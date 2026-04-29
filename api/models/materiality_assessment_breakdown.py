from datetime import datetime
from enum import Enum
from decimal import Decimal
from typing import Dict

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.mysql import LONGTEXT, TINYTEXT

from .database import Base


class Topic(str, Enum):
    Environment = "Environment"
    Social = "Social"
    Governance = "Governance"


class MaterialityAssessmentBreakdown(Base):
    __tablename__ = "materiality_assessment_breakdown"
    __table_args__ = (
        sa.ForeignKeyConstraint(
            ["materiality_assessment_id"],
            ["materiality_assessment.materiality_assessment_id"],
        ),
        {"mysql_engine": "InnoDB"},
    )

    materiality_assessment_breakdown_id: Mapped[int] = mapped_column(
        sa.BigInteger, primary_key=True, autoincrement=True
    )
    materiality_assessment_id: Mapped[int] = mapped_column(
        sa.BigInteger, nullable=False
    )
    topic: Mapped[str] = mapped_column(sa.Enum(Topic), nullable=False)
    sub_topic: Mapped[str] = mapped_column(
        sa.Enum(
            # Environmental (E)
            *([f"E{i}" for i in range(1, 6)]),
            # Social (S)
            *([f"S{i}" for i in range(1, 5)]),
            # Governance (G)
            "G1",
        ),
        nullable=False,
    )
    disclosure_requirement: Mapped[str] = mapped_column(
        sa.Enum(
            # Environmental (E)
            *([f"E1-{i}" for i in range(1, 10)]),
            *([f"E2-{i}" for i in range(1, 6)]),
            *([f"E3-{i}" for i in range(1, 6)]),
            *([f"E4-{i}" for i in range(1, 6)]),
            *([f"E5-{i}" for i in range(1, 6)]),
            # Social (S)
            *([f"S1-{i}" for i in range(1, 18)]),
            *([f"S2-{i}" for i in range(1, 6)]),
            *([f"S3-{i}" for i in range(1, 6)]),
            *([f"S4-{i}" for i in range(1, 6)]),
            # Governance (G)
            *([f"G1-{i}" for i in range(1, 7)]),
        ),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(sa.TEXT, nullable=False)
    policies: Mapped[Dict[str, any]] = mapped_column(sa.JSON, nullable=False)
    processes: Mapped[Dict[str, any]] = mapped_column(sa.JSON, nullable=False)
    strategies: Mapped[Dict[str, any]] = mapped_column(sa.JSON, nullable=False)
    impact_risk_opportunities: Mapped[str] = mapped_column(LONGTEXT, nullable=False)
    metric_target: Mapped[float] = mapped_column(sa.Float, nullable=False)
    metric_description: Mapped[str] = mapped_column(TINYTEXT, nullable=False)
    metric_unit: Mapped[str] = mapped_column(TINYTEXT, nullable=False)
    metric_id: Mapped[str] = mapped_column(TINYTEXT, nullable=True)
    xml_id: Mapped[str] = mapped_column(TINYTEXT, nullable=True)
    datapoints: Mapped[str] = mapped_column(TINYTEXT, nullable=True)
    financial_materiality_score: Mapped[Decimal] = mapped_column(
        sa.Numeric(5, 2), nullable=False
    )
    impact_materiality_score: Mapped[Decimal] = mapped_column(
        sa.Numeric(5, 2), nullable=False
    )
    recommendations: Mapped[str] = mapped_column(sa.TEXT, nullable=False)
    date: Mapped[datetime] = mapped_column(sa.DateTime, default=datetime.now)
