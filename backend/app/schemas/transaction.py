from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tx_id: str
    user: str

    amount: float
    country: Optional[str] = None
    device: Optional[str] = None
    channel: Optional[str] = None
    merchant: Optional[str] = None
    card_type: Optional[str] = None
    hour: Optional[int] = None

    ts: datetime

    risk: Optional[float] = None
    label: Optional[int] = None
    explanation: Optional[str] = None
    shap_top: Optional[Any] = None

    currency: Optional[str] = None
    velocity: Optional[int] = None
    device_new: Optional[bool] = None
    user_name: Optional[str] = None

    created_at: datetime
