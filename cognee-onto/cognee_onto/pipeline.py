"""The custom pipeline Task: Onto cleans + trust-scores each URL, and this
Task writes that score directly onto a graph node — via cognee.run_custom_pipeline,
not a pre-processing call bolted on before add()."""

from typing import List, Optional, Type

from cognee.modules.pipelines import Task
from cognee.tasks.storage import add_data_points as _cognee_add_data_points

from cognee_onto.client import read_and_score
from cognee_onto.models import OntoDocument


async def _store_onto_data_points(data_points):
    """Writes our DataPoints into the graph without cognee's Data-row
    provenance stamping.

    cognee's own `add_data_points` looks up `ctx.data_item.id` to link each
    node back to a relational `Data` row (see add_data_points.py) -- that row
    only exists for content cognee itself ingested via `add()`/`ingest_data`.
    Our pipeline's `data` is raw URL strings (Onto fetches and cleans them,
    cognee never sees the original), so `ctx.data_item` is just the URL
    string, which has no `.id` and would crash there. Provenance for these
    nodes lives on the DataPoint itself instead (`source_url`, `trust_score`
    on OntoDocument), so it doesn't need cognee's ledger.

    Declaring no `ctx` parameter here (unlike cognee's `add_data_points`)
    means `Task.accepts_ctx` (matched by parameter name, see
    cognee/modules/pipelines/tasks/task.py) is False, so the pipeline never
    injects the broken context -- we pass `ctx=None` explicitly instead.
    """
    return await _cognee_add_data_points(data_points, ctx=None)


def make_onto_intake_task(document_model: Type[OntoDocument] = OntoDocument):
    """Returns an executable that turns a list of URLs into a list of
    `document_model` DataPoints, each carrying Onto's real trust score.

    `document_model` lets a caller swap in their own DataPoint subclass
    (e.g. one with extra typed relation fields for their own ontology) as
    long as it accepts `name` / `source_url` / `trust_score` / `content`.
    """

    async def onto_intake_task(urls: List[str]) -> List[document_model]:
        documents = []
        for url in urls:
            result = await read_and_score(url)
            documents.append(
                document_model(
                    name=url,
                    source_url=url,
                    trust_score=float(result.get("trust_score", 50)),
                    content=result.get("markdown", ""),
                )
            )
        return documents

    return onto_intake_task


def build_onto_intake_pipeline(document_model: Type[OntoDocument] = OntoDocument) -> List[Task]:
    """The two-Task pipeline: Onto intake -> persist DataPoints.

    Usage:
        import cognee
        from cognee_onto import build_onto_intake_pipeline

        await cognee.run_custom_pipeline(
            tasks=build_onto_intake_pipeline(),
            data=["https://example.com/some-article"],
            dataset="my_dataset",
        )
    """
    return [Task(make_onto_intake_task(document_model)), Task(_store_onto_data_points)]
