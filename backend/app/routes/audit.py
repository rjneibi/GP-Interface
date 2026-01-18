from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.audit import AuditOut, AuditCreate
from app.crud.audit import add_audit, list_audit

router = APIRouter()


@router.get("/", response_model=list[AuditOut])
def get_all(limit: int = 200, db: Session = Depends(get_db)):
    return list_audit(db, limit=limit)


@router.post("/", response_model=AuditOut)
def create(payload: AuditCreate, db: Session = Depends(get_db)):
    return add_audit(db, payload.action, payload.meta)
