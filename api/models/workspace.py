from datetime import datetime
from typing import Optional, List

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Workspace(Base):
    __tablename__ = "workspace"
    __table_args__ = (
        sa.Index("idx_workspace_company", "company_id"),
        sa.ForeignKeyConstraint(["company_id"], ["company.company_id"]),
        {"mysql_engine": "InnoDB"},
    )

    workspace_id: Mapped[int] = mapped_column(
        sa.BigInteger, primary_key=True, autoincrement=True
    )
    company_id: Mapped[int] = mapped_column(sa.BigInteger, nullable=False)
    industry: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    region: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    employee_count: Mapped[Optional[int]] = mapped_column(sa.Integer, nullable=True)
    annual_revenue: Mapped[Optional[int]] = mapped_column(sa.BigInteger, nullable=True)
    hq_country: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    business_description: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    value_chain_description: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    key_stakeholders: Mapped[Optional[List[str]]] = mapped_column(sa.JSON, nullable=True)
    sustainability_goals: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    date: Mapped[datetime] = mapped_column(sa.DateTime, default=datetime.utcnow)
