"""
Materiality merge agent.

Receives env_breakdowns / social_breakdowns / gov_breakdowns from the three
specialist agents, writes everything to the DB, and assembles final state.
"""

from agents.state import GraphState
from agents.tools import (
    write_materiality_tool,
    write_materiality_breakdown_tool,
    write_assessment_files_tool,
)


async def materiality_agent(state: GraphState) -> GraphState:
    env = state.get("env_breakdowns") or []
    social = state.get("social_breakdowns") or []
    gov = state.get("gov_breakdowns") or []
    all_breakdowns = env + social + gov

    mat_id = None
    if all_breakdowns and state.get("workspace_id"):
        try:
            mat_id = write_materiality_tool(
                company_id=state.get("company_id", 1),
                workspace_id=state["workspace_id"],
                industry=state.get("industry", ""),
                region=state.get("region", ""),
                standard=state.get("standard", "ESRS"),
            )
        except Exception:
            pass

    if mat_id:
        try:
            write_assessment_files_tool(mat_id, state.get("hot_store_ids", []))
        except Exception:
            pass

        try:
            write_materiality_breakdown_tool(mat_id, all_breakdowns)
        except Exception:
            pass

    materiality_data = {
        "materiality_assessment_id": mat_id,
        "breakdown_count": len(all_breakdowns),
    }

    return {
        **state,
        "materiality_data": materiality_data,
        "materiality_assessment_id": mat_id,
        "current_step": "complete",
    }
