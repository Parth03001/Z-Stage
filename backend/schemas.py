from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


# ── StationBox ──────────────────────────────────────────────────────────────

class StationBoxBase(BaseModel):
    name: str
    prefix: str
    station_count: int
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


# ── Layout ───────────────────────────────────────────────────────────────────

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

    model_config = {"from_attributes": True}


class LayoutSummary(LayoutBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
