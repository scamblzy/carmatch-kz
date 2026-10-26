from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    Integer,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Listing(Base):
    """Database model for a car listing."""

    __tablename__ = "listings"
    __table_args__ = (
        Index(
            "uq_listings_source_listing_id",
            "source",
            "source_listing_id",
            unique=True,
        ),
    )

    id: Mapped[str] = mapped_column(
        String(80),
        primary_key=True,
    )

    source: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="demo",
        server_default="demo",
        index=True,
    )

    source_listing_id: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    make: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    model: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
        index=True,
    )

    year: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True,
    )

    price_kzt: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        index=True,
    )

    mileage_km: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    transmission: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    body_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    fuel_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    city: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
        index=True,
    )

    source_url: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )

    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"Listing(id={self.id!r}, "
            f"make={self.make!r}, model={self.model!r}, "
            f"year={self.year}, price_kzt={self.price_kzt})"
        )
