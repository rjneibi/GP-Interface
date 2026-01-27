from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)

    tx_id = Column(String(64), unique=True, index=True, nullable=False)

    # "user" is a reserved-ish word, but Postgres can store it fine.
    # Keep it if your DB already uses it.
    user = Column(String(255), nullable=False)

    amount = Column(Float, nullable=False)
    country = Column(String(50), nullable=True)
    device = Column(String(50), nullable=True)
    channel = Column(String(50), nullable=True)
    merchant = Column(String(120), nullable=True)
    card_type = Column(String(50), nullable=True)
    hour = Column(Integer, nullable=True)

    ts = Column(DateTime(timezone=True), nullable=False)

    # Fraud-related fields (these must exist in DB if your API selects them)
    risk = Column(Float, nullable=True)
    label = Column(Integer, nullable=True)
    explanation = Column(String, nullable=True)
    shap_top = Column(JSON, nullable=True)

    # Optional “extra” fields (only matter if you actually use them)
    currency = Column(String(8), nullable=True)
    velocity = Column(Integer, nullable=True)
    device_new = Column(Boolean, nullable=True)
    user_name = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    cases = relationship("Case", back_populates="transaction", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="transaction", cascade="all, delete-orphan")
