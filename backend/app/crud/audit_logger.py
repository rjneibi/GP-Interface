"""
Comprehensive Audit Logging System
Industry-level audit trail for all user actions
"""

from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from datetime import datetime
import json


def log_audit(
    db: Session,
    action: str,
    user_id: int = None,
    username: str = None,
    details: dict = None,
    ip_address: str = None,
    user_agent: str = None
):
    """
    Log an audit event to the database
    
    Args:
        db: Database session
        action: Description of the action (e.g., "USER_LOGIN", "TRANSACTION_CREATED")
        user_id: ID of the user performing the action
        username: Username of the user
        details: Additional details as a dictionary
        ip_address: IP address of the request
        user_agent: User agent string
    """
    
    # Build metadata
    meta = details or {}
    
    if user_id:
        meta["user_id"] = user_id
    if username:
        meta["username"] = username
    if ip_address:
        meta["ip_address"] = ip_address
    if user_agent:
        meta["user_agent"] = user_agent
    
    # Create audit log
    audit_entry = AuditLog(
        action=action,
        meta=meta
    )
    
    db.add(audit_entry)
    db.commit()
    
    print(f"[AUDIT] {action} by {username or 'system'} - {json.dumps(meta)}")


# Specific audit logging functions for common actions

def log_user_login(db: Session, username: str, user_id: int, ip_address: str = None, success: bool = True):
    """Log user login attempt"""
    action = "USER_LOGIN_SUCCESS" if success else "USER_LOGIN_FAILED"
    log_audit(
        db=db,
        action=action,
        user_id=user_id if success else None,
        username=username,
        details={"success": success},
        ip_address=ip_address
    )


def log_user_logout(db: Session, username: str, user_id: int, ip_address: str = None):
    """Log user logout"""
    log_audit(
        db=db,
        action="USER_LOGOUT",
        user_id=user_id,
        username=username,
        ip_address=ip_address
    )


def log_password_change(db: Session, username: str, user_id: int, forced: bool = False):
    """Log password change"""
    log_audit(
        db=db,
        action="PASSWORD_CHANGED",
        user_id=user_id,
        username=username,
        details={"forced_change": forced}
    )


def log_user_created(db: Session, created_by_username: str, created_by_id: int, new_username: str, new_user_role: str):
    """Log user creation"""
    log_audit(
        db=db,
        action=f"USER_CREATED: {new_username}",
        user_id=created_by_id,
        username=created_by_username,
        details={
            "new_username": new_username,
            "new_user_role": new_user_role,
            "action_type": "create_user"
        }
    )


def log_user_deleted(db: Session, deleted_by_username: str, deleted_by_id: int, deleted_username: str):
    """Log user deletion"""
    log_audit(
        db=db,
        action=f"USER_DELETED: {deleted_username}",
        user_id=deleted_by_id,
        username=deleted_by_username,
        details={
            "deleted_username": deleted_username,
            "action_type": "delete_user"
        }
    )


def log_transaction_created(db: Session, username: str, user_id: int, tx_id: str, amount: float, risk_score: int):
    """Log transaction creation"""
    log_audit(
        db=db,
        action=f"TRANSACTION_CREATED: {tx_id}",
        user_id=user_id,
        username=username,
        details={
            "transaction_id": tx_id,
            "amount": amount,
            "risk_score": risk_score,
            "action_type": "create_transaction"
        }
    )


def log_transaction_deleted(db: Session, username: str, user_id: int, tx_id: str):
    """Log transaction deletion"""
    log_audit(
        db=db,
        action=f"TRANSACTION_DELETED: {tx_id}",
        user_id=user_id,
        username=username,
        details={
            "transaction_id": tx_id,
            "action_type": "delete_transaction"
        }
    )


def log_case_created(db: Session, username: str, user_id: int, case_id: str, tx_id: str, priority: str):
    """Log case creation"""
    log_audit(
        db=db,
        action=f"CASE_CREATED: {case_id}",
        user_id=user_id,
        username=username,
        details={
            "case_id": case_id,
            "transaction_id": tx_id,
            "priority": priority,
            "action_type": "create_case"
        }
    )


