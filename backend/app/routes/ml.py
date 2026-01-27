"""
ML API Endpoints
Add these to a new file: backend/app/routes/ml.py
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.db import get_db
from app.routes.auth import get_current_user, require_role
from app.schemas.user import UserOut
from app.models.transaction import Transaction

router = APIRouter(prefix="/api/ml", tags=["machine-learning"])


@router.post("/predict")
async def predict_transaction_risk(
    transaction_data: Dict[str, Any],
    current_user: UserOut = Depends(get_current_user)
):
    """
    Predict fraud risk for a transaction using ML model
    
    Request body example:
    {
        "amount": 5000,
        "country": "US",
        "merchant": "Amazon",
        "channel": "web",
        "device": "mobile",
        "card_type": "visa"
    }
    """
    
    try:
        from ml.fraud_model import predict_fraud
        
        prediction = predict_fraud(transaction_data)
        
        return {
            "success": True,
            "prediction": prediction,
            "transaction_data": transaction_data
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"ML prediction failed: {str(e)}"
        )


@router.get("/model/info")
async def get_model_information(
    current_user: UserOut = Depends(require_role(["admin", "superadmin"]))
):
    """Get information about the current ML model (Admin only)"""
    
    try:
        from ml.fraud_model import get_model_info
        
        info = get_model_info()
        
        return {
            "success": True,
            "model_info": info
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get model info: {str(e)}"
        )


@router.post("/model/train")
async def train_model_endpoint(
    limit: int = 1000,
    current_user: UserOut = Depends(require_role(["superadmin"])),
    db: Session = Depends(get_db)
):
    """
    Train the ML model using existing transactions (Superadmin only)
    
    This will fetch the latest transactions and retrain the model
    """
    
    try:
        from ml.fraud_model import train_model
        
        # Fetch transactions
        transactions = db.query(Transaction).limit(limit).all()
        
        if not transactions:
            raise HTTPException(
                status_code=400,
                detail="No transactions found for training"
            )
        
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
        
        # Train model
        train_model(tx_list)
        
        return {
            "success": True,
            "message": f"Model trained on {len(tx_list)} transactions",
            "transaction_count": len(tx_list)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Model training failed: {str(e)}"
        )


@router.get("/model/feature-importance")
async def get_feature_importance(
    current_user: UserOut = Depends(require_role(["admin", "superadmin"]))
):
    """Get feature importance from the ML model (Admin only)"""
    
    try:
        from ml.fraud_model import fraud_model
        
        importance = fraud_model.get_feature_importance()
        
        if not importance:
            return {
                "success": False,
                "message": "Model not trained or feature importance not available"
            }
        
        return {
            "success": True,
            "feature_importance": importance
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get feature importance: {str(e)}"
        )