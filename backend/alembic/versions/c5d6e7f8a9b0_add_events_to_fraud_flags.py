"""Add events timeline to fraud_flags

Revision ID: c5d6e7f8a9b0
Revises: 114e01f40cf8
Create Date: 2026-10-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c5d6e7f8a9b0'
down_revision: Union[str, Sequence[str], None] = '114e01f40cf8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Written with IF NOT EXISTS so it is safe on databases where these columns
    were already added by hand: `count` previously only existed via the
    standalone add_count_to_fraud_flags.py script (never an Alembic revision),
    so an environment that missed that script would otherwise be missing it.
    """
    op.execute("ALTER TABLE fraud_flags ADD COLUMN IF NOT EXISTS count INTEGER NOT NULL DEFAULT 1")
    op.execute("ALTER TABLE fraud_flags ADD COLUMN IF NOT EXISTS events JSON NOT NULL DEFAULT '[]'::json")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TABLE fraud_flags DROP COLUMN IF EXISTS events")
