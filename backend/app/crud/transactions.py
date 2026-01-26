from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.transaction import Transaction
from app.models.case import Case
from app.schemas.transaction import TransactionCreate
from app.crud.audit import add_audit


def compute_risk_score(transaction_data: dict):
    """
    Compute risk score (0-100) based on transaction attributes.
    Returns tuple of (risk_score, reasons_list)
    """
    risk = 0
    reasons = []
    
    amount = transaction_data.get("amount", 0)
    country = transaction_data.get("country", "")
    device = transaction_data.get("device", "")
    device_new = transaction_data.get("device_new", False)
    merchant = transaction_data.get("merchant", "")
    hour = transaction_data.get("hour", 12)
    channel = transaction_data.get("channel", "")
    
    # Amount-based risk
    if amount > 50000:
        risk += 40
        reasons.append("Very high amount (>$50k)")
    elif amount > 20000:
        risk += 25
        reasons.append("High amount (>$20k)")
    elif amount > 10000:
        risk += 15
        reasons.append("Elevated amount (>$10k)")
    
    # Country risk
    high_risk_countries = ["NG", "IR", "KP", "SY", "VE", "AF"]
    if country in high_risk_countries:
        risk += 30
        reasons.append(f"High-risk country ({country})")
    elif country and country != "UAE":
        risk += 10
        reasons.append("Foreign transaction")
    
    # Device risk
    if device == "Unknown" or device_new:
        risk += 15
        reasons.append("New or unknown device")
    
    # Merchant risk
    high_risk_merchants = ["crypto", "gambling", "offshore", "casino", "forex"]
    merchant_lower = merchant.lower() if merchant else ""
    if any(keyword in merchant_lower for keyword in high_risk_merchants):
        risk += 25
        reasons.append("High-risk merchant category")
    
    # Time-based risk (late night/early morning)
    if hour is not None and (hour < 6 or hour > 23):
        risk += 10
        reasons.append("Unusual transaction time")
    
    # Channel risk
    if channel == "ATM":
        risk += 5
        reasons.append("ATM transaction")
    
    # Cap at 100
    risk = min(risk, 100)
    
    return risk, reasons


def list_transactions(db: Session, limit: int = 200):
    stmt = select(Transaction).order_by(Transaction.id.desc()).limit(limit)
    return db.execute(stmt).scalars().all()


def get_transaction(db: Session, tx_id: str):
    stmt = select(Transaction).where(Transaction.tx_id == tx_id)
    return db.execute(stmt).scalar_one_or_none()


def delete_transaction(db: Session, tx_id: str):
    obj = get_transaction(db, tx_id)
    if obj:
        db.delete(obj)
        db.commit()
        add_audit(db, action="transaction.delete", meta={"tx_id": tx_id})
        return True
    return False


def create_transaction(db: Session, payload: TransactionCreate):
    # Compute risk score
    transaction_dict = payload.model_dump()
    risk_score, reasons = compute_risk_score(transaction_dict)
    
    # Create transaction with computed risk
    obj = Transaction(**transaction_dict)
    obj.risk = risk_score
    obj.explanation = "; ".join(reasons) if reasons else "Low risk transaction"
    
    db.add(obj)
    db.commit()
    db.refresh(obj)
    
    # Add audit log
    add_audit(db, action="transaction.create", meta={
        "tx_id": obj.tx_id, 
        "amount": obj.amount,
        "risk": risk_score
    })
    
    # Auto-create case if high risk (>= 70)
    if risk_score >= 70:
        severity = "RED" if risk_score >= 90 else "ORANGE"
        case = Case(
            tx_id=obj.tx_id,
            status="NEW",
            severity=severity
        )
        db.add(case)
        db.commit()
        db.refresh(case)
        
        # Log case auto-creation
        add_audit(db, action="case.auto_created", meta={
            "case_id": case.id,
            "tx_id": obj.tx_id,
            "risk": risk_score,
            "severity": severity,
            "reason": "Auto-created from high-risk transaction"
        })
    
    return obj
