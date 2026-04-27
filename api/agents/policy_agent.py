import json

from .state import GraphState
from .tools import write_policy_tool, call_claude_tool
from rag.guardrails import output_guardrail, GuardrailError

POLICY_SYSTEM = """\
You are an ESRS compliance expert. Extract ALL MDR-P (Policies, para 65) and \
MDR-A (Actions & Targets, para 68) items from the documents.

For each item:
- title (max 80 chars)
- description (2-4 sentences)
- esrs_reference (e.g. "ESRS E1-2")
- mdr_type: "MDR-P" or "MDR-A"
- kanban_column: policy_defined | action_planned | action_implemented | \
action_progress | action_blocked | outcome_verified
- priority: critical | high | medium | low

Respond ONLY with a valid JSON array. No markdown."""


async def policy_gap_agent(state: GraphState) -> GraphState:
    ingested = state.get("ingested_docs", [])
    relevant = [
        d for d in ingested
        if d["category"] in ("policy", "legal", "sustainability")
    ] or ingested

    excerpts = "\n\n---\n\n".join(
        f"FILE: {d['filename']}\n{d['extracted_text'][:8000]}" for d in relevant
    )
    raw = call_claude_tool(
        POLICY_SYSTEM,
        f"Company: {state.get('company_name', '')}\n\nDocuments:\n{excerpts}",
        tier="strong",
    )

    try:
        checked = output_guardrail(raw, expected_type="json_array")
        items: list[dict] = json.loads(checked)
    except (GuardrailError, json.JSONDecodeError):
        items = []

    if items:
        write_policy_tool(state.get("company_id", 1), items)

    return {**state, "policy_data": items, "current_step": "policy_done"}
