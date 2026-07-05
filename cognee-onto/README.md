# cognee-onto

**Clean, trust-scored web intake for [Cognee](https://github.com/topoteretes/cognee) — as a real pipeline `Task`, not a pre-processing hack.**

![license](https://img.shields.io/badge/license-MIT-blue)
![python](https://img.shields.io/badge/python-3.10%2B-blue)
![cognee](https://img.shields.io/badge/cognee-%3E%3D0.3.9-green)
![tests](https://img.shields.io/badge/tests-8%20passing-brightgreen)

`cognee-onto` turns any URL into clean Markdown plus a 0–100 trust score
(via [Onto](https://buildonto.dev)), and writes both directly onto a Cognee
graph node through `cognee.run_custom_pipeline()`. It's a small package with
one job: stop raw HTML from poisoning your knowledge graph.

---

## Table of contents

- [The problem](#the-problem)
- [What this package does](#what-this-package-does)
- [Install](#install)
- [Quick start](#quick-start)
- [Use cases](#use-cases)
- [Bring your own ontology](#bring-your-own-ontology)
- [Why a Task, not a pre-processing call](#why-a-task-not-a-pre-processing-call)
- [API reference](#api-reference)
- [Development](#development)
- [Project origin](#project-origin)
- [License](#license)

---

## The problem

Cognee builds its graph by running an LLM extraction pass over whatever text
you hand `cognee.add()`. Feed it a raw scraped webpage and it will
cheerfully extract nodes like `"Accept Cookies"`, `"Subscribe to our
newsletter"`, and `"© 2026 All rights reserved"` — plus phantom relations
pulled from nav bars and footers. Those junk nodes don't stay contained;
they poison every future traversal that touches them.

A knowledge graph is only as good as the text you feed `cognify()`. Cleaning
that text is necessary. Cognee has no opinion on *how* you clean it, or on
what happens to metadata (like a trust score) you'd want to carry through —
that's the gap this package fills.

## What this package does

1. Takes a list of URLs.
2. Sends each through [Onto's](https://buildonto.dev) `read_and_score` API — clean Markdown out, a 0–100 AIO trust score out.
3. Wraps the result in a Cognee `DataPoint` (`OntoDocument`: `name`, `source_url`, `trust_score`, `content`).
4. Persists it via `cognee.tasks.storage.add_data_points`, as a real two-`Task` pipeline run through `cognee.run_custom_pipeline()`.

The trust score lands **on the graph node itself** — not in a side table, not
thrown away after cleaning. Anything that queries or renders the graph
afterward (a `SearchType.GRAPH_COMPLETION` answer, a force-graph
visualization, a trust-based prune) can use it directly.

Without an `ONTO_API_KEY` set, `read_and_score` falls back to clearly-labeled
mock content instead of raising, so a pipeline built on this package still
runs end to end in a sandbox or CI environment with zero configuration.

## Install

```bash
# From PyPI, once published:
pip install cognee-onto

# From the Chow monorepo directly (subdirectory install — this is
# where the package actually lives today):
pip install "git+https://github.com/ravixalgorithm/Chow.git#subdirectory=cognee-onto"
```

## Quick start

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

result = await cognee.search(
    query_text="what's the trust score on the second article?",
    query_type=cognee.SearchType.GRAPH_COMPLETION,
    datasets=["my_dataset"],
)
```

That's it — two lines to go from a list of URLs to trust-scored graph nodes
you can query like anything else in Cognee.

## Use cases

- **Research assistants / "your own Wikipedia"** — ingest a stack of docs,
  blog posts, and papers on a topic; ask cross-source questions and see
  which answers came from high-trust sources vs. a random blog post.
- **Competitive intelligence** — pull in competitor sites, docs, and
  changelogs; trust-score lets you weight official docs above forum
  speculation when the graph reasons across them.
- **Support/knowledge-base ingestion** — feed a product's help center and
  community forum into the same graph, with trust score distinguishing
  official articles from user-submitted answers.
- **Any Cognee pipeline that touches the open web** — anywhere `cognee.add()`
  would otherwise ingest raw HTML, this Task slots in ahead of it.

`cognee-onto` is dogfooded by [Chow](https://github.com/ravixalgorithm/Chow)'s
Research mode: paste a URL, get a trust-tinted node in the live graph.

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

This is exactly how Chow itself uses the package — its `cognee-service`
passes its own `Document` model (part of a larger `Person`/`Place`/`Event`/
`Object`/`Transaction` ontology) through this same hook.

## Why a Task, not a pre-processing call

It's easy to clean HTML into Markdown *before* calling `cognee.add()`. It's
also lossy: the trust score never becomes graph metadata, because
`cognee.add()` has nowhere to put it. Wiring Onto in as a real `Task` through
`cognee.run_custom_pipeline()` means the score is persisted on the node
itself, via Cognee's own `add_data_points` storage primitive — the same
mechanism Cognee's own pipeline stages use. That's the difference between
"used Cognee" and "built on Cognee's own extension points."

## API reference

| Export | Signature | What it does |
|---|---|---|
| `read_and_score` | `async (url: str, api_key=None, api_url=None) -> dict` | Calls Onto, returns `{"markdown": str, "trust_score": float}`. Falls back to mock content if unconfigured/unreachable. |
| `make_onto_intake_task` | `(document_model=OntoDocument) -> Callable` | Returns the first pipeline Task: a list of URLs → a list of `document_model` instances. |
| `build_onto_intake_pipeline` | `(document_model=OntoDocument) -> list[Task]` | Returns the full two-`Task` pipeline, ready for `cognee.run_custom_pipeline(tasks=...)`. |
| `OntoDocument` | `DataPoint` subclass | `name`, `source_url`, `trust_score`, `content` — the default graph node shape. |

## Development

```bash
pip install -e ".[dev]"
pytest
```

8 tests cover the intake task (URL → DataPoint, custom document models) and
pipeline assembly, with `Onto`'s API mocked via `respx` — no network calls
or API key needed to run the suite.

## Project origin

Built for and dogfooded by [Chow](https://github.com/ravixalgorithm/Chow),
a self-hosted-Cognee entry for the "Where's My Context?" hackathon
(targeting the **Best Use of Open Source** track). It lives in that repo's
`cognee-onto/` directory — one project, reviewable in one place — but is
built and tested as a fully standalone, independently installable package
any Cognee user can adopt.

## License

MIT — see [LICENSE](./LICENSE).
