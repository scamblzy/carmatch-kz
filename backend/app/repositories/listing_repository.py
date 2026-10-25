from typing import Literal

from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.orm import Session

from app.models import Listing
from app.schemas.listing import CarListing


SortField = Literal[
    "id",
    "make",
    "model",
    "year",
    "price_kzt",
    "mileage_km",
]

SortOrder = Literal["asc", "desc"]


def get_all_listings(db: Session) -> list[CarListing]:
    """Return all listings for the recommendation engine."""

    statement = select(Listing).order_by(Listing.id)
    rows = db.scalars(statement).all()

    return [
        CarListing.model_validate(row)
        for row in rows
    ]


def search_listings(
    db: Session,
    *,
    q: str | None = None,
    make: str | None = None,
    city: str | None = None,
    transmission: str | None = None,
    body_type: str | None = None,
    fuel_type: str | None = None,
    year_min: int | None = None,
    year_max: int | None = None,
    price_min: int | None = None,
    price_max: int | None = None,
    mileage_max: int | None = None,
    sort_by: SortField = "id",
    order: SortOrder = "asc",
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[CarListing], int]:
    """Search, filter, sort and paginate listings in PostgreSQL."""

    filters = []

    if q:
        pattern = f"%{q.strip()}%"
        filters.append(
            or_(
                Listing.make.ilike(pattern),
                Listing.model.ilike(pattern),
                Listing.description.ilike(pattern),
            )
        )

    if make:
        filters.append(Listing.make.ilike(make.strip()))

    if city:
        filters.append(Listing.city.ilike(city.strip()))

    if transmission:
        filters.append(
            Listing.transmission == transmission
        )

    if body_type:
        filters.append(
            Listing.body_type == body_type
        )

    if fuel_type:
        filters.append(Listing.fuel_type == fuel_type)

    if year_min is not None:
        filters.append(Listing.year >= year_min)

    if year_max is not None:
        filters.append(Listing.year <= year_max)

    if price_min is not None:
        filters.append(Listing.price_kzt >= price_min)

    if price_max is not None:
        filters.append(Listing.price_kzt <= price_max)

    if mileage_max is not None:
        filters.append(Listing.mileage_km <= mileage_max)

    # Count all matching rows before pagination.
    count_statement = (
        select(func.count())
        .select_from(Listing)
        .where(*filters)
    )

    total = db.scalar(count_statement) or 0

    # Sorting is restricted to an explicit allowlist.
    sort_columns = {
        "id": Listing.id,
        "make": Listing.make,
        "model": Listing.model,
        "year": Listing.year,
        "price_kzt": Listing.price_kzt,
        "mileage_km": Listing.mileage_km,
    }

    column = sort_columns[sort_by]
    sort_expression = (
        desc(column)
        if order == "desc"
        else asc(column)
    )

    statement = select(Listing).where(*filters)

    if sort_by == "id":
        statement = statement.order_by(sort_expression)
    else:
        statement = statement.order_by(
            sort_expression,
            Listing.id.asc(),
        )

    statement = statement.offset(offset).limit(limit)

    rows = db.scalars(statement).all()

    items = [
        CarListing.model_validate(row)
        for row in rows
    ]

    return items, total