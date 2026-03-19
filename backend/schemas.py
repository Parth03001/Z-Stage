from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


# ── StationBox ───────────────────────────────────────────────────────────────

class StationBoxBase(BaseModel):
    name: str
    prefix: str
    station_count: int
    station_ids: Optional[str] = None
    z_labels: Optional[str] = None
    station_data: Optional[str] = None
    position_x: float = 0.0
    position_y: float = 0.0
    order_index: int = 0


class StationBoxCreate(StationBoxBase):
    pass


class StationBoxUpdate(BaseModel):
    name: Optional[str] = None
    prefix: Optional[str] = None
    station_count: Optional[int] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    order_index: Optional[int] = None


class StationBoxOut(StationBoxBase):
    id: int
    layout_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── BypassIcon ───────────────────────────────────────────────────────────────

class BypassIconBase(BaseModel):
    position_x: float = 0.0
    position_y: float = 0.0


class BypassIconCreate(BypassIconBase):
    pass


class BypassIconUpdate(BaseModel):
    position_x: Optional[float] = None
    position_y: Optional[float] = None


class BypassIconOut(BypassIconBase):
    id: int
    layout_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Connection ────────────────────────────────────────────────────────────────

class ConnectionOut(BaseModel):
    id: int
    layout_id: int
    from_box_id: int
    to_box_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Layout ────────────────────────────────────────────────────────────────────

class LayoutBase(BaseModel):
    name: str


class LayoutCreate(LayoutBase):
    pass


class LayoutUpdate(BaseModel):
    name: Optional[str] = None


class LayoutOut(LayoutBase):
    id: int
    created_at: datetime
    updated_at: datetime
    station_boxes: List[StationBoxOut] = []
    bypass_icons: List[BypassIconOut] = []
    connections: List[ConnectionOut] = []

    model_config = {"from_attributes": True}


class LayoutSummary(LayoutBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Snapshot (full layout save) ───────────────────────────────────────────────

class SnapshotBox(BaseModel):
    local_id: str
    name: str
    prefix: str
    station_count: int
    station_ids: Optional[str] = None
    z_labels: Optional[str] = None
    station_data: Optional[str] = None
    position_x: float = 0.0
    position_y: float = 0.0
    order_index: int = 0


class SnapshotBypassIcon(BaseModel):
    local_id: str
    position_x: float = 0.0
    position_y: float = 0.0


class SnapshotConnection(BaseModel):
    from_local_id: str
    to_local_id: str


class LayoutSnapshotCreate(BaseModel):
    name: str
    boxes: List[SnapshotBox] = []
    bypass_icons: List[SnapshotBypassIcon] = []
    connections: List[SnapshotConnection] = []
