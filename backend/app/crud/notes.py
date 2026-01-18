from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.note import Note


def get_note_by_tx(db: Session, tx_id: str):
    stmt = select(Note).where(Note.tx_id == tx_id)
    return db.execute(stmt).scalars().first()


def upsert_note(db: Session, tx_id: str, content: str):
    existing = get_note_by_tx(db, tx_id)
    if existing:
        existing.content = content
        db.commit()
        db.refresh(existing)
        return existing

    obj = Note(tx_id=tx_id, content=content)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def delete_note(db: Session, tx_id: str):
    existing = get_note_by_tx(db, tx_id)
    if not existing:
        return False
    db.delete(existing)
    db.commit()
    return True
