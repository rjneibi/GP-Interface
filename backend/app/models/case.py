from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db import Base


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)

    tx_id = Column(String(64), ForeignKey("transactions.tx_id", ondelete="CASCADE"), nullable=False, index=True)

    status = Column(String(20), nullable=False, server_default="NEW")
    severity = Column(String(10), nullable=False, server_default="ORANGE")

    assigned_to = Column(String(255), nullable=True)
    decision = Column(String(10), nullable=True)  # APPROVE / REJECT
    decision_reason = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    transaction = relationship("Transaction", back_populates="cases")
    notes = relationship("Note", back_populates="case", cascade="all, delete-orphan")
