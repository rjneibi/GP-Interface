from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import logging

# Import routes
from app.routes import transactions, notes, audit, cases, auth, reports, database, ml
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

# CREATE APP FIRST
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://fraudguard-40.preview.emergentagent.com"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
    max_age=600,
)

# Security Middleware (order matters!)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(XSSProtectionMiddleware)
app.add_middleware(RequestValidationMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# Include routers (AFTER app is created)
app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(notes.router)
app.include_router(audit.router)
app.include_router(cases.router)
app.include_router(reports.router)
app.include_router(database.router)
app.include_router(ml.router)  # ML router added here

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