"""
Authentication router for CORE-SE Backend
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List

from ..database import get_db
from ..models import (
    UserCreate, UserLogin, UserUpdate, UserResponse, Token, 
    PasswordChange, UserRole, User
)
from ..auth import (
    hash_password, verify_password, create_token_response, generate_user_id
)
from ..dependencies import (
    get_current_user, get_current_active_user, require_admin,
    require_role
)

router = APIRouter(prefix="/auth", tags=["authentication"])

# In-memory user store for demo (replace with database operations later)
demo_users = {
    "admin": {
        "id": "admin-user-1",
        "username": "admin",
        "email": "admin@aerospace.com",
        "full_name": "Sarah Chen",
        "hashed_password": hash_password("admin123"),
        "role": UserRole.ADMIN,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "last_login": None,
        "first_name": "Sarah",
        "last_name": "Chen",
        "city": "Houston",
        "timezone": "UTC-6",
        "communication_style": "technical",
        "encouragement_level": "medium",
        "feedback_style": "direct",
        "interests": ["systems engineering", "project management"],
        "goals": ["ensure mission success", "maintain engineering standards"],
        "work_style": "methodical and thorough"
    },
    "sys_engineer": {
        "id": "engineer-user-1", 
        "username": "sys_engineer",
        "email": "mike.rodriguez@aerospace.com",
        "full_name": "Mike Rodriguez",
        "hashed_password": hash_password("engineer123"),
        "role": UserRole.INFLUENCER,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "last_login": None,
        "first_name": "Mike",
        "last_name": "Rodriguez",
        "city": "Los Angeles",
        "timezone": "UTC-8",
        "communication_style": "collaborative",
        "encouragement_level": "high",
        "feedback_style": "detailed",
        "interests": ["requirements analysis", "interface design", "electrical systems"],
        "goals": ["optimize system architecture", "improve traceability"],
        "work_style": "analytical and detail-oriented"
    },
    "analyst": {
        "id": "analyst-user-1",
        "username": "analyst", 
        "email": "alex.kim@aerospace.com",
        "full_name": "Alex Kim",
        "hashed_password": hash_password("analyst123"),
        "role": UserRole.CONSUMER,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "last_login": None,
        "first_name": "Alex",
        "last_name": "Kim",
        "city": "Washington DC",
        "timezone": "UTC-5",
        "communication_style": "precise",
        "encouragement_level": "medium",
        "feedback_style": "constructive",
        "interests": ["thermal analysis", "test planning", "verification"],
        "goals": ["ensure requirements compliance", "track test coverage"],
        "work_style": "systematic and organized"
    }
}


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    
    # Check if username or email already exists
    for existing_user in demo_users.values():
        if existing_user["username"] == user_data.username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        if existing_user["email"] == user_data.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Create new user
    user_id = generate_user_id()
    hashed_password = hash_password(user_data.password)
    
    new_user = {
        "id": user_id,
        "username": user_data.username,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "hashed_password": hashed_password,
        "role": user_data.role,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "last_login": None,
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "city": user_data.city,
        "timezone": user_data.timezone,
        "communication_style": "friendly",
        "encouragement_level": "medium",
        "feedback_style": "supportive",
        "interests": [],
        "goals": [],
        "work_style": ""
    }
    
    # Store in demo users (replace with database insert)
    demo_users[user_data.username] = new_user
    
    # Create token response
    return create_token_response(new_user)


@router.post("/login", response_model=Token)
async def login_user(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """Authenticate user and return access token"""
    
    # Find user by username or email
    user = None
    for u in demo_users.values():
        if u["username"] == login_data.username or u["email"] == login_data.username:
            user = u
            break
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Verify password
    if not verify_password(login_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Check if user is active
    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    
    # Update last login
    user["last_login"] = datetime.now(timezone.utc)
    
    # Create token response
    return create_token_response(user)


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: dict = Depends(get_current_active_user)
):
    """Get current user profile"""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        username=current_user["username"],
        full_name=current_user["full_name"],
        role=current_user["role"],
        is_active=current_user["is_active"],
        created_at=current_user["created_at"],
        last_login=current_user["last_login"]
    )


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    
    # Find user in demo store
    user = None
    for u in demo_users.values():
        if u["id"] == current_user["id"]:
            user = u
            break
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(user, field) or field in user:
            user[field] = value
    
    user["updated_at"] = datetime.now(timezone.utc)
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        username=user["username"],
        full_name=user["full_name"],
        role=user["role"],
        is_active=user["is_active"],
        created_at=user["created_at"],
        last_login=user["last_login"]
    )


@router.post("/change-password")
async def change_password(
    password_change: PasswordChange,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    
    # Find user in demo store
    user = None
    for u in demo_users.values():
        if u["id"] == current_user["id"]:
            user = u
            break
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not verify_password(password_change.current_password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    # Update password
    user["hashed_password"] = hash_password(password_change.new_password)
    user["updated_at"] = datetime.now(timezone.utc)
    
    return {"message": "Password updated successfully"}


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all users (admin only)"""
    
    users = []
    for user in demo_users.values():
        users.append(UserResponse(
            id=user["id"],
            email=user["email"],
            username=user["username"],
            full_name=user["full_name"],
            role=user["role"],
            is_active=user["is_active"],
            created_at=user["created_at"],
            last_login=user["last_login"]
        ))
    
    return users


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    new_role: UserRole,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update user role (admin only)"""
    
    # Find user
    target_user = None
    for u in demo_users.values():
        if u["id"] == user_id:
            target_user = u
            break
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update role
    target_user["role"] = new_role
    target_user["updated_at"] = datetime.now(timezone.utc)
    
    return {"message": f"User role updated to {new_role.value}"}


@router.put("/users/{user_id}/status")
async def toggle_user_status(
    user_id: str,
    is_active: bool,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Activate/deactivate user account (admin only)"""
    
    # Find user
    target_user = None
    for u in demo_users.values():
        if u["id"] == user_id:
            target_user = u
            break
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update status
    target_user["is_active"] = is_active
    target_user["updated_at"] = datetime.now(timezone.utc)
    
    status_text = "activated" if is_active else "deactivated"
    return {"message": f"User account {status_text}"}


@router.post("/logout")
async def logout_user(current_user: dict = Depends(get_current_active_user)):
    """Logout user (invalidate token on client side)"""
    return {"message": "Successfully logged out"}