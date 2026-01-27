from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import timedelta

from app.db import get_db
from app.schemas.user import (
    UserCreate, UserOut, UserUpdate, PasswordChange,
    Token, LoginRequest
)
from app.crud.users import (
    list_users, create_user, get_user_by_id, update_user,
    delete_user, authenticate_user, change_password, reset_password
)
from app.security import create_access_token, verify_token, TokenData
from app.middleware.security_middleware import limiter

router = APIRouter(prefix="/api/auth", tags=["authentication"])
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> UserOut:
    """Get current authenticated user"""
    token_data = verify_token(credentials)
    
    from app.crud.users import get_user_by_username
    user = get_user_by_username(db, token_data.username)
    
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive")
    
    return UserOut.model_validate(user)


def require_role(allowed_roles: list[str]):
    """Dependency to check user role"""
    def role_checker(current_user: UserOut = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions. Required roles: {allowed_roles}"
            )
        return current_user
    return role_checker


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, login_data: LoginRequest, db: Session = Depends(get_db)):
    """Login endpoint"""
    user = authenticate_user(db, login_data.username, login_data.password)
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password"
        )
    
    # Create access token
    access_token = create_access_token(
        data={
            "sub": user.username,
            "role": user.role,
            "user_id": user.id
        },
        expires_delta=timedelta(hours=8)
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )


@router.post("/change-password")
async def change_user_password(
    password_data: PasswordChange,
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change password (must provide old password)"""
    success = change_password(
        db,
        current_user.id,
        password_data.old_password,
        password_data.new_password
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Invalid old password")
    
    return {"message": "Password changed successfully"}


@router.get("/me", response_model=UserOut)
async def get_current_user_info(current_user: UserOut = Depends(get_current_user)):
    """Get current user information"""
    return current_user


# Admin routes
@router.get("/users", response_model=list[UserOut])
async def get_users(
    current_user: UserOut = Depends(require_role(["admin", "superadmin"])),
    db: Session = Depends(get_db)
):
    """List all users (admin only)"""
    return list_users(db)


@router.post("/users", response_model=dict)
async def create_new_user(
    user_data: UserCreate,
    current_user: UserOut = Depends(require_role(["admin", "superadmin"])),
    db: Session = Depends(get_db)
):
    """Create new user with random password (admin only)"""
    try:
        user, plain_password = create_user(db, user_data, current_user.username)
        return {
            "user": UserOut.model_validate(user),
            "temporary_password": plain_password,
            "message": "User created successfully. Share this password securely with the user."
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/users/{user_id}", response_model=UserOut)
async def update_user_info(
    user_id: int,
    user_data: UserUpdate,
    current_user: UserOut = Depends(require_role(["admin", "superadmin"])),
    db: Session = Depends(get_db)
):
    """Update user (admin only)"""
    user = update_user(db, user_id, user_data, current_user.username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.delete("/users/{user_id}")
async def delete_user_account(
    user_id: int,
    current_user: UserOut = Depends(require_role(["admin", "superadmin"])),
    db: Session = Depends(get_db)
):
    """Delete user (admin only)"""
    # Prevent deleting yourself
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    success = delete_user(db, user_id, current_user.username)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}


@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    current_user: UserOut = Depends(require_role(["admin", "superadmin"])),
    db: Session = Depends(get_db)
):
    """Reset user password (admin only)"""
    try:
        new_password = reset_password(db, user_id, current_user.username)
        return {
            "message": "Password reset successfully",
            "temporary_password": new_password
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
