from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.transaction import TransactionOut, TransactionCreate
from app.crud.transactions import (
    list_transactions, 
    create_transaction,
    get_transaction,
    delete_transaction
)

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("/", response_model=list[TransactionOut])
def get_all(limit: int = 200, db: Session = Depends(get_db)):
    return list_transactions(db, limit=limit)


@router.post("/", response_model=TransactionOut)
def create(payload: TransactionCreate, db: Session = Depends(get_db)):
    return create_transaction(db, payload)


@router.get("/{tx_id}", response_model=TransactionOut)
def get_single(tx_id: str, db: Session = Depends(get_db)):
    obj = get_transaction(db, tx_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return obj


@router.delete("/{tx_id}")
def delete(tx_id: str, db: Session = Depends(get_db)):
    success = delete_transaction(db, tx_id)
    if not success:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted successfully"}
