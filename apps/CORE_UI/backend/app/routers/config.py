"""
Configuration API router
"""

from fastapi import APIRouter
from app.config import get_settings
from app.models import ConfigResponse

router = APIRouter(tags=["config"])


@router.get("/config", response_model=ConfigResponse)
async def get_config():
    """Get application configuration and feature flags"""
    settings = get_settings()
    
    return ConfigResponse(
        features={
            "FEATURE_EMAIL": settings.FEATURE_EMAIL,
            "FEATURE_WINDCHILL": settings.FEATURE_WINDCHILL,
            "FEATURE_OUTLOOK": settings.FEATURE_OUTLOOK,
            "FEATURE_AI_MICROCALLS": settings.FEATURE_AI_MICROCALLS,
            "FEATURE_TRACE_GRAPH": settings.FEATURE_TRACE_GRAPH,
            "FEATURE_THEMES": settings.FEATURE_THEMES,
        },
        themes=["dark", "light", "custom"],
        mode=settings.MODE
    )
