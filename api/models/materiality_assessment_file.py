from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class MaterialityAssessmentFile(Base):
    __tablename__ = "materiality_assessment_file"
    __table_args__ = (
        sa.Index("idx_mat_file_assessment", "materiality_assessment_id"),
        sa.ForeignKeyConstraint(
            ["materiality_assessment_id"],
            ["materiality_assessment.materiality_assessment_id"],
        ),
        sa.ForeignKeyConstraint(["hot_store_id"], ["hot_store.hot_store_id"]),
        {"mysql_engine": "InnoDB"},
    )

    materiality_assessment_file_id: Mapped[int] = mapped_column(
        sa.BigInteger, primary_key=True, autoincrement=True
    )
    materiality_assessment_id: Mapped[int] = mapped_column(
        sa.BigInteger, nullable=False
    )
    hot_store_id: Mapped[int] = mapped_column(sa.BigInteger, nullable=False)
    date: Mapped[datetime] = mapped_column(sa.DateTime, default=datetime.now)
