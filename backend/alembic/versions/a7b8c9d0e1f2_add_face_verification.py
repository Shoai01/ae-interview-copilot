"""Add face verification: session reference photo columns, face_checks, FACE_MISMATCH flag type

Revision ID: a7b8c9d0e1f2
Revises: e2f3a4b5c6d7
Create Date: 2026-10-14 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'e2f3a4b5c6d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # main.py runs Base.metadata.create_all() at startup, so face_checks may
    # already exist; create_all never alters existing tables, so the
    # viva_sessions columns still need adding. Every step is skipped if present.
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    session_cols = {c['name'] for c in inspector.get_columns('viva_sessions')}
    if 'face_reference_path' not in session_cols:
        op.add_column('viva_sessions', sa.Column('face_reference_path', sa.String(), nullable=True))
    if 'face_reference_embedding' not in session_cols:
        op.add_column('viva_sessions', sa.Column('face_reference_embedding', sa.JSON(), nullable=True))
    if 'face_reference_at' not in session_cols:
        op.add_column('viva_sessions', sa.Column('face_reference_at', sa.DateTime(), nullable=True))

    if not inspector.has_table('face_checks'):
        op.create_table(
            'face_checks',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('session_id', sa.Integer(), nullable=False),
            sa.Column('viva_question_id', sa.Integer(), nullable=True),
            sa.Column('status', sa.String(), nullable=False),
            sa.Column('similarity', sa.Float(), nullable=True),
            sa.Column('face_count', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('image_path', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['session_id'], ['viva_sessions.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['viva_question_id'], ['viva_questions.id']),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_face_checks_id'), 'face_checks', ['id'], unique=False)
        op.create_index(op.f('ix_face_checks_session_id'), 'face_checks', ['session_id'], unique=False)
        op.create_index(op.f('ix_face_checks_created_at'), 'face_checks', ['created_at'], unique=False)

    # fraud_flags.flag_type is a native Postgres enum; extend it (no-op elsewhere).
    if bind.dialect.name == 'postgresql':
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE fraudflagtype ADD VALUE IF NOT EXISTS 'FACE_MISMATCH'")


def downgrade() -> None:
    """Downgrade schema. The enum value is left in place (Postgres can't drop one)."""
    op.drop_table('face_checks')
    op.drop_column('viva_sessions', 'face_reference_at')
    op.drop_column('viva_sessions', 'face_reference_embedding')
    op.drop_column('viva_sessions', 'face_reference_path')
