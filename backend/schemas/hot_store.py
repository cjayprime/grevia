from enum import Enum

from pydantic import BaseModel, Field, field_validator


class FileType(str, Enum):
    PDF = "PDF"
    DOCX = "DOCX"
    XLSX = "XLSX"
    CSV = "CSV"
    TXT = "TXT"
    OTHER = "OTHER"


class Category(str, Enum):
    POLICY = "policy"
    REPORT = "report"
    LEGAL = "legal"
    CONTRACT = "contract"
    FINANCIAL = "financial"
    OTHER = "other"


class Status(str, Enum):
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"


class HotReportRequest(BaseModel):
    company_id: int = Field(
        default=1, description="ID of the company requesting the hot report"
    )
    prompt: str = Field(
        description="Non-blank instruction or question that guides report generation"
    )
    hot_store_ids: list[int] = Field(
        description="Non-empty list of hot-store document IDs to include in the report"
    )

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("prompt cannot be blank.")
        return v

    @field_validator("hot_store_ids")
    @classmethod
    def validate_hot_store_ids(cls, v: list[int]) -> list[int]:
        if not v:
            raise ValueError("At least one hot_store_id is required.")
        if any(i <= 0 for i in v):
            raise ValueError("All hot_store_ids must be positive integers.")
        return v
