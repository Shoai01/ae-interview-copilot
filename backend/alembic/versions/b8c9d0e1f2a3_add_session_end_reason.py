"""Add viva_sessions.end_reason (why the system ended an exam, e.g. integrity auto-submit)

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-10-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8c9d0e1f2a3'
down_revision: Union[str, Sequence[str], None] = 'a7b8c9d0e1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Skipped if present: create_all() at startup never alters existing tables,
    # but a fresh database gets the column from the model directly.
    inspector = sa.inspect(op.get_bind())
    cols = {c['name'] for c in inspector.get_columns('viva_sessions')}
    if 'end_reason' not in cols:
        op.add_column('viva_sessions', sa.Column('end_reason', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('viva_sessions', 'end_reason')
