import json
import os
from typing import Any

from sqlalchemy.orm import Session
# from serpapi import GoogleSearch

from helpers import chat, extract_text, download_file
from models.database import engine
from models.hot_store import HotStore, Category
from models.emission_record import EmissionRecord, EmissionConfidence, EmissionStatus
from models.policy_item import PolicyItem, MdrType, KanbanColumn, Priority
from models.materiality_assessment import (
    MaterialityAssessment,
    Standard,
    AssessmentStatus,
)
from models.materiality_assessment_breakdown import (
    MaterialityAssessmentBreakdown,
    Topic as BreakdownTopic,
)
from models.materiality_assessment_file import MaterialityAssessmentFile


# Web search
def web_search_tool(query: str) -> list[dict[str, str]]:
    # api_key = os.getenv("SERPAPI_API_KEY", "")
    # if not api_key:
    #     return []
    # try:
    #     results = GoogleSearch({"q": query, "api_key": api_key, "num": 5}).get_dict()
    #     return [
    #         {
    #             "title": r.get("title", ""),
    #             "snippet": r.get("snippet", ""),
    #             "url": r.get("link", ""),
    #         }
    #         for r in results.get("organic_results", [])[:5]
    #     ]
    # except Exception:
    return []


# Document reading
def read_hot_store_tool(hot_store_ids: list[int]) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    with Session(engine) as session:
        for doc_id in hot_store_ids:
            doc = session.get(HotStore, doc_id)
            if not doc or doc.deleted:
                continue
            try:
                if doc.chunks:
                    chunk_list = json.loads(doc.chunks)
                    text = " ".join(c.get("text", "") for c in chunk_list)[:40_000]
                else:
                    data = download_file(doc.file_path)
                    text = extract_text(data, doc.file_type)[:40_000]
                results.append(
                    {
                        "id": str(doc_id),
                        "filename": doc.original_filename,
                        "file_type": doc.file_type.value,
                        "extracted_text": text,
                        "detailed_description": doc.detailed_description or "",
                    }
                )
            except Exception as exc:
                results.append(
                    {
                        "id": str(doc_id),
                        "filename": doc.original_filename,
                        "file_type": doc.file_type.value,
                        "extracted_text": f"[extraction error: {exc}]",
                        "detailed_description": doc.detailed_description or "",
                    }
                )
    return results


# DB write tools
def write_emissions_tool(company_id: int, records: list[dict[str, Any]]) -> list[int]:
    ids: list[int] = []
    with Session(engine) as session:
        for r in records:
            rec = EmissionRecord(
                company_id=company_id,
                year=r.get("year", 2025),
                period=r.get("period", "Annual"),
                scope=r.get("scope", 1),
                category=r.get("category", ""),
                tco2e=r.get("tco2e"),
                confidence=EmissionConfidence(r.get("confidence", "low")),
                status=EmissionStatus(r.get("status", "gap")),
                esrs_reference=r.get("esrs_reference"),
                gri_reference=r.get("gri_reference"),
                tcfd_reference=r.get("tcfd_reference"),
                issb_reference=r.get("issb_reference"),
                narrative_disclosure=r.get("narrative"),
            )
            session.add(rec)
            session.flush()
            ids.append(rec.emission_record_id)
        session.commit()
    return ids


def write_policy_tool(company_id: int, items: list[dict[str, Any]]) -> list[int]:
    ids: list[int] = []
    with Session(engine) as session:
        for p in items:
            item = PolicyItem(
                company_id=company_id,
                title=p.get("title", "")[:300],
                description=p.get("description"),
                esrs_reference=p.get("esrs_reference"),
                mdr_type=MdrType(p.get("mdr_type", "MDR-P")),
                kanban_column=KanbanColumn(p.get("kanban_column", "policy_defined")),
                priority=Priority(p.get("priority", "medium")),
            )
            session.add(item)
            session.flush()
            ids.append(item.policy_item_id)
        session.commit()
    return ids


