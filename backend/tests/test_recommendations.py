from fastapi.testclient import TestClient

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

    assert result["total"] == 4

    expected_ids = {
        "demo-004",
        "demo-006",
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