"""Thin client for Onto's read_and_score endpoint (buildonto.dev).

Falls back to clearly-labeled mock content when no ONTO_API_KEY is
configured or the API is unreachable, so a pipeline built on this package
degrades instead of failing outright.
"""

import os

import httpx

DEFAULT_ONTO_API_URL = "https://api.buildonto.dev"


async def read_and_score(url: str, api_key: str = None, api_url: str = None) -> dict:
    api_key = api_key or os.environ.get("ONTO_API_KEY")
    api_url = api_url or os.environ.get("ONTO_API_URL", DEFAULT_ONTO_API_URL)

    if not api_key or api_key == "your_onto_api_key":
        return {"markdown": f"Mock content for {url}", "trust_score": 50}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                f"{api_url}/read_and_score",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"url": url},
            )
        if res.status_code != 200:
            return {"markdown": f"Fallback content for {url} (API Error)", "trust_score": 50}
        return res.json()
    except httpx.HTTPError:
        return {"markdown": f"Fallback content for {url} (Network Error)", "trust_score": 50}
