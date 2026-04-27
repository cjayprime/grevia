

from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

VALID_RAG_MODES = {"balanced", "precise", "broad"}


class MessageSchema(BaseModel):
    role: Literal["user", "assistant"] = Field(
        description="Message author: 'user' for human messages, 'assistant' for AI responses"
    )
    content: str = Field(description="Non-blank text content of the message")

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Message content cannot be blank.")
        return v


class ChatRequest(BaseModel):
    question: str = Field(description="Non-blank user question to answer")
    company_id: int = Field(
        default=1,
        description="ID of the company whose data to retrieve and reason over",
    )
    history: list[MessageSchema] = Field(
        default=[], description="Prior conversation turns, oldest first"
    )
    frameworks: list[str] = Field(
        default=[],
        description="ESG reporting frameworks to emphasise (e.g. ['ESRS', 'GRI 305'])",
    )
    rag_mode: str = Field(
        default="balanced",
        description="RAG retrieval mode — one of: balanced, precise, broad",
    )
    hot_store_ids: list[int] = Field(
        default=[],
        description="Hot-store document IDs to pin as additional context; empty = no pinned docs",
    )

    @field_validator("question")
    @classmethod
    def validate_question(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("question cannot be blank.")
        return v

    @field_validator("rag_mode")
    @classmethod
    def validate_rag_mode(cls, v: str) -> str:
        if v not in VALID_RAG_MODES:
            raise ValueError(
                f"rag_mode must be one of: {', '.join(sorted(VALID_RAG_MODES))}."
            )
        return v


class ChatResponse(BaseModel):
    answer: str = Field(description="The assistant's response to the user's question")
