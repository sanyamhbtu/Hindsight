import pytest

from cognee_onto.models import OntoDocument
from cognee_onto.pipeline import build_onto_intake_pipeline, make_onto_intake_task


async def test_onto_intake_task_builds_documents_from_urls(monkeypatch):
    async def fake_read_and_score(url):
        return {"markdown": f"clean text for {url}", "trust_score": 73}

    monkeypatch.setattr("cognee_onto.pipeline.read_and_score", fake_read_and_score)

    task = make_onto_intake_task()
    documents = await task(["https://a.example", "https://b.example"])

    assert len(documents) == 2
    assert all(isinstance(d, OntoDocument) for d in documents)
    assert documents[0].source_url == "https://a.example"
    assert documents[0].trust_score == 73
    assert documents[0].content == "clean text for https://a.example"


async def test_onto_intake_task_accepts_custom_document_model(monkeypatch):
    class MyDocument(OntoDocument):
        category: str = "general"

    async def fake_read_and_score(url):
        return {"markdown": "x", "trust_score": 40}

    monkeypatch.setattr("cognee_onto.pipeline.read_and_score", fake_read_and_score)

    task = make_onto_intake_task(document_model=MyDocument)
    documents = await task(["https://a.example"])

    assert isinstance(documents[0], MyDocument)
    assert documents[0].category == "general"


def test_build_onto_intake_pipeline_returns_two_tasks():
    tasks = build_onto_intake_pipeline()
    assert len(tasks) == 2
