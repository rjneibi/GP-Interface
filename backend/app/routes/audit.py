from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.audit import AuditOut
from app.crud.audit import list_audit

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("/", response_model=list[AuditOut])
def get_all(limit: int = 200, db: Session = Depends(get_db)):
    return list_audit(db, limit=limit)
