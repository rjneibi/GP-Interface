from datetime import datetime
from pydantic import BaseModel, ConfigDict


class NoteUpsert(BaseModel):
    tx_id: str
    content: str


class NoteOut(BaseModel):
    id: int
    tx_id: str
    content: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
