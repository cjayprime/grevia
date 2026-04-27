from langgraph.graph import StateGraph, START, END

from .state import GraphState
from .research_agent import research_agent
from .ingestion_agent import document_ingestion_agent
from .emissions_agent import emissions_analysis_agent
from .policy_agent import policy_gap_agent
# from .esrs import environment_agent, social_agent, governance_agent
from .materiality_agent import materiality_agent


async def _merge(state: GraphState) -> GraphState:
    """Fan-in barrier — LangGraph has already merged the three parallel states."""
    return {**state, "current_step": "merging"}


def build_esrs_graph():
    workflow = StateGraph(GraphState)

    # Sequential preparation nodes
    workflow.add_node("research", research_agent)
    workflow.add_node("ingestion", document_ingestion_agent)
    workflow.add_node("emissions", emissions_analysis_agent)
    workflow.add_node("policy_gap", policy_gap_agent)

    # Parallel specialist nodes
    # workflow.add_node("environment", environment_agent)
    # workflow.add_node("social", social_agent)
    # workflow.add_node("governance", governance_agent)

    # Fan-in + final merge
    workflow.add_node("merge", _merge)
    workflow.add_node("materiality", materiality_agent)

    # Sequential chain up to fan-out
    workflow.add_edge(START, "research")
    workflow.add_edge("research", "ingestion")
    workflow.add_edge("ingestion", "emissions")
    workflow.add_edge("emissions", "policy_gap")
    workflow.add_edge("policy_gap", "merge")

    # Final pipeline
    workflow.add_edge("merge", "materiality")
    workflow.add_edge("materiality", END)

    return workflow.compile()


esrs_graph = build_esrs_graph()
