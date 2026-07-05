from typing import Optional

from cognee.infrastructure.engine import DataPoint


class OntoDocument(DataPoint):
    """A single URL ingested through Onto: cleaned to Markdown and scored
    0-100 for trust. The score lives directly on the node, so anything that
    renders the graph can tint by real per-source trust."""

    name: str
    source_url: Optional[str] = None
    trust_score: float = 50.0
    content: Optional[str] = None
    metadata: dict = {"index_fields": ["name", "content"]}
