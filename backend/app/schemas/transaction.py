from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, validator, Field
from app.security import InputValidator


class TransactionCreate(BaseModel):
    tx_id: str = Field(..., min_length=1, max_length=64)
    user: str = Field(..., min_length=1, max_length=255)
    amount: float = Field(..., gt=0, le=10_000_000)
    country: Optional[str] = Field(None, min_length=2, max_length=3)
    device: Optional[str] = Field(None, max_length=50)
    channel: Optional[str] = Field(None, max_length=50)
    merchant: Optional[str] = Field(None, max_length=120)
    card_type: Optional[str] = Field(None, max_length=50)
    hour: Optional[int] = Field(None, ge=0, le=23)
    ts: datetime
    currency: Optional[str] = Field("AED", max_length=8)
    velocity: Optional[int] = Field(None, ge=0)
    device_new: Optional[bool] = False
    user_name: Optional[str] = Field(None, max_length=255)
    
    @validator('tx_id')
    def validate_tx_id(cls, v):
        return InputValidator.validate_tx_id(v)
    
    @validator('amount')
    def validate_amount(cls, v):
        return InputValidator.validate_amount(v)
    
    @validator('country')
    def validate_country(cls, v):
        if v:
            return InputValidator.validate_country_code(v)
        return v
    
    @validator('user', 'merchant', 'device', 'channel', 'card_type', 'user_name')
    def sanitize_strings(cls, v):
        if v:
            return InputValidator.sanitize_string(v)
        return v


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
