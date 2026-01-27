from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime
import csv
import io

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


@router.get("/export/csv")
@limiter.limit("10/minute")
async def export_transactions_csv(
    request: Request,
    limit: int = Query(500, le=5000),
    db: Session = Depends(get_db)
):
    """Export transactions as CSV file"""
    transactions = list_transactions(db, limit=limit)
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write headers
    writer.writerow([
        'tx_id', 'user', 'amount', 'country', 'device', 'channel', 
        'merchant', 'card_type', 'risk_score', 'label', 'timestamp', 'created_at'
    ])
    
    # Write data
    for tx in transactions:
        label_text = 'GREEN' if tx.risk < 40 else ('ORANGE' if tx.risk < 70 else 'RED') if tx.risk is not None else 'N/A'
        writer.writerow([
            tx.tx_id,
            tx.user,
            tx.amount,
            tx.country or '',
            tx.device or '',
            tx.channel or '',
            tx.merchant or '',
            tx.card_type or '',
            f"{tx.risk:.1f}%" if tx.risk is not None else 'N/A',
            label_text,
            tx.ts.isoformat() if tx.ts else '',
            tx.created_at.isoformat() if tx.created_at else ''
        ])
    
    output.seek(0)
    
    filename = f"transactions_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
