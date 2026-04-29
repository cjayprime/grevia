from datetime import date, datetime
from enum import Enum
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class MdrType(str, Enum):
    MDR_P = "MDR-P"
    MDR_A = "MDR-A"
    MDR_T = "MDR-T"


class KanbanColumn(str, Enum):
    POLICY_DEFINED = "policy_defined"
    ACTION_PLANNED = "action_planned"
    ACTION_IMPLEMENTED = "action_implemented"
    ACTION_PROGRESS = "action_progress"
    ACTION_BLOCKED = "action_blocked"
    OUTCOME_VERIFIED = "outcome_verified"


class CheckFrequency(str, Enum):
    THREE_DAYS = "3_days"
    ONE_WEEK = "1_week"
    TWO_WEEKS = "2_weeks"
    ONE_MONTH = "1_month"


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ActionStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"


class PolicyItem(Base):
    __tablename__ = "policy_item"
    __table_args__ = (
        sa.Index("idx_policy_company", "company_id"),
        sa.Index("idx_policy_column", "kanban_column"),
        sa.ForeignKeyConstraint(["company_id"], ["company.company_id"]),
        {"mysql_engine": "InnoDB"},
    )

    policy_item_id: Mapped[int] = mapped_column(
        sa.BigInteger, primary_key=True, autoincrement=True
    )
    company_id: Mapped[int] = mapped_column(sa.BigInteger, nullable=False)
    title: Mapped[str] = mapped_column(sa.String(300), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    esrs_reference: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    mdr_type: Mapped[MdrType] = mapped_column(
        sa.Enum(MdrType, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=MdrType.MDR_P,
    )
    kanban_column: Mapped[KanbanColumn] = mapped_column(
        sa.Enum(KanbanColumn, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=KanbanColumn.POLICY_DEFINED,
    )
    priority: Mapped[Priority] = mapped_column(
        sa.Enum(Priority, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=Priority.MEDIUM,
    )
    due_date: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    assignee: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    source_document_id: Mapped[Optional[int]] = mapped_column(sa.BigInteger, nullable=True)
    linked_action_id: Mapped[Optional[int]] = mapped_column(sa.BigInteger, nullable=True)
    check_frequency: Mapped[Optional[CheckFrequency]] = mapped_column(
        sa.Enum(CheckFrequency, values_callable=lambda e: [m.value for m in e]),
        nullable=True,
    )
    date: Mapped[datetime] = mapped_column(sa.DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(sa.DateTime, default=datetime.utcnow)
