from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode

from .base import GraphState
from .environment_agent import environment_agent
from .social_agent import social_agent
from .governance_agent import governance_agent
from .guardrails import input_guardrail_agent, output_guardrail_agent, llm_judge_agent
from .tools import web_search_tool


tool_node = ToolNode(tools=[web_search_tool])


def route_from_input_guardrail(state: GraphState) -> str:
    if state.get("input_validated") is True:
        return "environment"
    else:
        return END


def route_from_agent(state: GraphState) -> str:
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return "continue"


def route_from_tool(state: GraphState) -> str:
    step = state.get("current_step")
    return step


def build_esrs_graph():
    workflow = StateGraph(GraphState)

    workflow.add_node("input_guardrail", input_guardrail_agent)
    workflow.add_node("environment", environment_agent)
    workflow.add_node("social", social_agent)
    workflow.add_node("governance", governance_agent)
    workflow.add_node("tools", tool_node)
    workflow.add_node("output_guardrail", output_guardrail_agent)

    workflow.add_edge(START, "input_guardrail")
    workflow.add_conditional_edges(
        "input_guardrail",
        route_from_input_guardrail,
        {"environment": "environment", END: END},
    )
    workflow.add_conditional_edges(
        "environment",
        route_from_agent,
        {"tools": "tools", "continue": "social"},
    )
    workflow.add_conditional_edges(
        "social",
        route_from_agent,
        {"tools": "tools", "continue": "governance"},
    )
    workflow.add_conditional_edges(
        "governance",
        route_from_agent,
        {"tools": "tools", "continue": END},  # "output_guardrail"
    )
    workflow.add_conditional_edges(
        "tools",
        route_from_tool,
        {
            "environment": "environment",
            "social": "social",
            "governance": "governance",
        },
    )
    # workflow.add_edge("output_guardrail", END)

    return workflow.compile()


esrs_graph = build_esrs_graph()

esrs_graph.get_graph().draw_mermaid_png(output_file_path="esrs_graph.png")
print("ESRS Graph Visualization Saved As `esrs_graph.png`")
