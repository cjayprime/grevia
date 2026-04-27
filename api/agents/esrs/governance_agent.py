from pprint import pprint

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, AIMessage
from trustcall import create_extractor

from schemas.materiality import GovernanceAssessmentBreakdown, AssessmentStatus
from models.materiality_assessment_breakdown import MaterialityAssessmentBreakdown
from .base import (
    breakdown_field_descriptions,
    get_materiality_assessment,
    GraphState,
    MODEL,
)

SYSTEM = f"""\
You are a senior ESRS double-materiality assessor specialising in Governance topics.

Your task is to evaluate the company's double materiality for EVERY Governance disclosure requirement across ESRS G1 (Business Conduct).

Coverage requirements (YOU MUST produce at least 1 assessment item per Disclosure Requirement (DR) below, even if there is no relevant information in the documents. If there is no relevant information, leave the description field blank but still produce an assessment item and provide recommendations based on the DR requirements):
- G1-1 through G1-6 (Business Conduct — 6 DRs)

Company Documents:
{{document_chunks}}

Field reference:
{breakdown_field_descriptions(GovernanceAssessmentBreakdown)}

Scoring rules:
- financial_materiality_score and impact_materiality_score are 0.00-99.99.
- Score HIGH (≥70) only when there is clear, documented evidence of systemic governance risks, anti-corruption failures, or sector-level exposure.
- Score MEDIUM (40-69) when exposure is plausible but evidence is limited or generic.
- Score LOW (<40) when the topic has negligible relevance for this company's business model.

Evidence rules:
- DO NOT return the same disclosure requirement (G*) multiple times. Instead, if there are multiple pieces of evidence for a single DR, synthesise them into one comprehensive assessment item per DR.
- documents: If you DON'T find the relevant documents above in this prompt then leave the description field blank but still produce the assessment item and provide recommendations based on the DR requirements, referencing the specific ESRS DR. If you do find relevant information in the documents, quote it in the description field and leave recommendations blank.
- tools: you have access to a web search tool. Use it to find relevant information to perform the assessment to generate the whole report (the metric_id, xml_id, and datapoints fields MUST be filled with information from the official standards).
- description: summarise only what you can find in the provided documents. Leave blank if no evidence; fill recommendations instead.
- metric_target: only use figures present in the documents (e.g., % of employees trained on anti-corruption, number of confirmed incidents); set 0 if none found.
- metric_id, xml_id, datapoints: use EFRAG official IDs only; leave blank if unknown.
- Do NOT fabricate data.
- Cover at minimum: G1-1 through G1-6. You MUST produce all of them: G1-1, G1-2, G1-3, G1-4, G1-5 and G1-6
- topic must be "Governance".
- sub_topic must match the DR prefix (e.g. "G1").
- financial_materiality_score and impact_materiality_score are 0.00-99.99.
- description: quote evidence from the documents. If none exists, leave empty.
- recommendations: required when description is blank, otherwise leave empty; reference the specific ESRS G1-X DR.
- Do NOT fabricate metric_target values; only use figures found in the documents.
- speech: Rather than say "The company" speak directly to the user as if you are the assessor, e.g. "Based on your 2023 Code of Conduct (p. 8) which states '...'(quote evidence), we assess that your impact on..." it's important to refer to them, so use "your" and "we", not "the company".
"""


def governance_agent(state: GraphState) -> GraphState:
    """
    Governance ESRS Agent: researches and records governance double-materiality assessments, based on the context provided
    """

    pprint("\n\n\n===governance_agent")
    pprint(state.get("current_step", ""))
    pprint("===============\n\n\n")

    governance = ChatOpenAI(model=MODEL, temperature=0.1, logprobs=True)
    document_chunks = state.get("document_chunks", "")
    messages = [SystemMessage(SYSTEM.format(document_chunks=document_chunks))] + state[
        "messages"
    ]
    trustcall = create_extractor(
        llm=governance,
        tools=[GovernanceAssessmentBreakdown],
        enable_inserts=True,
    )
    result = trustcall.invoke(messages)
    response = result["responses"][0]

    (materiality_assessment, session) = get_materiality_assessment(
        state["materiality_assessment_id"]
    )
    materiality_assessment.status = AssessmentStatus.READY

    if "all" not in response.model_dump() or not response.model_dump().get("all"):
        raise ValueError("No governance materiality assessment breakdowns found in the response.")

    new_materiality_assessment_breakdowns = []
    for mAB in response.model_dump().get("all", []):
        materiality_assessment_breakdown = MaterialityAssessmentBreakdown(
            materiality_assessment_id=materiality_assessment.materiality_assessment_id,
            topic=mAB["topic"],
            sub_topic=mAB["sub_topic"].value,
            disclosure_requirement=mAB["disclosure_requirement"].value,
            description=mAB["description"],
            policies=mAB["policies"],
            processes=mAB["processes"],
            strategies=mAB["strategies"],
            impact_risk_opportunities=mAB["impact_risk_opportunities"],
            metric_target=mAB["metric_target"],
            metric_description=mAB["metric_description"],
            metric_unit=mAB["metric_unit"],
            metric_id=mAB["metric_id"],
            xml_id=mAB["xml_id"],
            datapoints=mAB["datapoints"],
            financial_materiality_score=mAB["financial_materiality_score"],
            impact_materiality_score=mAB["impact_materiality_score"],
            recommendations=mAB["recommendations"],
            date=mAB["date"].strftime("%Y-%m-%d %H:%M:%S"),
        )
        new_materiality_assessment_breakdowns.append(materiality_assessment_breakdown)

    try:
        session.add(materiality_assessment)
        session.add_all(new_materiality_assessment_breakdowns)
        session.commit()
    except Exception as e:
        session.rollback()
        raise e

    return {
        **state,
        "is_fan_out": False,
        "messages": [
            AIMessage(content="Succesfully completed for the governance report.")
        ],
        "current_step": "governance",
    }
