from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.note import NoteOut, NoteUpsert
from app.crud.notes import get_note_by_tx, upsert_note, delete_note
from app.crud.audit import add_audit

router = APIRouter()


@router.get("/{tx_id}", response_model=NoteOut)
def get_note(tx_id: str, db: Session = Depends(get_db)):
    note = get_note_by_tx(db, tx_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.put("/", response_model=NoteOut)
def put_note(payload: NoteUpsert, db: Session = Depends(get_db)):
    note = upsert_note(db, payload.tx_id, payload.content)
    add_audit(db, "TX_NOTE_UPSERT", {"tx_id": payload.tx_id, "length": len(payload.content or "")})
    return note


@router.delete("/{tx_id}")
def remove(tx_id: str, db: Session = Depends(get_db)):
    ok = delete_note(db, tx_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Note not found")
    add_audit(db, "TX_NOTE_DELETED", {"tx_id": tx_id})
    return {"deleted": True}
