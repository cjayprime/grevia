import json
from typing import TypedDict, Annotated, List, Any, Dict
import operator

from sqlalchemy.orm import Session
from langgraph.graph.message import add_messages

from models.database import engine
from models.workspace import Workspace
from models.materiality_assessment import MaterialityAssessment

# MODEL = "gpt-4.1"
MODEL = "gpt-5.4"  # For reasoning


def update_to_latest_results(previous: str | int, current: str | int) -> str | int:
    return current


def update_node_results(
    previous: Dict[str, int], current: Dict[str, int]
) -> Dict[str, int]:
    return {**previous, **current}


class GraphState(TypedDict):
    messages: Annotated[List[Any], add_messages]
    e_messages: Annotated[List[Any], add_messages]
    s_messages: Annotated[List[Any], add_messages]
    g_messages: Annotated[List[Any], add_messages]
    input_validated: Annotated[bool, operator.or_] = False

    hot_store_ids: Annotated[List[int], operator.add]
    errors: Annotated[List[str], operator.add]

    document_chunks: Annotated[str, update_to_latest_results]
    materiality_assessment_id: Annotated[int, update_to_latest_results]
    steps: Annotated[Dict[str, int], update_node_results]


def get_workspace_profile(workspace_id: int) -> dict:
    """Fetch workspace fields needed for agent context."""
    with Session(engine) as session:
        ws = session.get(Workspace, workspace_id)
        if not ws:
            return {}
        return ws


def get_materiality_assessment(materiality_assessment_id: int) -> dict:
    """Fetch workspace fields needed for agent context."""
    with Session(engine) as session:
        ws = session.get(MaterialityAssessment, materiality_assessment_id)
        if not ws:
            return ({}, session)
        return (ws, session)


def build_context(state: dict) -> str:
    """Assemble a concise text block from GraphState for an LLM prompt."""
    profile = get_workspace_profile(state.get("workspace_id", 0))

    chunks = state.get("document_chunks", [])
    chunk_context = "\n".join(
        f"[{c.get('source', c.get('filename', ''))}] {c.get('text', '')[:800]}"
        for c in chunks[:60]
    )

    stakeholders = json.dumps(profile.get("key_stakeholders", []))

    return (
        f"Industry: {profile.get('industry', '')}\n"
        f"Region: {profile.get('region', '')}\n"
        f"HQ Country: {profile.get('hq_country', '')}\n"
        f"Employee Count: {profile.get('employee_count', 'unknown')}\n"
        f"Annual Revenue (USD): {profile.get('annual_revenue', 'unknown')}\n"
        f"Business Description: {profile.get('business_description', '')}\n"
        f"Value Chain: {profile.get('value_chain_description', '')}\n"
        f"Key Stakeholders: {stakeholders}\n"
        f"Sustainability Goals: {profile.get('sustainability_goals', '')}\n\n"
        f"--- Document Evidence ---\n{chunk_context[:12_000]}"
    )


def breakdown_field_descriptions(model_cls: type) -> str:
    lines: list[str] = []
    for name, field in model_cls.model_fields.items():
        desc = field.description or ""
        lines.append(f"  {name}: {desc}")
    return "\n".join(lines)
