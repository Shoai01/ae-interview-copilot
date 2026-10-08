"""Add KEYTERM_EXTRACTION value to llmcallsite enum

Revision ID: d1e2f3a4b5c6
Revises: c5d6e7f8a9b0
Create Date: 2026-10-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, Sequence[str], None] = 'c5d6e7f8a9b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction block on
    # Postgres < 12; use an autocommit block so this works across versions.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE llmcallsite ADD VALUE IF NOT EXISTS 'KEYTERM_EXTRACTION'")


def downgrade() -> None:
    """Downgrade schema."""
    # Postgres has no ALTER TYPE ... DROP VALUE; leave the value in place
    # (same approach as the EMBEDDING migration).
    pass
