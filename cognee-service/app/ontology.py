"""Hindsight's custom Cognee ontology.

Domain-shaped DataPoint models (Rule 2.1 of the PRD's "Best Use of Open
Source" playbook) so cognify() extracts typed, investigation-shaped nodes
instead of a generic Entity/EntityType graph.

Passed into cognee.cognify(graph_model=...) and cognee.run_custom_pipeline(...)
so both the detective-fragment path and the Onto-scored URL path land in the
same typed graph.
"""

from typing import List, Optional

from cognee.infrastructure.engine import DataPoint
from cognee_onto.models import OntoDocument


class Place(DataPoint):
    name: str
    metadata: dict = {"index_fields": ["name"]}


class Object(DataPoint):
    name: str
    metadata: dict = {"index_fields": ["name"]}


class Event(DataPoint):
    name: str
    occurred_at: Optional[str] = None
    located_at: Optional[Place] = None
    metadata: dict = {"index_fields": ["name"]}


class Person(DataPoint):
    name: str
    attended: Optional[List[Event]] = None
    located_at: Optional[Place] = None
    left_with: Optional[List[Object]] = None
    metadata: dict = {"index_fields": ["name"]}


class Transaction(DataPoint):
    name: str
    paid_by: Optional[Person] = None
    amount: Optional[str] = None
    location: Optional[Place] = None
    metadata: dict = {"index_fields": ["name"]}


# Document is cognee-onto's own OntoDocument (see cognee-onto/cognee_onto/models.py) --
# this service is cognee-onto's first real consumer, not just its author.
Document = OntoDocument

# The root type handed to cognify()/run_custom_pipeline() as graph_model=.
# Person is the narrative spine (who attended what, went where, left with
# what, paid for what) — Place/Object/Event/Transaction hang off it via
# typed relation fields above.
ROOT_GRAPH_MODEL = Person
