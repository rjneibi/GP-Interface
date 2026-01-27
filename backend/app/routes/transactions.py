from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime
import csv
import io

from app.db import get_db
from app.schemas.transaction import TransactionOut, TransactionCreate
from app.schemas.user import UserOut
from app.routes.auth import get_current_user, require_role
from app.crud.transactions import (
    list_transactions, 
    create_transaction,
    get_transaction,
    delete_transaction
)
from app.middleware.security_middleware import limiter

# ✅ ADD THIS IMPORT
from app.crud.audit_logger import (
    log_transaction_created,
    log_transaction_deleted,
    log_report_exported
)

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
async def create(
    request: Request,
    payload: TransactionCreate,
    current_user: UserOut = Depends(get_current_user),  # ✅ ADD THIS
    db: Session = Depends(get_db)
):
    """Create transaction with audit logging"""
    try:
        new_tx = create_transaction(db, payload)
        
        # ✅ LOG TRANSACTION CREATION
        log_transaction_created(
            db=db,
            username=current_user.username,
            user_id=current_user.id,
            tx_id=new_tx.tx_id,
            amount=float(new_tx.amount) if new_tx.amount else 0.0,
            risk_score=new_tx.risk or 0
        )
        
        return new_tx
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
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
async def delete(
    request: Request,
    tx_id: str,
    current_user: UserOut = Depends(require_role(["admin", "superadmin"])),  # ✅ ADD THIS
    db: Session = Depends(get_db)
):
    """Delete transaction with audit logging"""
    success = delete_transaction(db, tx_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # ✅ LOG TRANSACTION DELETION
    log_transaction_deleted(
        db=db,
        username=current_user.username,
        user_id=current_user.id,
        tx_id=tx_id
    )
    
    return {"message": "Transaction deleted successfully"}


@router.get("/export/csv")
@limiter.limit("10/minute")
async def export_transactions_csv(
    request: Request,
    limit: int = Query(500, le=5000),
    current_user: UserOut = Depends(require_role(["admin", "superadmin"])),  # ✅ ADD THIS
    db: Session = Depends(get_db)
):
    """Export transactions as CSV with audit logging"""
    transactions = list_transactions(db, limit=limit)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        'tx_id', 'user', 'amount', 'country', 'device', 'channel', 
        'merchant', 'card_type', 'risk_score', 'label', 'timestamp', 'created_at'
    ])
    
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
    
    # ✅ LOG EXPORT
    log_report_exported(
        db=db,
        username=current_user.username,
        user_id=current_user.id,
        export_format="CSV - Transactions"
    )
    
    filename = f"transactions_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )