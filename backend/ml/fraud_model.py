"""
Fraud Detection Machine Learning Model
Uses Random Forest for transaction risk prediction
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import os
from datetime import datetime
from pathlib import Path


class FraudDetectionModel:
    """Machine Learning model for fraud detection"""
    
    def __init__(self, model_path: str = "models/fraud_model.joblib"):
        self.model_path = Path(model_path)
        self.model = None
        self.scaler = StandardScaler()
        self.encoders = {}
        self.feature_names = [
            'amount', 'country', 'merchant', 'channel', 
            'device', 'card_type', 'hour', 'day_of_week'
        ]
        
        # Risk thresholds
        self.HIGH_RISK_THRESHOLD = 0.7
        self.MEDIUM_RISK_THRESHOLD = 0.4
        
        # Load model if exists
        if self.model_path.exists():
            self.load_model()
        else:
            self.initialize_model()
    
    def initialize_model(self):
        """Initialize a new Random Forest model"""
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        print("✅ New fraud detection model initialized")
    
    def extract_features(self, transaction: dict) -> pd.DataFrame:
        """Extract features from a transaction"""
        
        # Parse timestamp
        ts = transaction.get('ts') or transaction.get('created_at') or datetime.now().isoformat()
        if isinstance(ts, str):
            ts = pd.to_datetime(ts)
        
        # Extract time features
        hour = ts.hour if hasattr(ts, 'hour') else 0
        day_of_week = ts.weekday() if hasattr(ts, 'weekday') else 0
        
        # Create feature dictionary
        features = {
            'amount': float(transaction.get('amount', 0)),
            'country': str(transaction.get('country', 'UNKNOWN')),
            'merchant': str(transaction.get('merchant', 'UNKNOWN')),
            'channel': str(transaction.get('channel', 'UNKNOWN')),
            'device': str(transaction.get('device', 'UNKNOWN')),
            'card_type': str(transaction.get('card_type', 'UNKNOWN')),
            'hour': hour,
            'day_of_week': day_of_week
        }
        
        return pd.DataFrame([features])
    
    def encode_features(self, df: pd.DataFrame, fit: bool = False) -> pd.DataFrame:
        """Encode categorical features"""
        
        categorical_features = ['country', 'merchant', 'channel', 'device', 'card_type']
        
        for col in categorical_features:
            if col not in df.columns:
                continue
                
            if fit:
                # Create and fit encoder
                self.encoders[col] = LabelEncoder()
                df[col] = self.encoders[col].fit_transform(df[col].astype(str))
            else:
                # Use existing encoder, handle unknown categories
                if col in self.encoders:
                    # Handle unknown categories
                    known_categories = set(self.encoders[col].classes_)
                    df[col] = df[col].apply(
                        lambda x: x if x in known_categories else self.encoders[col].classes_[0]
                    )
                    df[col] = self.encoders[col].transform(df[col].astype(str))
                else:
                    # Fallback: use simple hash encoding
                    df[col] = df[col].astype(str).apply(hash).abs() % 1000
        
        return df
    
    def train(self, transactions: list[dict], labels: list[int] = None):
        """
        Train the model on historical transactions
        
        Args:
            transactions: List of transaction dictionaries
            labels: List of fraud labels (1=fraud, 0=legitimate)
                   If None, uses risk score to generate labels
        """
        
        if not transactions:
            print("⚠️ No transactions provided for training")
            return
        
        # Convert to DataFrame
        df = pd.DataFrame(transactions)
        
        # Generate labels if not provided (based on risk score)
        if labels is None:
            if 'risk' in df.columns:
                labels = (df['risk'] >= 70).astype(int).tolist()
            else:
                print("⚠️ No risk scores or labels provided")
                return
        
        # Extract features
        features_list = []
        for tx in transactions:
            features_df = self.extract_features(tx)
            features_list.append(features_df)
        
        X = pd.concat(features_list, ignore_index=True)
        y = np.array(labels)
        
        # Encode categorical features
        X = self.encode_features(X, fit=True)
        
        # Scale numerical features
        X = pd.DataFrame(
            self.scaler.fit_transform(X),
            columns=X.columns
        )
        
        # Train model
        print(f"🎓 Training model on {len(X)} transactions...")
        self.model.fit(X, y)
        
        # Calculate accuracy
        train_score = self.model.score(X, y)
        print(f"✅ Model trained! Training accuracy: {train_score:.2%}")
        
        # Save model
        self.save_model()
    
    def predict(self, transaction: dict) -> dict:
        """
        Predict fraud probability for a transaction
        
        Returns:
            dict with 'risk_score', 'risk_level', 'is_fraud', 'confidence'
        """
        
        if self.model is None:
            # Fallback to rule-based system
            return self._rule_based_prediction(transaction)
        
        try:
            # Extract and encode features
            X = self.extract_features(transaction)
            X = self.encode_features(X, fit=False)
            
            # Scale features
            X = pd.DataFrame(
                self.scaler.transform(X),
                columns=X.columns
            )
            
            # Predict probability
            proba = self.model.predict_proba(X)[0]
            fraud_probability = proba[1] if len(proba) > 1 else 0.5
            
            # Convert to risk score (0-100)
            risk_score = int(fraud_probability * 100)
            
            # Determine risk level
            if risk_score >= 70:
                risk_level = "HIGH"
            elif risk_score >= 40:
                risk_level = "MEDIUM"
            else:
                risk_level = "LOW"
            
            return {
                'risk_score': risk_score,
                'risk_level': risk_level,
                'is_fraud': risk_score >= self.HIGH_RISK_THRESHOLD * 100,
                'confidence': float(max(proba)),
                'fraud_probability': float(fraud_probability),
                'model_version': 'RandomForest_v1'
            }
            
        except Exception as e:
            print(f"❌ ML prediction error: {e}")
            return self._rule_based_prediction(transaction)
    
    def _rule_based_prediction(self, transaction: dict) -> dict:
        """Fallback rule-based fraud detection"""
        
        amount = transaction.get('amount', 0)
        country = transaction.get('country', '')
        channel = transaction.get('channel', '')
        
        risk_score = 30  # Base risk
        
        # Amount-based rules
        if amount > 10000:
            risk_score += 30
        elif amount > 5000:
            risk_score += 20
        elif amount > 1000:
            risk_score += 10
        
        # Country-based rules
        high_risk_countries = ['NG', 'RU', 'CN']  # Example
        if country in high_risk_countries:
            risk_score += 25
        
        # Channel-based rules
        if channel == 'atm':
            risk_score += 15
        
        # Time-based rules (if timestamp available)
        ts = transaction.get('ts') or transaction.get('created_at')
        if ts:
            if isinstance(ts, str):
                ts = pd.to_datetime(ts)
            if hasattr(ts, 'hour'):
                hour = ts.hour
                if hour >= 23 or hour <= 5:  # Late night transactions
                    risk_score += 20
        
        risk_score = min(risk_score, 100)
        
        if risk_score >= 70:
            risk_level = "HIGH"
        elif risk_score >= 40:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        return {
            'risk_score': risk_score,
            'risk_level': risk_level,
            'is_fraud': risk_score >= 70,
            'confidence': 0.6,
            'fraud_probability': risk_score / 100,
            'model_version': 'RuleBased_v1'
        }
    
    def get_feature_importance(self) -> dict:
        """Get feature importance from the trained model"""
        
        if self.model is None or not hasattr(self.model, 'feature_importances_'):
            return {}
        
        importance = dict(zip(
            self.feature_names,
            self.model.feature_importances_
        ))
        
        # Sort by importance
        importance = dict(sorted(
            importance.items(),
            key=lambda x: x[1],
            reverse=True
        ))
        
        return importance
    
    def save_model(self):
        """Save model to disk"""
        
        # Create models directory
        self.model_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save model and preprocessing objects
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'encoders': self.encoders,
            'feature_names': self.feature_names,
            'timestamp': datetime.now().isoformat()
        }
        
        joblib.dump(model_data, self.model_path)
        print(f"✅ Model saved to {self.model_path}")
    
    def load_model(self):
        """Load model from disk"""
        
        try:
            model_data = joblib.load(self.model_path)
            self.model = model_data['model']
            self.scaler = model_data['scaler']
            self.encoders = model_data['encoders']
            self.feature_names = model_data.get('feature_names', self.feature_names)
            print(f"✅ Model loaded from {self.model_path}")
            print(f"   Trained: {model_data.get('timestamp', 'Unknown')}")
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            self.initialize_model()


# Global model instance
fraud_model = FraudDetectionModel()


def predict_fraud(transaction: dict) -> dict:
    """
    Main function to predict fraud for a transaction
    
    Args:
        transaction: Transaction dictionary with features
        
    Returns:
        Prediction dictionary with risk_score, risk_level, etc.
    """
    return fraud_model.predict(transaction)


def train_model(transactions: list[dict], labels: list[int] = None):
    """
    Train the fraud detection model
    
    Args:
        transactions: List of historical transactions
        labels: Optional fraud labels (1=fraud, 0=legitimate)
    """
    fraud_model.train(transactions, labels)


def get_model_info() -> dict:
    """Get information about the current model"""
    
    return {
        'model_loaded': fraud_model.model is not None,
        'model_type': type(fraud_model.model).__name__ if fraud_model.model else None,
        'feature_importance': fraud_model.get_feature_importance(),
        'model_path': str(fraud_model.model_path)
    }