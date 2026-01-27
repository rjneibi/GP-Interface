"""
Train the fraud detection model using existing transactions
"""

import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.transaction import Transaction
from ml.fraud_model import train_model, get_model_info


def fetch_transactions(db: Session, limit: int = 1000):
    """Fetch transactions from database"""
    
    transactions = db.query(Transaction).limit(limit).all()
    
    # Convert to dictionaries
    tx_list = []
    for tx in transactions:
        tx_dict = {
            'tx_id': tx.tx_id,
            'amount': float(tx.amount),
            'country': tx.country,
            'merchant': tx.merchant,
            'channel': tx.channel,
            'device': tx.device,
            'card_type': tx.card_type,
            'risk': tx.risk,
            'ts': tx.ts or tx.created_at,
            'created_at': tx.created_at
        }
        tx_list.append(tx_dict)
    
    return tx_list


def main():
    """Train the fraud detection model"""
    
    # Database connection
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql://fraud:fraud@localhost:5432/frauddb"
    )
    
    engine = create_engine(DATABASE_URL)
    db = Session(engine)
    
    print("=" * 60)
    print("🎓 FRAUD DETECTION MODEL TRAINING")
    print("=" * 60)
    
    # Fetch transactions
    print("\n📊 Fetching transactions from database...")
    transactions = fetch_transactions(db, limit=1000)
    
    if not transactions:
        print("❌ No transactions found in database")
        print("💡 Generate some transactions first using the transaction stream")
        return
    
    print(f"✅ Found {len(transactions)} transactions")
    
    # Show distribution
    high_risk = sum(1 for tx in transactions if tx['risk'] >= 70)
    medium_risk = sum(1 for tx in transactions if 40 <= tx['risk'] < 70)
    low_risk = sum(1 for tx in transactions if tx['risk'] < 40)
    
    print(f"\n📈 Risk Distribution:")
    print(f"   High Risk:   {high_risk:4d} ({high_risk/len(transactions)*100:.1f}%)")
    print(f"   Medium Risk: {medium_risk:4d} ({medium_risk/len(transactions)*100:.1f}%)")
    print(f"   Low Risk:    {low_risk:4d} ({low_risk/len(transactions)*100:.1f}%)")
    
    # Train model
    print(f"\n🤖 Training machine learning model...")
    train_model(transactions)
    
    # Show model info
    print("\n📋 Model Information:")
    info = get_model_info()
    print(f"   Model Type: {info['model_type']}")
    print(f"   Model Path: {info['model_path']}")
    
    # Show feature importance
    if info['feature_importance']:
        print("\n⭐ Feature Importance (Top 5):")
        for i, (feature, importance) in enumerate(list(info['feature_importance'].items())[:5]):
            print(f"   {i+1}. {feature:15s} {importance:.4f}")
    
    print("\n" + "=" * 60)
    print("✅ MODEL TRAINING COMPLETE!")
    print("=" * 60)
    print("\n💡 The model will now be used for real-time fraud prediction")
    print("   Restart your backend server to load the new model")
    
    db.close()


if __name__ == "__main__":
    main()