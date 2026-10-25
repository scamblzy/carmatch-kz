from datetime import date

from app.providers.mock_provider import get_demo_listings
from app.schemas.listing import (
    CarListing,
    RecommendationItem,
    RecommendationRequest,
    RecommendationResponse,
)


def _clamp(value: float) -> float:
    """Keep a score between 0 and 100."""
    return max(0.0, min(100.0, value))


def _matches_filters(
    car: CarListing,
    request: RecommendationRequest,
) -> bool:
    """Apply mandatory filters before scoring."""

    if car.price_kzt > request.budget_max:
        return False

    if (
        request.budget_min is not None
        and car.price_kzt < request.budget_min
    ):
        return False

    if request.year_min is not None:
        if car.year < request.year_min:
            return False

    if request.year_max is not None:
        if car.year > request.year_max:
            return False

    if request.mileage_max is not None:
        if car.mileage_km > request.mileage_max:
            return False

    if (
        request.transmission is not None
        and car.transmission != request.transmission
    ):
        return False

    if (
        request.body_type is not None
        and car.body_type != request.body_type
    ):
        return False

    if (
        request.fuel_type is not None
        and car.fuel_type != request.fuel_type
    ):
        return False

    return True


def _score_car(
    car: CarListing,
    request: RecommendationRequest,
) -> RecommendationItem:
    """Calculate a normalized score and explain the result."""

    current_year = date.today().year

    # Price: a lower price within the allowed budget scores better.
    price_score = _clamp(
        50 + 50 * (
            request.budget_max - car.price_kzt
        ) / request.budget_max
    )

    # Recency: newer cars score better.
    year_range = max(current_year - 2000, 1)
    year_score = _clamp(
        (car.year - 2000) / year_range * 100
    )

    # Mileage: lower mileage scores better.
    mileage_score = _clamp(
        100 - car.mileage_km / 300_000 * 100
    )

    criteria = [
        (price_score, 0.35),
        (year_score, 0.30),
        (mileage_score, 0.25),
    ]

    same_make = False
    same_city = False

    if request.preferred_make:
        same_make = (
            car.make.casefold()
            == request.preferred_make.casefold()
        )
        criteria.append(
            (100.0 if same_make else 0.0, 0.10)
        )

    if request.city:
        same_city = (
            car.city.casefold()
            == request.city.casefold()
        )
        criteria.append(
            (100.0 if same_city else 0.0, 0.10)
        )

    total_weight = sum(weight for _, weight in criteria)

    score = round(
        sum(value * weight for value, weight in criteria)
        / total_weight
    )

    reasons = []

    if car.price_kzt <= request.budget_max * 0.8:
        reasons.append(
            "Цена минимум на 20% ниже верхней границы бюджета."
        )
    else:
        reasons.append("Цена укладывается в заданный бюджет.")

    if request.year_min is not None:
        reasons.append("Год выпуска соответствует запросу.")

    if request.mileage_max is not None:
        reasons.append("Пробег не превышает установленный максимум.")

    if request.transmission is not None:
        reasons.append("Коробка передач соответствует запросу.")

    if request.body_type is not None:
        reasons.append("Тип кузова соответствует запросу.")

    if request.fuel_type is not None:
        reasons.append("Тип топлива соответствует запросу.")

    warnings = []

    if request.preferred_make:
        if same_make:
            reasons.append("Совпадает предпочтительная марка.")
        else:
            warnings.append(
                "Марка отличается от предпочтительной."
            )

    if request.city:
        if same_city:
            reasons.append("Совпадает предпочтительный город.")
        else:
            warnings.append(
                "Объявление находится в другом городе."
            )

    if car.mileage_km >= 150_000:
        warnings.append(
            "Пробег высокий: стоит проверить историю обслуживания."
        )

    warnings.append(
        "Рейтинг отражает соответствие запросу, "
        "а не техническое состояние автомобиля."
    )

    return RecommendationItem(
        listing=car,
        score=score,
        reasons=reasons,
        warnings=warnings,
    )


def recommend_cars(
    request: RecommendationRequest,
    listings: list[CarListing] | None = None,
) -> RecommendationResponse:
    """Filter the catalog and rank matching cars."""

    catalog = (
        get_demo_listings()
        if listings is None
        else listings
    )

    matches = [
        car
        for car in catalog
        if _matches_filters(car, request)
    ]

    items = [
        _score_car(car, request)
        for car in matches
    ]

    items.sort(
        key=lambda item: (
            -item.score,
            item.listing.price_kzt,
            -item.listing.year,
        )
    )

    return RecommendationResponse(
        items=items,
        total=len(items),
    )