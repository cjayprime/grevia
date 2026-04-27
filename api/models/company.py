from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Company(Base):
    __tablename__ = "company"
    __table_args__ = (sa.UniqueConstraint("email"),)

    company_id: Mapped[int] = mapped_column(
        sa.BigInteger, primary_key=True, autoincrement=True
    )
    name: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    email: Mapped[str] = mapped_column(sa.String(100), nullable=False, unique=True)
    password: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(sa.String(500), nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    region: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    employee_count: Mapped[Optional[int]] = mapped_column(sa.Integer, nullable=True)
    revenue: Mapped[Optional[int]] = mapped_column(sa.BigInteger, nullable=True)
    fiscal_year_end: Mapped[Optional[str]] = mapped_column(sa.String(10), nullable=True)
    date: Mapped[datetime] = mapped_column(sa.DateTime, default=datetime.utcnow)
