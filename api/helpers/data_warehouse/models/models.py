from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class DWBase(DeclarativeBase):
    pass


class ESGBaseModel(DWBase):
    __abstract__ = True

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True, autoincrement=True)
    company_id: Mapped[str] = mapped_column(sa.String(200), nullable=False)
    reporting_period: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    date: Mapped[datetime] = mapped_column(sa.DateTime, default=datetime.utcnow)


class EmissionData(ESGBaseModel):
    __tablename__ = "emissiondata"

    scope: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    category: Mapped[str] = mapped_column(sa.String(200), nullable=False)
    sub_category: Mapped[Optional[str]] = mapped_column(sa.String(200), nullable=True)
    co2_equivalent: Mapped[float] = mapped_column(sa.Float, nullable=False)
    unit: Mapped[str] = mapped_column(sa.String(20), default="tCO2e")
    confidence_score: Mapped[float] = mapped_column(sa.Float, default=0.0)
    source_file: Mapped[Optional[str]] = mapped_column(sa.String(500), nullable=True)


class Policy(ESGBaseModel):
    __tablename__ = "policy"

    title: Mapped[str] = mapped_column(sa.String(300), nullable=False)
    description: Mapped[str] = mapped_column(sa.Text, nullable=False)
    scope_of_application: Mapped[str] = mapped_column(sa.String(200), nullable=False)
    accountability: Mapped[str] = mapped_column(sa.String(200), nullable=False)
    status: Mapped[str] = mapped_column(sa.String(50), default="Defined")


class ActionItem(ESGBaseModel):
    __tablename__ = "actionitem"

    title: Mapped[str] = mapped_column(sa.String(300), nullable=False)
    description: Mapped[str] = mapped_column(sa.Text, nullable=False)
    policy_id: Mapped[Optional[int]] = mapped_column(
        sa.Integer, sa.ForeignKey("policy.id"), nullable=True
    )
    time_horizon: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    status: Mapped[str] = mapped_column(sa.String(50), default="Planned")
    budget_allocated: Mapped[Optional[float]] = mapped_column(sa.Float, nullable=True)


def get_engine(db_url: str = "sqlite:///esg_data.db"):
    return create_engine(db_url)


def init_db(engine):
    DWBase.metadata.create_all(engine)
