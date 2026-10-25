import os
from pathlib import Path
from typing import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


# Project root: carmatch.kz/
PROJECT_ROOT = Path(__file__).resolve().parents[3]

# Load environment variables from the project root.
load_dotenv(PROJECT_ROOT / ".env")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    (
        "postgresql+psycopg://carmatch:"
        "carmatch_dev_password@localhost:5432/carmatch"
    ),
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    """Base class for SQLAlchemy models."""

    pass


def get_db() -> Generator[Session, None, None]:
    """Provide a database session to an API endpoint."""

    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()