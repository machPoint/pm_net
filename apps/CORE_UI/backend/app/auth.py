"""
Authentication utilities for CORE-SE Backend
"""

import jwt
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from passlib.context import CryptContext
from fastapi import HTTPException, status
from .config import get_settings
from .models import TokenData, UserRole

# Password context for hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Get settings
settings = get_settings()


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def generate_user_id() -> str:
    """Generate a unique user ID"""
    return str(uuid.uuid4())


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    # Use JWT secret key or fallback to demo token for development
    secret_key = settings.JWT_SECRET_KEY or settings.DEMO_AUTH_TOKEN
    
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> TokenData:
    """Verify and decode a JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Use JWT secret key or fallback to demo token for development
        secret_key = settings.JWT_SECRET_KEY or settings.DEMO_AUTH_TOKEN
        
        payload = jwt.decode(token, secret_key, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        user_id: str = payload.get("user_id")
        role: str = payload.get("role")
        exp: int = payload.get("exp")
        
        if username is None or user_id is None:
            raise credentials_exception
            
        token_data = TokenData(
            username=username,
            user_id=user_id,
            role=UserRole(role) if role else None,
            exp=exp
        )
        
        return token_data
        
    except jwt.PyJWTError:
        raise credentials_exception


def create_token_response(user_data: dict) -> dict:
    """Create a complete token response"""
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    token_data = {
        "sub": user_data["username"],
        "user_id": user_data["id"],
        "role": user_data["role"],
    }
    
    access_token = create_access_token(
        data=token_data, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Convert to seconds
        "user": {
            "id": user_data["id"],
            "email": user_data["email"],
            "username": user_data["username"],
            "full_name": user_data["full_name"],
            "role": user_data["role"],
            "is_active": user_data["is_active"],
            "created_at": user_data["created_at"],
            "last_login": user_data.get("last_login")
        }
    }


def check_role_permission(user_role: UserRole, required_role: UserRole) -> bool:
    """Check if user role has permission for required role"""
    role_hierarchy = {
        UserRole.CONSUMER: 1,
        UserRole.INFLUENCER: 2,
        UserRole.ADMIN: 3
    }
    
    return role_hierarchy.get(user_role, 0) >= role_hierarchy.get(required_role, 0)


def require_role(required_role: UserRole):
    """Decorator factory for role-based access control"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # This will be used with FastAPI dependencies
            return func(*args, **kwargs)
        return wrapper
    return decorator