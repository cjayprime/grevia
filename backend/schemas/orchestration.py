

from pydantic import BaseModel, Field, field_validator


class OrchestrationRequest(BaseModel):
    company_id: int = Field(
        default=1,
        description="ID of the company to run full-pipeline orchestration for",
    )
    company_name: str = Field(
        default="", description="Company display name, passed to agents for context"
    )
    industry: str = Field(
        default="", description="Company industry, used to focus agent outputs"
    )
    region: str = Field(
        default="", description="Company operating region, used to focus agent outputs"
    )
    workspace_id: int = Field(
        default=1, description="Workspace ID to associate orchestration outputs with"
    )
    hot_store_ids: list[int] = Field(
        default=[],
        description="Hot-store document IDs to process; empty = process all company documents",
    )

    @field_validator("hot_store_ids")
    @classmethod
    def validate_hot_store_ids(cls, v: list[int]) -> list[int]:
        if any(i <= 0 for i in v):
            raise ValueError("All document IDs must be positive integers.")
        return v
