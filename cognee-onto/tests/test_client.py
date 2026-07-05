import httpx
import pytest
import respx

from cognee_onto.client import read_and_score


async def test_falls_back_to_mock_without_api_key(monkeypatch):
    monkeypatch.delenv("ONTO_API_KEY", raising=False)
    result = await read_and_score("https://example.com/a")
    assert result["trust_score"] == 50
    assert "Mock content" in result["markdown"]


async def test_falls_back_to_mock_for_placeholder_key(monkeypatch):
    monkeypatch.setenv("ONTO_API_KEY", "your_onto_api_key")
    result = await read_and_score("https://example.com/a")
    assert result["trust_score"] == 50


@respx.mock
async def test_calls_onto_and_returns_real_score(monkeypatch):
    monkeypatch.setenv("ONTO_API_KEY", "real-key")
    respx.post("https://api.buildonto.dev/read_and_score").mock(
        return_value=httpx.Response(200, json={"markdown": "# Clean\ncontent", "trust_score": 87})
    )

    result = await read_and_score("https://example.com/a")

    assert result == {"markdown": "# Clean\ncontent", "trust_score": 87}


@respx.mock
async def test_falls_back_on_non_200(monkeypatch):
    monkeypatch.setenv("ONTO_API_KEY", "real-key")
    respx.post("https://api.buildonto.dev/read_and_score").mock(
        return_value=httpx.Response(500)
    )

    result = await read_and_score("https://example.com/a")

    assert result["trust_score"] == 50
    assert "API Error" in result["markdown"]


@respx.mock
async def test_falls_back_on_network_error(monkeypatch):
    monkeypatch.setenv("ONTO_API_KEY", "real-key")
    respx.post("https://api.buildonto.dev/read_and_score").mock(
        side_effect=httpx.ConnectError("boom")
    )

    result = await read_and_score("https://example.com/a")

    assert result["trust_score"] == 50
    assert "Network Error" in result["markdown"]
