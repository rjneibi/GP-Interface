from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TransactionBase(BaseModel):
    tx_id: str
    user: str
    amount: float
    country: str
    device: str
    channel: str
    merchant: str
    card_type: str
    hour: int
    ts: datetime


class TransactionCreate(TransactionBase):
    pass


class TransactionOut(TransactionBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
