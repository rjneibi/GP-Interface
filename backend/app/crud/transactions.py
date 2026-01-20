from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate
from app.crud.audit import add_audit


def list_transactions(db: Session, limit: int = 200):
    stmt = select(Transaction).order_by(Transaction.id.desc()).limit(limit)
    return db.execute(stmt).scalars().all()


def create_transaction(db: Session, payload: TransactionCreate):
    obj = Transaction(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    add_audit(db, action="transaction.create", meta={"tx_id": obj.tx_id})
    return obj
