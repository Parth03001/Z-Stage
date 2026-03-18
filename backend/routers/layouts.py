from fastapi import APIRouter, Depends, HTTPException
from typing import List

from database import get_connector
from app.connectors.state_db_connector import StateDBConnector
from app.queries import LayoutQueries, StationBoxQueries, BypassIconQueries
import schemas

router = APIRouter(prefix="/layouts", tags=["layouts"])


def _row_to_dict(row) -> dict:
    """Convert a SQLAlchemy Row to a plain dict"""
    return dict(row._mapping)


def _build_layout_out(layout_row, connector: StateDBConnector) -> dict:
    """
    Assemble a full LayoutOut dict by fetching nested boxes and icons
    """
    layout = _row_to_dict(layout_row)

    boxes = connector.execute_query(
        StationBoxQueries.LIST_BY_LAYOUT,
        {"layout_id": layout["id"]},
    )
    icons = connector.execute_query(
        BypassIconQueries.LIST_BY_LAYOUT,
        {"layout_id": layout["id"]},
    )

    layout["station_boxes"] = [_row_to_dict(b) for b in boxes]
    layout["bypass_icons"] = [_row_to_dict(i) for i in icons]
    return layout


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[schemas.LayoutSummary])
def list_layouts(connector: StateDBConnector = Depends(get_connector)):
    rows = connector.execute_query(LayoutQueries.LIST_LAYOUTS)
    return [_row_to_dict(r) for r in rows]


@router.post("/", response_model=schemas.LayoutOut, status_code=201)
def create_layout(
    payload: schemas.LayoutCreate,
    connector: StateDBConnector = Depends(get_connector),
):
    rows = connector.execute_query(
        LayoutQueries.CREATE_LAYOUT, {"name": payload.name}
    )
    if not rows:
        raise HTTPException(status_code=500, detail="Failed to create layout")
    return _build_layout_out(rows[0], connector)


@router.get("/{layout_id}", response_model=schemas.LayoutOut)
def get_layout(
    layout_id: int,
    connector: StateDBConnector = Depends(get_connector),
):
    rows = connector.execute_query(
        LayoutQueries.GET_LAYOUT, {"layout_id": layout_id}
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Layout not found")
    return _build_layout_out(rows[0], connector)


@router.put("/{layout_id}", response_model=schemas.LayoutOut)
def update_layout(
    layout_id: int,
    payload: schemas.LayoutUpdate,
    connector: StateDBConnector = Depends(get_connector),
):
    # Verify exists
    exists = connector.execute_query(
        LayoutQueries.CHECK_EXISTS, {"layout_id": layout_id}
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Layout not found")

    rows = connector.execute_query(
        LayoutQueries.UPDATE_LAYOUT,
        {"layout_id": layout_id, "name": payload.name},
    )
    if not rows:
        raise HTTPException(status_code=500, detail="Failed to update layout")
    return _build_layout_out(rows[0], connector)


@router.delete("/{layout_id}", status_code=204)
def delete_layout(
    layout_id: int,
    connector: StateDBConnector = Depends(get_connector),
):
    exists = connector.execute_query(
        LayoutQueries.CHECK_EXISTS, {"layout_id": layout_id}
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Layout not found")

    connector.execute_update(
        LayoutQueries.DELETE_LAYOUT, {"layout_id": layout_id}
    )
