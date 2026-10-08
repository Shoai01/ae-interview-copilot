"""Add stt_keyterms, question_keyterms and question_bank.keyterms_extracted_at

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-10-08 00:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2f3a4b5c6d7'
down_revision: Union[str, Sequence[str], None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('question_bank', sa.Column('keyterms_extracted_at', sa.DateTime(), nullable=True))

    op.create_table(
        'stt_keyterms',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('module_id', sa.Integer(), nullable=False),
        sa.Column('term', sa.String(), nullable=False),
        sa.Column('term_key', sa.String(), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['module_id'], ['training_modules.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('module_id', 'term_key', name='uq_stt_keyterms_module_term'),
    )
    op.create_index(op.f('ix_stt_keyterms_id'), 'stt_keyterms', ['id'], unique=False)
    op.create_index(op.f('ix_stt_keyterms_module_id'), 'stt_keyterms', ['module_id'], unique=False)

    op.create_table(
        'question_keyterms',
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('keyterm_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['question_id'], ['question_bank.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['keyterm_id'], ['stt_keyterms.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('question_id', 'keyterm_id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('question_keyterms')
    op.drop_index(op.f('ix_stt_keyterms_module_id'), table_name='stt_keyterms')
    op.drop_index(op.f('ix_stt_keyterms_id'), table_name='stt_keyterms')
    op.drop_table('stt_keyterms')
    op.drop_column('question_bank', 'keyterms_extracted_at')
