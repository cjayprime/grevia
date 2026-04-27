import asyncio
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from lxml import etree
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from models.database import get_session
from models.workspace import Workspace
from models.company import Company
from models.materiality_assessment import MaterialityAssessment
from models.materiality_assessment_breakdown import MaterialityAssessmentBreakdown
from models.materiality_assessment_file import MaterialityAssessmentFile

from agents.esrs.graph import esrs_graph, GraphState
from agents.tools import get_document_chunks
from schemas.materiality import (
    AssessmentRequest,
    Standard,
    AssessmentStatus,
)
from helpers.auth import get_authenticated_company


STEP_LABELS = {
    "validating": "Validating selected documents",
    "starting": "Initiating comprehensive assessment",
    "environment": "Appraising environmental stewardship",
    "social": "Evaluating social impact and equity",
    "governance": "Reviewing governance and ethical frameworks",
}

router = APIRouter(
    prefix="/api/v1/materiality",
    tags=["materiality"],
    dependencies=[Depends(get_authenticated_company)],
)


@router.post("/assess")
async def assess_materiality(
    body: AssessmentRequest,
    session: Session = Depends(get_session),
    company: Company = Depends(get_authenticated_company),
):
    ws = (
        session.query(Workspace)
        .filter(Workspace.workspace_id == body.workspace_id)
        .filter(Workspace.company_id == company.company_id)
        .first()
    )
    if not ws:
        raise HTTPException(403, "Unauthorized workspace access")

    try:
        standard = Standard(body.standard)
    except ValueError:
        raise HTTPException(400, f"Invalid standard: {body.standard}")

    industry = body.industry or ws.industry or ""
    region = body.region or ws.region or ""
    profile = {
        "industry": industry,
        "region": region,
        "employee_count": ws.employee_count,
        "annual_revenue": ws.annual_revenue,
        "hq_country": ws.hq_country,
        "business_description": ws.business_description,
        "value_chain_description": ws.value_chain_description,
        "key_stakeholders": ws.key_stakeholders,
        "sustainability_goals": ws.sustainability_goals,
    }

    company_id = company.company_id
    # TODO: agents should report the names of partner companies they find in the documents, and I
    # can verify against a known list of partners for the company.
    # company_name = company.name

    materiality_assessment = MaterialityAssessment(
        company_id=company_id,
        workspace_id=body.workspace_id,
        profile=profile,
        standard=standard.value,
        industry=industry,
        region=region,
        status=AssessmentStatus.PROCESSING,
    )
    session.add(materiality_assessment)
    session.commit()
    session.refresh(materiality_assessment)
    materiality_assessment_id = materiality_assessment.materiality_assessment_id
    
    new_materiality_assessment_files = []
    for hs_id in body.hot_store_ids:
        materiality_assessment_file = MaterialityAssessmentFile(
            materiality_assessment_id=materiality_assessment_id,
            hot_store_id=hs_id,
        )
        new_materiality_assessment_files.append(materiality_assessment_file)
    session.add_all(new_materiality_assessment_files)
    session.commit()

    doc_chunks = get_document_chunks(body.hot_store_ids)
    doc_chunks = "\n".join(map(str, doc_chunks))
    if not doc_chunks:
        return "No valid documents found for assessment. Please select another document and try again."

    # progress = asyncio.Queue()
    initial_state: GraphState = {
        "input_validated": False,
        "messages": [],
        "materiality_assessment_id": materiality_assessment_id,
        "hot_store_ids": body.hot_store_ids,
        "document_chunks": doc_chunks,
        "errors": [],
        "current_step": "validating",
        # "progress": progress
    }
    config = {"configurable": {"thread_id": materiality_assessment_id}}

    def _sse(event: str, data: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"

    async def event_stream():
        yield _sse(
            "step",
            {
                "step": "validating",
                "label": STEP_LABELS["validating"],
            },
        )

        try:
            async for chunk in esrs_graph.astream(initial_state, config=config):
                # while not progress.empty():
                #     msg = progress.get_nowait()
                #     yield _sse("substep", {"label": msg})

                for node_name, node_state in chunk.items():
                    # print("\n\n\n===astream")
                    # print(node_name)
                    # print("=================\n\n\n")

                    if node_state.get("input_validated") is False:
                        yield _sse(
                            "error",
                            {
                                "message": f"Unfortunately, the validation of the documents failed. \
                                    Please try again or contact support with code: {str(node_state['errors'])}"
                            },
                        )
                        return

                    step = node_state.get("current_step", node_name)
                    label = STEP_LABELS.get(step, "")
                    if (
                        node_name == "fan_out"
                        or node_name == "input_guardrail"
                        or not label
                    ):
                        continue

                    yield _sse(
                        "step",
                        {
                            "node": node_name,
                            "step": step,
                            "label": label,
                        },
                    )
                    await asyncio.sleep(0)
        except Exception as exc:
            with Session(session.get_bind()) as s:
                rec = s.get(MaterialityAssessment, materiality_assessment_id)
                if rec:
                    rec.status = AssessmentStatus.ERROR
                    s.commit()
            # raise exc  # for testing only
            yield _sse(
                "error",
                {
                    "message": f"An error occurred during the assessment. Please try again or contact support with code: {str(exc)[:15]}"
                },
            )
            return

        yield _sse("success", {"materiality_assessment_id": materiality_assessment_id})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{assessment_id}")
def get_one_assessment(
    assessment_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    topic: Optional[str] = None,
    company: Company = Depends(get_authenticated_company),
    session: Session = Depends(get_session),
):
    ws = (
        session.query(MaterialityAssessment)
        .filter(MaterialityAssessment.company_id == company.company_id)
        .first()
    )
    if not ws:
        raise HTTPException(403, "Unauthorized materiality assessment access")

    record = session.get(MaterialityAssessment, assessment_id)
    if not record:
        raise HTTPException(404, "Assessment not found")

    bd_stmt = select(MaterialityAssessmentBreakdown).where(
        MaterialityAssessmentBreakdown.materiality_assessment_id == assessment_id
    )
    count_stmt = (
        select(func.count())
        .select_from(MaterialityAssessmentBreakdown)
        .where(
            MaterialityAssessmentBreakdown.materiality_assessment_id == assessment_id
        )
    )
    if topic and topic != "all":
        bd_stmt = bd_stmt.where(MaterialityAssessmentBreakdown.topic == topic)
        count_stmt = count_stmt.where(MaterialityAssessmentBreakdown.topic == topic)

    bd_total = session.execute(count_stmt).scalar() or 0
    breakdowns = (
        session.execute(
            bd_stmt.order_by(
                MaterialityAssessmentBreakdown.description.desc(),
                MaterialityAssessmentBreakdown.financial_materiality_score.desc(),
            )
            .offset((page - 1) * limit)
            .limit(limit)
        )
        .scalars()
        .all()
    )

    # All breakdowns (no pagination) for charts — only fetched on page 1 / no topic filter
    all_breakdowns = []
    if page == 1 and not topic:
        all_breakdowns = (
            session.execute(
                select(MaterialityAssessmentBreakdown).where(
                    MaterialityAssessmentBreakdown.materiality_assessment_id
                    == assessment_id
                )
            )
            .scalars()
            .all()
        )

    files = (
        session.execute(
            select(MaterialityAssessmentFile).where(
                MaterialityAssessmentFile.materiality_assessment_id == assessment_id
            )
        )
        .scalars()
        .all()
    )

    def serialize_bd(bd):
        return {
            "materiality_assessment_breakdown_id": bd.materiality_assessment_breakdown_id,
            "topic": bd.topic.value if hasattr(bd.topic, "value") else bd.topic,
            "sub_topic": bd.sub_topic,
            "disclosure_requirement": bd.disclosure_requirement,
            "description": bd.description,
            "policies": bd.policies,
            "processes": bd.processes,
            "strategies": bd.strategies,
            "impact_risk_opportunities": bd.impact_risk_opportunities,
            "metric_target": float(bd.metric_target) if bd.metric_target else 0,
            "metric_description": bd.metric_description,
            "metric_unit": bd.metric_unit,
            "financial_materiality_score": float(bd.financial_materiality_score),
            "impact_materiality_score": float(bd.impact_materiality_score),
            "recommendations": bd.recommendations,
        }

    return {
        "materiality_assessment_id": record.materiality_assessment_id,
        "company_id": record.company_id,
        "workspace_id": record.workspace_id,
        "standard": record.standard.value
        if hasattr(record.standard, "value")
        else record.standard,
        "industry": record.industry,
        "region": record.region,
        "status": record.status.value
        if hasattr(record.status, "value")
        else record.status,
        "date": record.date.isoformat() if record.date else None,
        "profile": record.profile,
        "breakdowns": [serialize_bd(bd) for bd in breakdowns],
        "all_breakdowns": [serialize_bd(bd) for bd in all_breakdowns],
        "bd_total": bd_total,
        "bd_page": page,
        "bd_limit": limit,
        "files": [{"hot_store_id": f.hot_store_id} for f in files],
    }


@router.get("")
def get_all_assessments(
    company_id: int = 1,
    workspace_id: Optional[int] = None,
    company: Company = Depends(get_authenticated_company),
    session: Session = Depends(get_session),
):
    ws = (
        session.query(MaterialityAssessment)
        .filter(MaterialityAssessment.company_id == company.company_id)
        .first()
    )
    if not ws:
        raise HTTPException(403, "Unauthorized materiality assessment access")

    stmt = select(MaterialityAssessment).where(
        MaterialityAssessment.company_id == company_id
    )
    if workspace_id is not None:
        stmt = stmt.where(MaterialityAssessment.workspace_id == workspace_id)
    stmt = stmt.order_by(MaterialityAssessment.date.desc())
    return session.execute(stmt).scalars().all()


@router.post("/{assessment_id}/export")
def export_assessment(assessment_id: int, session: Session = Depends(get_session)):
    record = session.get(MaterialityAssessment, assessment_id)
    if not record:
        raise HTTPException(
            400, "Unable to create report from assessment at this time."
        )

    breakdowns = (
        session.execute(
            select(MaterialityAssessmentBreakdown).where(
                MaterialityAssessmentBreakdown.materiality_assessment_id
                == assessment_id
            )
        )
        .scalars()
        .all()
    )

    nsmap = {
        "xbrli": "http://www.xbrl.org/2003/instance",
        "esrs": "http://www.efrag.org/esrs/2023",
    }
    root = etree.Element("{http://www.xbrl.org/2003/instance}xbrl", nsmap=nsmap)

    context = etree.SubElement(root, "{http://www.xbrl.org/2003/instance}context")
    context.set("id", "ctx-current")
    entity = etree.SubElement(context, "{http://www.xbrl.org/2003/instance}entity")
    ident = etree.SubElement(entity, "{http://www.xbrl.org/2003/instance}identifier")
    ident.set("scheme", "http://grevia.io")
    ident.text = str(record.company_id)
    period = etree.SubElement(context, "{http://www.xbrl.org/2003/instance}period")
    instant = etree.SubElement(period, "{http://www.xbrl.org/2003/instance}instant")
    instant.text = record.date.strftime("%Y-%m-%d")

    for bd in breakdowns:
        item = etree.SubElement(
            root, "{http://www.efrag.org/esrs/2023}DisclosureRequirement"
        )
        item.set("contextRef", "ctx-current")

        for key in (
            "topic",
            "sub_topic",
            "disclosure_requirement",
            "description",
            "recommendations",
        ):
            el = etree.SubElement(item, "{http://www.efrag.org/esrs/2023}" + key)
            val = getattr(bd, key, "")
            el.text = str(val.value if hasattr(val, "value") else val) if val else ""

        for score_key in ("financial_materiality_score", "impact_materiality_score"):
            el = etree.SubElement(item, "{http://www.efrag.org/esrs/2023}" + score_key)
            el.set("unitRef", "score-0-100")
            el.text = str(float(getattr(bd, score_key, 0)))

    xml_bytes = etree.tostring(
        root, pretty_print=True, xml_declaration=True, encoding="UTF-8"
    )
    filename = (
        f"materiality_{record.standard.value}_{record.materiality_assessment_id}.xml"
    )
    return Response(
        content=xml_bytes,
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
