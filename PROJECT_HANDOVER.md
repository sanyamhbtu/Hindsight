# Chow — Project Architecture & Handover Document

Top-to-bottom overview of the **Chow** project, for anyone (frontend, backend, or ML) picking this up. Chow demonstrates **Graph RAG vs. Vector RAG** on top of **self-hosted, open-source Cognee** — not Cognee Cloud.

---

## 1. High-level overview

Chow ingests scattered sources (text fragments, files, or URLs) and builds them into a Cognee knowledge graph. Users ask questions whose answers require multi-hop reasoning across fragments — something plain vector search can't do because it only ever retrieves the single most-similar chunk.

Two front doors, one engine:
- **Detective mode** — a curated "last night" evidence set (the "Find Doug" case).
- **Research mode** — real URLs, cleaned and trust-scored by **Onto** before they reach the graph.

---

## 2. Frontend architecture

- **Framework:** Next.js (App Router), React, TypeScript.
- **Styling:** Tailwind CSS v4.
- **Animations:** Framer Motion.
- **Graph visualization:** `react-force-graph-2d`.

### Core pages

1. **`/` (Landing page)** — ingest UI. Detective mode has a single-shot fragment box; Research mode stages multiple URLs/docs into a list before sending the batch (`queuedSources` state in `src/app/page.tsx`).
2. **`/board`** — the interactive knowledge graph. Nodes are tinted by trust score; includes `memify`/`forget` controls.
3. **`/ask`** — the split-screen query interface: vector RAG (`CHUNKS`) on one side, graph-reasoned answer + traversal trail on the other.
4. **`/dashboard`** — node/edge stats, trust distribution, `memify` before/after, and cross-session Q&A history.

---

## 3. Backend architecture

Two independent services:

### `cognee-service/` (the actual engine)

A FastAPI wrapper around the real, self-hosted `cognee` OSS package (`topoteretes/cognee`). Runs as its own process — via a local Python venv or Docker — not Cognee Cloud. See `cognee-service/README.md` for the full internals (custom ontology, custom pipeline Task, store config).

Endpoints: `/api/v1/add`, `/cognify`, `/onto-ingest` (the custom pipeline Task), `/search`, `/memify`, `/datasets/{id}/graph`, `/datasets/{id}` (DELETE = forget), plus `/session/remember` and `/session/recall` for cross-session Q&A history (sqlite-backed — no external database needed).

### Next.js API routes (`src/app/api/...`)

A thin proxy layer over `cognee-service`, all going through `src/lib/cognee/client.ts`:

- **`POST /api/ingest`** — routes URL sources through the Onto pipeline (`ontoIngest`), and text/file sources through `add` + `cognify`.
- **`POST /api/ask`** — runs `GRAPH_COMPLETION_CONTEXT_EXTENSION` and `CHUNKS` in parallel for the split-screen comparison, plus derives the traversal trail from the raw graph.
- **`GET /api/graph`** — raw nodes/edges for a dataset, shaped for the force-graph UI.
- **`POST /api/improve`** — calls `cognee.memify()` for real; returns before/after node/edge counts.
- **`POST /api/forget-all`** — nuclear (wipe dataset) or surgical (re-add everything except one source) deletion.

---

## 4. Storage

No external database account is required.

- **Graph / vector / relational data:** embedded, file-based stores inside `cognee-service` — Ladybug (graph), LanceDB (vector), SQLite (relational). Configured in `cognee-service/.env`.
- **Cross-session Q&A history:** a separate sqlite file (`cognee-service/hindsight_sessions.db`), written by the `/session/remember` / `/session/recall` endpoints in `cognee-service/app/main.py`.

---

## 5. Environment variables

**Next.js (`.env.local`)** — see `.env.local.example` for the template:

```env
COGNEE_MODE="selfhosted"
COGNEE_SELFHOSTED_URL="http://localhost:8000/api/v1"
ONTO_API_KEY="your_onto_api_key"
```

`COGNEE_MODE=cloud` plus `COGNEE_API_URL` / `COGNEE_TENANT_ID` / `COGNEE_USER_ID` / `COGNEE_API_KEY` switches to Cognee Cloud as a fallback — not the primary path.

**`cognee-service/.env`** — see `cognee-service/.env.template`: `LLM_PROVIDER`/`LLM_API_KEY` (OpenAI by default), `EMBEDDING_PROVIDER` (fastembed, local, free), store providers, and `ONTO_API_KEY`.

Never commit real values for either file — both are gitignored; only the `.example`/`.template` files are tracked.
