"""seed default company record

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-21
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "INSERT INTO company (company_id, name, email) "
        "VALUES (1, 'Default Company', 'admin@grevia.io')"
    )


def downgrade() -> None:
    op.execute("DELETE FROM company WHERE company_id = 1")
