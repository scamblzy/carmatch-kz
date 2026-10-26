from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


Transmission = Literal["automatic", "manual"]

BodyType = Literal[
    "sedan",
    "hatchback",
    "suv",
    "wagon",
    "coupe",
    "minivan",
    "other",
]

FuelType = Literal[
    "petrol",
    "diesel",
    "hybrid",
    "electric",
    "lpg",
    "other",
]


class CarListing(BaseModel):
    """Normalized car listing used inside the application."""

    model_config = ConfigDict(
        str_strip_whitespace=True,
        from_attributes=True,
    )

    id: str
    source: str = Field(default="demo", min_length=1, max_length=50)
    source_listing_id: str | None = Field(default=None, max_length=120)
    make: str
    model: str
    year: int = Field(ge=1980, le=2035)
    price_kzt: int = Field(gt=0)
    mileage_km: int = Field(ge=0)
    transmission: Transmission
    body_type: BodyType
    fuel_type: FuelType
    city: str
    source_url: str
    description: str = ""
    published_at: datetime | None = None
    last_seen_at: datetime | None = None


class RecommendationRequest(BaseModel):
    """User preferences for the car recommendation engine."""

    model_config = ConfigDict(str_strip_whitespace=True)

    budget_max: int = Field(gt=0)
    budget_min: int | None = Field(default=None, ge=0)

    year_min: int | None = Field(default=None, ge=1980, le=2035)
    year_max: int | None = Field(default=None, ge=1980, le=2035)

    mileage_max: int | None = Field(default=None, ge=0)

    transmission: Transmission | None = None
    body_type: BodyType | None = None
    fuel_type: FuelType | None = None

    # These are preferences, not mandatory filters.
    preferred_make: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )

    city: str | None = Field(
        default=None,
        min_length=1,
        max_length=80,
    )

    @model_validator(mode="after")
    def validate_ranges(self):
        if (
            self.budget_min is not None
            and self.budget_min > self.budget_max
        ):
            raise ValueError(
                "Minimum budget cannot exceed maximum budget."
            )

        if (
            self.year_min is not None
            and self.year_max is not None
            and self.year_min > self.year_max
        ):
            raise ValueError(
                "Minimum year cannot exceed maximum year."
            )

        return self

class ScoreComponent(BaseModel):
    """One component of the recommendation score."""

    key: Literal[
        "price",
        "year",
        "mileage",
        "preferred_make",
    ]

    label: str
    score: int = Field(ge=0, le=100)
    weight: float = Field(ge=0, le=1)
    contribution: float = Field(ge=0, le=100)
    available: bool


class PriceComparison(BaseModel):
    """Market comparison context for the listing's current price."""

    median_price_kzt: int | None = Field(default=None, gt=0)
    difference_percent: float | None = None
    comparable_count: int = Field(ge=0)
    scope: Literal["city", "country"] | None = None


class RecommendationItem(BaseModel):
    """A car and the explanation of its recommendation score."""

    listing: CarListing
    score: int = Field(ge=0, le=100)
    score_available: bool
    score_breakdown: list[ScoreComponent]
    price_comparison: PriceComparison
    reasons: list[str]
    warnings: list[str]


class RecommendationResponse(BaseModel):
    """Response returned by the recommendation endpoint."""

    items: list[RecommendationItem]
    total: int

class ListingPage(BaseModel):
    """Paginated response containing car listings."""

    items: list[CarListing]
    total: int
    limit: int
    offset: int
