from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from helpers import download_file, extract_text, chat
from helpers.auth import get_authenticated_company
from models.company import Company
from models.database import get_session
from models.hot_store import HotStore
from models.policy_item import (
    PolicyItem,
    MdrType,
    KanbanColumn,
    Priority,
    CheckFrequency,
)
from models.policy_action import PolicyAction, ActionStatus
from schemas.policy import (
    ExtractPoliciesRequest,
    CreatePolicyRequest,
    UpdatePolicyRequest,
    MovePolicyRequest,
    CreateActionRequest,
    ExtractionResult,
)


router = APIRouter(
    prefix="/api/v1/policy",
    tags=["policy"],
    dependencies=[Depends(get_authenticated_company)],
)

POLICY_SYSTEM_PROMPT = """\
You are an ESRS compliance expert. Analyze the following documents and extract \
ALL MDR-P (Policies, para 65) and MDR-A (Actions & Targets, para 68) items.

For each item:
- title: a concise title (max 80 chars)
- description: a detailed description of the policy or action (2-4 sentences)
- esrs_reference: the ESRS disclosure this maps to (e.g. "ESRS E1-2", "ESRS S1-1", "ESRS G1-1")
- mdr_type: "MDR-P" if it's a policy statement, "MDR-A" if it's an action or target
- kanban_column: the current implementation stage:
    "policy_defined" if only the policy exists
    "action_planned" if an action plan is described
    "action_implemented" if the action has started
    "action_progress" if the action is actively in progress
    "action_blocked" if the action is blocked or stalled
    "outcome_verified" if outcomes have been measured and verified
- priority: "critical" if legally required under CSRD, "high" if materially significant, \
"medium" if recommended best practice, "low" if voluntary/aspirational

Company: {company_name}
Documents: {document_excerpts}

Respond ONLY with a valid JSON array. No markdown. No explanation. Schema:
[{{ "title": "...", "description": "...", "esrs_reference": "ESRS E1-2",
   "mdr_type": "MDR-P", "kanban_column": "policy_defined", "priority": "critical" }}]
"""


@router.post("/extract")
def extract_policies(
    body: ExtractPoliciesRequest,
    session: Session = Depends(get_session),
    company: Company = Depends(get_authenticated_company),
):
    doc_texts: list[str] = []
    for did in body.hot_store_ids:
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

    company_name = body.company_name or "(not provided)"
    system_prompt = POLICY_SYSTEM_PROMPT.format(
        document_excerpts="\n\n".join(doc_texts),
        company_name=company_name,
    )

    try:
        result: ExtractionResult = chat(
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": "Extract all MDR-P and MDR-A items from these documents now.",
                }
            ],
            tier="strong",
            response_schema=ExtractionResult,
        )
    except Exception as exc:
        raise HTTPException(502, f"AI service error: {exc}")

    created: list[PolicyItem] = []
    for item in result.items:
        record = PolicyItem(
            company_id=company.company_id,
            title=item.title,
            description=item.description,
            esrs_reference=item.esrs_reference,
            mdr_type=MdrType(item.mdr_type),
            kanban_column=KanbanColumn(item.kanban_column),
            priority=Priority(item.priority),
        )
        session.add(record)
        created.append(record)

    session.commit()
    for rec in created:
        session.refresh(rec)
    return created


@router.get("")
def list_policies(
    session: Session = Depends(get_session),
    company: Company = Depends(get_authenticated_company),
):
    stmt = (
        select(PolicyItem)
        .where(PolicyItem.company_id == company.company_id)
        .order_by(PolicyItem.priority.desc(), PolicyItem.date.desc())  # type: ignore[union-attr]
    )
    items = session.execute(stmt).scalars().all()

    columns: dict[str, list] = {
        "policy_defined": [],
        "action_planned": [],
        "action_implemented": [],
        "action_progress": [],
        "action_blocked": [],
        "outcome_verified": [],
    }
    for item in items:
        col = item.kanban_column.value
        if col in columns:
            columns[col].append(item)
    return columns


@router.post("")
def create_policy(body: CreatePolicyRequest, session: Session = Depends(get_session)):
    item = PolicyItem(
        company_id=body.company_id,
        title=body.title,
        description=body.description,
        esrs_reference=body.esrs_reference,
        mdr_type=MdrType(body.mdr_type),
        kanban_column=KanbanColumn(body.kanban_column),
        priority=Priority(body.priority),
        assignee=body.assignee,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.patch("/{policy_id}/move")
def move_policy(
    policy_id: int, body: MovePolicyRequest, session: Session = Depends(get_session)
):
    item = session.get(PolicyItem, policy_id)
    if not item:
        raise HTTPException(404, "Policy item not found")
    item.kanban_column = KanbanColumn(body.column)
    item.updated_at = datetime.utcnow()
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.put("/{policy_id}")
def update_policy(
    policy_id: int, body: UpdatePolicyRequest, session: Session = Depends(get_session)
):
    item = session.get(PolicyItem, policy_id)
    if not item:
        raise HTTPException(404, "Policy item not found")

    data = body.model_dump(exclude_unset=True)
    for field, value in data.items():
        if field == "mdr_type" and value is not None:
            value = MdrType(value)
        elif field == "kanban_column" and value is not None:
            value = KanbanColumn(value)
        elif field == "priority" and value is not None:
            value = Priority(value)
        elif field == "check_frequency":
            value = CheckFrequency(value) if value else None
        setattr(item, field, value)

    item.updated_at = datetime.utcnow()
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.delete("/{policy_id}")
def delete_policy(policy_id: int, session: Session = Depends(get_session)):
    item = session.get(PolicyItem, policy_id)
    if not item:
        raise HTTPException(404, "Policy item not found")
    session.delete(item)
    session.commit()
    return {"deleted": policy_id}


@router.get("/{policy_id}/actions")
def list_actions(policy_id: int, session: Session = Depends(get_session)):
    stmt = select(PolicyAction).where(PolicyAction.policy_item_id == policy_id)
    return session.execute(stmt).scalars().all()


@router.post("/{policy_id}/actions")
def create_action(
    policy_id: int, body: CreateActionRequest, session: Session = Depends(get_session)
):
    item = session.get(PolicyItem, policy_id)
    if not item:
        raise HTTPException(404, "Policy item not found")

    action = PolicyAction(
        policy_item_id=policy_id,
        action_title=body.action_title,
        action_description=body.action_description,
        owner=body.owner,
        outcome_metric=body.outcome_metric,
        outcome_value=body.outcome_value,
        status=ActionStatus(body.status),
    )
    session.add(action)
    session.commit()
    session.refresh(action)
    return action
