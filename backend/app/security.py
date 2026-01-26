# app/security.py
"""
Security module implementing OWASP best practices
"""
import re
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import HTTPException, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, validator, EmailStr
import secrets

# Security Configuration
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Bearer token
security = HTTPBearer()


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


class UserInDB(BaseModel):
    username: str
    email: EmailStr
    hashed_password: str
    role: str
    is_active: bool = True


# Input Validation & Sanitization
class InputValidator:
    """
    OWASP A03:2021 - Injection Prevention
    Validates and sanitizes all user inputs
    """
    
    @staticmethod
    def sanitize_string(value: str, max_length: int = 255) -> str:
        """Remove potentially dangerous characters"""
        if not value:
            return ""
        
        # Remove null bytes
        value = value.replace('\x00', '')
        
        # Limit length
        value = value[:max_length]
        
        # Remove control characters except newline, carriage return, tab
        value = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', value)
        
        return value.strip()
    
    @staticmethod
    def validate_tx_id(tx_id: str) -> str:
        """Validate transaction ID format"""
        # Only allow alphanumeric, hyphens, underscores
        if not re.match(r'^[A-Za-z0-9\-_]{1,64}$', tx_id):
            raise ValueError("Invalid transaction ID format")
        return tx_id
    
    @staticmethod
    def validate_amount(amount: float) -> float:
        """Validate transaction amount"""
        if amount < 0:
            raise ValueError("Amount cannot be negative")
        if amount > 10_000_000:  # 10 million limit
            raise ValueError("Amount exceeds maximum limit")
        return amount
    
    @staticmethod
    def validate_country_code(code: str) -> str:
        """Validate country code (2-3 letter ISO code)"""
        if not re.match(r'^[A-Z]{2,3}$', code.upper()):
            raise ValueError("Invalid country code")
        return code.upper()
    
    @staticmethod
    def validate_email(email: str) -> str:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            raise ValueError("Invalid email format")
        return email.lower()


# Password Hashing (OWASP A07:2021 - Authentication Failures)
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)


def validate_password_strength(password: str) -> bool:
    """
    Enforce strong password policy:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    
    if not re.search(r'[A-Z]', password):
        raise ValueError("Password must contain at least one uppercase letter")
    
    if not re.search(r'[a-z]', password):
        raise ValueError("Password must contain at least one lowercase letter")
    
    if not re.search(r'\d', password):
        raise ValueError("Password must contain at least one digit")
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise ValueError("Password must contain at least one special character")
    
    return True


# JWT Token Management (OWASP A07:2021)
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": secrets.token_urlsafe(16)  # JWT ID for token revocation
    })
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> TokenData:
    """
    Verify JWT token
    Raises HTTPException if token is invalid
    """
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        username: str = payload.get("sub")
        role: str = payload.get("role")
        
        if username is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return TokenData(username=username, role=role)
    
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# Role-Based Access Control (OWASP A01:2021 - Broken Access Control)
def check_permission(token_data: TokenData, required_roles: list[str]) -> bool:
    """Check if user has required role"""
    if token_data.role not in required_roles:
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions"
        )
    return True


# Security Headers
def get_security_headers() -> Dict[str, str]:
    """
    OWASP A05:2021 - Security Misconfiguration
    Return security headers for HTTP responses
    """
    return {
        # Prevent clickjacking
        "X-Frame-Options": "DENY",
        
        # XSS protection
        "X-Content-Type-Options": "nosniff",
        "X-XSS-Protection": "1; mode=block",
        
        # Content Security Policy (XSS prevention)
        "Content-Security-Policy": (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        ),
        
        # HTTPS enforcement
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        
        # Referrer policy
        "Referrer-Policy": "strict-origin-when-cross-origin",
        
        # Permissions policy
        "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    }


# Secure Error Handling (OWASP A05:2021)
def sanitize_error_message(error: Exception) -> str:
    """
    Sanitize error messages to prevent information disclosure
    """
    # Generic error messages for production
    error_messages = {
        "ValueError": "Invalid input provided",
        "KeyError": "Resource not found",
        "TypeError": "Invalid data type",
        "DatabaseError": "Database operation failed",
    }
    
    error_type = type(error).__name__
    return error_messages.get(error_type, "An error occurred")


# Request Size Limiting (OWASP A05:2021)
MAX_REQUEST_SIZE = 10 * 1024 * 1024  # 10 MB


async def check_request_size(request: Request):
    """Limit request body size to prevent DoS"""
    content_length = request.headers.get('content-length')
    
    if content_length:
        content_length = int(content_length)
        if content_length > MAX_REQUEST_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Request body too large"
            )


# SQL Injection Prevention (Already handled by SQLAlchemy ORM)
# SQLAlchemy uses parameterized queries by default
# Always use ORM methods instead of raw SQL


# Audit Logging (OWASP A09:2021 - Security Logging Failures)
def log_security_event(
    event_type: str,
    username: Optional[str],
    ip_address: str,
    details: Dict[str, Any]
):
    """
    Log security-relevant events
    """
    import logging
    
    logger = logging.getLogger("security")
    logger.info(
        f"SECURITY_EVENT: {event_type} | "
        f"User: {username or 'anonymous'} | "
        f"IP: {ip_address} | "
        f"Details: {details}"
    )


# CSRF Protection
def generate_csrf_token() -> str:
    """Generate CSRF token"""
    return secrets.token_urlsafe(32)


def verify_csrf_token(token: str, session_token: str) -> bool:
    """Verify CSRF token"""
    return secrets.compare_digest(token, session_token)
