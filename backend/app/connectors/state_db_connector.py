"""
PostgreSQL State Database Connector
Manages connections and query execution for Z-Stage
"""

import logging
from typing import Any, Dict, List, Optional
from contextlib import contextmanager

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

from app.config.config import get_settings
from app.queries import CommonQueries

logger = logging.getLogger(__name__)


class StateDBConnector:
    """
    Manages PostgreSQL database connections and query execution
    """

    def __init__(self):
        self.settings = get_settings()
        self.engine = None
        self.SessionLocal = None
        self._connect()

    def _connect(self):
        """Establish connection to PostgreSQL database"""
        try:
            self.engine = create_engine(
                self.settings.postgres_url,
                poolclass=QueuePool,
                pool_size=5,
                max_overflow=10,
                pool_pre_ping=True,
                echo=False,
            )

            self.SessionLocal = sessionmaker(
                autocommit=False, autoflush=False, bind=self.engine
            )

            # Validate the connection immediately
            with self.engine.connect() as conn:
                conn.execute(text(CommonQueries.TEST_CONNECTION))

            logger.info(
                f"Connected to PostgreSQL at {self.settings.POSTGRES_HOST}"
                f":{self.settings.POSTGRES_PORT}/{self.settings.POSTGRES_DB}"
            )
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            raise

    @contextmanager
    def get_session(self) -> Session:
        """
        Context manager that yields a database session with
        auto-commit on success and auto-rollback on error.
        """
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Session error: {e}")
            raise
        finally:
            session.close()

    # ── Public query helpers ──────────────────────────────────────────────────

    def execute_query(
        self, query: str, params: Optional[Dict[str, Any]] = None
    ) -> List[Any]:
        """
        Execute a SELECT (or INSERT/UPDATE … RETURNING) query and return all rows.

        Args:
            query  : SQL string (use :param_name placeholders)
            params : Optional dict of bind parameters

        Returns:
            List of SQLAlchemy Row objects (access columns via row.<col> or dict(row._mapping))
        """
        try:
            with self.get_session() as session:
                result = session.execute(
                    text(query), params or {}
                )
                rows = result.fetchall()
                logger.debug(f"execute_query returned {len(rows)} row(s)")
                return rows
        except Exception as e:
            logger.error(f"execute_query error: {e}")
            raise

    def execute_insert(
        self, query: str, params: Optional[Dict[str, Any]] = None
    ) -> Any:
        """
        Execute an INSERT query.
        If the query has a RETURNING clause, returns the first column of the
        first returned row (typically the new ID).
        Otherwise falls back to lastrowid.

        Args:
            query  : SQL INSERT string
            params : Bind parameters

        Returns:
            Inserted record ID (or None)
        """
        try:
            with self.get_session() as session:
                result = session.execute(text(query), params or {})

                if result.lastrowid:
                    return result.lastrowid

                row = result.fetchone()
                return row[0] if row else None
        except Exception as e:
            logger.error(f"execute_insert error: {e}")
            raise

    def execute_update(
        self, query: str, params: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Execute an UPDATE or DELETE query.

        Args:
            query  : SQL UPDATE/DELETE string
            params : Bind parameters

        Returns:
            Number of rows affected
        """
        try:
            with self.get_session() as session:
                result = session.execute(text(query), params or {})
                return result.rowcount
        except Exception as e:
            logger.error(f"execute_update error: {e}")
            raise

    # ── Utility ───────────────────────────────────────────────────────────────

    def test_connection(self) -> bool:
        """Return True if the database is reachable"""
        try:
            rows = self.execute_query(CommonQueries.TEST_CONNECTION)
            return len(rows) > 0
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False

    def close(self):
        """Dispose of the connection pool"""
        if self.engine:
            try:
                self.engine.dispose()
                logger.info("PostgreSQL connection closed")
            except Exception as e:
                logger.error(f"Error closing connection: {e}")
