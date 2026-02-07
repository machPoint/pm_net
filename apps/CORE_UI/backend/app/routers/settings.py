"""
User settings API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_current_user
from app.models import User
from app.database import get_db, UserSettingsDB
from datetime import datetime

router = APIRouter(tags=["settings"])


class AIPromptSettings(BaseModel):
    """AI prompt configuration"""
    domain_focus: List[str] = Field(default_factory=lambda: ["interfaces", "electrical"])
    response_style: str = Field("detailed", description="Brief, standard, detailed, or technical")
    analysis_depth: str = Field("standard", description="Shallow, standard, or deep")
    custom_system_prompt: str = Field("", description="General system prompt override")
    relationship_prompt: str = Field("", description="Relationship analysis specific prompt")
    impact_prompt: str = Field("", description="Impact analysis specific prompt")


class DisplaySettings(BaseModel):
    """Display and appearance settings"""
    theme: str = Field("dark", description="Light, dark, or auto")
    density: str = Field("comfortable", description="Compact, comfortable, or spacious")
    animations: bool = Field(True, description="Enable UI animations")


class NotificationSettings(BaseModel):
    """Notification preferences"""
    email_notifications: bool = Field(True)
    push_notifications: bool = Field(True)
    pulse_updates: bool = Field(True)
    task_reminders: bool = Field(True)


class UserSettings(BaseModel):
    """Complete user settings"""
    ai_prompts: AIPromptSettings = Field(default_factory=AIPromptSettings)
    display: DisplaySettings = Field(default_factory=DisplaySettings)
    notifications: NotificationSettings = Field(default_factory=NotificationSettings)
    timezone: str = Field("UTC-8")
    language: str = Field("en")


class ProfileUpdate(BaseModel):
    """User profile update payload"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    city: Optional[str] = None
    timezone: Optional[str] = None


@router.get("/settings")
async def get_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> UserSettings:
    """
    Get current user's settings from database.
    Returns default settings if none exist.
    """
    user_id = current_user.id
    
    # Query database for user settings
    result = await db.execute(
        select(UserSettingsDB).where(UserSettingsDB.user_id == user_id)
    )
    settings_db = result.scalar_one_or_none()
    
    # If no settings exist, return defaults
    if not settings_db:
        return UserSettings()
    
    # Convert database model to pydantic model
    return UserSettings(
        ai_prompts=AIPromptSettings(
            domain_focus=settings_db.domain_focus or ["interfaces", "electrical"],
            response_style=settings_db.response_style,
            analysis_depth=settings_db.analysis_depth,
            custom_system_prompt=settings_db.custom_system_prompt or "",
            relationship_prompt=settings_db.relationship_prompt or "",
            impact_prompt=settings_db.impact_prompt or ""
        ),
        display=DisplaySettings(
            theme=settings_db.theme,
            density=settings_db.density,
            animations=settings_db.animations
        ),
        notifications=NotificationSettings(
            email_notifications=settings_db.email_notifications,
            push_notifications=settings_db.push_notifications,
            pulse_updates=settings_db.pulse_updates,
            task_reminders=settings_db.task_reminders
        ),
        timezone=settings_db.timezone,
        language=settings_db.language
    )


