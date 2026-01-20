from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.cases import CaseCreate, CaseUpdate, CaseOut
from app.crud.cases import list_cases, create_case, update_case

router = APIRouter(prefix="/api/cases", tags=["cases"])


@router.get("/", response_model=list[CaseOut])
def get_all(limit: int = 200, db: Session = Depends(get_db)):
    return list_cases(db, limit=limit)


@router.post("/", response_model=CaseOut)
def create(payload: CaseCreate, db: Session = Depends(get_db)):
    return create_case(db, payload)


@router.patch("/{case_id}", response_model=CaseOut)
def patch(case_id: int, payload: CaseUpdate, db: Session = Depends(get_db)):
    obj = update_case(db, case_id, payload)
    if not obj:
        raise HTTPException(status_code=404, detail="Case not found")
    return obj
