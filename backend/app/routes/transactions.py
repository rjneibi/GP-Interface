from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.transaction import TransactionOut, TransactionCreate
from app.crud.transactions import (
    list_transactions, 
    create_transaction,
    get_transaction,
    delete_transaction
)
from app.middleware.security_middleware import limiter

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("/", response_model=list[TransactionOut])
@limiter.limit("100/minute")
async def get_all(request: Request, limit: int = 200, db: Session = Depends(get_db)):
    """List all transactions with rate limiting"""
    if limit > 500:
        raise HTTPException(status_code=400, detail="Limit cannot exceed 500")
    return list_transactions(db, limit=limit)


@router.post("/", response_model=TransactionOut)
@limiter.limit("50/minute")
async def create(request: Request, payload: TransactionCreate, db: Session = Depends(get_db)):
    """Create transaction with input validation and rate limiting"""
    try:
        return create_transaction(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Log error but don't expose internals
        raise HTTPException(status_code=500, detail="Failed to create transaction")


@router.get("/{tx_id}", response_model=TransactionOut)
@limiter.limit("200/minute")
async def get_single(request: Request, tx_id: str, db: Session = Depends(get_db)):
    """Get single transaction with rate limiting"""
    obj = get_transaction(db, tx_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return obj


@router.delete("/{tx_id}")
@limiter.limit("30/minute")
async def delete(request: Request, tx_id: str, db: Session = Depends(get_db)):
    """Delete transaction with rate limiting"""
    success = delete_transaction(db, tx_id)
    if not success:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted successfully"}
