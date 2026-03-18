from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas

router = APIRouter(tags=["bypass_icons"])


@router.get("/layouts/{layout_id}/bypass-icons", response_model=List[schemas.BypassIconOut])
def list_bypass_icons(layout_id: int, db: Session = Depends(get_db)):
    layout = db.query(models.Layout).filter(models.Layout.id == layout_id).first()
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    return layout.bypass_icons


@router.post("/layouts/{layout_id}/bypass-icons", response_model=schemas.BypassIconOut, status_code=201)
def create_bypass_icon(layout_id: int, payload: schemas.BypassIconCreate, db: Session = Depends(get_db)):
    layout = db.query(models.Layout).filter(models.Layout.id == layout_id).first()
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    icon = models.BypassIcon(layout_id=layout_id, **payload.model_dump())
    db.add(icon)
    db.commit()
    db.refresh(icon)
    return icon


@router.put("/bypass-icons/{icon_id}", response_model=schemas.BypassIconOut)
def update_bypass_icon(icon_id: int, payload: schemas.BypassIconUpdate, db: Session = Depends(get_db)):
    icon = db.query(models.BypassIcon).filter(models.BypassIcon.id == icon_id).first()
    if not icon:
        raise HTTPException(status_code=404, detail="Bypass icon not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(icon, field, value)
    db.commit()
    db.refresh(icon)
    return icon


@router.delete("/bypass-icons/{icon_id}", status_code=204)
def delete_bypass_icon(icon_id: int, db: Session = Depends(get_db)):
    icon = db.query(models.BypassIcon).filter(models.BypassIcon.id == icon_id).first()
    if not icon:
        raise HTTPException(status_code=404, detail="Bypass icon not found")
    db.delete(icon)
    db.commit()
