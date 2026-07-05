# cognee-service

The real, self-hosted, open-source `cognee` package (`topoteretes/cognee` on
PyPI/GitHub) running as its own process — not Cognee Cloud. Chow's
Next.js app talks to it over HTTP exactly like it used to talk to Cloud
(`add` / `cognify` / `search` / `datasets/{id}/graph` / `memify`), so
switching engines is a URL change (`COGNEE_MODE` in the app's `.env.local`),
not a rewrite.

What this service adds on top of stock `cognee`, so the graph is domain-shaped
rather than a generic Entity/EntityType blob:

- **`app/ontology.py`** — custom `DataPoint` models (`Person`, `Place`,
  `Event`, `Object`, `Transaction`, `Document`) passed as `graph_model=` to
  `cognify()`.
- **`app/tasks.py`** — a custom pipeline `Task` (`onto_intake_task`) that
  calls Onto's `read_and_score`, then writes the trust score directly onto a
  `Document` node via `cognee.run_custom_pipeline(...)` — not a Next.js-side
  pre-call joined into a generic text blob.
- **`app/main.py`** — the FastAPI wrapper exposing the REST contract the
  Next.js app expects, backed by real `cognee.add` / `cognee.cognify` /
  `cognee.search` / `cognee.memify` / `cognee.forget` calls.

## Run it directly (no Docker needed)

Defaults are all embedded/file-based (Ladybug graph store, LanceDB vector
store, SQLite relational store) — nothing else to install or run.

```bash
cd cognee-service
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.template .env         # fill in LLM_API_KEY (and ONTO_API_KEY)
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Then point the Next.js app at it (already the default in `.env.local`):

```env
COGNEE_MODE="selfhosted"
COGNEE_SELFHOSTED_URL="http://localhost:8000/api/v1"
```

## Run it via Docker

```bash
docker compose up   # from the repo root
```

## Swappable stores (a real OSS talking point, not just a claim)

Set in `.env`:

- `GRAPH_DATABASE_PROVIDER` — `ladybug` (default, embedded) or `neo4j`
- `VECTOR_DB_PROVIDER` — `lancedb` (default, embedded) or `pgvector`
- `DB_PROVIDER` — `sqlite` (default) or `postgres`

## Per-dataset isolation

`ENABLE_BACKEND_ACCESS_CONTROL=true` makes Cognee create isolated
relational/vector/graph stores per user + dataset (supported today with the
default Ladybug + LanceDB + SQLite stack). This defaults to `true` here, and
it's load-bearing, not just a demo flourish: cognee's own
`get_graph_data()`/`visualize_graph()` have no dataset filter at all, so with
access control off every dataset shares one physical graph store and
`/datasets/{id}/graph` leaks nodes across datasets (confirmed directly —
ingesting into a second dataset made the first dataset's nodes show up in the
second one's graph response). It also demos real per-user memory isolation
for free, since it's a genuine OSS feature and not something we bolted on.
