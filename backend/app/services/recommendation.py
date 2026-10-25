from datetime import date
from statistics import median

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

    if (
        request.year_min is not None
        and car.year < request.year_min
    ):
        return False

    if (
        request.year_max is not None
        and car.year > request.year_max
    ):
        return False

    if (
        request.mileage_max is not None
        and car.mileage_km > request.mileage_max
    ):
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

    # The selected city is a mandatory filter.
    if (
        request.city is not None
        and car.city.casefold() != request.city.casefold()
    ):
        return False

    return True


def _get_comparable_prices(
    car: CarListing,
    catalog: list[CarListing],
) -> list[int] | None:
    """
    Find comparable listings with the same make, model,
    transmission and body type, within two model years.

    At least three listings, including the current car,
    are required for a comparison.
    """

    comparable_prices = [
        other.price_kzt
        for other in catalog
        if (
            other.make.casefold() == car.make.casefold()
            and other.model.casefold() == car.model.casefold()
            and abs(other.year - car.year) <= 2
            and other.transmission == car.transmission
            and other.body_type == car.body_type
            and other.price_kzt > 0
        )
    ]

    if len(comparable_prices) < 3:
        return None

    return comparable_prices


def _score_car(
    car: CarListing,
    request: RecommendationRequest,
    catalog: list[CarListing],
) -> RecommendationItem:
    """Score a car and explain the recommendation."""

    current_year = date.today().year

    # Compare asking prices only when enough similar listings exist.
    comparable_prices = _get_comparable_prices(car, catalog)

    if comparable_prices is not None:
        median_price = median(comparable_prices)

        relative_difference = (
            car.price_kzt - median_price
        ) / median_price

        # A lower price relative to comparable cars scores better.
        price_score = _clamp(
            70 - relative_difference * 200
        )
    else:
        # Neutral price score: do not assume a cheaper car
        # is a better deal without sufficient comparison data.
        median_price = None
        price_score = 60.0

    # Newer cars receive a higher year score.
    year_range = max(current_year - 2000, 1)

    year_score = _clamp(
        (car.year - 2000) / year_range * 100
    )

    # Lower mileage receives a higher score.
    mileage_score = _clamp(
        100 - car.mileage_km / 300_000 * 100
    )

    # Base weights. They are normalized below.
    criteria = [
        (price_score, 0.25),
        (year_score, 0.35),
        (mileage_score, 0.30),
    ]

    same_make = False

    # Brand is a preference rather than a mandatory filter.
    if request.preferred_make:
        same_make = (
            car.make.casefold()
            == request.preferred_make.casefold()
        )

        criteria.append(
            (100.0 if same_make else 0.0, 0.10)
        )

    total_weight = sum(weight for _, weight in criteria)

    score = round(
        sum(
            value * weight
            for value, weight in criteria
        ) / total_weight
    )

    reasons = [
        "Цена соответствует установленному бюджету.",
        "Год выпуска и пробег учтены в рейтинге.",
    ]

    warnings = []

    if median_price is not None:
        if car.price_kzt <= median_price * 0.90:
            reasons.append(
                "Цена минимум на 10% ниже медианы похожих объявлений."
            )
        elif car.price_kzt <= median_price:
            reasons.append(
                "Цена не превышает медиану похожих объявлений."
            )
        elif car.price_kzt <= median_price * 1.10:
            reasons.append(
                "Цена немного выше медианы похожих объявлений."
            )
        else:
            warnings.append(
                "Цена более чем на 10% выше медианы похожих объявлений."
            )
    else:
        reasons.append(
            "В каталоге недостаточно аналогов для сравнительной оценки цены."
        )

    if request.year_min is not None:
        reasons.append(
            "Год выпуска соответствует минимальному значению."
        )

    if request.year_max is not None:
        reasons.append(
            "Год выпуска не превышает максимального значения."
        )

    if request.mileage_max is not None:
        reasons.append(
            "Пробег не превышает установленный максимум."
        )

    if request.transmission is not None:
        reasons.append(
            "Коробка передач соответствует запросу."
        )

    if request.body_type is not None:
        reasons.append(
            "Тип кузова соответствует запросу."
        )

    if request.fuel_type is not None:
        reasons.append(
            "Тип топлива соответствует запросу."
        )

    if request.city:
        reasons.append(
            "Объявление находится в выбранном городе."
        )

    if request.preferred_make:
        if same_make:
            reasons.append(
                "Совпадает предпочтительная марка."
            )
        else:
            warnings.append(
                "Марка отличается от предпочтительной."
            )

    if car.mileage_km >= 150_000:
        warnings.append(
            "Пробег высокий: стоит проверить историю обслуживания."
        )

    warnings.append(
        "Рейтинг показывает соответствие запросу, "
        "а не подтверждённое техническое состояние автомобиля."
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
        _score_car(car, request, catalog)
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