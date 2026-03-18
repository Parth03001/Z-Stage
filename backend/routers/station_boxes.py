from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas

router = APIRouter(tags=["station_boxes"])


@router.get("/layouts/{layout_id}/boxes", response_model=List[schemas.StationBoxOut])
def list_boxes(layout_id: int, db: Session = Depends(get_db)):
    layout = db.query(models.Layout).filter(models.Layout.id == layout_id).first()
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    return layout.station_boxes


@router.post("/layouts/{layout_id}/boxes", response_model=schemas.StationBoxOut, status_code=201)
def create_box(layout_id: int, payload: schemas.StationBoxCreate, db: Session = Depends(get_db)):
    layout = db.query(models.Layout).filter(models.Layout.id == layout_id).first()
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    box = models.StationBox(layout_id=layout_id, **payload.model_dump())
    db.add(box)
    db.commit()
    db.refresh(box)
    return box


@router.put("/boxes/{box_id}", response_model=schemas.StationBoxOut)
def update_box(box_id: int, payload: schemas.StationBoxUpdate, db: Session = Depends(get_db)):
    box = db.query(models.StationBox).filter(models.StationBox.id == box_id).first()
    if not box:
        raise HTTPException(status_code=404, detail="Station box not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(box, field, value)
    db.commit()
    db.refresh(box)
    return box


@router.delete("/boxes/{box_id}", status_code=204)
def delete_box(box_id: int, db: Session = Depends(get_db)):
    box = db.query(models.StationBox).filter(models.StationBox.id == box_id).first()
    if not box:
        raise HTTPException(status_code=404, detail="Station box not found")
    db.delete(box)
    db.commit()
