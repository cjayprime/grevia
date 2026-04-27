"""create all tables for the application

Revision ID: 0001
Revises:
Create Date: 2026-04-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.mysql import LONGTEXT, TINYTEXT

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "company",
        sa.Column(
            "company_id",
            sa.BigInteger,
            primary_key=True,
            autoincrement=True,
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(100), nullable=False),
        sa.Column("password", sa.String(255), nullable=True),
        sa.Column("website", sa.String(500), nullable=True),
        sa.Column("industry", sa.String(100), nullable=True),
        sa.Column("region", sa.String(100), nullable=True),
        sa.Column("country", sa.String(100), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("employee_count", sa.BigInteger, nullable=True),
        sa.Column("revenue", sa.BigInteger, nullable=True),
        sa.Column("fiscal_year_end", sa.String(10), nullable=True),
        sa.Column("date", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("email", name="idx_email"),
        mysql_engine="InnoDB",
    )

    op.create_table(
        "workspace",
        sa.Column(
            "workspace_id",
            sa.BigInteger,
            primary_key=True,
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "company_id",
            sa.BigInteger,
            sa.ForeignKey("company.company_id"),
            nullable=False,
        ),
        sa.Column("industry", sa.String(100), nullable=False),
        sa.Column("region", sa.String(100), nullable=False),
        sa.Column("employee_count", sa.Integer, nullable=False),
        sa.Column("annual_revenue", sa.BigInteger, nullable=False),
        sa.Column("hq_country", sa.String(100), nullable=False),
        sa.Column("business_description", sa.Text, nullable=False),
        sa.Column("value_chain_description", sa.Text, nullable=False),
        sa.Column("key_stakeholders", sa.JSON, nullable=False),
        sa.Column("sustainability_goals", sa.Text, nullable=False),
        sa.Column(
            "date",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
        mysql_engine="InnoDB",
    )

    op.create_table(
        "hot_store",
        sa.Column(
            "hot_store_id",
            sa.BigInteger,
            primary_key=True,
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "company_id",
            sa.BigInteger,
            sa.ForeignKey("company.company_id"),
            nullable=False,
        ),
        sa.Column(
            "category",
            sa.Enum("policy", "report", "legal", "contract", "financial", "other"),
            nullable=False,
            index=sa.Index("idx_category", "category"),
        ),
        sa.Column("file_name", sa.String(500), nullable=False),
        sa.Column(
            "file_type",
            sa.Enum("PDF", "DOCX", "XLSX", "CSV", "TXT", "JPG", "PNG", "OTHER"),
            nullable=False,
        ),
        sa.Column("file_path", sa.String(1000), nullable=False),
        sa.Column("file_size", sa.Integer, nullable=False, server_default="0"),
        sa.Column("original_filename", sa.String(500), nullable=False),
        sa.Column(
            "is_hot_report",
            sa.Boolean,
            nullable=False,
            server_default="0",
            index=sa.Index("idx_is_hot_report", "is_hot_report"),
        ),
        sa.Column("report_prompts", sa.JSON, nullable=True),
        sa.Column("detailed_description", LONGTEXT, nullable=True),
        sa.Column(
            "chunks",
            LONGTEXT,
            nullable=False,
        ),
        sa.Column(
            "deleted",
            sa.Boolean,
            nullable=False,
            server_default="0",
            index=sa.Index("idx_deleted", "deleted"),
        ),
        sa.Column(
            "status",
            sa.Enum("processing", "ready", "error"),
            nullable=False,
            server_default="processing",
        ),
        sa.Column(
            "date",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Index("idx_company_id_hot_report", "company_id", "is_hot_report"),
        sa.Index("idx_company_id_deleted", "company_id", "deleted"),
        mysql_engine="InnoDB",
    )

    op.create_table(
        "materiality_assessment",
        sa.Column(
            "materiality_assessment_id",
            sa.BigInteger,
            primary_key=True,
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "company_id",
            sa.BigInteger,
            sa.ForeignKey("company.company_id"),
            nullable=False,
        ),
        sa.Column(
            "workspace_id",
            sa.BigInteger,
            sa.ForeignKey("workspace.workspace_id"),
            nullable=False,
        ),
        sa.Column(
            "standard",
            sa.Enum("ESRS", "GRI", "SASB", "TCFD", "ISSB"),
            nullable=False,
        ),
        sa.Column("profile", sa.JSON, nullable=False),
        sa.Column("industry", sa.String(100), nullable=False),
        sa.Column("region", sa.String(100), nullable=False),
        sa.Column(
            "status",
            sa.Enum("processing", "ready", "error"),
            nullable=False,
            server_default="processing",
        ),
        sa.Column(
            "date",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Index("idx_mat_company", "company_id"),
        mysql_engine="InnoDB",
    )

    op.create_table(
        "materiality_assessment_breakdown",
        sa.Column(
            "materiality_assessment_breakdown_id",
            sa.BigInteger,
            primary_key=True,
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "materiality_assessment_id",
            sa.BigInteger,
            sa.ForeignKey("materiality_assessment.materiality_assessment_id"),
            nullable=False,
        ),
        sa.Column(
            "topic",
            sa.Enum(
                "Environment",
                "Social",
                "Governance",
            ),
            nullable=False,
        ),
        sa.Column(
            "sub_topic",
            sa.Enum(
                # Environmental (E)
                *([f"E{i}" for i in range(1, 5)]),
                # Social (S)
                *([f"S{i}" for i in range(1, 5)]),
                # Governance (G)
                "G1",
            ),
            nullable=False,
        ),
        sa.Column(
            "disclosure_requirement",
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
        ),
        sa.Column("description", sa.TEXT, nullable=False),
        sa.Column("policies", sa.JSON, nullable=False),
        sa.Column("processes", sa.JSON, nullable=False),
        sa.Column("strategies", sa.JSON, nullable=False),
        sa.Column("impact_risk_opportunities", LONGTEXT, nullable=False),
        sa.Column("metric_target", sa.Float, nullable=True),
        sa.Column("metric_description", TINYTEXT, nullable=True),
        sa.Column("metric_unit", TINYTEXT, nullable=True),
        sa.Column("metric_id", TINYTEXT, nullable=True),
        sa.Column("xml_id", TINYTEXT, nullable=True),
        sa.Column("datapoints", TINYTEXT, nullable=True),
        sa.Column("financial_materiality_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("impact_materiality_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("recommendations", sa.TEXT, nullable=False),
        sa.Column(
            "date",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
        mysql_engine="InnoDB",
    )

    op.create_table(
        "materiality_assessment_file",
        sa.Column(
            "materiality_assessment_file_id",
            sa.BigInteger,
            primary_key=True,
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "materiality_assessment_id",
            sa.BigInteger,
            sa.ForeignKey("materiality_assessment.materiality_assessment_id"),
            nullable=False,
        ),
        sa.Column(
            "hot_store_id",
            sa.BigInteger,
            sa.ForeignKey("hot_store.hot_store_id"),
            nullable=False,
        ),
        sa.Column(
            "date",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
        mysql_engine="InnoDB",
    )

    op.create_table(
        "emission_record",
        sa.Column(
            "emission_record_id",
            sa.BigInteger,
            primary_key=True,
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "company_id",
            sa.BigInteger,
            sa.ForeignKey("company.company_id"),
            nullable=False,
        ),
        sa.Column("year", sa.Integer, nullable=False, server_default="2025"),
        sa.Column("period", sa.String(20), nullable=False, server_default="Annual"),
        sa.Column("scope", sa.Integer, nullable=False, server_default="1"),
        sa.Column("category", sa.String(200), nullable=False),
        sa.Column("tco2e", sa.Float, nullable=True),
        sa.Column("percentage_of_total", sa.Float, nullable=True),
        sa.Column(
            "confidence",
            sa.Enum("low", "medium", "high"),
            nullable=False,
            server_default="medium",
        ),
        sa.Column(
            "status",
            sa.Enum("ok", "gap", "outlier", "unverified"),
            nullable=False,
            server_default="unverified",
        ),
        sa.Column("esrs_reference", sa.String(100), nullable=True),
        sa.Column("gri_reference", sa.String(100), nullable=True),
        sa.Column("tcfd_reference", sa.String(100), nullable=True),
        sa.Column("issb_reference", sa.String(100), nullable=True),
        sa.Column("source_document_id", sa.BigInteger, nullable=True),
        sa.Column("narrative_disclosure", sa.Text, nullable=True),
        sa.Column(
            "date",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Index("idx_emission_company", "company_id"),
        sa.Index("idx_emission_scope", "scope"),
        sa.Index("idx_emission_year_period", "year", "period"),
        mysql_engine="InnoDB",
    )

    op.create_table(
        "policy_item",
        sa.Column(
            "policy_item_id",
            sa.BigInteger,
            primary_key=True,
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "company_id",
            sa.BigInteger,
            sa.ForeignKey("company.company_id"),
            nullable=False,
        ),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("esrs_reference", sa.String(50), nullable=True),
        sa.Column(
            "mdr_type",
            sa.Enum("MDR-P", "MDR-A"),
            nullable=False,
            server_default="MDR-P",
        ),
        sa.Column(
            "kanban_column",
            sa.Enum(
                "policy_defined",
                "action_planned",
                "action_implemented",
                "action_progress",
                "action_blocked",
                "outcome_verified",
            ),
            nullable=False,
            server_default="policy_defined",
        ),
        sa.Column(
            "priority",
            sa.Enum("low", "medium", "high", "critical"),
            nullable=False,
            server_default="medium",
        ),
        sa.Column("due_date", sa.Date, nullable=True),
        sa.Column("assignee", sa.String(100), nullable=True),
        sa.Column("source_document_id", sa.BigInteger, nullable=True),
        sa.Column("linked_action_id", sa.BigInteger, nullable=True),
        sa.Column(
            "check_frequency",
            sa.Enum("3_days", "1_week", "2_weeks", "1_month"),
            nullable=True,
        ),
        sa.Column(
            "date",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Index("idx_policy_company", "company_id"),
        sa.Index("idx_policy_column", "kanban_column"),
        mysql_engine="InnoDB",
    )

    op.create_table(
        "policy_action",
        sa.Column(
            "policy_action_id",
            sa.BigInteger,
            primary_key=True,
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "policy_item_id",
            sa.BigInteger,
            sa.ForeignKey("policy_item.policy_item_id"),
            nullable=False,
        ),
        sa.Column("action_title", sa.String(300), nullable=False),
        sa.Column("action_description", sa.Text, nullable=True),
        sa.Column("owner", sa.String(100), nullable=True),
        sa.Column("target_date", sa.Date, nullable=True),
        sa.Column("completion_date", sa.Date, nullable=True),
        sa.Column("evidence_document_id", sa.BigInteger, nullable=True),
        sa.Column("outcome_metric", sa.String(200), nullable=True),
        sa.Column("outcome_value", sa.String(100), nullable=True),
        sa.Column(
            "status",
            sa.Enum("pending", "in_progress", "completed", "overdue"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "date",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Index("idx_paction_policy", "policy_item_id"),
        mysql_engine="InnoDB",
    )


def downgrade() -> None:
    op.drop_table("policy_action")
    op.drop_table("policy_item")
    op.drop_table("emission_record")
    op.drop_table("materiality_assessment_file")
    op.drop_table("materiality_assessment_breakdown")
    op.drop_table("materiality_assessment")
    op.drop_table("workspace")
    op.drop_table("hot_store")
    op.drop_table("company")
