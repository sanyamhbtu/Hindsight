# cognee-onto

A Cognee pipeline Task that turns any URL into clean, trust-scored Markdown
via [Onto](https://buildonto.dev) and writes the score directly onto a graph
node — as a `cognee.run_custom_pipeline()` Task, not a pre-processing call
that throws the score away before it reaches the graph.

Built for and dogfooded by [Hindsight](https://github.com/ravixalgorithm/Hindsight)
(a self-hosted-Cognee entry for the "Where's My Context?" hackathon) — it
lives in that repo as `cognee-onto/`, but is a standalone, independently
installable package any Cognee user can pull in, not something wired only
to Hindsight's own code.

## Install

```bash
# Directly from the Hindsight monorepo (subdirectory install):
pip install "git+https://github.com/ravixalgorithm/Hindsight.git#subdirectory=cognee-onto"

# or, once published to PyPI:
pip install cognee-onto
```

## Use

```python
import os
import cognee
from cognee_onto import build_onto_intake_pipeline

os.environ["ONTO_API_KEY"] = "..."  # from buildonto.dev

await cognee.run_custom_pipeline(
    tasks=build_onto_intake_pipeline(),
    data=["https://example.com/some-article", "https://example.com/another"],
    dataset="my_dataset",
)

await cognee.search(query_text="what's the trust score on the second article?",
                     query_type=cognee.SearchType.GRAPH_COMPLETION,
                     datasets=["my_dataset"])
```

Without an `ONTO_API_KEY` set, `read_and_score` falls back to clearly-labeled
mock content instead of failing, so a pipeline built on this package still
runs end to end in a sandbox/CI environment.

## Bring your own ontology

`build_onto_intake_pipeline()` defaults to a minimal `OntoDocument` DataPoint
(`name`, `source_url`, `trust_score`, `content`). Pass your own DataPoint
subclass to carry extra fields or typed relations into your graph:

```python
from cognee_onto.models import OntoDocument
from cognee_onto import build_onto_intake_pipeline

class MyDocument(OntoDocument):
    category: str = "general"

tasks = build_onto_intake_pipeline(document_model=MyDocument)
```

## Why a Task, not a pre-processing call

Cleaning HTML into Markdown before `cognee.add()` is easy but throws the
trust score away — it never becomes graph metadata. Wiring Onto in as a real
`Task` through `cognee.run_custom_pipeline()` means the score is persisted on
the node itself via `cognee.tasks.storage.add_data_points`, so anything that
renders or queries the graph (a viz, a `SearchType.GRAPH_COMPLETION` answer)
can use it directly.

## Development

```bash
pip install -e ".[dev]"
pytest
```
