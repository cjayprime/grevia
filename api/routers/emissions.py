import json
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from helpers import download_file, extract_text, chat
from models.database import get_session
from models.hot_store import HotStore
from models.workspace import Workspace
from models.company import Company
from models.emission_record import EmissionRecord, EmissionConfidence, EmissionStatus
from schemas.emissions import (
    AnalyzeEmissionsRequest,
    NarrativeRequest,
    UpdateEmissionRequest,
    AnalysisResult,
    NarrativeResult,
)
from helpers.auth import get_authenticated_company


router = APIRouter(
    prefix="/api/v1/emissions",
    tags=["emissions"],
    dependencies=[Depends(get_authenticated_company)],
)

EMISSIONS_SYSTEM_PROMPT = """\
You are an expert emissions accountant and ESG auditor. Analyze the \
following documents and extract ALL emissions data.

For each emissions source found, produce a structured record with:
- scope (1, 2, or 3)
- category (specific activity category per GHG Protocol)
- tco2e (tonnes CO2 equivalent — estimate if not explicit, mark \
confidence accordingly). Use null if data is completely missing.
- confidence: "high" if directly measured/audited, "medium" if \
estimated from reliable proxies, "low" if rough estimate or spend-based
- status: "ok" if complete data present, "gap" if data is missing or \
incomplete, "outlier" if value seems anomalous
- esrs_reference (map to ESRS E1 sub-disclosures, e.g. "ESRS E1-6")
- gri_reference (map to GRI 305, e.g. "GRI 305-1")
- tcfd_reference (e.g. "Metrics & Targets")
- issb_reference (e.g. "IFRS S2 C6")
- narrative: a brief factual sentence describing the source

Also identify: what emissions data is MISSING that would be required \
for ESRS E1 compliance. Flag those as gap records with tco2e null.

Documents: {document_excerpts}
Company: {company_name}, Industry: {industry}

Respond ONLY with a valid JSON array. No markdown. No explanation.
"""

NARRATIVE_SYSTEM_PROMPT = """\
You are an ESG report writer. For each emissions record below that has \
status "gap" or "outlier", write a professional narrative disclosure \
paragraph that would appear in a CSRD annual report.

For gap records: explain what data is missing, why it matters for \
compliance, and recommend remediation steps.
For outlier records: explain why the value is anomalous, potential \
causes, and what verification is needed.

Records: {records}
Company: {company_name}, Industry: {industry}

Respond ONLY with a valid JSON array matching the schema. \
Each item must include emission_record_id and the generated narrative.
"""


@router.post("/analyze")
def analyze_emissions(
    body: AnalyzeEmissionsRequest,
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

    company_id = company.company_id
    hot_store_ids = body.hot_store_ids

    company_name = ws.business_description or ""
    industry = ws.industry or ""

    doc_texts: list[str] = []
    for did in hot_store_ids:
        doc = session.get(HotStore, did)
        if not doc or doc.deleted:
            continue
        if doc.chunks:
            doc_texts.append(f"--- {doc.original_filename} ---\n{doc.chunks}")
        else:
            data = download_file(doc.file_path)
            text = extract_text(data, doc.file_type)
            if text:
                doc_texts.append(f"--- {doc.original_filename} ---\n{text}")

    if not doc_texts:
        raise HTTPException(400, "No readable documents found")

    system_prompt = EMISSIONS_SYSTEM_PROMPT.format(
        document_excerpts="\n\n".join(doc_texts),
        company_name=company_name or "(not provided)",
        industry=industry or "(not specified)",
    )

    try:
        result: AnalysisResult = chat(
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": "Extract all emissions data from these documents now.",
                }
            ],
            tier="strong",
            response_schema=AnalysisResult,
        )
    except Exception as exc:
        raise HTTPException(502, f"AI service error: {exc}")

    total_co2 = sum(r.tco2e or 0 for r in result.records)
    records: list[EmissionRecord] = []
    for r in result.records:
        pct = round((r.tco2e / total_co2) * 100, 2) if r.tco2e and total_co2 else None
        record = EmissionRecord(
            company_id=company_id,
            scope=r.scope,
            category=r.category,
            tco2e=r.tco2e,
            percentage_of_total=pct,
            confidence=EmissionConfidence(r.confidence),
            status=EmissionStatus(r.status),
            esrs_reference=r.esrs_reference,
            gri_reference=r.gri_reference,
            tcfd_reference=r.tcfd_reference,
            issb_reference=r.issb_reference,
            narrative_disclosure=r.narrative,
        )
        session.add(record)
        records.append(record)

    session.commit()
    for rec in records:
        session.refresh(rec)
    return records


