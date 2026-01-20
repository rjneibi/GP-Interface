from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NoteUpsert(BaseModel):
    tx_id: str
    body: str
    author: Optional[str] = None
    case_id: Optional[int] = None


class NoteOut(BaseModel):
    id: int
    tx_id: str
    body: str
    author: Optional[str] = None
    case_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
