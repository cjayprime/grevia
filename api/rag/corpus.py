"""Builds the retrieval corpus from the live database for a given company."""

import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from models.database import engine
from models.hot_store import HotStore
from models.emission_record import EmissionRecord
from models.policy_item import PolicyItem
from models.materiality_assessment import MaterialityAssessment
from helpers import extract_text, download_file
from .logger import get_logger, log_phase
from .types import Chunk

_log = get_logger("rag.corpus")


async def build_corpus(company_id: int) -> list[Chunk]:
    chunks: list[Chunk] = []
    with log_phase(_log, "build_corpus") as bag:
        with Session(engine) as session:
            docs = session.execute(
                select(HotStore).where(
                    HotStore.company_id == company_id,
                    HotStore.deleted == False,  # noqa: E712
                )
            ).scalars().all()
            doc_failures = 0
            for doc in docs:
                try:
                    if doc.chunks:
                        stored = json.loads(doc.chunks)
                        for c in stored:
                            text = c.get("text", "")
                            idx = c.get("index", 0)
                            if text.strip():
                                chunks.append(Chunk(
                                    text=text,
                                    source=f"doc:{doc.original_filename}:chunk{idx}",
                                    metadata={"doc_id": doc.hot_store_id, "type": "document"},
                                ))
                    else:
                        data = download_file(doc.file_path)
                        text = extract_text(data, doc.file_type)
                        for i, start in enumerate(range(0, len(text), 1500)):
                            chunks.append(Chunk(
                                text=text[start:start + 1500],
                                source=f"doc:{doc.original_filename}:chunk{i}",
                                metadata={"doc_id": doc.hot_store_id, "type": "document"},
                            ))
                except Exception:
                    doc_failures += 1
                    _log.warning("document_ingest_failed", doc_id=doc.hot_store_id, filename=doc.original_filename)

            records = session.execute(
                select(EmissionRecord).where(EmissionRecord.company_id == company_id)
            ).scalars().all()
            for r in records:
                text = (
                    f"Scope {r.scope} | {r.category} | {r.tco2e} tCO2e | "
                    f"confidence={r.confidence.value} | status={r.status.value} | "
                    f"ESRS={r.esrs_reference} | GRI={r.gri_reference} | "
                    f"narrative={r.narrative_disclosure or ''}"
                )
                chunks.append(Chunk(
                    text=text,
                    source=f"emission:{r.emission_record_id}",
                    metadata={"type": "emission", "scope": r.scope},
                ))

            policies = session.execute(
                select(PolicyItem).where(PolicyItem.company_id == company_id)
            ).scalars().all()
            for p in policies:
                text = (
                    f"{p.mdr_type.value} | {p.title} | {p.esrs_reference or ''} | "
                    f"priority={p.priority.value} | stage={p.kanban_column.value} | "
                    f"{p.description or ''}"
                )
                chunks.append(Chunk(
                    text=text,
                    source=f"policy:{p.policy_item_id}",
                    metadata={"type": "policy"},
                ))

            assessments = session.execute(
                select(MaterialityAssessment)
                .where(MaterialityAssessment.company_id == company_id)
                .order_by(MaterialityAssessment.date.desc())
                .limit(1)
            ).scalars().first()
            if assessments and assessments.assessment_data:
                for topic in assessments.assessment_data:
                    text = (
                        f"Materiality topic: {topic.get('name')} | "
                        f"ESRS={topic.get('esrs_reference')} | "
                        f"financial={topic.get('financial_impact_score')} | "
                        f"impact={topic.get('impact_risk_score')} | "
                        f"confidence={topic.get('confidence')} | "
                        f"{topic.get('rationale', '')}"
                    )
                    chunks.append(Chunk(
                        text=text,
                        source=f"materiality:{topic.get('topic_id')}",
                        metadata={"type": "materiality"},
                    ))

        bag["total_chunks"] = len(chunks)
        bag["documents"] = len(docs)
        bag["doc_failures"] = doc_failures
        bag["emissions"] = len(records)
        bag["policies"] = len(policies)
        bag["has_materiality"] = assessments is not None

    return chunks
