from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas

router = APIRouter(prefix="/layouts", tags=["layouts"])


@router.get("/", response_model=List[schemas.LayoutSummary])
def list_layouts(db: Session = Depends(get_db)):
    return db.query(models.Layout).order_by(models.Layout.created_at.desc()).all()


@router.post("/", response_model=schemas.LayoutOut, status_code=201)
def create_layout(payload: schemas.LayoutCreate, db: Session = Depends(get_db)):
    layout = models.Layout(name=payload.name)
    db.add(layout)
    db.commit()
    db.refresh(layout)
    return layout


@router.get("/{layout_id}", response_model=schemas.LayoutOut)
def get_layout(layout_id: int, db: Session = Depends(get_db)):
    layout = db.query(models.Layout).filter(models.Layout.id == layout_id).first()
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    return layout


@router.put("/{layout_id}", response_model=schemas.LayoutOut)
def update_layout(layout_id: int, payload: schemas.LayoutUpdate, db: Session = Depends(get_db)):
    layout = db.query(models.Layout).filter(models.Layout.id == layout_id).first()
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    if payload.name is not None:
        layout.name = payload.name
    db.commit()
    db.refresh(layout)
    return layout


@router.delete("/{layout_id}", status_code=204)
def delete_layout(layout_id: int, db: Session = Depends(get_db)):
    layout = db.query(models.Layout).filter(models.Layout.id == layout_id).first()
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    db.delete(layout)
    db.commit()
