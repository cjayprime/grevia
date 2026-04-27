

from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

KanbanColumnLiteral = Literal[
    "policy_defined",
    "action_planned",
    "action_implemented",
    "action_progress",
    "action_blocked",
    "outcome_verified",
]
PriorityLiteral = Literal["low", "medium", "high", "critical"]
MdrTypeLiteral = Literal["MDR-P", "MDR-A"]
ActionStatusLiteral = Literal["pending", "in_progress", "completed", "overdue"]
CheckFrequencyLiteral = Literal["3_days", "1_week", "2_weeks", "1_month"]


class ExtractPoliciesRequest(BaseModel):
    company_id: int = Field(
        default=1, description="ID of the company whose policies are being extracted"
    )
    hot_store_ids: list[int] = Field(
        description="Non-empty list of hot-store document IDs to extract policies from"
    )
    company_name: str = Field(
        default="(not provided)",
        description="Company name passed to the agent for context",
    )

    @field_validator("hot_store_ids")
    @classmethod
    def validate_hot_store_ids(cls, v: list[int]) -> list[int]:
        if not v:
            raise ValueError("At least one document_id is required.")
        if any(i <= 0 for i in v):
            raise ValueError("All document IDs must be positive integers.")
        return v


class CreatePolicyRequest(BaseModel):
    company_id: int = Field(
        default=1, description="ID of the company this policy belongs to"
    )
    title: str = Field(description="Short policy or action title, max 300 characters")
    description: Optional[str] = Field(
        default=None,
        description="Detailed description of the policy or action (2–4 sentences)",
    )
    esrs_reference: Optional[str] = Field(
        default=None,
        description="ESRS disclosure reference this policy addresses (e.g. 'ESRS E1-2')",
    )
    mdr_type: MdrTypeLiteral = Field(
        default="MDR-P",
        description="MDR-P for policies (para 65) or MDR-A for actions & targets (para 68)",
    )
    kanban_column: KanbanColumnLiteral = Field(
        default="policy_defined",
        description="Initial Kanban board column for this item",
    )
    priority: PriorityLiteral = Field(
        default="medium", description="Priority level: critical, high, medium, or low"
    )
    assignee: Optional[str] = Field(
        default=None,
        description="Name or identifier of the person responsible for this item",
    )

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("title cannot be blank.")
        if len(v) > 300:
            raise ValueError("title must be 300 characters or fewer.")
        return v


class UpdatePolicyRequest(BaseModel):
    title: Optional[str] = Field(
        default=None, description="Updated title, max 300 characters"
    )
    description: Optional[str] = Field(default=None, description="Updated description")
    esrs_reference: Optional[str] = Field(
        default=None, description="Updated ESRS reference"
    )
    mdr_type: Optional[MdrTypeLiteral] = Field(
        default=None, description="Updated MDR type"
    )
    kanban_column: Optional[KanbanColumnLiteral] = Field(
        default=None, description="Updated Kanban column to move this item to"
    )
    priority: Optional[PriorityLiteral] = Field(
        default=None, description="Updated priority level"
    )
    due_date: Optional[str] = Field(
        default=None, description="ISO 8601 due date (e.g. '2025-12-31')"
    )
    assignee: Optional[str] = Field(
        default=None, description="Updated assignee name or identifier"
    )
    check_frequency: Optional[CheckFrequencyLiteral] = Field(
        default=None, description="How often this item should be reviewed"
    )

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("title cannot be blank.")
            if len(v) > 300:
                raise ValueError("title must be 300 characters or fewer.")
        return v


class MovePolicyRequest(BaseModel):
    column: KanbanColumnLiteral = Field(
        description="Target Kanban column to move the policy item to"
    )


class CreateActionRequest(BaseModel):
    action_title: str = Field(description="Short action title, max 300 characters")
    action_description: Optional[str] = Field(
        default=None, description="Detailed description of the action to take"
    )
    owner: Optional[str] = Field(
        default=None,
        description="Name or identifier of the person responsible for this action",
    )
    target_date: Optional[str] = Field(
        default=None, description="ISO 8601 target completion date (e.g. '2025-12-31')"
    )
    outcome_metric: Optional[str] = Field(
        default=None,
        description="Metric used to measure the outcome (e.g. 'tCO2e reduction')",
    )
    outcome_value: Optional[str] = Field(
        default=None, description="Target value for the outcome metric (e.g. '500')"
    )
    status: ActionStatusLiteral = Field(
        default="pending",
        description="Current status: pending, in_progress, completed, or overdue",
    )

    @field_validator("action_title")
    @classmethod
    def validate_action_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("action_title cannot be blank.")
        if len(v) > 300:
            raise ValueError("action_title must be 300 characters or fewer.")
        return v


class ExtractedPolicySchema(BaseModel):
    title: str = Field(description="Concise policy or action title (max 80 characters)")
    description: str = Field(
        description="Detailed description of the policy or action (2-4 sentences)"
    )
    esrs_reference: Optional[str] = Field(
        default=None,
        description="ESRS disclosure this maps to (e.g. 'ESRS E1-2', 'ESRS S1-1', 'ESRS G1-1')",
    )
    mdr_type: MdrTypeLiteral = Field(
        description="'MDR-P' for policy statements (para 65), 'MDR-A' for actions and targets (para 68)"
    )
    kanban_column: KanbanColumnLiteral = Field(
        description="Current implementation stage of the policy or action"
    )
    priority: PriorityLiteral = Field(
        description="'critical' if legally required under CSRD, 'high' if materially significant, 'medium' if best practice, 'low' if voluntary"
    )


class ExtractionResult(BaseModel):
    items: list[ExtractedPolicySchema] = Field(
        description="List of all extracted MDR-P and MDR-A items from the provided documents"
    )
