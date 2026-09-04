"""Add llm_usage_logs table

Revision ID: a1b2c3d4e5f6
Revises: f1a2b3c4d5e6
Create Date: 2026-09-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'llm_usage_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('call_site', sa.Enum('EVALUATOR', 'QUESTION_GEN', 'IDEAL_ANSWER', name='llmcallsite'), nullable=False),
        sa.Column('model_name', sa.String(), nullable=False),
        sa.Column('input_tokens', sa.Integer(), nullable=True),
        sa.Column('output_tokens', sa.Integer(), nullable=True),
        sa.Column('total_tokens', sa.Integer(), nullable=True),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        sa.Column('status', sa.Enum('SUCCESS', 'ERROR', name='llmcallstatus'), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('session_id', sa.Integer(), nullable=True),
        sa.Column('module_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['viva_sessions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['module_id'], ['training_modules.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_llm_usage_logs_id'), 'llm_usage_logs', ['id'], unique=False)
    op.create_index(op.f('ix_llm_usage_logs_created_at'), 'llm_usage_logs', ['created_at'], unique=False)
    op.create_index('ix_llm_usage_logs_call_site', 'llm_usage_logs', ['call_site'], unique=False)
    op.create_index('ix_llm_usage_logs_created_at_call_site', 'llm_usage_logs', ['created_at', 'call_site'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_llm_usage_logs_created_at_call_site', table_name='llm_usage_logs')
    op.drop_index('ix_llm_usage_logs_call_site', table_name='llm_usage_logs')
    op.drop_index(op.f('ix_llm_usage_logs_created_at'), table_name='llm_usage_logs')
    op.drop_index(op.f('ix_llm_usage_logs_id'), table_name='llm_usage_logs')
    op.drop_table('llm_usage_logs')
    sa.Enum(name='llmcallsite').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='llmcallstatus').drop(op.get_bind(), checkfirst=True)
