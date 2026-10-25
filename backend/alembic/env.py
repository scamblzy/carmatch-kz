from logging.config import fileConfig
from pathlib import Path
import sys

from alembic import context

BACKEND_DIR = Path(__file__).resolve().parents[1]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import Base, engine
from app.models import Listing  # noqa: F401


config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Use the same database configuration as the application.
# Escape percent signs for ConfigParser interpolation.
database_url = engine.url.render_as_string(
    hide_password=False
).replace("%", "%%")

config.set_main_option("sqlalchemy.url", database_url)

# Alembic uses this metadata to detect model changes.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Generate migrations without creating a database connection."""

    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations using a live database connection."""

    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()