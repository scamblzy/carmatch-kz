from datetime import date
from statistics import median

from app.providers.mock_provider import DemoListingProvider
from app.schemas.listing import (
    CarListing,
    PriceComparison,
    RecommendationItem,
    RecommendationRequest,
    RecommendationResponse,
    ScoreComponent,
)


def _clamp(value: float) -> float:
    return max(0.0, min(100.0, value))


def _matches_filters(
    car: CarListing,
    request: RecommendationRequest,
) -> bool:
    """Apply mandatory filters before ranking."""

    if car.price_kzt > request.budget_max:
        return False

    if (
        request.budget_min is not None
        and car.price_kzt < request.budget_min
    ):
        return False

    if request.year_min is not None and car.year < request.year_min:
        return False

    if request.year_max is not None and car.year > request.year_max:
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

    # A selected city is mandatory.
    if (
        request.city is not None
        and car.city.casefold() != request.city.casefold()
    ):
        return False

    return True


def _get_comparable_prices(
    car: CarListing,
    catalog: list[CarListing],
) -> tuple[list[int], str | None]:
    """Prefer local analogues, then use the wider Kazakhstan catalog."""

    peers = [
        other
        for other in catalog
        if (
            other.id != car.id
            and other.make.casefold() == car.make.casefold()
            and other.model.casefold() == car.model.casefold()
            and abs(other.year - car.year) <= 2
            and other.transmission == car.transmission
            and other.body_type == car.body_type
            and other.price_kzt > 0
        )
    ]

    city_peers = [
        other
        for other in peers
        if other.city.casefold() == car.city.casefold()
    ]

    # Require two other listings. A city sample is preferred when it is
    # large enough; otherwise use the wider national sample and disclose it.
    if len(city_peers) >= 2:
        return [other.price_kzt for other in city_peers], "city"

    if peers:
        return [other.price_kzt for other in peers], "country"

    return [], None


def _year_score(
    car: CarListing,
    request: RecommendationRequest,
) -> float | None:
    """Score the year only when the user has set a year preference."""

    if request.year_min is None and request.year_max is None:
        return None

    if request.year_min is not None and request.year_max is not None:
        if request.year_min == request.year_max:
            return 100.0

        progress = (car.year - request.year_min) / (
            request.year_max - request.year_min
        )
    elif request.year_min is not None:
        newest_target = max(date.today().year, request.year_min)
        progress = (car.year - request.year_min) / max(
            newest_target - request.year_min,
            1,
        )
    else:
        oldest_supported_year = 1980
        progress = (car.year - oldest_supported_year) / max(
            request.year_max - oldest_supported_year,
            1,
        )

    return _clamp(60 + 40 * progress)


def _mileage_score(
    car: CarListing,
    request: RecommendationRequest,
) -> float | None:
    """Score mileage only when the user has set a mileage limit."""

    if request.mileage_max is None:
        return None

    if request.mileage_max == 0:
        return 100.0

    progress = (
        request.mileage_max - car.mileage_km
    ) / request.mileage_max
    return _clamp(60 + 40 * progress)


def _score_car(
    car: CarListing,
    request: RecommendationRequest,
    catalog: list[CarListing],
) -> RecommendationItem:
    """Calculate the score and explain every weighted component."""

    comparable_prices, comparison_scope = _get_comparable_prices(car, catalog)
    comparable_count = len(comparable_prices)

    if comparable_count >= 2:
        median_value = median(comparable_prices)
        median_price = round(median_value)
        difference_percent = (
            (car.price_kzt - median_value) / median_value * 100
        )
        price_score: float | None = _clamp(
            70 - difference_percent * 2
        )
    else:
        median_price = None
        difference_percent = None
        price_score = None

    price_comparison = PriceComparison(
        median_price_kzt=median_price,
        difference_percent=(
            round(difference_percent, 1)
            if difference_percent is not None
            else None
        ),
        comparable_count=comparable_count,
        scope=comparison_scope,
    )

    year_score = _year_score(car, request)
    mileage_score = _mileage_score(car, request)
    same_make = bool(
        request.preferred_make
        and car.make.casefold() == request.preferred_make.casefold()
    )

    # Only user-selected preferences and sufficiently supported price data
    # contribute to the score. Missing criteria are left out of the weights.
    criteria = [
        ("price", "Цена относительно аналогов", price_score, 0.40),
    ]

    if year_score is not None:
        criteria.append(("year", "Год выпуска", year_score, 0.25))

    if mileage_score is not None:
        criteria.append(("mileage", "Пробег", mileage_score, 0.25))

    if request.preferred_make:
        criteria.append(
            (
                "preferred_make",
                "Совпадение марки",
                100.0 if same_make else 0.0,
                0.10,
            )
        )

    available_criteria = [
        criterion for criterion in criteria if criterion[2] is not None
    ]
    total_weight = sum(criterion[3] for criterion in available_criteria)
    score_available = total_weight > 0

    breakdown = []
    for key, label, component_score, weight in criteria:
        available = component_score is not None
        normalized_weight = weight / total_weight if available else 0.0
        numeric_score = component_score if component_score is not None else 0.0

        breakdown.append(
            ScoreComponent(
                key=key,
                label=label,
                score=round(numeric_score),
                weight=round(normalized_weight, 4),
                contribution=round(numeric_score * normalized_weight, 1),
                available=available,
            )
        )

    score = (
        round(
            sum(
                component_score * weight
                for _, _, component_score, weight in available_criteria
            )
            / total_weight
        )
        if score_available
        else 0
    )

    reasons = ["Цена укладывается в заданный максимальный бюджет."]
    warnings = []

    if median_price is not None and difference_percent is not None:
        scope_label = (
            "в этом городе"
            if comparison_scope == "city"
            else "по стране"
        )

        if difference_percent <= -10:
            reasons.append(
                "Цена минимум на 10% ниже медианы аналогов "
                f"{scope_label} (на {abs(difference_percent):.0f}%)."
            )
        elif difference_percent <= 0:
            reasons.append(
                f"Цена не выше медианы аналогов {scope_label}."
            )
        elif difference_percent > 10:
            warnings.append(
                f"Цена на {difference_percent:.0f}% выше медианы "
                f"аналогов {scope_label}."
            )
        else:
            reasons.append(
                f"Цена немного выше медианы аналогов {scope_label}."
            )

        if difference_percent <= -20:
            warnings.append(
                "Цена заметно ниже медианы; проверьте состояние и "
                "историю автомобиля."
            )
    else:
        scope_label = (
            "в этом городе"
            if comparison_scope == "city"
            else "по стране"
        )
        if comparable_count:
            reasons.append(
                "Недостаточно аналогов для сравнения цены: "
                f"найдено {comparable_count} (выборка {scope_label}); "
                "нужно не менее 2."
            )
        else:
            reasons.append("Подходящие аналоги для сравнения цены не найдены.")

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
        "Рейтинг отражает соответствие запросу, "
        "а не подтверждённое техническое состояние."
    )

    if not score_available:
        warnings.append(
            "Недостаточно данных для надёжного рейтинга; "
            "варианты упорядочены по цене и году выпуска."
        )

    return RecommendationItem(
        listing=car,
        score=score,
        score_available=score_available,
        score_breakdown=breakdown,
        price_comparison=price_comparison,
        reasons=reasons,
        warnings=warnings,
    )


def recommend_cars(
    request: RecommendationRequest,
    listings: list[CarListing] | None = None,
) -> RecommendationResponse:
    """Filter the catalog and rank matching cars."""

    catalog = (
        DemoListingProvider().fetch_listings()
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
