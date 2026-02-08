"""
Windows API router - external system window links
"""

from fastapi import APIRouter, HTTPException, Path
from app.config import get_settings
from app.models import WindowLink

router = APIRouter(tags=["windows"])


@router.get("/windows/{tool}/{item_id}", response_model=WindowLink)
async def get_window_link(
    tool: str = Path(..., description="Tool name (jama, jira, windchill, outlook, email)"),
    item_id: str = Path(..., description="Item ID to open")
):
    """Get window link for external system"""
    settings = get_settings()
    
    # Validate tool
    valid_tools = ["jama", "jira", "windchill", "outlook", "email"]
    if tool not in valid_tools:
        raise HTTPException(status_code=400, detail=f"Invalid tool. Must be one of: {', '.join(valid_tools)}")
    
    try:
        # Generate window link pointing to FDS mock window
        window_link = WindowLink(
            url=f"{settings.FDS_BASE_URL}/mock/windows/{tool}/{item_id}",
            read_only=True,
            title=f"{tool.title()} - {item_id}",
            tool=tool
        )
        
        return window_link
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate window link: {str(e)}")
