from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate


def list_transactions(db: Session, limit: int = 200):
    stmt = select(Transaction).order_by(Transaction.ts.desc()).limit(limit)
    return db.execute(stmt).scalars().all()


def create_transaction(db: Session, payload: TransactionCreate):
    obj = Transaction(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj
