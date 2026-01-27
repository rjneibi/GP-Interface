from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime
import secrets
import string

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.security import get_password_hash, verify_password
from app.crud.audit import add_audit


def generate_random_password(length: int = 12) -> str:
    """Generate a secure random password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    # Ensure password meets complexity requirements
    password = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%^&*")
    ]
    # Fill the rest randomly
    password += [secrets.choice(alphabet) for _ in range(length - 4)]
    # Shuffle
    secrets.SystemRandom().shuffle(password)
    return ''.join(password)


def list_users(db: Session, skip: int = 0, limit: int = 100):
    """List all users"""
    stmt = select(User).offset(skip).limit(limit).order_by(User.created_at.desc())
    return db.execute(stmt).scalars().all()


def get_user_by_username(db: Session, username: str):
    """Get user by username"""
    stmt = select(User).where(User.username == username)
    return db.execute(stmt).scalar_one_or_none()


def get_user_by_email(db: Session, email: str):
    """Get user by email"""
    stmt = select(User).where(User.email == email)
    return db.execute(stmt).scalar_one_or_none()


def get_user_by_id(db: Session, user_id: int):
    """Get user by ID"""
    return db.get(User, user_id)


def create_user(db: Session, user: UserCreate, created_by: str) -> tuple[User, str]:
    """
    Create a new user with random password
    Returns tuple of (User, plain_password)
    """
    # Check if user already exists
    existing = get_user_by_username(db, user.username)
    if existing:
        raise ValueError("Username already exists")
    
    existing_email = get_user_by_email(db, user.email)
    if existing_email:
        raise ValueError("Email already exists")
    
    # Generate random password
    plain_password = generate_random_password()
    hashed_password = get_password_hash(plain_password)
    
    # Create user
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        role=user.role,
        is_active=True,
        must_change_password=True,
        created_by=created_by
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Log audit
    add_audit(db, action="user.created", meta={
        "user_id": db_user.id,
        "username": db_user.username,
        "role": db_user.role,
        "created_by": created_by
    })
    
    return db_user, plain_password


def update_user(db: Session, user_id: int, user_update: UserUpdate, updated_by: str):
    """Update user"""
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return None
    
    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    
    # Log audit
    add_audit(db, action="user.updated", meta={
        "user_id": user_id,
        "username": db_user.username,
        "changes": update_data,
        "updated_by": updated_by
    })
    
    return db_user


def delete_user(db: Session, user_id: int, deleted_by: str):
    """Delete user"""
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return False
    
    username = db_user.username
    db.delete(db_user)
    db.commit()
    
    # Log audit
    add_audit(db, action="user.deleted", meta={
        "user_id": user_id,
        "username": username,
        "deleted_by": deleted_by
    })
    
    return True


def authenticate_user(db: Session, username: str, password: str):
    """Authenticate user and update last_login"""
    user = get_user_by_username(db, username)
    if not user:
        return None
    if not user.is_active:
        return None
    if not verify_password(password, user.hashed_password):
        # Log failed attempt
        add_audit(db, action="login.failed", meta={
            "username": username,
            "reason": "invalid_password"
        })
        return None
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Log successful login
    add_audit(db, action="login.success", meta={
        "user_id": user.id,
        "username": username
    })
    
    return user


def change_password(db: Session, user_id: int, old_password: str, new_password: str):
    """Change user password"""
    user = get_user_by_id(db, user_id)
    if not user:
        return False
    
    # Verify old password
    if not verify_password(old_password, user.hashed_password):
        return False
    
    # Set new password
    user.hashed_password = get_password_hash(new_password)
    user.must_change_password = False
    db.commit()
    
    # Log audit
    add_audit(db, action="password.changed", meta={
        "user_id": user_id,
        "username": user.username
    })
    
    return True


def reset_password(db: Session, user_id: int, reset_by: str) -> str:
    """Reset user password to random (admin function)"""
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError("User not found")
    
    # Generate new random password
    new_password = generate_random_password()
    user.hashed_password = get_password_hash(new_password)
    user.must_change_password = True
    db.commit()
    
    # Log audit
    add_audit(db, action="password.reset", meta={
        "user_id": user_id,
        "username": user.username,
        "reset_by": reset_by
    })
    
    return new_password
