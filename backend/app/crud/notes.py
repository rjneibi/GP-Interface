from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.note import Note
from app.schemas.note import NoteUpsert
from app.crud.audit import add_audit


def list_notes(db: Session, tx_id: str, limit: int = 200):
    stmt = select(Note).where(Note.tx_id == tx_id).order_by(Note.created_at.desc()).limit(limit)
    return db.execute(stmt).scalars().all()


def upsert_note(db: Session, payload: NoteUpsert):
    obj = Note(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    add_audit(db, action="note.create", meta={"tx_id": obj.tx_id, "note_id": obj.id})
    return obj
