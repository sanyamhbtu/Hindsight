"""Self-hosted Cognee service for Hindsight.

Wraps the real, self-hosted `cognee` OSS package (not Cognee Cloud) behind a
REST contract that mirrors what src/lib/cognee/client.ts already calls, so
the Next.js app needs a URL change, not a rewrite.

Run directly (no Docker needed — defaults are Kuzu + LanceDB + SQLite, all
embedded/file-based):

    uvicorn app.main:app --host 0.0.0.0 --port 8000

Or via the repo-root docker-compose.yml once Docker is available.
"""

import asyncio
import logging
import os
import sqlite3
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

import cognee
from cognee import SearchType
from cognee.context_global_variables import set_database_global_context_variables
from cognee.infrastructure.databases.graph import get_graph_engine
from cognee.modules.data.methods import get_authorized_existing_datasets
from cognee.modules.users.methods import get_default_user
from fastapi import BackgroundTasks, FastAPI, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.ontology import ROOT_GRAPH_MODEL
from app.tasks import build_onto_intake_pipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hindsight.cognee-service")

app = FastAPI(title="Hindsight Cognee Service (self-hosted OSS)")

# In-memory dataset name registry. We don't rely on Cognee's internal
# dataset-UUID scheme — our "id" is just the dataset name — so the
# Next.js side's existing name -> id lookup (lib/cognee/datasetCache.ts)
# keeps working unmodified against a self-hosted backend.
_known_datasets: set[str] = set()


def _remember_dataset(name: str) -> None:
    _known_datasets.add(name)


# Cross-session Q&A history, self-hosted alongside everything else -- a
# plain sqlite file next to Cognee's own system dir. Keeps the "own your
# whole stack" story true: no external Postgres account needed just to
# remember what was asked in a past session.
_SESSION_DB_PATH = Path(__file__).resolve().parent.parent / "hindsight_sessions.db"


