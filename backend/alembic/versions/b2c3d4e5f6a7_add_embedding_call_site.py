"""Add EMBEDDING value to llmcallsite enum

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-04 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction block on
    # Postgres < 12; use an autocommit block so this works across versions.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE llmcallsite ADD VALUE IF NOT EXISTS 'EMBEDDING'")


def downgrade() -> None:
    """Downgrade schema."""
    # Postgres has no ALTER TYPE ... DROP VALUE. Rebuilding the enum type to
    # remove a value is destructive to any rows using it, so this is a no-op;
    # the EMBEDDING value simply remains available after a downgrade.
    pass
