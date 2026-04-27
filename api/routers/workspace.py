
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from models.database import get_session
from models.workspace import Workspace
from schemas.workspace import CreateWorkspaceRequest, UpdateWorkspaceRequest
from helpers.auth import get_authenticated_company

router = APIRouter(prefix="/api/v1/companies/workspace", tags=["workspace"], dependencies=[Depends(get_authenticated_company)])


@router.get("")
def get_workspace_by_company(
    company_id: int = Query(..., description="Company ID to filter workspaces"),
    is_all: Optional[bool] = Query(
        False, description="Whether to return all workspaces or just the latest"
    ),
    session: Session = Depends(get_session),
):
    workspaces = session.query(Workspace).where(Workspace.company_id == company_id).order_by(Workspace.date.desc())
    if is_all:
        return workspaces.all()
    return workspaces.first()


@router.post("")
def create_workspace(
    body: CreateWorkspaceRequest, session: Session = Depends(get_session)
):
    ws = Workspace(
        company_id=body.company_id,
        industry=body.industry,
        region=body.region,
        employee_count=body.employee_count,
        annual_revenue=body.annual_revenue,
        hq_country=body.hq_country,
        business_description=body.business_description,
        value_chain_description=body.value_chain_description,
        key_stakeholders=body.key_stakeholders,
        sustainability_goals=body.sustainability_goals,
    )
    session.add(ws)
    session.commit()
    session.refresh(ws)
    return ws


@router.put("/{workspace_id}")
def update_workspace(
    workspace_id: int,
    body: UpdateWorkspaceRequest,
    session: Session = Depends(get_session),
):
    ws = session.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(404, "Workspace not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(ws, field, value)
    session.commit()
    session.refresh(ws)
    return ws


@router.get("/{workspace_id}")
def get_workspace(workspace_id: int, session: Session = Depends(get_session)):
    ws = session.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(404, "Workspace not found")
    return ws
