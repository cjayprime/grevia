

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from agents import assistant_agent
from models.database import get_session
from rag.guardrails import input_guardrail, GuardrailError
from schemas.assistant import ChatRequest, ChatResponse
from helpers.auth import get_authenticated_company

router = APIRouter(prefix="/api/v1/assistant", tags=["assistant"], dependencies=[Depends(get_authenticated_company)])


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest, session: Session = Depends(get_session)):
    try:
        input_guardrail(req.question)
    except GuardrailError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    history = [{"role": m.role, "content": m.content} for m in req.history]
    answer = await assistant_agent(
        question=req.question,
        company_id=req.company_id,
        history=history,
        frameworks=req.frameworks or None,
        hot_store_ids=req.hot_store_ids or None,
        session=session,
    )
    return ChatResponse(answer=answer)
