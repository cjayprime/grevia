from pprint import pprint

from langchain_core.messages import AIMessage

from rag.guardrails import (
    input_guardrail,
    output_guardrail,
    llm_judge,
    GuardrailError,
)
from .base import GraphState, build_context


def input_guardrail_agent(state: GraphState) -> GraphState:
    """Validate document chunks before they reach the assessment agents."""
    pprint("\n\n\n===input_guardrail_agent")
    document_chunks = state.get("document_chunks", "")

    if not document_chunks:
        pprint("No document chunks — failing guardrail")
        return {
            **state,
            "input_validated": False,
            "current_step": "validating",
            "errors": state.get("errors", []) + ["No documents provided"],
        }

    try:
        document_chunks = input_guardrail(document_chunks)
    except GuardrailError as exc:
        # raise exc
        return {
            **state,
            "input_validated": False,
            "current_step": "validating",
            "errors": state.get("errors", []) + [f"Validation failed: {exc}"],
        }

    pprint("All chunks passed input guardrail")
    pprint("===============\n\n\n")
    return {
        **state,
        "input_validated": True,
        "current_step": "validating",
        "document_chunks": document_chunks,
    }


def output_guardrail_agent(state: GraphState) -> GraphState:
    """Validate the final agent messages before the graph ends.

    Checks the last message content from each pillar agent against the
    output guardrail (empty responses, refusals). Logs warnings but does
    not block — appends issues to ``errors`` for observability.
    """
    errors = list(state.get("errors", []))

    for msg in state.get("messages", []):
        content = msg.content if hasattr(msg, "content") else str(msg)
        if not content:
            continue
        try:
            output_guardrail(content, expected_type="text")
        except GuardrailError as exc:
            # raise exc
            pprint(f"Output guardrail flagged: {exc}")
            errors.append(
                "Unable to continue the process at this time. Try again with different documents."
            )

    return {
        **state,
        "errors": errors,
    }


def llm_judge_agent(state: GraphState) -> GraphState:
    """Score the assessment quality using an independent LLM-as-judge call.

    Constructs a summary of all agent messages and evaluates them against
    the original document context. Appends a quality warning to messages
    if the score is low or hallucination is detected.
    """
    pprint("\n\n\n===llm_judge_agent")
    context = build_context(state)

    agent_outputs = []
    for msg in state.get("messages", []):
        content = msg.content if hasattr(msg, "content") else str(msg)
        if content:
            agent_outputs.append(content)
    answer = "\n\n".join(agent_outputs[-6:])

    question = (
        "Evaluate the quality of this ESRS double-materiality assessment. "
        "Are the scores well-justified? Are recommendations actionable? "
        "Is the evidence properly cited from the source documents?"
    )

    verdict = llm_judge(question, answer, context)
    pprint(
        f"Judge verdict: score={verdict.score}, grounded={verdict.grounded}, "
        f"hallucination={verdict.hallucination_detected}"
    )
    pprint("===============\n\n\n")

    new_messages = []
    errors = list(state.get("errors", []))

    if verdict.score <= 2 or verdict.hallucination_detected:
        warning = (
            f"Quality check flagged potential issues (score {verdict.score}/5). "
            f"{verdict.rationale}"
        )
        new_messages.append(AIMessage(content=f"⚠️ {warning}"))
        errors.append(f"LLM judge: {warning}")

    return {
        **state,
        "messages": new_messages,
        "errors": errors,
    }
