from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class AuditCreate(BaseModel):
    action: str
    meta: Optional[dict[str, Any]] = None


class AuditOut(BaseModel):
    id: int
    action: str
    meta: Optional[dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