def write_materiality_tool(
    company_id: int,
    workspace_id: int,
    industry: str,
    region: str,
    standard: str,
    assessment_data: list[dict[str, Any]] | None = None,
) -> int:
    with Session(engine) as session:
        rec = MaterialityAssessment(
            company_id=company_id,
            workspace_id=workspace_id,
            standard=Standard(standard),
            industry=industry,
            region=region,
            assessment_data=assessment_data,
            status=AssessmentStatus.READY,
        )
        session.add(rec)
        session.commit()
        session.refresh(rec)
        return rec.materiality_assessment_id


def get_document_chunks(hot_store_ids: list[int]) -> list[dict]:
    chunks: list[dict] = []
    with Session(engine) as session:
        for doc_id in hot_store_ids:
            doc = session.get(HotStore, doc_id)
            if not doc or doc.deleted:
                continue
            try:
                if doc.chunks:
                    raw = json.loads(doc.chunks)
                    for c in raw:
                        chunks.append(
                            {
                                "text": c.get("text", ""),
                                "source": f"doc:{doc.original_filename}:chunk{c.get('index', 0)}",
                                "doc_id": doc_id,
                                "filename": doc.original_filename,
                            }
                        )
            except Exception:
                pass
    return chunks


def write_materiality_breakdown_tool(
    materiality_assessment_id: int, breakdowns: list[dict[str, Any]]
) -> list[int]:
    ids: list[int] = []
    with Session(engine) as session:
        for b in breakdowns:
            topic_str = b.get("topic", "Environment")
            try:
                topic_enum = BreakdownTopic(topic_str)
            except ValueError:
                topic_enum = BreakdownTopic.Environment

            rec = MaterialityAssessmentBreakdown(
                materiality_assessment_id=materiality_assessment_id,
                topic=topic_enum.value,
                sub_topic=b.get("sub_topic", "E1"),
                disclosure_requirement=b.get("disclosure_requirement", "E1-1"),
                description=b.get("description", ""),
                policies=b.get("policies", []),
                processes=b.get("processes", []),
                strategies=b.get("strategies", []),
                impact_risk_opportunities=b.get("impact_risk_opportunities", ""),
                metric_target=b.get("metric_target", 0),
                metric_description=b.get("metric_description", ""),
                metric_unit=b.get("metric_unit", ""),
                metric_id=b.get("metric_id"),
                xml_id=b.get("xml_id"),
                datapoints=b.get("datapoints"),
                financial_materiality_score=b.get("financial_materiality_score", 0),
                impact_materiality_score=b.get("impact_materiality_score", 0),
                recommendations=b.get("recommendations", ""),
            )
            session.add(rec)
            session.flush()
            ids.append(rec.materiality_assessment_breakdown_id)
        session.commit()
    return ids


def write_assessment_files_tool(
    materiality_assessment_id: int, hot_store_ids: list[int]
) -> list[int]:
    ids: list[int] = []
    with Session(engine) as session:
        for hs_id in hot_store_ids:
            rec = MaterialityAssessmentFile(
                materiality_assessment_id=materiality_assessment_id,
                hot_store_id=hs_id,
            )
            session.add(rec)
            session.flush()
            ids.append(rec.materiality_assessment_file_id)
        session.commit()
    return ids


def update_doc_category_tool(doc_id: int, category: str) -> None:
    with Session(engine) as session:
        doc = session.get(HotStore, doc_id)
        if doc:
            try:
                doc.category = Category(category)
            except ValueError:
                doc.category = Category.other
            session.add(doc)
            session.commit()


def update_doc_description_tool(doc_id: int, description: str) -> None:
    with Session(engine) as session:
        doc = session.get(HotStore, doc_id)
        if doc:
            doc.detailed_description = description
            session.add(doc)
            session.commit()


# LLM wrapper
def call_claude_tool(
    system_prompt: str, user_content: str, tier: str = "default"
) -> str:
    return chat(
        system=system_prompt,
        messages=[{"role": "user", "content": user_content}],
        tier=tier,
    )
