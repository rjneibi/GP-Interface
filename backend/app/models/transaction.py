from sqlalchemy import Column, Integer, String, Float, DateTime, Index
from app.db import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    tx_id = Column(String, index=True, unique=True, nullable=False)

    user = Column(String, nullable=False)
    amount = Column(Float, nullable=False)

    country = Column(String, nullable=False)
    device = Column(String, nullable=False)
    channel = Column(String, nullable=False)
    merchant = Column(String, nullable=False)
    card_type = Column(String, nullable=False)

    hour = Column(Integer, nullable=False)
    ts = Column(DateTime, nullable=False)

Index("ix_transactions_tx_id", Transaction.tx_id)
