"""Add transcript_manually_enhanced and transcript_enhance_attempts to VivaQuestion

Revision ID: 114e01f40cf8
Revises: b2c3d4e5f6a7
Create Date: 2026-10-06 11:07:35.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '114e01f40cf8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'viva_questions',
        sa.Column('transcript_manually_enhanced', sa.Boolean(), nullable=False, server_default=sa.false())
    )
    op.add_column(
        'viva_questions',
        sa.Column('transcript_enhance_attempts', sa.Integer(), nullable=False, server_default='0')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('viva_questions', 'transcript_enhance_attempts')
    op.drop_column('viva_questions', 'transcript_manually_enhanced')
