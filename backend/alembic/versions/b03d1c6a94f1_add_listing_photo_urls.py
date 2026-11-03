"""add listing photo URLs

Revision ID: b03d1c6a94f1
Revises: 4f7c2a91d0b6
Create Date: 2026-11-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b03d1c6a94f1"
down_revision: Union[str, Sequence[str], None] = "4f7c2a91d0b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "listings",
        sa.Column(
            "photo_urls",
            sa.JSON(),
            server_default=sa.text("'[]'"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("listings", "photo_urls")
