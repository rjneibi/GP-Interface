from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import logging

from app.routes import transactions, notes, audit, cases
from app.middleware.security_middleware import (
    SecurityHeadersMiddleware,
    RequestValidationMiddleware,
    RequestLoggingMiddleware,
    XSSProtectionMiddleware,
    limiter
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = FastAPI(
    title="GP-Interface API - Fraud Detection System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Rate limiter state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration
# NOTE: In production, restrict origins to specific domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://transact-shield-2.preview.emergentagent.com"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
    max_age=600,  # Cache preflight requests for 10 minutes
)

# Security Middleware (order matters!)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(XSSProtectionMiddleware)
app.add_middleware(RequestValidationMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# Include routers
app.include_router(transactions.router)
app.include_router(notes.router)
app.include_router(audit.router)
app.include_router(cases.router)


@app.get("/health")
async def health(request: Request):
    """Health check endpoint with rate limiting"""
    return {
        "status": "ok",
        "version": "1.0.0",
        "security": "enabled"
    }


@app.get("/")
async def root(request: Request):
    """Root endpoint"""
    return {
        "message": "Fraud Detection API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }
