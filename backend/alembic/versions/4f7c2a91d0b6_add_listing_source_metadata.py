"""add listing source and freshness metadata

Revision ID: 4f7c2a91d0b6
Revises: dc520f134103
Create Date: 2026-10-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4f7c2a91d0b6"
down_revision: Union[str, Sequence[str], None] = "dc520f134103"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "listings",
        sa.Column(
            "source",
            sa.String(length=50),
            server_default="demo",
            nullable=False,
        ),
    )
    op.add_column(
        "listings",
        sa.Column("source_listing_id", sa.String(length=120), nullable=True),
    )
    op.add_column(
        "listings",
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "listings",
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_listings_source"),
        "listings",
        ["source"],
        unique=False,
    )
    op.create_index(
        op.f("ix_listings_last_seen_at"),
        "listings",
        ["last_seen_at"],
        unique=False,
    )
    op.create_index(
        "uq_listings_source_listing_id",
        "listings",
        ["source", "source_listing_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_listings_source_listing_id", table_name="listings")
    op.drop_index(op.f("ix_listings_last_seen_at"), table_name="listings")
    op.drop_index(op.f("ix_listings_source"), table_name="listings")
    op.drop_column("listings", "last_seen_at")
    op.drop_column("listings", "published_at")
    op.drop_column("listings", "source_listing_id")
    op.drop_column("listings", "source")
