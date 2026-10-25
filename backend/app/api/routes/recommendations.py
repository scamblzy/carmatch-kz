from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.listing_repository import (
    get_all_listings,
    search_listings,
)
from app.schemas.listing import (
    BodyType,
    CarListing,
    FuelType,
    ListingPage,
    RecommendationRequest,
    RecommendationResponse,
    Transmission,
)
from app.services.recommendation import recommend_cars


router = APIRouter(
    prefix="/api/v1",
    tags=["Listings and recommendations"],
)


@router.get(
    "/listings",
    response_model=ListingPage,
)
def list_listings(
    q: str | None = Query(
        default=None,
        min_length=1,
        max_length=100,
    ),
    make: str | None = Query(default=None, min_length=1),
    city: str | None = Query(default=None, min_length=1),
    transmission: Transmission | None = None,
    body_type: BodyType | None = None,
    fuel_type: FuelType | None = None,
    year_min: int | None = Query(default=None, ge=1980, le=2035),
    year_max: int | None = Query(default=None, ge=1980, le=2035),
    price_min: int | None = Query(default=None, ge=0),
    price_max: int | None = Query(default=None, gt=0),
    mileage_max: int | None = Query(default=None, ge=0),
    sort_by: Literal[
        "id",
        "make",
        "model",
        "year",
        "price_kzt",
        "mileage_km",
    ] = "id",
    order: Literal["asc", "desc"] = "asc",
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """Search, filter, sort and paginate car listings."""

    if (
        year_min is not None
        and year_max is not None
        and year_min > year_max
    ):
        raise HTTPException(
            status_code=422,
            detail="year_min cannot exceed year_max",
        )

    if (
        price_min is not None
        and price_max is not None
        and price_min > price_max
    ):
        raise HTTPException(
            status_code=422,
            detail="price_min cannot exceed price_max",
        )

    items, total = search_listings(
        db,
        q=q,
        make=make,
        city=city,
        transmission=transmission,
        body_type=body_type,
        fuel_type=fuel_type,
        year_min=year_min,
        year_max=year_max,
        price_min=price_min,
        price_max=price_max,
        mileage_max=mileage_max,
        sort_by=sort_by,
        order=order,
        limit=limit,
        offset=offset,
    )

    return ListingPage(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/recommendations",
    response_model=RecommendationResponse,
)
def create_recommendations(
    request: RecommendationRequest,
    db: Session = Depends(get_db),
):
    """Recommend cars from PostgreSQL."""

    listings = get_all_listings(db)

    return recommend_cars(
        request=request,
        listings=listings,
    )