def _session_db() -> sqlite3.Connection:
    conn = sqlite3.connect(_SESSION_DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS session_interactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
        """
    )
    return conn


def _remember_interaction(session_id: str, question: str, answer: str, timestamp: str) -> None:
    with _session_db() as conn:
        conn.execute(
            "INSERT INTO session_interactions (session_id, question, answer, timestamp) VALUES (?, ?, ?, ?)",
            (session_id, question, answer, timestamp),
        )


def _recall_interactions(session_id: str) -> list[dict]:
    with _session_db() as conn:
        rows = conn.execute(
            "SELECT question, answer, timestamp FROM session_interactions "
            "WHERE session_id = ? ORDER BY timestamp ASC",
            (session_id,),
        ).fetchall()
    return [{"question": q, "answer": a, "timestamp": t} for q, a, t in rows]


@app.post("/api/v1/session/remember")
async def session_remember(payload: dict):
    session_id = payload.get("session_id")
    question = payload.get("question")
    answer = payload.get("answer")
    timestamp = payload.get("timestamp")
    if not (session_id and question and answer and timestamp):
        raise HTTPException(400, "session_id, question, answer, and timestamp are required")
    await asyncio.to_thread(_remember_interaction, session_id, question, answer, timestamp)
    return {"stored": True}


@app.get("/api/v1/session/recall")
async def session_recall(session_id: str = "detective_session_1"):
    logs = await asyncio.to_thread(_recall_interactions, session_id)
    return {"logs": logs}


@app.get("/health")
async def health():
    return {"status": "ok", "mode": "self-hosted", "datasets": len(_known_datasets)}


@app.get("/api/v1/datasets")
async def list_datasets():
    return [{"id": name, "name": name} for name in sorted(_known_datasets)]


@app.post("/api/v1/add")
async def add(datasetName: str = Form(...), data: UploadFile = None):
    if data is None:
        raise HTTPException(400, "Missing 'data' file field")
    raw = (await data.read()).decode("utf-8", errors="replace")
    await cognee.add(raw, dataset_name=datasetName)
    _remember_dataset(datasetName)
    return {"status": "success", "dataset": datasetName}


async def _run_cognify(dataset_name: str, custom_prompt: str = None):
    try:
        await cognee.cognify(
            datasets=[dataset_name], graph_model=ROOT_GRAPH_MODEL, custom_prompt=custom_prompt
        )
    except Exception:
        logger.exception("Background cognify failed for dataset %s", dataset_name)


@app.post("/api/v1/cognify")
async def cognify_endpoint(payload: dict, background_tasks: BackgroundTasks):
    datasets = payload.get("datasets") or []
    run_in_background = bool(payload.get("run_in_background"))
    custom_prompt = payload.get("customPrompt")
    for name in datasets:
        _remember_dataset(name)

    if run_in_background:
        for name in datasets:
            background_tasks.add_task(_run_cognify, name, custom_prompt)
        return JSONResponse({"status": "processing"}, status_code=202)

    for name in datasets:
        await _run_cognify(name, custom_prompt)
    return {"status": "success"}


@app.post("/api/v1/onto-ingest")
async def onto_ingest(payload: dict, background_tasks: BackgroundTasks):
    """Custom pipeline entrypoint: Onto-clean + trust-score URLs, persist as
    Document DataPoints via our custom Task (not a plain add() call)."""
    dataset_name = payload.get("datasetName") or "research_core"
    urls = payload.get("urls") or []
    _remember_dataset(dataset_name)

    async def _run():
        try:
            await cognee.run_custom_pipeline(
                tasks=build_onto_intake_pipeline(), data=urls, dataset=dataset_name
            )
        except Exception:
            logger.exception("onto_intake pipeline failed for dataset %s", dataset_name)

    if payload.get("run_in_background", True):
        background_tasks.add_task(_run)
        return JSONResponse({"status": "processing"}, status_code=202)

    await _run()
    return {"status": "success"}


@app.post("/api/v1/search")
async def search_endpoint(payload: dict):
    query = payload.get("query", "")
    datasets = payload.get("datasets") or []
    search_type_name = payload.get("search_type", "GRAPH_COMPLETION")

    try:
        search_type = SearchType[search_type_name]
    except KeyError:
        valid = ", ".join(t.name for t in SearchType)
        raise HTTPException(400, f"Unknown search_type '{search_type_name}'. Valid: {valid}")

    results = await cognee.search(
        query_text=query,
        query_type=search_type,
        datasets=datasets,
        top_k=payload.get("topK", 15),
        system_prompt=payload.get("system_prompt"),
    )
    return results


@app.post("/api/v1/memify")
async def memify_endpoint(payload: dict):
    datasets = payload.get("datasets") or []
    results = {}
    for name in datasets:
        results[name] = await cognee.memify(dataset=name)
    return {"status": "success", "results": results}


@app.get("/api/v1/datasets/{dataset_id}/graph")
async def dataset_graph(dataset_id: str):
    """Raw node/edge dump for the graph viz -- NOT a search() call.

    SearchType.TRIPLET_COMPLETION requires memify() to have already built a
    Triplet_text embedding collection, and even then returns an LLM-generated
    answer string, not structured triplets -- it can't back a full graph dump.
    This uses the same low-level graph_engine.get_graph_data() that cognee's
    own visualize_graph() uses internally (verified against the installed
    cognee==1.2.2 source, cognee/api/v1/visualize/visualize.py).
    """
    if dataset_id not in _known_datasets:
        return {"nodes": [], "edges": []}

    user = await get_default_user()
    authorized = await get_authorized_existing_datasets([dataset_id], "read", user)
    if not authorized:
        return {"nodes": [], "edges": []}

    async with set_database_global_context_variables(authorized[0].id, authorized[0].owner_id):
        graph_engine = await get_graph_engine()
        raw_nodes, raw_edges = await graph_engine.get_graph_data()

    nodes = []
    for node_id, props in raw_nodes:
        nodes.append(
            {
                "id": node_id,
                "label": props.get("name") or node_id,
                "type": props.get("type") or "Object",
                "properties": {
                    k: v
                    for k, v in props.items()
                    if k in ("trust_score", "trust", "source_url", "document_id")
                },
            }
        )

    edges = [
        {"source": source_id, "target": target_id, "relation": relation}
        for source_id, target_id, relation, _props in raw_edges
    ]

    return {"nodes": nodes, "edges": edges}


@app.delete("/api/v1/datasets/{dataset_id}")
async def delete_dataset(dataset_id: str):
    await cognee.forget(dataset=dataset_id)
    _known_datasets.discard(dataset_id)
    return {"status": "success"}
