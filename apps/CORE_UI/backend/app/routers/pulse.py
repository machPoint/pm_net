"""
Pulse API router - aggregated activity feed
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from datetime import datetime
import httpx

from app.config import get_settings
from app.models import PulseItem

router = APIRouter(tags=["pulse"])


@router.get("/pulse", response_model=List[PulseItem])
async def get_pulse(
    since: Optional[datetime] = Query(None, description="Show changes since this timestamp"),
    sources: Optional[str] = Query(None, description="Comma-separated source filter (jama,jira,windchill,outlook,email)"),
    types: Optional[str] = Query(None, description="Comma-separated type filter (requirement,test,issue,part,ecn,email,outlook)"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of items to return")
):
    """Get aggregated pulse feed from all engineering systems"""
    settings = get_settings()
    
    try:
        # Build query parameters
        params = {"limit": limit}
        if since:
            params["since"] = since.isoformat()
        if sources:
            params["sources"] = sources
        if types:
            params["types"] = types
        
        if not settings.FDS_BASE_URL:
            raise HTTPException(status_code=503, detail="FDS is not configured for this mode")

        # Call FDS
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.FDS_BASE_URL}/mock/pulse",
                params=params,
                timeout=10.0
            )
            response.raise_for_status()
            
            # Convert FDS response to our model format
            fds_data = response.json()
            pulse_items = []
            
            for item in fds_data:
                # Convert MockPulseItem to PulseItem
                pulse_item = PulseItem(
                    id=item["id"],
                    artifact_ref={
                        "id": item["artifact_ref"]["id"],
                        "type": item["artifact_ref"]["type"],
                        "source": item["artifact_ref"]["source"],
                        "title": item["artifact_ref"]["title"],
                        "status": item["artifact_ref"].get("status"),
                        "url": item["artifact_ref"].get("url")
                    },
                    change_type=item["change_type"],
                    change_summary=item["change_summary"],
                    timestamp=datetime.fromisoformat(item["timestamp"].replace("Z", "+00:00")),
                    author=item.get("author"),
                    metadata=item.get("metadata", {})
                )
                pulse_items.append(pulse_item)
            
            return pulse_items
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Failed to connect to FDS: {str(e)}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"FDS error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
