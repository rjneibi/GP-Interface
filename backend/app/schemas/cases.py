from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class CaseCreate(BaseModel):
    tx_id: str
    assigned_to: Optional[str] = None


class CaseUpdate(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    assigned_to: Optional[str] = None
    decision: Optional[str] = None
    decision_reason: Optional[str] = None


class CaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    tx_id: str
    status: str
    severity: str
    assigned_to: Optional[str] = None
    decision: Optional[str] = None
    decision_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
