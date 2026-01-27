from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.cases import CaseCreate, CaseUpdate, CaseOut
from app.schemas.user import UserOut
from app.routes.auth import get_current_user
from app.crud.cases import list_cases, create_case, update_case, get_case, delete_case

# ✅ ADD THIS IMPORT
from app.crud.audit_logger import (
    log_case_created,
    log_case_updated,
    log_case_resolved
)

router = APIRouter(prefix="/api/cases", tags=["cases"])


@router.get("/", response_model=list[CaseOut])
def get_all(limit: int = 200, db: Session = Depends(get_db)):
    return list_cases(db, limit=limit)


@router.post("/", response_model=CaseOut)
def create(
    payload: CaseCreate,
    current_user: UserOut = Depends(get_current_user),  # ✅ ADD THIS
    db: Session = Depends(get_db)
):
    """Create case with audit logging"""
    new_case = create_case(db, payload)
    
    # ✅ LOG CASE CREATION
    log_case_created(
        db=db,
        username=current_user.username,
        user_id=current_user.id,
        case_id=str(new_case.case_id),
        tx_id=new_case.tx_id or "N/A",
        priority=new_case.priority or "medium"
    )
    
    return new_case


@router.get("/{case_id}", response_model=CaseOut)
def get_single(case_id: int, db: Session = Depends(get_db)):
    obj = get_case(db, case_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Case not found")
    return obj


@router.patch("/{case_id}", response_model=CaseOut)
def patch(
    case_id: int,
    payload: CaseUpdate,
    current_user: UserOut = Depends(get_current_user),  # ✅ ADD THIS
    db: Session = Depends(get_db)
):
    """Update case with audit logging"""
    obj = update_case(db, case_id, payload)
    
    if not obj:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # ✅ LOG CASE UPDATE
    log_case_updated(
        db=db,
        username=current_user.username,
        user_id=current_user.id,
        case_id=str(case_id),
        status=payload.status if hasattr(payload, 'status') else None,
        assigned_to=payload.assigned_to if hasattr(payload, 'assigned_to') else None
    )
    
    # ✅ LOG IF RESOLVED
    if hasattr(payload, 'status') and payload.status == 'resolved':
        log_case_resolved(
            db=db,
            username=current_user.username,
            user_id=current_user.id,
            case_id=str(case_id)
        )
    
    return obj


@router.delete("/{case_id}")
def delete(
    case_id: int,
    current_user: UserOut = Depends(get_current_user),  # ✅ ADD THIS
    db: Session = Depends(get_db)
):
    """Delete case"""
    success = delete_case(db, case_id)
    if not success:
        raise HTTPException(status_code=404, detail="Case not found")
    return {"message": "Case deleted successfully"}