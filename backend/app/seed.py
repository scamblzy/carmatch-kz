from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import Listing
from app.providers.mock_provider import DemoListingProvider


def seed_database() -> None:
    """Insert synthetic demonstration listings into PostgreSQL."""

    with SessionLocal() as db:
        existing_id = db.scalar(
            select(Listing.id).limit(1)
        )

        if existing_id is not None:
            print(
                "Database already contains listings. "
                "Skipping seed to avoid duplicate data."
            )
            return

        demo_cars = DemoListingProvider().fetch_listings()

        database_listings = [
            Listing(**car.model_dump())
            for car in demo_cars
        ]

        db.add_all(database_listings)
        db.commit()

        print(
            f"Successfully inserted "
            f"{len(database_listings)} demonstration listings."
        )


if __name__ == "__main__":
    seed_database()
