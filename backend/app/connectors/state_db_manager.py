"""
State Database Manager
Handles database creation and table initialisation for Z-Stage
"""

import logging
from sqlalchemy import create_engine, inspect, text

from app.config.config import get_settings
from app.connectors.table_creation import metadata
from app.queries import DatabaseQueries, QueryValidator

logger = logging.getLogger(__name__)


class StateDBManager:
    """
    Manages database initialisation and table creation for PostgreSQL.
    Call initialize_database() then create_tables_if_not_exists() on startup.
    """

    def __init__(self):
        self.settings = get_settings()
        self.engine = None

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _get_engine(self, database: str = None):
        """
        Return a SQLAlchemy engine connected to `database`.
        Falls back to the default 'postgres' database when database is None,
        which is required for CREATE DATABASE statements.
        """
        if database:
            url = (
                f"postgresql://{self.settings.POSTGRES_USER}"
                f":{self.settings.POSTGRES_PASSWORD}"
                f"@{self.settings.POSTGRES_HOST}"
                f":{self.settings.POSTGRES_PORT}"
                f"/{database}?client_encoding=utf8"
            )
        else:
            url = (
                f"postgresql://{self.settings.POSTGRES_USER}"
                f":{self.settings.POSTGRES_PASSWORD}"
                f"@{self.settings.POSTGRES_HOST}"
                f":{self.settings.POSTGRES_PORT}"
                f"/postgres?client_encoding=utf8"
            )

        return create_engine(url, isolation_level="AUTOCOMMIT")

    # ── Public API ────────────────────────────────────────────────────────────

    def initialize_database(self):
        """
        Create the target database if it does not already exist.
        Database names cannot be parameterised in PostgreSQL, so the name is
        validated first via QueryValidator to prevent SQL injection.
        """
        try:
            db_name = self.settings.POSTGRES_DB
            QueryValidator.validate_identifier(db_name, "database name")

            engine = self._get_engine()          # connect to postgres DB
            with engine.connect() as conn:
                result = conn.execute(
                    text(DatabaseQueries.CHECK_DATABASE_EXISTS),
                    {"db_name": db_name},
                )
                exists = result.fetchone()

                if not exists:
                    logger.info(f"Creating database '{db_name}'")
                    create_sql = DatabaseQueries.get_create_database_query(db_name)
                    conn.execute(text(create_sql))
                    logger.info(f"Database '{db_name}' created successfully")
                else:
                    logger.info(f"Database '{db_name}' already exists")

            engine.dispose()

        except ValueError as e:
            logger.error(f"Invalid database name: {e}")
            raise
        except Exception as e:
            logger.error(f"Error initialising database: {e}")
            raise

    def create_tables_if_not_exists(self):
        """
        Create all tables defined in table_creation.py if they do not exist.
        Uses SQLAlchemy metadata.create_all with checkfirst=True so existing
        tables are never re-created or dropped.
        """
        try:
            self.engine = self._get_engine(self.settings.POSTGRES_DB)

            inspector = inspect(self.engine)
            existing_tables = set(inspector.get_table_names())
            logger.info(f"Existing tables: {existing_tables or '(none)'}")

            logger.info("Running metadata.create_all ...")
            metadata.create_all(self.engine, checkfirst=True)

            inspector = inspect(self.engine)
            new_tables = set(inspector.get_table_names())
            created = new_tables - existing_tables

            if created:
                logger.info(f"Created new tables: {created}")
            else:
                logger.info("All tables already present — nothing created")

            logger.info(f"Total tables in '{self.settings.POSTGRES_DB}': {len(new_tables)}")

            # Migrate existing tables to add new columns if they don't exist
            self._migrate_add_columns()

            self.engine.dispose()

        except Exception as e:
            logger.error(f"Error creating tables: {e}")
            raise

    def _migrate_add_columns(self):
        """Add new columns to existing tables if they don't already exist."""
        migrations = [
            "ALTER TABLE station_boxes ADD COLUMN IF NOT EXISTS station_ids TEXT",
            "ALTER TABLE station_boxes ADD COLUMN IF NOT EXISTS z_labels TEXT",
        ]
        try:
            with self.engine.connect() as conn:
                for sql in migrations:
                    conn.execute(text(sql))
                conn.commit()
            logger.info("Column migrations applied successfully")
        except Exception as e:
            logger.warning(f"Column migration warning (may be harmless): {e}")

    def drop_all_tables(self):
        """Drop all Z-Stage tables. USE WITH EXTREME CAUTION."""
        try:
            logger.warning("Dropping all tables …")
            self.engine = self._get_engine(self.settings.POSTGRES_DB)
            metadata.drop_all(self.engine)
            logger.warning("All tables dropped")
            self.engine.dispose()
        except Exception as e:
            logger.error(f"Error dropping tables: {e}")
            raise

    def list_tables(self) -> list:
        """Return a list of all table names in the target database."""
        try:
            self.engine = self._get_engine(self.settings.POSTGRES_DB)
            inspector = inspect(self.engine)
            tables = inspector.get_table_names()
            self.engine.dispose()

            logger.info(f"Tables in '{self.settings.POSTGRES_DB}': {tables}")
            return tables
        except Exception as e:
            logger.error(f"Error listing tables: {e}")
            raise
