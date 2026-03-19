"""
SQL Query definitions for Z-Stage
"""

import re


class CommonQueries:
    TEST_CONNECTION = "SELECT 1"


class DatabaseQueries:
    CHECK_DATABASE_EXISTS = (
        "SELECT 1 FROM pg_database WHERE datname = :db_name"
    )

    @staticmethod
    def get_create_database_query(db_name: str) -> str:
        """Return a safe CREATE DATABASE statement (name pre-validated)"""
        return f'CREATE DATABASE "{db_name}"'


class QueryValidator:
    @staticmethod
    def validate_identifier(name: str, label: str = "identifier") -> None:
        """
        Ensure a database identifier contains only safe characters.
        Raises ValueError for invalid names.
        """
        if not re.match(r'^[a-zA-Z][a-zA-Z0-9_]*$', name):
            raise ValueError(
                f"Invalid {label} '{name}': must start with a letter and "
                "contain only letters, digits, or underscores."
            )


# ── Layout queries ────────────────────────────────────────────────────────────

class LayoutQueries:
    LIST_LAYOUTS = """
        SELECT id, name, created_at, updated_at
        FROM layouts
        ORDER BY created_at DESC
    """

    GET_LAYOUT = """
        SELECT id, name, created_at, updated_at
        FROM layouts
        WHERE id = :layout_id
    """

    CREATE_LAYOUT = """
        INSERT INTO layouts (name, created_at, updated_at)
        VALUES (:name, NOW(), NOW())
        RETURNING id, name, created_at, updated_at
    """

    UPDATE_LAYOUT = """
        UPDATE layouts
        SET name = :name, updated_at = NOW()
        WHERE id = :layout_id
        RETURNING id, name, created_at, updated_at
    """

    DELETE_LAYOUT = "DELETE FROM layouts WHERE id = :layout_id"

    CHECK_EXISTS = "SELECT id FROM layouts WHERE id = :layout_id"


# ── Station box queries ───────────────────────────────────────────────────────

class StationBoxQueries:
    LIST_BY_LAYOUT = """
        SELECT id, layout_id, name, prefix, station_count, station_ids, z_labels,
               station_data, position_x, position_y, order_index, created_at, updated_at
        FROM station_boxes
        WHERE layout_id = :layout_id
        ORDER BY order_index, id
    """

    GET_BOX = """
        SELECT id, layout_id, name, prefix, station_count, station_ids, z_labels,
               station_data, position_x, position_y, order_index, created_at, updated_at
        FROM station_boxes
        WHERE id = :box_id
    """

    CREATE_BOX = """
        INSERT INTO station_boxes
            (layout_id, name, prefix, station_count, station_ids, z_labels,
             station_data, position_x, position_y, order_index, created_at, updated_at)
        VALUES
            (:layout_id, :name, :prefix, :station_count, :station_ids, :z_labels,
             :station_data, :position_x, :position_y, :order_index, NOW(), NOW())
        RETURNING id, layout_id, name, prefix, station_count, station_ids, z_labels,
                  station_data, position_x, position_y, order_index, created_at, updated_at
    """

    UPDATE_BOX = """
        UPDATE station_boxes
        SET name          = COALESCE(:name, name),
            prefix        = COALESCE(:prefix, prefix),
            station_count = COALESCE(:station_count, station_count),
            station_ids   = COALESCE(:station_ids, station_ids),
            z_labels      = COALESCE(:z_labels, z_labels),
            station_data  = COALESCE(:station_data, station_data),
            position_x    = COALESCE(:position_x, position_x),
            position_y    = COALESCE(:position_y, position_y),
            order_index   = COALESCE(:order_index, order_index),
            updated_at    = NOW()
        WHERE id = :box_id
        RETURNING id, layout_id, name, prefix, station_count, station_ids, z_labels,
                  station_data, position_x, position_y, order_index, created_at, updated_at
    """

    DELETE_BOX = "DELETE FROM station_boxes WHERE id = :box_id"

    CHECK_EXISTS = "SELECT id FROM station_boxes WHERE id = :box_id"


# ── Bypass icon queries ───────────────────────────────────────────────────────

class BypassIconQueries:
    LIST_BY_LAYOUT = """
        SELECT id, layout_id, position_x, position_y, created_at
        FROM bypass_icons
        WHERE layout_id = :layout_id
        ORDER BY id
    """

    GET_ICON = """
        SELECT id, layout_id, position_x, position_y, created_at
        FROM bypass_icons
        WHERE id = :icon_id
    """

    CREATE_ICON = """
        INSERT INTO bypass_icons (layout_id, position_x, position_y, created_at)
        VALUES (:layout_id, :position_x, :position_y, NOW())
        RETURNING id, layout_id, position_x, position_y, created_at
    """

    UPDATE_ICON = """
        UPDATE bypass_icons
        SET position_x = COALESCE(:position_x, position_x),
            position_y = COALESCE(:position_y, position_y)
        WHERE id = :icon_id
        RETURNING id, layout_id, position_x, position_y, created_at
    """

    DELETE_ICON = "DELETE FROM bypass_icons WHERE id = :icon_id"

    CHECK_EXISTS = "SELECT id FROM bypass_icons WHERE id = :icon_id"


# ── Connection queries ────────────────────────────────────────────────────────

class ConnectionQueries:
    LIST_BY_LAYOUT = """
        SELECT id, layout_id, from_box_id, to_box_id, created_at
        FROM box_connections
        WHERE layout_id = :layout_id
        ORDER BY id
    """

    CREATE_CONNECTION = """
        INSERT INTO box_connections (layout_id, from_box_id, to_box_id, created_at)
        VALUES (:layout_id, :from_box_id, :to_box_id, NOW())
        RETURNING id, layout_id, from_box_id, to_box_id, created_at
    """

    DELETE_CONNECTION = "DELETE FROM box_connections WHERE id = :conn_id"

    CHECK_EXISTS = "SELECT id FROM box_connections WHERE id = :conn_id"


# ── Snapshot queries (full layout sync) ───────────────────────────────────────

class SnapshotQueries:
    DELETE_CONNECTIONS = "DELETE FROM box_connections WHERE layout_id = :layout_id"
    DELETE_BYPASS_ICONS = "DELETE FROM bypass_icons WHERE layout_id = :layout_id"
    DELETE_STATION_BOXES = "DELETE FROM station_boxes WHERE layout_id = :layout_id"
