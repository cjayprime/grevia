from datetime import datetime
from typing import Optional, Dict, Any

import sqlalchemy as sa
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base
from schemas.hot_store import FileType, Category, Status


class HotStore(Base):
    __tablename__ = "hot_store"
    __table_args__ = (
        sa.ForeignKeyConstraint(["company_id"], ["company.company_id"]),
        sa.Index("idx_is_hot_report", "is_hot_report"),
        sa.Index("idx_category", "category"),
        sa.Index("idx_deleted", "deleted"),
        sa.Index("idx_company_id_report", "company_id", "is_hot_report"),
        sa.Index("idx_company_id_deleted", "company_id", "deleted"),
        {"mysql_engine": "InnoDB"},
    )

    hot_store_id: Mapped[int] = mapped_column(
        sa.BigInteger, primary_key=True, autoincrement=True
    )
    company_id: Mapped[int] = mapped_column(
        sa.BigInteger, sa.ForeignKey("company.company_id"), nullable=False
    )
    category: Mapped[Category] = mapped_column(
        sa.Enum(Category, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=Category.OTHER,
    )
    file_name: Mapped[str] = mapped_column(sa.String(500), nullable=False)
    file_type: Mapped[FileType] = mapped_column(
        sa.Enum(FileType, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    file_path: Mapped[str] = mapped_column(sa.String(1000), nullable=False)
    file_size: Mapped[int] = mapped_column(sa.Integer, default=0)
    original_filename: Mapped[str] = mapped_column(sa.String(500), nullable=False)
    is_hot_report: Mapped[bool] = mapped_column(sa.Boolean, default=False)
    report_prompts: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        sa.JSON, nullable=True
    )
    detailed_description: Mapped[Optional[str]] = mapped_column(LONGTEXT, nullable=True)
    chunks: Mapped[str] = mapped_column(LONGTEXT, nullable=False)
    deleted: Mapped[bool] = mapped_column(sa.Boolean, default=False)
    status: Mapped[Status] = mapped_column(
        sa.Enum(Status, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=Status.PROCESSING,
    )
    date: Mapped[datetime] = mapped_column(sa.DateTime, default=datetime.utcnow)
