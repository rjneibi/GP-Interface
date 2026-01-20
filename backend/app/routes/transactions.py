from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.transaction import TransactionOut, TransactionCreate
from app.crud.transactions import list_transactions, create_transaction

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("/", response_model=list[TransactionOut])
def get_all(limit: int = 200, db: Session = Depends(get_db)):
    return list_transactions(db, limit=limit)


@router.post("/", response_model=TransactionOut)
def create(payload: TransactionCreate, db: Session = Depends(get_db)):
    return create_transaction(db, payload)
