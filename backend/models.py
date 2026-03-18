from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base


class Layout(Base):
    __tablename__ = "layouts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    station_boxes = relationship("StationBox", back_populates="layout", cascade="all, delete-orphan")
    bypass_icons = relationship("BypassIcon", back_populates="layout", cascade="all, delete-orphan")


class StationBox(Base):
    __tablename__ = "station_boxes"

    id = Column(Integer, primary_key=True, index=True)
    layout_id = Column(Integer, ForeignKey("layouts.id"), nullable=False)
    name = Column(String(255), nullable=False)
    prefix = Column(String(50), nullable=False)
    station_count = Column(Integer, nullable=False)
    position_x = Column(Float, default=0.0)
    position_y = Column(Float, default=0.0)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    layout = relationship("Layout", back_populates="station_boxes")


class BypassIcon(Base):
    __tablename__ = "bypass_icons"

    id = Column(Integer, primary_key=True, index=True)
    layout_id = Column(Integer, ForeignKey("layouts.id"), nullable=False)
    position_x = Column(Float, default=0.0)
    position_y = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    layout = relationship("Layout", back_populates="bypass_icons")
