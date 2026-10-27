from fastapi.testclient import TestClient
from app.schemas.listing import CarListing, RecommendationRequest
from app.services.recommendation import recommend_cars
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_listings_endpoint_returns_demo_cars():
    response = client.get("/api/v1/listings")

    assert response.status_code == 200

    data = response.json()

    assert data["total"] == 12
    assert len(data["items"]) == 12
    assert data["limit"] == 20
    assert data["offset"] == 0

    assert all(
        "id" in car
        for car in data["items"]
    )


def test_recommendations_apply_filters():
    response = client.post(
        "/api/v1/recommendations",
        json={
            "budget_max": 6000000,
            "year_min": 2015,
            "mileage_max": 160000,
            "transmission": "automatic",
            "body_type": "sedan",
            "preferred_make": "Toyota",
            "city": "Astana",
        },
    )

    assert response.status_code == 200

    result = response.json()

    assert result["total"] == 3

    expected_ids = {
    "demo-004",
    "demo-009",
    "demo-010",
    }

    actual_ids = {
        item["listing"]["id"]
        for item in result["items"]
    }

    assert actual_ids == expected_ids

    for item in result["items"]:
        car = item["listing"]

        assert car["price_kzt"] <= 6000000
        assert car["year"] >= 2015
        assert car["mileage_km"] <= 160000
        assert car["transmission"] == "automatic"
        assert car["body_type"] == "sedan"


def test_results_sorted_by_score():
    response = client.post(
        "/api/v1/recommendations",
        json={
            "budget_max": 6000000,
            "transmission": "automatic",
            "body_type": "sedan",
        },
    )

    assert response.status_code == 200

    items = response.json()["items"]
    scores = [item["score"] for item in items]

    assert scores == sorted(scores, reverse=True)


def test_recommendations_include_explanations():
    response = client.post(
        "/api/v1/recommendations",
        json={
            "budget_max": 6000000,
            "transmission": "automatic",
            "preferred_make": "Toyota",
        },
    )

    assert response.status_code == 200

    for item in response.json()["items"]:
        assert 0 <= item["score"] <= 100
        assert isinstance(item["reasons"], list)
        assert len(item["reasons"]) > 0
        assert isinstance(item["warnings"], list)


def test_invalid_budget_returns_422():
    response = client.post(
        "/api/v1/recommendations",
        json={
            "budget_min": 7000000,
            "budget_max": 6000000,
        },
    )

    assert response.status_code == 422


