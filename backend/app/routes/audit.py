from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, func
from typing import Optional
from datetime import datetime, timedelta

from app.db import get_db
from app.schemas.audit import AuditOut
from app.crud.audit import list_audit
from app.models.audit import AuditLog
from app.models.user import User
from app.routes.auth import get_current_user, require_role
from app.schemas.user import UserOut

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("/", response_model=list[AuditOut])
def get_all(limit: int = 200, db: Session = Depends(get_db)):
    """Get all audit logs (basic endpoint)"""
    return list_audit(db, limit=limit)


# ===== NEW SUPERADMIN ENDPOINTS =====

@router.get("/superadmin/all-users")
def get_all_users_with_activity(
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user)
):
    """Get all users with their recent activity summary"""
    
    users = db.query(User).all()
    start_date = datetime.now() - timedelta(days=7)
    
    user_list = []
    for user in users:
        # Count recent activities - simple approach
        activity_count = db.query(func.count(AuditLog.id)).filter(
            AuditLog.created_at >= start_date
        ).scalar() or 0
        
        user_list.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "activity_last_7_days": activity_count
        })
    
    return {
        "total_users": len(user_list),
        "users": user_list
    }


@router.get("/superadmin/statistics")
def get_audit_statistics(
    days: int = Query(7, description="Number of days for statistics"),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user)
):
    """Get system-wide audit statistics"""
    
    start_date = datetime.now() - timedelta(days=days)
    
    # Total logs in period
    total_logs = db.query(func.count(AuditLog.id)).filter(
        AuditLog.created_at >= start_date
    ).scalar() or 0
    
    # Get all users
    users = db.query(User).all()
    user_activities = []
    
    for user in users:
        # Simple count for now
        count = total_logs // len(users) if len(users) > 0 else 0
        
        user_activities.append({
            "username": user.username,
            "role": user.role,
            "activity_count": count,
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "is_active": user.is_active
        })
    
    # Sort by activity count
    user_activities.sort(key=lambda x: x["activity_count"], reverse=True)
    
    # Get action type distribution
    all_logs = db.query(AuditLog).filter(
        AuditLog.created_at >= start_date
    ).limit(100).all()
    
    action_types = {}
    for log in all_logs:
        action_type = log.action.split()[0] if log.action else "unknown"
        action_types[action_type] = action_types.get(action_type, 0) + 1
    
    return {
        "period_days": days,
        "start_date": start_date.isoformat(),
        "end_date": datetime.now().isoformat(),
        "total_activities": total_logs,
        "total_users": len(users),
        "active_users": len([u for u in user_activities if u["activity_count"] > 0]),
        "user_activities": user_activities,
        "action_distribution": action_types,
        "top_active_users": user_activities[:5]
    }


@router.get("/superadmin/comprehensive")
def get_comprehensive_audit(
    user_filter: Optional[str] = Query(None),
    action_filter: Optional[str] = Query(None),
    limit: int = Query(200),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user)
):
    """Comprehensive audit log for SuperAdmin with filtering"""
    
    query = db.query(AuditLog)
    
    # Filter by user
    if user_filter:
        query = query.filter(
            or_(
                AuditLog.action.contains(user_filter)
            )
        )
    
    # Filter by action type
    if action_filter:
        query = query.filter(AuditLog.action.contains(action_filter))
    
    # Order by most recent first
    query = query.order_by(desc(AuditLog.created_at))
    
    # Apply limit
    logs = query.limit(limit).all()
    
    return {
        "total": len(logs),
        "logs": [
            {
                "id": log.id,
                "action": log.action,
                "meta": log.meta or {},
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
    }


@router.get("/superadmin/user-activity/{username}")
def get_user_activity(
    username: str,
    days: int = Query(30),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user)
):
    """Get all activity for a specific user"""
    
    # Get user
    user = db.query(User).filter(User.username == username).first()
    
    if not user:
        return {
            "error": "User not found",
            "username": username,
            "logs": []
        }
    
    # Calculate date range
    start_date = datetime.now() - timedelta(days=days)
    
    # Query logs that mention this user
    logs = db.query(AuditLog).filter(
        or_(
            AuditLog.action.contains(username),
            AuditLog.action.contains(str(user.id))
        ),
        AuditLog.created_at >= start_date
    ).order_by(desc(AuditLog.created_at)).limit(100).all()
    
    return {
        "username": username,
        "user_id": user.id,
        "role": user.role,
        "total_activities": len(logs),
        "date_range": {
            "from": start_date.isoformat(),
            "to": datetime.now().isoformat()
        },
        "logs": [
            {
                "id": log.id,
                "action": log.action,
                "meta": log.meta or {},
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
    }