@router.get("")
def list_emissions(
    year: Optional[int] = None,
    scope: Optional[int] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    company: Company = Depends(get_authenticated_company),
    session: Session = Depends(get_session),
):
    base = select(EmissionRecord).where(EmissionRecord.company_id == company.company_id)
    if year is not None:
        base = base.where(EmissionRecord.year == year)
    if scope is not None:
        if scope not in (1, 2, 3):
            raise HTTPException(400, "scope must be 1, 2, or 3")
        base = base.where(EmissionRecord.scope == scope)

    total = session.execute(
        select(func.count()).select_from(base.subquery())
    ).scalar() or 0

    rows = (
        session.execute(
            base.order_by(
                case((EmissionRecord.status == EmissionStatus.GAP, 1), else_=0),
                EmissionRecord.scope,
                EmissionRecord.category,
            )
            .offset((page - 1) * limit)
            .limit(limit)
        )
        .scalars()
        .all()
    )

    return {"records": rows, "total": total, "page": page, "limit": limit}


@router.put("/{emission_id}")
def update_emission(
    emission_id: int,
    body: UpdateEmissionRequest,
    session: Session = Depends(get_session),
):
    record = session.get(EmissionRecord, emission_id)
    if not record:
        raise HTTPException(404, "Emission record not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        if field == "confidence":
            value = EmissionConfidence(value)
        elif field == "status":
            value = EmissionStatus(value)
        setattr(record, field, value)

    session.add(record)
    session.commit()
    session.refresh(record)
    return record


@router.post("/narrative")
def generate_narratives(
    body: NarrativeRequest,
    company: Company = Depends(get_authenticated_company),
    session: Session = Depends(get_session),
):
    company_name = ""
    industry = ""
    if body.workspace_id:
        ws = session.get(Workspace, body.workspace_id)
        if ws:
            company_name = ws.business_description or ""
            industry = ws.industry or ""

    stmt = (
        select(EmissionRecord)
        .where(EmissionRecord.company_id == company.company_id)
        .where(
            EmissionRecord.status.in_(  # type: ignore[union-attr]
                [EmissionStatus.GAP, EmissionStatus.OUTLIER]
            )
        )
    )
    records = session.execute(stmt).scalars().all()
    if not records:
        return {"updated": 0}

    records_data = [
        {
            "emission_record_id": r.emission_record_id,
            "scope": r.scope,
            "category": r.category,
            "tco2e": r.tco2e,
            "status": r.status.value,
            "esrs_reference": r.esrs_reference,
        }
        for r in records
    ]

    system_prompt = NARRATIVE_SYSTEM_PROMPT.format(
        records=json.dumps(records_data),
        company_name=company_name or "(not provided)",
        industry=industry or "(not specified)",
    )

    try:
        result: NarrativeResult = chat(
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": "Generate narrative disclosures for all gap and outlier records.",
                }
            ],
            tier="default",
            response_schema=NarrativeResult,
        )
    except Exception as exc:
        raise HTTPException(502, f"AI service error: {exc}")

    updated = 0
    for n in result.narratives:
        rec = session.get(EmissionRecord, n.emission_record_id)
        if rec:
            rec.narrative_disclosure = n.narrative
            session.add(rec)
            updated += 1

    session.commit()
    return {"updated": updated}


@router.get("/timeline")
def emissions_timeline(
    company: Company = Depends(get_authenticated_company),
    session: Session = Depends(get_session),
):
    stmt = (
        select(EmissionRecord)
        .where(EmissionRecord.company_id == company.company_id)
        .order_by(EmissionRecord.year, EmissionRecord.period)
    )
    records = session.execute(stmt).scalars().all()

    buckets: dict[str, dict[str, float]] = defaultdict(
        lambda: {"scope1": 0, "scope2": 0, "scope3": 0}
    )
    for r in records:
        key = f"{r.period} {r.year}"
        buckets[key][f"scope{r.scope}"] += r.tco2e or 0

    return [
        {
            "period": k,
            "scope1": v["scope1"],
            "scope2": v["scope2"],
            "scope3": v["scope3"],
        }
        for k, v in buckets.items()
    ]