def test_listings_search_and_pagination():
    response = client.get(
        "/api/v1/listings",
        params={
            "q": "Corolla",
            "limit": 1,
            "offset": 1,
            "sort_by": "year",
            "order": "desc",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["total"] == 2
    assert len(data["items"]) == 1
    assert data["items"][0]["id"] == "demo-010"


def test_listings_filter_by_city_and_price():
    response = client.get(
        "/api/v1/listings",
        params={
            "city": "Astana",
            "price_max": 6000000,
            "sort_by": "price_kzt",
            "order": "asc",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["total"] == 5
    assert len(data["items"]) == 5

    prices = [
        item["price_kzt"]
        for item in data["items"]
    ]

    assert prices == sorted(prices)

    assert all(
        item["city"] == "Astana"
        and item["price_kzt"] <= 6000000
        for item in data["items"]
    )


def test_price_comparison_identifies_below_median_price():
    cars = [
        CarListing(
            id="compare-001",
            make="Toyota",
            model="Corolla",
            year=2018,
            price_kzt=5_000_000,
            mileage_km=100_000,
            transmission="automatic",
            body_type="sedan",
            fuel_type="petrol",
            city="Astana",
            source_url="https://example.com/compare-001",
            description="Synthetic test listing.",
        ),
        CarListing(
            id="compare-002",
            make="Toyota",
            model="Corolla",
            year=2017,
            price_kzt=6_000_000,
            mileage_km=120_000,
            transmission="automatic",
            body_type="sedan",
            fuel_type="petrol",
            city="Astana",
            source_url="https://example.com/compare-002",
            description="Synthetic test listing.",
        ),
        CarListing(
            id="compare-003",
            make="Toyota",
            model="Corolla",
            year=2018,
            price_kzt=4_500_000,
            mileage_km=90_000,
            transmission="automatic",
            body_type="sedan",
            fuel_type="petrol",
            city="Astana",
            source_url="https://example.com/compare-003",
            description="Synthetic test listing.",
        ),
    ]

    request = RecommendationRequest(
        budget_max=8_000_000,
    )

    result = recommend_cars(
        request=request,
        listings=cars,
    )

    target = next(
        item
        for item in result.items
        if item.listing.id == "compare-003"
    )

    assert result.total == 3

    assert any(
        "минимум на 10%" in reason.lower()
        for reason in target.reasons
    )


def test_price_comparison_reports_insufficient_data():
    cars = [
        CarListing(
            id="limited-001",
            make="Toyota",
            model="Corolla",
            year=2018,
            price_kzt=5_000_000,
            mileage_km=100_000,
            transmission="automatic",
            body_type="sedan",
            fuel_type="petrol",
            city="Astana",
            source_url="https://example.com/limited-001",
            description="Synthetic test listing.",
        ),
        CarListing(
            id="limited-002",
            make="Toyota",
            model="Corolla",
            year=2017,
            price_kzt=6_000_000,
            mileage_km=120_000,
            transmission="automatic",
            body_type="sedan",
            fuel_type="petrol",
            city="Astana",
            source_url="https://example.com/limited-002",
            description="Synthetic test listing.",
        ),
    ]

    request = RecommendationRequest(
        budget_max=8_000_000,
    )

    result = recommend_cars(
        request=request,
        listings=cars,
    )

    assert result.total == 2

    for item in result.items:
        assert any(
            "недостаточно аналогов" in reason.lower()
            for reason in item.reasons
        )


def _make_car(
    identifier: str,
    *,
    city: str,
    price_kzt: int,
    year: int = 2018,
    mileage_km: int = 100_000,
) -> CarListing:
    return CarListing(
        id=identifier,
        make="Toyota",
        model="Corolla",
        year=year,
        price_kzt=price_kzt,
        mileage_km=mileage_km,
        transmission="automatic",
        body_type="sedan",
        fuel_type="petrol",
        city=city,
        source_url=f"https://example.com/{identifier}",
    )


def test_price_comparison_excludes_listing_and_prefers_city_sample():
    cars = [
        _make_car("city-target", city="Astana", price_kzt=5_000_000),
        _make_car("city-peer-1", city="Astana", price_kzt=4_500_000),
        _make_car("city-peer-2", city="Astana", price_kzt=5_500_000),
        _make_car("national-peer", city="Almaty", price_kzt=1_000_000),
    ]

    result = recommend_cars(
        request=RecommendationRequest(budget_max=8_000_000),
        listings=cars,
    )

    target = next(
        item for item in result.items if item.listing.id == "city-target"
    )

    assert target.price_comparison.comparable_count == 2
    assert target.price_comparison.scope == "city"
    assert target.price_comparison.median_price_kzt == 5_000_000
    assert target.price_comparison.difference_percent == 0


def test_price_comparison_falls_back_to_country_sample():
    cars = [
        _make_car("fallback-target", city="Astana", price_kzt=5_000_000),
        _make_car("fallback-local", city="Astana", price_kzt=4_500_000),
        _make_car("fallback-national", city="Almaty", price_kzt=5_500_000),
    ]

    result = recommend_cars(
        request=RecommendationRequest(budget_max=8_000_000),
        listings=cars,
    )

    target = next(
        item for item in result.items if item.listing.id == "fallback-target"
    )

    assert target.price_comparison.comparable_count == 2
    assert target.price_comparison.scope == "country"
    assert target.price_comparison.median_price_kzt == 5_000_000


def test_score_is_unavailable_without_selected_preferences_or_analogs():
    result = recommend_cars(
        request=RecommendationRequest(budget_max=8_000_000),
        listings=[
            _make_car("unranked", city="Astana", price_kzt=5_000_000),
        ],
    )

    item = result.items[0]

    assert item.score_available is False
    assert item.score == 0
    assert item.score_breakdown[0].available is False
    assert item.score_breakdown[0].weight == 0


def test_year_and_mileage_only_score_when_requested():
    car = _make_car("selected-criteria", city="Astana", price_kzt=5_000_000)
    result = recommend_cars(
        request=RecommendationRequest(
            budget_max=8_000_000,
            year_min=2015,
            mileage_max=200_000,
        ),
        listings=[car],
    )

    item = result.items[0]
    components = {component.key: component for component in item.score_breakdown}

    assert item.score_available is True
    assert components["price"].available is False
    assert components["year"].available is True
    assert components["mileage"].available is True
    assert components["year"].weight == 0.5
    assert components["mileage"].weight == 0.5
