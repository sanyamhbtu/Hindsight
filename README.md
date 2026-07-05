# CHOW 🧠🕵️‍♂️

> *"Your AI woke up on the roof with no memory of last night. Chow connects the dots you don't remember."*

Chow ingests scattered, messy sources and builds them into a **Cognee knowledge graph**, then answers questions whose answers aren't contained in any single source — by traversing the connections between facts instead of retrieving the most similar chunk. That's the difference between vector RAG and graph RAG, made visible on one screen.

Built for Cognee's "Where's My Context?" hackathon, targeting **Best Use of Open Source**: the whole engine runs on **self-hosted OSS Cognee** (Docker or a local venv, not Cognee Cloud), with a custom ontology, a custom pipeline Task, and an open-source ingestion package (`cognee-onto/`) contributed alongside it.

---

## The problem

Vector search retrieves the chunk most *similar* to your question. It can't answer a question whose answer is *distributed* across several chunks.

- Fragment A: "Phil texted that Doug was with them at 11:47pm."
- Fragment B: "Security found a man on the rooftop at 8am, Suite 3200 key in his pocket."
- Question: "Where is Doug?"

Vector RAG returns whichever fragment is more similar and stops. The answer — *the roof* — lives in the edge between A and B, not in either one. Chow builds a graph and walks it.

---

## Two modes, one engine

- **Detective mode** — a pre-loaded "last night" evidence set (~15 messy fragments: texts, receipts, CCTV logs, a hotel invoice). Ask "Where's Doug?" and watch it reason across the graph to the answer.
- **Research mode** — paste real URLs. Each one is cleaned and trust-scored by **Onto** before it reaches the graph, so nodes carry a real 0–100 trust score instead of raw HTML noise.

Same engine underneath both — `add → cognify → search → memify → forget`, all against a real, self-hosted Cognee instance.

---

## Architecture

```
Next.js (App Router) ── HTTP ──> cognee-service (FastAPI, self-hosted OSS Cognee)
        │                              │
        │ Onto cleans + trust-scores   ├── Ladybug graph store (embedded)
        │ URLs before they reach       ├── LanceDB vector store (embedded)
        │ cognify (Research mode)      └── SQLite (relational + session history)
        │
   sqlite-backed session history, self-hosted alongside everything else
```

- **`cognee-service/`** — wraps the real `cognee` OSS package behind a small REST contract. Custom ontology (`app/ontology.py`: `Person` / `Place` / `Event` / `Object` / `Transaction` / `Document`, typed relations) is passed as `graph_model=` to `cognify()`, so extraction produces domain-shaped nodes instead of a generic entity graph.
- **`cognee-onto/`** — a standalone, independently installable package (see its own README) implementing Onto intake as a real Cognee pipeline `Task` via `cognee.run_custom_pipeline()`. `cognee-service` is its first real consumer.
- **`src/`** — the Next.js app: ingest UI, force-graph visualizer (trust-tinted nodes), the split-screen "vector vs. graph" ask interface, and the memory dashboard (`memify` / `forget`).

No external database account is required — session history lives in a sqlite file next to Cognee's own storage, so the whole stack is self-hosted end to end.

---

## Running it locally

**1. `cognee-service`** (the self-hosted Cognee engine):

```bash
cd cognee-service
python -m venv .venv
.venv\Scripts\activate        # Windows; `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
cp .env.template .env         # fill in LLM_API_KEY, ONTO_API_KEY
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Or via Docker from the repo root: `docker compose up`.

**2. The Next.js app:**

```bash
npm install
cp .env.local.example .env.local   # if present — otherwise see below
npm run dev
```

`.env.local` needs:

```env
COGNEE_MODE="selfhosted"
COGNEE_SELFHOSTED_URL="http://localhost:8000/api/v1"
ONTO_API_KEY="your_onto_api_key"
```

Open [http://localhost:3000](http://localhost:3000).

---

## Cognee operations on screen

| Operation | What it does here |
|---|---|
| `cognee.add()` / `cognee.cognify()` | Evidence streams into a dataset; the custom ontology extracts typed nodes + relations |
| `cognee.run_custom_pipeline()` | Onto cleans + trust-scores a URL, writes the score onto a `Document` node (Research mode) |
| `cognee.search(GRAPH_COMPLETION_CONTEXT_EXTENSION)` | Multi-hop answer + traversal trail |
| `cognee.search(CHUNKS)` | The vector-RAG baseline for the split-screen comparison |
| `cognee.search(GRAPH_COMPLETION_COT / GRAPH_SUMMARY_COMPLETION / TEMPORAL)` | Deep reasoning, dataset-wide summary, and timeline views |
| `cognee.memify()` | Re-processes an already-cognified graph; before/after node & edge counts shown on the dashboard |
| `cognee.forget()` | Wipes a dataset; re-querying afterward proves the graph no longer knows it |

---

## Project structure

```
Hindsight/
├── cognee-service/      # self-hosted OSS Cognee, wrapped in FastAPI
├── cognee-onto/          # standalone Onto-intake pipeline Task (own package)
├── src/
│   ├── app/
│   │   ├── ask/          # split-screen vector vs. graph query interface
│   │   ├── board/        # force-graph visualizer, trust-tinted
│   │   ├── dashboard/     # node/edge stats, memify, forget, session history
│   │   └── api/           # Next.js routes proxying cognee-service
│   ├── components/
│   ├── hooks/             # useDatasetSession — Detective vs Research state
│   └── lib/
│       ├── cognee/        # HTTP client for cognee-service
│       ├── session/       # cross-session Q&A history (sqlite-backed)
│       └── detective/      # the "Find Doug" fragment set
```

---

*Chow — because the truth is in the connections.*
