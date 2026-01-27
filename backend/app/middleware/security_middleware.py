# app/middleware/security_middleware.py
"""
Security middleware implementing OWASP best practices
"""
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import time
import secrets
from app.security import get_security_headers, log_security_event

# Rate Limiter (OWASP - DoS Prevention)
limiter = Limiter(key_func=get_remote_address)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses
    OWASP A05:2021 - Security Misconfiguration
    """
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Add security headers
        headers = get_security_headers()
        for key, value in headers.items():
            response.headers[key] = value
        
        return response


class RequestValidationMiddleware(BaseHTTPMiddleware):
    """
    Validate all incoming requests
    OWASP A03:2021 - Injection Prevention
    """
    
    async def dispatch(self, request: Request, call_next):
        # Check request size
        content_length = request.headers.get('content-length')
        if content_length and int(content_length) > 10 * 1024 * 1024:  # 10 MB
            return JSONResponse(
                status_code=413,
                content={"detail": "Request body too large"}
            )
        
        # Validate content type for POST/PUT/PATCH
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get('content-type', '')
            if content_type and 'application/json' not in content_type:
                # Only allow JSON for API endpoints
                if request.url.path.startswith('/api/'):
                    return JSONResponse(
                        status_code=415,
                        content={"detail": "Unsupported Media Type. Expected application/json"}
                    )
        
        response = await call_next(request)
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Log all requests for security monitoring
    OWASP A09:2021 - Security Logging Failures
    """
    
    async def dispatch(self, request: Request, call_next):
        # Generate request ID
        request_id = secrets.token_urlsafe(8)
        request.state.request_id = request_id
        
        # Log request
        start_time = time.time()
        
        try:
            response = await call_next(request)
            
            # Calculate request duration
            duration = time.time() - start_time
            
            # Log security events for sensitive endpoints
            if request.url.path.startswith('/api/'):
                log_security_event(
                    event_type="API_REQUEST",
                    username=getattr(request.state, 'username', None),
                    ip_address=request.client.host,
                    details={
                        "request_id": request_id,
                        "method": request.method,
                        "path": request.url.path,
                        "status_code": response.status_code,
                        "duration_ms": round(duration * 1000, 2)
                    }
                )
            
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            
            return response
        
        except Exception as e:
            # Log error
            log_security_event(
                event_type="REQUEST_ERROR",
                username=getattr(request.state, 'username', None),
                ip_address=request.client.host,
                details={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "error": str(e)
                }
            )
            raise


class XSSProtectionMiddleware(BaseHTTPMiddleware):
    """
    Additional XSS protection
    OWASP A03:2021 - Injection (XSS)
    """
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Ensure JSON responses have correct content type
        if response.headers.get('content-type', '').startswith('application/json'):
            # Prevent JSON hijacking
            response.headers['X-Content-Type-Options'] = 'nosniff'
        
        return response


class IPWhitelistMiddleware(BaseHTTPMiddleware):
    """
    Optional IP whitelisting for admin endpoints
    OWASP A01:2021 - Broken Access Control
    """
    
    def __init__(self, app, whitelist: list = None):
        super().__init__(app)
        self.whitelist = whitelist or []
    
    async def dispatch(self, request: Request, call_next):
        # Only apply to admin endpoints
        if request.url.path.startswith('/api/admin/'):
            client_ip = request.client.host
            
            if self.whitelist and client_ip not in self.whitelist:
                log_security_event(
                    event_type="UNAUTHORIZED_ACCESS_ATTEMPT",
                    username=None,
                    ip_address=client_ip,
                    details={
                        "path": request.url.path,
                        "reason": "IP not in whitelist"
                    }
                )
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Access denied"}
                )
        
        response = await call_next(request)
        return response


# Rate limiting decorators
def rate_limit_by_endpoint():
    """
    Rate limiting decorator
    Different limits for different endpoint types
    """
    def decorator(endpoint_type: str):
        limits = {
            "public": "100/minute",
            "authenticated": "500/minute",
            "admin": "1000/minute"
        }
        return limiter.limit(limits.get(endpoint_type, "100/minute"))
    
    return decorator
