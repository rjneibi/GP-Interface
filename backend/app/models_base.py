from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, JSON
from sqlalchemy.sql import func
from .db import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    tx_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g. TX-1001
    user = Column(String(120), nullable=False)
    merchant = Column(String(120), nullable=False)
    amount = Column(Float, nullable=False)
    country = Column(String(50), nullable=False)
    device = Column(String(50), nullable=False)
    channel = Column(String(50), nullable=False)
    card_type = Column(String(50), nullable=False)
    hour = Column(Integer, nullable=False)
    ts = Column(DateTime(timezone=True), server_default=func.now())

    risk = Column(Integer, nullable=True)
    label = Column(String(20), nullable=True)  # GREEN/ORANGE/RED
    explanation = Column(String, nullable=True)
    shap_top = Column(JSON, nullable=True)  # explainability list

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    time = Column(DateTime(timezone=True), server_default=func.now())
    action = Column(String(80), nullable=False)
    meta = Column(JSON, nullable=True)

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    tx_id = Column(String(50), index=True, nullable=False)  # TX-1001
    content = Column(String, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
