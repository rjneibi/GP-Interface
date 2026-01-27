from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.transaction import Transaction
from app.models.case import Case
from app.schemas.transaction import TransactionCreate
from app.crud.audit import add_audit
from ml.fraud_model import predict_fraud


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


def create_transaction(db: Session, transaction: TransactionCreate):
    """Create transaction with ML-based fraud prediction"""
    
    # Prepare transaction data
    tx_data = transaction.model_dump()
    
    # Use ML model to predict fraud risk
    try:
        prediction = predict_fraud(tx_data)
        risk_score = prediction['risk_score']
        
        print(f"🤖 ML Prediction: Risk={risk_score}%, "
              f"Confidence={prediction.get('confidence', 0):.2%}")
        
    except Exception as e:
        print(f"⚠️ ML prediction failed: {e}, using fallback")
        # Fallback to your existing risk calculation
        amount = tx_data.get('amount', 0)
        risk_score = min(30 + (amount // 100), 100)
    
    tx_data['risk'] = risk_score
    
    # Create database record
    db_transaction = Transaction(**tx_data)
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    
    return db_transaction
