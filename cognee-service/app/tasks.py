"""Hindsight's custom Cognee pipeline Task (Rule 2.2 of the "Best Use of
Open Source" playbook), sourced from our own cognee-onto contribution --
see cognee-onto/cognee_onto/pipeline.py. Wiring it in here, not just
publishing it standalone, is the proof it's actually reusable machinery.
"""

from typing import List

from cognee.modules.pipelines import Task
from cognee_onto.pipeline import build_onto_intake_pipeline as _build_onto_intake_pipeline

from app.ontology import Document


def build_onto_intake_pipeline() -> List[Task]:
    return _build_onto_intake_pipeline(document_model=Document)
