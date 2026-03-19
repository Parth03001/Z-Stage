"""
Database Table Definitions for Z-Stage
Defines all PostgreSQL tables using the dynamic table pattern
"""

import datetime
import logging
from sqlalchemy import (
    Table,
    MetaData,
    Column,
    Integer,
    Float,
    String,
    DateTime,
    ForeignKey,
    Sequence,
    Index,
)

logger = logging.getLogger(__name__)

metadata = MetaData()
DYNAMIC_TABLES: dict = {}


def create_dynamic_table(name, columns, constraints=None, indexes=None):
    """
    Create a SQLAlchemy Table and register it in DYNAMIC_TABLES.

    Args:
        name        : Table name
        columns     : List of Column objects
        constraints : Optional list of constraint objects
        indexes     : Optional list of Index objects

    Returns:
        The created Table object
    """
    logger.debug(f"Defining table '{name}'")
    table_args = list(columns)
    if constraints:
        table_args += constraints
    if indexes:
        table_args += indexes

    table = Table(name, metadata, *table_args)
    DYNAMIC_TABLES[name] = table
    logger.debug(f"Table '{name}' registered in DYNAMIC_TABLES")
    return table


# ── Sequences ─────────────────────────────────────────────────────────────────

layout_id_seq = Sequence("layout_id_seq")
box_id_seq = Sequence("box_id_seq")
icon_id_seq = Sequence("icon_id_seq")
conn_id_seq = Sequence("conn_id_seq")


# ── layouts ───────────────────────────────────────────────────────────────────

create_dynamic_table(
    "layouts",
    [
        Column(
            "id",
            Integer,
            layout_id_seq,
            primary_key=True,
            server_default=layout_id_seq.next_value(),
        ),
        Column("name", String(255), nullable=False),
        Column(
            "created_at",
            DateTime,
            default=datetime.datetime.utcnow,
            nullable=False,
        ),
        Column(
            "updated_at",
            DateTime,
            default=datetime.datetime.utcnow,
            onupdate=datetime.datetime.utcnow,
            nullable=False,
        ),
    ],
    indexes=[
        Index("idx_layouts_created_at", "created_at"),
    ],
)


# ── station_boxes ─────────────────────────────────────────────────────────────

create_dynamic_table(
    "station_boxes",
    [
        Column(
            "id",
            Integer,
            box_id_seq,
            primary_key=True,
            server_default=box_id_seq.next_value(),
        ),
        Column(
            "layout_id",
            Integer,
            ForeignKey("layouts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        Column("name", String(255), nullable=False),
        Column("prefix", String(50), nullable=False),
        Column("station_count", Integer, nullable=False),
        Column("station_ids", String, nullable=True),
        Column("z_labels", String, nullable=True),
        Column("position_x", Float, nullable=False, default=0.0),
        Column("position_y", Float, nullable=False, default=0.0),
        Column("order_index", Integer, nullable=False, default=0),
        Column(
            "created_at",
            DateTime,
            default=datetime.datetime.utcnow,
            nullable=False,
        ),
        Column(
            "updated_at",
            DateTime,
            default=datetime.datetime.utcnow,
            onupdate=datetime.datetime.utcnow,
            nullable=False,
        ),
    ],
    indexes=[
        Index("idx_station_boxes_layout_id", "layout_id"),
        Index("idx_station_boxes_order", "layout_id", "order_index"),
    ],
)


# ── bypass_icons ──────────────────────────────────────────────────────────────

create_dynamic_table(
    "bypass_icons",
    [
        Column(
            "id",
            Integer,
            icon_id_seq,
            primary_key=True,
            server_default=icon_id_seq.next_value(),
        ),
        Column(
            "layout_id",
            Integer,
            ForeignKey("layouts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        Column("position_x", Float, nullable=False, default=0.0),
        Column("position_y", Float, nullable=False, default=0.0),
        Column(
            "created_at",
            DateTime,
            default=datetime.datetime.utcnow,
            nullable=False,
        ),
    ],
    indexes=[
        Index("idx_bypass_icons_layout_id", "layout_id"),
    ],
)


# ── box_connections ───────────────────────────────────────────────────────────

create_dynamic_table(
    "box_connections",
    [
        Column(
            "id",
            Integer,
            conn_id_seq,
            primary_key=True,
            server_default=conn_id_seq.next_value(),
        ),
        Column(
            "layout_id",
            Integer,
            ForeignKey("layouts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        Column(
            "from_box_id",
            Integer,
            ForeignKey("station_boxes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        Column(
            "to_box_id",
            Integer,
            ForeignKey("station_boxes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        Column(
            "created_at",
            DateTime,
            default=datetime.datetime.utcnow,
            nullable=False,
        ),
    ],
    indexes=[
        Index("idx_box_connections_layout_id", "layout_id"),
        Index("idx_box_connections_from", "from_box_id"),
        Index("idx_box_connections_to", "to_box_id"),
    ],
)


logger.info("All Z-Stage table definitions registered")
