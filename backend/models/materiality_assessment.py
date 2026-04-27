from datetime import datetime
from typing import Optional, Dict, Any

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from schemas.materiality import Standard, AssessmentStatus
from .database import Base


class MaterialityAssessment(Base):
    __tablename__ = "materiality_assessment"
    __table_args__ = (
        sa.Index("idx_mat_company", "company_id"),
        sa.ForeignKeyConstraint(["company_id"], ["company.company_id"]),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspace.workspace_id"]),
        {"mysql_engine": "InnoDB"},
    )

    materiality_assessment_id: Mapped[int] = mapped_column(
        sa.BigInteger, primary_key=True, autoincrement=True
    )
    company_id: Mapped[int] = mapped_column(sa.BigInteger, nullable=False)
    workspace_id: Mapped[int] = mapped_column(sa.BigInteger, nullable=False)
    standard: Mapped[Standard] = mapped_column(
        sa.Enum(Standard, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    profile: Mapped[Optional[Dict[str, Any]]] = mapped_column(sa.JSON, nullable=False)
    industry: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=False)
    region: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=False)
    status: Mapped[AssessmentStatus] = mapped_column(
        sa.Enum(AssessmentStatus, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=AssessmentStatus.PROCESSING,
    )
    date: Mapped[datetime] = mapped_column(sa.DateTime, default=datetime.now)
