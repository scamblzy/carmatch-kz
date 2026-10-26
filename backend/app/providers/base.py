from typing import Protocol

from app.schemas.listing import CarListing


class ListingProvider(Protocol):
    """Return listings normalized to the application's shared schema."""

    def fetch_listings(self) -> list[CarListing]:
        """Fetch and normalize the source catalog."""
