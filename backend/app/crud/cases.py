from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.case import Case
from app.schemas.cases import CaseCreate, CaseUpdate
from app.crud.audit import add_audit


def list_cases(db: Session, limit: int = 200):
    stmt = select(Case).order_by(Case.updated_at.desc()).limit(limit)
    return db.execute(stmt).scalars().all()


def create_case(db: Session, payload: CaseCreate):
    obj = Case(
        tx_id=payload.tx_id,
        priority=payload.priority,
        assigned_to=payload.assigned_to,
        status="OPEN",
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    add_audit(db, action="case.create", meta={"case_id": obj.id, "tx_id": obj.tx_id})
    return obj


def update_case(db: Session, case_id: int, payload: CaseUpdate):
    obj = db.get(Case, case_id)
    if not obj:
        return None

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(obj, k, v)

    db.commit()
    db.refresh(obj)
    add_audit(db, action="case.update", meta={"case_id": obj.id, "tx_id": obj.tx_id, "changes": data})
    return obj
