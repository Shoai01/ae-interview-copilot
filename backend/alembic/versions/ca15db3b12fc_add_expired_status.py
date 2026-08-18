"""add EXPIRED status

Revision ID: ca15db3b12fc
Revises: 4cb2b222baaa
Create Date: 2026-08-18 11:20:09.695815

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ca15db3b12fc'
down_revision: Union[str, Sequence[str], None] = '4cb2b222baaa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE sessionstatus ADD VALUE 'EXPIRED'")


def downgrade() -> None:
    pass
