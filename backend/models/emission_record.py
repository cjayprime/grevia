from datetime import datetime
from enum import Enum
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class EmissionConfidence(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class EmissionStatus(str, Enum):
    OK = "ok"
    GAP = "gap"
    OUTLIER = "outlier"
    UNVERIFIED = "unverified"


class EmissionRecord(Base):
    __tablename__ = "emission_record"
    __table_args__ = (
        sa.Index("idx_emission_company", "company_id"),
        sa.Index("idx_emission_scope", "scope"),
        sa.Index("idx_emission_year_period", "year", "period"),
        sa.ForeignKeyConstraint(["company_id"], ["company.company_id"]),
        {"mysql_engine": "InnoDB"},
    )

    emission_record_id: Mapped[int] = mapped_column(
        sa.BigInteger, primary_key=True, autoincrement=True
    )
    company_id: Mapped[int] = mapped_column(sa.BigInteger, nullable=False)
    year: Mapped[int] = mapped_column(sa.Integer, default=2025)
    period: Mapped[str] = mapped_column(sa.String(20), nullable=False, default="Annual")
    scope: Mapped[int] = mapped_column(sa.Integer, default=1)
    category: Mapped[str] = mapped_column(sa.String(200), nullable=False)
    tco2e: Mapped[Optional[float]] = mapped_column(sa.Float, nullable=True)
    percentage_of_total: Mapped[Optional[float]] = mapped_column(sa.Float, nullable=True)
    confidence: Mapped[EmissionConfidence] = mapped_column(
        sa.Enum(EmissionConfidence, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=EmissionConfidence.MEDIUM,
    )
    status: Mapped[EmissionStatus] = mapped_column(
        sa.Enum(EmissionStatus, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=EmissionStatus.UNVERIFIED,
    )
    esrs_reference: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    gri_reference: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    tcfd_reference: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    issb_reference: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    source_document_id: Mapped[Optional[int]] = mapped_column(sa.BigInteger, nullable=True)
    narrative_disclosure: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    date: Mapped[datetime] = mapped_column(sa.DateTime, default=datetime.utcnow)