def log_case_updated(db: Session, username: str, user_id: int, case_id: str, status: str = None, assigned_to: str = None):
    """Log case update"""
    details = {
        "case_id": case_id,
        "action_type": "update_case"
    }
    if status:
        details["new_status"] = status
    if assigned_to:
        details["assigned_to"] = assigned_to
    
    log_audit(
        db=db,
        action=f"CASE_UPDATED: {case_id}",
        user_id=user_id,
        username=username,
        details=details
    )


def log_case_resolved(db: Session, username: str, user_id: int, case_id: str, resolution: str):
    """Log case resolution"""
    log_audit(
        db=db,
        action=f"CASE_RESOLVED: {case_id}",
        user_id=user_id,
        username=username,
        details={
            "case_id": case_id,
            "resolution": resolution,
            "action_type": "resolve_case"
        }
    )


def log_note_added(db: Session, username: str, user_id: int, case_id: str, note_preview: str):
    """Log note addition to case"""
    log_audit(
        db=db,
        action=f"NOTE_ADDED to case {case_id}",
        user_id=user_id,
        username=username,
        details={
            "case_id": case_id,
            "note_preview": note_preview[:100],  # First 100 chars
            "action_type": "add_note"
        }
    )


def log_report_generated(db: Session, username: str, user_id: int, report_type: str):
    """Log report generation"""
    log_audit(
        db=db,
        action=f"REPORT_GENERATED: {report_type}",
        user_id=user_id,
        username=username,
        details={
            "report_type": report_type,
            "action_type": "generate_report"
        }
    )


def log_report_exported(db: Session, username: str, user_id: int, export_format: str):
    """Log report export"""
    log_audit(
        db=db,
        action=f"REPORT_EXPORTED: {export_format}",
        user_id=user_id,
        username=username,
        details={
            "export_format": export_format,
            "action_type": "export_report"
        }
    )


def log_settings_changed(db: Session, username: str, user_id: int, setting_name: str, old_value: str, new_value: str):
    """Log settings change"""
    log_audit(
        db=db,
        action=f"SETTINGS_CHANGED: {setting_name}",
        user_id=user_id,
        username=username,
        details={
            "setting_name": setting_name,
            "old_value": old_value,
            "new_value": new_value,
            "action_type": "change_settings"
        }
    )


def log_ml_model_trained(db: Session, username: str, user_id: int, transactions_count: int, accuracy: float):
    """Log ML model training"""
    log_audit(
        db=db,
        action="ML_MODEL_TRAINED",
        user_id=user_id,
        username=username,
        details={
            "transactions_count": transactions_count,
            "accuracy": accuracy,
            "action_type": "train_ml_model"
        }
    )


def log_alert_acknowledged(db: Session, username: str, user_id: int, alert_id: str, alert_type: str):
    """Log alert acknowledgment"""
    log_audit(
        db=db,
        action=f"ALERT_ACKNOWLEDGED: {alert_id}",
        user_id=user_id,
        username=username,
        details={
            "alert_id": alert_id,
            "alert_type": alert_type,
            "action_type": "acknowledge_alert"
        }
    )


def log_permission_denied(db: Session, username: str, user_id: int, attempted_action: str, required_role: str):
    """Log permission denied attempt"""
    log_audit(
        db=db,
        action=f"PERMISSION_DENIED: {attempted_action}",
        user_id=user_id,
        username=username,
        details={
            "attempted_action": attempted_action,
            "required_role": required_role,
            "action_type": "permission_denied"
        }
    )


def log_data_access(db: Session, username: str, user_id: int, resource_type: str, resource_id: str, action: str):
    """Log data access (read/view)"""
    log_audit(
        db=db,
        action=f"DATA_ACCESS: {action} {resource_type} {resource_id}",
        user_id=user_id,
        username=username,
        details={
            "resource_type": resource_type,
            "resource_id": resource_id,
            "access_action": action,
            "action_type": "data_access"
        }
    )