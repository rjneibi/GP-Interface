from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.audit import AuditLog


def add_audit(db: Session, action: str, meta: dict | None = None):
    obj = AuditLog(action=action, meta=meta)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def list_audit(db: Session, limit: int = 200):
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    return db.execute(stmt).scalars().all()
