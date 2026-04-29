from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode

from .base import GraphState
from .environment_agent import environment_agent
from .social_agent import social_agent
from .governance_agent import governance_agent
from .guardrails import input_guardrail_agent, output_guardrail_agent
from .tools import web_search_tool


e_tool_node = ToolNode(messages_key="e_messages", tools=[web_search_tool])
s_tool_node = ToolNode(messages_key="s_messages", tools=[web_search_tool])
g_tool_node = ToolNode(messages_key="g_messages", tools=[web_search_tool])


def _fan_out_node(state: GraphState) -> GraphState:
    return state


def route_from_fan_out(state: GraphState) -> list:
    return ["environment", "social", "governance"]


def route_from_input_guardrail(state: GraphState) -> str:
    if state.get("input_validated") is True:
        return "fan_out"
    else:
        return END


def route_from_agent(which: str):
    def route(state: GraphState) -> str:
        last_message = state[which + "_messages"][-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "tools"
        return "continue"

    return route


def build_esrs_graph():
    workflow = StateGraph(GraphState)

    workflow.add_node("input_guardrail", input_guardrail_agent)
    workflow.add_node("fan_out", _fan_out_node)
    workflow.add_node("environment", environment_agent)
    workflow.add_node("social", social_agent)
    workflow.add_node("governance", governance_agent)
    workflow.add_node("e_tools", e_tool_node)
    workflow.add_node("s_tools", s_tool_node)
    workflow.add_node("g_tools", g_tool_node)
    workflow.add_node("output_guardrail", output_guardrail_agent)

    workflow.add_edge(START, "input_guardrail")
    workflow.add_conditional_edges(
        "input_guardrail",
        route_from_input_guardrail,
        {"fan_out": "fan_out", END: END},
    )
    workflow.add_conditional_edges(
        "fan_out",
        route_from_fan_out,
        {
            "environment": "environment",
            "social": "social",
            "governance": "governance",
        },
    )
    workflow.add_conditional_edges(
        "environment",
        route_from_agent("e"),
        {"tools": "e_tools", "continue": "output_guardrail"},
    )
    workflow.add_conditional_edges(
        "social",
        route_from_agent("s"),
        {"tools": "s_tools", "continue": "output_guardrail"},
    )
    workflow.add_conditional_edges(
        "governance",
        route_from_agent("g"),
        {"tools": "g_tools", "continue": "output_guardrail"},
    )
    workflow.add_edge("e_tools", "environment")
    workflow.add_edge("s_tools", "social")
    workflow.add_edge("g_tools", "governance")
    workflow.add_edge("output_guardrail", END)

    return workflow.compile()


esrs_graph = build_esrs_graph()

esrs_graph.get_graph().draw_mermaid_png(output_file_path="esrs_graph.png")
print("ESRS Graph Visualization Saved As `esrs_graph.png`")
