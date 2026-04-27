from .state import GraphState
from .tools import web_search_tool


async def research_agent(state: GraphState) -> GraphState:
    name = state.get("company_name", "")
    industry = state.get("industry", "")
    queries = [
        f"{name} ESG report 2024",
        f"{name} greenhouse gas emissions",
        f"{name} sustainability policy CSRD",
        f"{industry} ESRS materiality topics",
        f"{name} annual report revenue employees",
        "EFRAG ESRS guidance latest 2024",
    ]
    results: dict = {"searches": {}}
    for q in queries:
        results["searches"][q] = web_search_tool(q)

    return {**state, "research_data": results, "current_step": "research_done"}
