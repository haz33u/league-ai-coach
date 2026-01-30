from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
import sys
from pathlib import Path
from dotenv import load_dotenv
import os
from alembic import context

# Загружаем .env файл СНАЧАЛА
load_dotenv()

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# ✅ ПРАВИЛЬНЫЕ ИМПОРТЫ для твоей структуры
from app.database import Base
from app.models import Player, RankedStats, MatchHistory

# this is the Alembic Config object
config = context.config

# Получаем DATABASE_URL из переменных окружения
database_url = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:7878@localhost:5432/league_ai_coach"
)

# Устанавливаем URL в конфиг Alembic
config.set_main_option("sqlalchemy.url", database_url)

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = database_url
    
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
