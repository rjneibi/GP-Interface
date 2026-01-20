from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.note import NoteOut, NoteUpsert
from app.crud.notes import list_notes, upsert_note

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("/", response_model=list[NoteOut])
def get_for_tx(tx_id: str, limit: int = 200, db: Session = Depends(get_db)):
    return list_notes(db, tx_id=tx_id, limit=limit)


@router.post("/", response_model=NoteOut)
def create(payload: NoteUpsert, db: Session = Depends(get_db)):
    return upsert_note(db, payload)
