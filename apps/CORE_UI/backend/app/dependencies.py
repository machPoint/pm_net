"""
FastAPI dependencies for authentication and authorization
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from .database import get_db
from .auth import verify_token, check_role_permission
from .models import TokenData, UserRole, User

# HTTP Bearer token scheme
security = HTTPBearer()


def get_current_user_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenData:
    """Extract and verify JWT token from Authorization header"""
    token = credentials.credentials
    return verify_token(token)


def get_current_user(
    token_data: TokenData = Depends(get_current_user_token),
    db: Session = Depends(get_db)
) -> dict:
    """Get current user from database using token data"""
    # Import here to avoid circular imports
    from .routers.auth import demo_users
    
    # Find user in demo_users store
    for user in demo_users.values():
        if user["id"] == token_data.user_id:
            return user
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="User not found"
    )


def get_current_active_user(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Ensure current user is active"""
    if not current_user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


def require_role(required_role: UserRole):
    """Dependency factory for role-based access control"""
    def role_checker(current_user: dict = Depends(get_current_active_user)) -> dict:
        user_role = UserRole(current_user["role"])
        if not check_role_permission(user_role, required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role.value}"
            )
        return current_user
    return role_checker


def require_admin(current_user: dict = Depends(get_current_active_user)) -> dict:
    """Require admin role"""
    return require_role(UserRole.ADMIN)(current_user)


def require_influencer_or_admin(current_user: dict = Depends(get_current_active_user)) -> dict:
    """Require influencer or admin role"""
    return require_role(UserRole.INFLUENCER)(current_user)


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[dict]:
    """Get current user if token is provided, otherwise return None"""
    if not credentials:
        return None
    
    try:
        token_data = verify_token(credentials.credentials)
        # Import here to avoid circular imports
        from .routers.auth import demo_users
        
        # Find user in demo_users store
        for user in demo_users.values():
            if user["id"] == token_data.user_id:
                return user
        
    except HTTPException:
        pass
    
    return None
