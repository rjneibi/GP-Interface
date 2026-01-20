from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db import Base


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)

    tx_id = Column(String(64), ForeignKey("transactions.tx_id", ondelete="CASCADE"), index=True, nullable=False)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=True)

    body = Column(String(2000), nullable=False)
    author = Column(String(120), nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    transaction = relationship("Transaction", back_populates="notes")
    case = relationship("Case", back_populates="notes")
