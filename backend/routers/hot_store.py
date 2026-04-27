import json
import math
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from helpers import (
    chat,
    detect_file_type,
    extract_text,
    upload_file,
    download_file,
    delete_file,
)
from models.company import Company
from models.database import get_session
from models.hot_store import Category, FileType, HotStore, Status
from schemas.hot_store import HotReportRequest
from helpers.auth import get_authenticated_company

CHUNK_SIZE = 1500
IMAGE_TYPES = {FileType.OTHER}

router = APIRouter(
    prefix="/api/v1/hot-store",
    tags=["hot-store"],
    dependencies=[Depends(get_authenticated_company)],
)

MAX_FILE_SIZE = 250 * 1024 * 1024  # 250 MB


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    category: Category = Form(Category.OTHER),
    session: Session = Depends(get_session),
    company: Company = Depends(get_authenticated_company),
):
    original = file.filename or "untitled"
    ft = detect_file_type(original)

    if ft == FileType.OTHER:
        raise HTTPException(
            400,
            "Unsupported file type. Accepted: PDF, DOCX, XLSX, CSV, TXT, JPG, PNG",
        )

    contents = await file.read()

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(400, "File size exceeds 250 MB limit")

    path = upload_file(contents, str(company.company_id), original)
    if not path:
        raise HTTPException(400, "Failed to upload file")

    chunks_json = "[]"
    if ft not in IMAGE_TYPES:
        try:
            text = extract_text(contents, ft)
            chunk_list = [
                {"text": text[i : i + CHUNK_SIZE], "index": idx}
                for idx, i in enumerate(range(0, len(text), CHUNK_SIZE))
                if text[i : i + CHUNK_SIZE].strip()
            ]
            chunks_json = json.dumps(chunk_list)
        except Exception:
            chunks_json = "[]"

    record = HotStore(
        company_id=company.company_id,
        file_name=os.path.basename(path),
        original_filename=original,
        file_type=ft,
        file_path=path,
        file_size=len(contents),
        category=category,
        chunks=chunks_json,
        status=Status.READY,
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


@router.get("/documents")
def list_documents(
    company_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    file_type: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    is_hot_report: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
    session: Session = Depends(get_session),
):
    stmt = select(HotStore).where(HotStore.deleted == False)  # noqa: E712

    if company_id:
        stmt = stmt.where(HotStore.company_id == company_id)
    if category:
        cats = [c.strip() for c in category.split(",")]
        stmt = stmt.where(HotStore.category.in_(cats))
    if file_type:
        types = [t.strip() for t in file_type.split(",")]
        stmt = stmt.where(HotStore.file_type.in_(types))
    if date_from:
        try:
            stmt = stmt.where(HotStore.date >= datetime.fromisoformat(date_from))
        except ValueError:
            raise HTTPException(400, "date_from must be a valid ISO date (YYYY-MM-DD)")
    if date_to:
        try:
            stmt = stmt.where(HotStore.date <= datetime.fromisoformat(date_to))
        except ValueError:
            raise HTTPException(400, "date_to must be a valid ISO date (YYYY-MM-DD)")
    if is_hot_report is not None:
        stmt = stmt.where(HotStore.is_hot_report == is_hot_report)

    stmt = stmt.order_by(HotStore.date.desc())

    total_stmt = select(HotStore.hot_store_id).where(HotStore.deleted == False)  # noqa: E712
    if company_id:
        total_stmt = total_stmt.where(HotStore.company_id == company_id)
    total = len(session.execute(total_stmt).scalars().all())

    offset = (page - 1) * limit
    stmt = stmt.offset(offset).limit(limit)
    docs = session.execute(stmt).scalars().all()

    return {
        "documents": docs,
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": math.ceil(total / limit) if total else 0,
    }


@router.delete("/documents/{hot_store_id}")
def delete_document(hot_store_id: int, session: Session = Depends(get_session)):
    doc = session.get(HotStore, hot_store_id)
    if not doc or doc.deleted:
        raise HTTPException(404, "Document not found")

    doc.deleted = True
    session.add(doc)
    session.commit()

    try:
        delete_file(doc.file_path)
    except Exception:
        pass

    return {"deleted": True, "hot_store_id": hot_store_id}


@router.get("/documents/{hot_store_id}/preview")
def preview_document(hot_store_id: int, session: Session = Depends(get_session)):
    doc = session.get(HotStore, hot_store_id)
    if not doc or doc.deleted:
        raise HTTPException(404, "Document not found")

    base = {
        "file_type": doc.file_type.value,
        "url": doc.file_path,
        "filename": doc.original_filename,
        "detailed_description": doc.detailed_description,
    }

    if doc.file_type == FileType.PDF:
        return {**base, "type": "pdf"}
    if doc.file_type in (FileType.CSV, FileType.TXT):
        data = download_file(doc.file_path)
        text = extract_text(data, doc.file_type)
        return {**base, "type": "text", "data": text}
    if doc.file_type in (FileType.DOCX, FileType.XLSX):
        data = download_file(doc.file_path)
        text = extract_text(data, doc.file_type)
        return {**base, "type": "document", "data": text}
    if doc.is_hot_report or (doc.file_name and doc.file_name.endswith(".html")):
        data = download_file(doc.file_path)
        html = data.decode("utf-8", errors="replace")
        return {**base, "type": "html", "data": html}

    return {**base, "type": "unsupported"}


HOT_REPORT_SYSTEM_PROMPT = """\
You are an expert ESG reporting consultant and data analyst. You are given the following documents uploaded by a company. Your task is to generate a FULLY FORMATTED, PROFESSIONAL ESG report in clean plain HTML (with graphs and charts) and XML according to ESRS official standard.

The report MUST include:
- A cover page section with title, company name, date, and an executive summary
- A methodology section
- A findings section with inline Chart.js bar/pie charts (use CDN), formatted tables with colored status indicators
- A conclusions and recommendations section
- All output must adhere strictly to CSRD/EFRAG ESRS standards
- Use a professional color palette: navy, white, teal accents
- Include any relevant ESRS disclosure references (e.g., ESRS E1-6, ESRS S1-1)

Documents provided: {document_list}
User instruction: {user_prompt}

Respond ONLY with valid, self-contained HTML. No markdown, no explanation.
Also add a watermark of my logo 'GREVIA' on all pages.
"""


@router.post("/hot-reports")
def generate_hot_report(
    body: HotReportRequest,
    session: Session = Depends(get_session),
    company: Company = Depends(get_authenticated_company),
):
    doc_texts: list[str] = []
    doc_names: list[str] = []
    for sid in body.hot_store_ids:
        doc = session.get(HotStore, sid)
        if not doc or doc.deleted:
            continue
        if doc.chunks:
            try:
                import json as _json

                chunk_list = _json.loads(doc.chunks)
                text = " ".join(c["text"] for c in chunk_list if c.get("text"))
            except Exception:
                text = doc.chunks
        else:
            raw = download_file(doc.file_path)
            text = extract_text(raw, doc.file_type)
        if text:
            doc_texts.append(f"--- {doc.original_filename} ---\n{text}")
            doc_names.append(doc.original_filename)

    if not doc_texts:
        raise HTTPException(400, "No readable documents found for the given IDs")

    total_chars = sum(len(t) for t in doc_texts)
    if total_chars > 5000:
        raise HTTPException(
            400,
            f"The content of all selected documents are too long ({total_chars:,} characters). \n"
            "Please select fewer or shorter documents (limit: 5,000 characters).",
        )

    system_prompt = HOT_REPORT_SYSTEM_PROMPT.format(
        document_list=", ".join(doc_names),
        user_prompt=body.prompt,
    )

    try:
        html_content = chat(
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Here are the source documents:\n\n"
                        + "\n\n".join(doc_texts)
                        + f"\n\nUser instruction: {body.prompt}"
                    ),
                }
            ],
            max_tokens=32000,
        )
    except Exception as exc:
        raise HTTPException(502, f"AI service error: {exc}")

    if not isinstance(html_content, str):
        raise HTTPException(502, "AI returned unexpected response type")

    report_filename = f"hot_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.html"
    path = upload_file(
        html_content.encode("utf-8"), str(company.company_id), report_filename
    )

    record = HotStore(
        company_id=company.company_id,
        file_name=os.path.basename(path),
        original_filename=report_filename,
        file_type=FileType.OTHER,
        category=Category.REPORT,
        file_path=path,
        file_size=len(html_content.encode("utf-8")),
        is_hot_report=True,
        report_prompts={"prompt": body.prompt},
        status=Status.READY,
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record
