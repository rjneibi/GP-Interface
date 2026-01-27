from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime


class AuditOut(BaseModel):
    id: int
    action: str
    meta: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True