@router.put("/settings")
async def update_settings(
    settings: UserSettings,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Update user settings in database.
    """
    user_id = current_user.id
    
    # Check if settings exist
    result = await db.execute(
        select(UserSettingsDB).where(UserSettingsDB.user_id == user_id)
    )
    settings_db = result.scalar_one_or_none()
    
    if settings_db:
        # Update existing settings
        settings_db.domain_focus = settings.ai_prompts.domain_focus
        settings_db.response_style = settings.ai_prompts.response_style
        settings_db.analysis_depth = settings.ai_prompts.analysis_depth
        settings_db.custom_system_prompt = settings.ai_prompts.custom_system_prompt
        settings_db.relationship_prompt = settings.ai_prompts.relationship_prompt
        settings_db.impact_prompt = settings.ai_prompts.impact_prompt
        settings_db.theme = settings.display.theme
        settings_db.density = settings.display.density
        settings_db.animations = settings.display.animations
        settings_db.email_notifications = settings.notifications.email_notifications
        settings_db.push_notifications = settings.notifications.push_notifications
        settings_db.pulse_updates = settings.notifications.pulse_updates
        settings_db.task_reminders = settings.notifications.task_reminders
        settings_db.timezone = settings.timezone
        settings_db.language = settings.language
        settings_db.updated_at = datetime.utcnow()
    else:
        # Create new settings
        settings_db = UserSettingsDB(
            user_id=user_id,
            domain_focus=settings.ai_prompts.domain_focus,
            response_style=settings.ai_prompts.response_style,
            analysis_depth=settings.ai_prompts.analysis_depth,
            custom_system_prompt=settings.ai_prompts.custom_system_prompt,
            relationship_prompt=settings.ai_prompts.relationship_prompt,
            impact_prompt=settings.ai_prompts.impact_prompt,
            theme=settings.display.theme,
            density=settings.display.density,
            animations=settings.display.animations,
            email_notifications=settings.notifications.email_notifications,
            push_notifications=settings.notifications.push_notifications,
            pulse_updates=settings.notifications.pulse_updates,
            task_reminders=settings.notifications.task_reminders,
            timezone=settings.timezone,
            language=settings.language
        )
        db.add(settings_db)
    
    await db.commit()
    await db.refresh(settings_db)
    
    return {
        "message": "Settings updated successfully",
        "settings": settings
    }


@router.get("/settings/ai-prompts")
async def get_ai_prompt_settings(
    current_user: User = Depends(get_current_user)
) -> AIPromptSettings:
    """
    Get AI prompt settings only.
    """
    user_id = current_user.id
    
    if user_id not in user_settings_store:
        return AIPromptSettings()
    
    return user_settings_store[user_id].ai_prompts


@router.put("/settings/ai-prompts")
async def update_ai_prompt_settings(
    ai_prompts: AIPromptSettings,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Update AI prompt settings only.
    """
    user_id = current_user.id
    
    # Get or create settings
    if user_id not in user_settings_store:
        user_settings_store[user_id] = UserSettings()
    
    # Update AI prompts
    user_settings_store[user_id].ai_prompts = ai_prompts
    
    return {
        "message": "AI prompt settings updated successfully",
        "ai_prompts": ai_prompts
    }


@router.get("/settings/display")
async def get_display_settings(
    current_user: User = Depends(get_current_user)
) -> DisplaySettings:
    """
    Get display settings only.
    """
    user_id = current_user.id
    
    if user_id not in user_settings_store:
        return DisplaySettings()
    
    return user_settings_store[user_id].display


@router.put("/settings/display")
async def update_display_settings(
    display: DisplaySettings,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Update display settings only.
    """
    user_id = current_user.id
    
    if user_id not in user_settings_store:
        user_settings_store[user_id] = UserSettings()
    
    user_settings_store[user_id].display = display
    
    return {
        "message": "Display settings updated successfully",
        "display": display
    }


@router.get("/settings/notifications")
async def get_notification_settings(
    current_user: User = Depends(get_current_user)
) -> NotificationSettings:
    """
    Get notification settings only.
    """
    user_id = current_user.id
    
    if user_id not in user_settings_store:
        return NotificationSettings()
    
    return user_settings_store[user_id].notifications


@router.put("/settings/notifications")
async def update_notification_settings(
    notifications: NotificationSettings,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Update notification settings only.
    """
    user_id = current_user.id
    
    if user_id not in user_settings_store:
        user_settings_store[user_id] = UserSettings()
    
    user_settings_store[user_id].notifications = notifications
    
    return {
        "message": "Notification settings updated successfully",
        "notifications": notifications
    }


@router.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user)) -> User:
    """
    Get current user's profile.
    """
    return current_user


@router.put("/profile")
async def update_profile(
    profile_update: ProfileUpdate,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Update user profile.
    """
    # TODO: Update user in database
    # For now, just return success
    
    updated_fields = {k: v for k, v in profile_update.dict(exclude_unset=True).items() if v is not None}
    
    return {
        "message": "Profile updated successfully",
        "updated_fields": updated_fields
    }


@router.get("/profile/stats")
async def get_profile_stats(current_user: User = Depends(get_current_user)) -> Dict[str, int]:
    """
    Get user activity statistics.
    """
    # TODO: Query actual stats from database
    # For now, return mock data
    
    return {
        "notes_created": 47,
        "tasks_completed": 23,
        "requirements_reviewed": 156,
        "ai_queries": 89,
        "pulse_items_viewed": 234,
        "relationships_analyzed": 67
    }
