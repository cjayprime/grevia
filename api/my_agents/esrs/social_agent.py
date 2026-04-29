from pprint import pprint

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, AIMessage, HumanMessage
from trustcall import create_extractor

from schemas.materiality import SocialAssessmentBreakdown, AssessmentStatus
from models.materiality_assessment_breakdown import MaterialityAssessmentBreakdown

from .base import (
    breakdown_field_descriptions,
    get_materiality_assessment,
    GraphState,
    MODEL,
)
from .tools import web_search_tool

SYSTEM = f"""\
You are a senior ESRS double-materiality assessor specialising in Social topics.

Your task is to evaluate the company's double materiality for EVERY Social disclosure requirement across 
ESRS S1 (Own workforce), S2 (Workers in the value chain), S3 (Affected communities), and 
S4 (Consumers and end-users).

Coverage requirements (YOU MUST produce at least 1 assessment item per Disclosure Requirement (DR) below, 
even if there is no relevant information in the documents. If there is no relevant information, leave the 
description field blank but still produce an assessment item and provide recommendations based on the DR requirements):
- S1-1 through S1-17 (Own workforce — 17 DRs)
- S2-1 through S2-5 (Workers in the value chain — 5 DRs)
- S3-1 through S3-5 (Affected communities — 5 DRs)
- S4-1 through S4-5 (Consumers and end-users — 5 DRs)

Company Documents:
{{document_chunks}}

Field reference:
{breakdown_field_descriptions(SocialAssessmentBreakdown)}

Scoring rules:
- financial_materiality_score and impact_materiality_score are 0.00-99.99.
- Score HIGH (≥70) only when there is clear, documented evidence of systemic social risks, human 
rights impacts, or sector-level exposure.
- Score MEDIUM (40-69) when exposure is plausible but evidence is limited or generic.
- Score LOW (<40) when the topic has negligible relevance for this company's business model.

Evidence rules:
- DO NOT return the same disclosure requirement (S*) multiple times. Instead, if there are multiple 
pieces of evidence for a single DR, synthesise them into one comprehensive assessment item per DR.
- documents: If you DON'T find the relevant documents above in this prompt then leave the description 
field blank but still produce the assessment item and provide recommendations based on the DR requirements, 
referencing the specific ESRS DR. If you do find relevant information in the documents, quote it in the 
description field and leave recommendations blank.
- tools: you have access to a web search tool. Use it to find relevant information to perform the assessment 
to generate the whole report (the metric_id, xml_id, and datapoints fields MUST be filled with information 
from the official standards).
- description: summarise only what you can find in the provided documents. Leave blank if no evidence; fill 
recommendations instead.
- metric_target: only use figures present in the documents (e.g., percentage of employees, turnover rates, 
gender pay gap %); set 0 if none found.
- metric_id, xml_id, datapoints: use EFRAG official IDs only; leave blank if unknown.
- Do NOT fabricate data.
- Cover at minimum: S1-1 through S1-17, S2-1 through S2-5, S3-1 through S3-5, S4-1 through S4-5.
- topic must be "Social".
- format: note that the first 2 characters of a disclosure requirement must be the same with the first 2 characters of a subtopic
- sub_topic must match the DR prefix (e.g. "S1" for S1-5, "S3" for S3-2).
- financial_materiality_score and impact_materiality_score are 0.00-99.99 (note the 2 decimal places for proper scoring).
- description: quote evidence from the documents. If none exists, leave empty.
- recommendations: required when description is blank, otherwise leave empty; reference the specific ESRS DR.
- Do NOT fabricate metric_target values; only use figures found in the documents.
- speech: Rather than say "The company" speak directly to the user as if you are the assessor, e.g. "Based 
on your 2023 Sustainability Report (p. 12) which states '...'(quote evidence), we assess that your impact 
on..." it's important to refer to them, so use "your" and "we", not "the company".
"""


def social_agent(state: GraphState) -> GraphState:
    """
    Social ESRS Agent: researches and records social double-materiality assessments, based on the context provided
    """

    pprint("\n\n\n===social_agent")
    pprint(state.get("current_step", ""))
    pprint("===============\n\n\n")

    social = ChatOpenAI(model=MODEL, temperature=0.1, logprobs=True)
    document_chunks = state.get("document_chunks", "")
    messages = [SystemMessage(SYSTEM.format(document_chunks=document_chunks))] + state[
        "s_messages"
    ]

    steps = state.get("steps", {})
    is_from_tool_node = steps.get("social") is True

    response = None
    if not is_from_tool_node:
        social_tools = social.bind_tools([web_search_tool])
        response = social_tools.invoke(messages)
        if not hasattr(response, "tool_calls") or not response.tool_calls:
            is_from_tool_node = True

    if is_from_tool_node:
        trustcall = create_extractor(
            llm=social,
            tools=[SocialAssessmentBreakdown],
            enable_inserts=True,
        )
        extract_messages = messages + [
            HumanMessage(
                content="Please extract the Social Assessment Breakdowns now. You must return the appropriate tool call for the extraction."
            )
        ]
        result = trustcall.invoke(extract_messages)
        if not result.get("responses"):
            raise ValueError(
                "No social materiality assessment breakdowns found in the response."
            )
        response = result["responses"][0]

    if is_from_tool_node:
        (materiality_assessment, session) = get_materiality_assessment(
            state["materiality_assessment_id"]
        )
        materiality_assessment.status = AssessmentStatus.PROCESSING

        if "all" not in response.model_dump() or not response.model_dump().get("all"):
            raise ValueError(
                "No social materiality assessment breakdowns found in the response."
            )

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
            new_materiality_assessment_breakdowns.append(
                materiality_assessment_breakdown
            )

        try:
            session.add(materiality_assessment)
            session.add_all(new_materiality_assessment_breakdowns)
            session.commit()
        except Exception as e:
            session.rollback()
            raise e

    return {
        **state,
        "s_messages": [
            AIMessage(content="Succesfully completed for the environment report.")
            if is_from_tool_node
            else response
        ],
        "steps": {"social": True},
    }
