from datetime import date, datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base
from models.policy_item import ActionStatus


class PolicyAction(Base):
    __tablename__ = "policy_action"
    __table_args__ = (
        sa.Index("idx_paction_policy", "policy_item_id"),
    )

    policy_action_id: Mapped[int] = mapped_column(
        sa.BigInteger, primary_key=True, autoincrement=True
    )
    policy_item_id: Mapped[int] = mapped_column(sa.BigInteger, nullable=False)
    action_title: Mapped[str] = mapped_column(sa.String(300), nullable=False)
    action_description: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    owner: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    target_date: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    completion_date: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    evidence_document_id: Mapped[Optional[int]] = mapped_column(sa.BigInteger, nullable=True)
    outcome_metric: Mapped[Optional[str]] = mapped_column(sa.String(200), nullable=True)
    outcome_value: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    status: Mapped[ActionStatus] = mapped_column(
        sa.Enum(ActionStatus, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=ActionStatus.PENDING,
    )
    date: Mapped[datetime] = mapped_column(sa.DateTime, default=datetime.utcnow)
