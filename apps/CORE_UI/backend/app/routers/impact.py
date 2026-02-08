"""
Impact Analysis API router
"""

from fastapi import APIRouter, Query, HTTPException, Path
from datetime import datetime
import httpx

from app.config import get_settings
from app.models import ImpactResult

router = APIRouter(tags=["impact"])


@router.get("/impact/{entity_id}", response_model=ImpactResult)
async def get_impact_analysis(
    entity_id: str = Path(..., description="Entity ID to analyze (e.g., JAMA-REQ-123)"),
    depth: int = Query(2, ge=1, le=5, description="Analysis depth")
):
    """Get impact analysis for a specific entity"""
    settings = get_settings()
    
    try:
        # Call FDS
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.FDS_BASE_URL}/mock/impact/{entity_id}",
                params={"depth": depth},
                timeout=15.0
            )
            response.raise_for_status()
            
            # Convert FDS response to our model format
            fds_data = response.json()
            
            # Recursively convert impact nodes
            def convert_impact_node(node_data):
                return {
                    "artifact_ref": {
                        "id": node_data["artifact_ref"]["id"],
                        "type": node_data["artifact_ref"]["type"],
                        "source": node_data["artifact_ref"]["source"],
                        "title": node_data["artifact_ref"]["title"],
                        "status": node_data["artifact_ref"].get("status"),
                        "url": node_data["artifact_ref"].get("url")
                    },
                    "impact_level": node_data["impact_level"],
                    "relationship_type": node_data["relationship_type"],
                    "children": [convert_impact_node(child) for child in node_data.get("children", [])]
                }
            
            impact_result = ImpactResult(
                root_artifact={
                    "id": fds_data["root_artifact"]["id"],
                    "type": fds_data["root_artifact"]["type"],
                    "source": fds_data["root_artifact"]["source"],
                    "title": fds_data["root_artifact"]["title"],
                    "status": fds_data["root_artifact"].get("status"),
                    "url": fds_data["root_artifact"].get("url")
                },
                depth=fds_data["depth"],
                total_impacted=fds_data["total_impacted"],
                impact_tree=[convert_impact_node(node) for node in fds_data["impact_tree"]],
                gap_count=fds_data.get("gap_count", 0)
            )
            
            return impact_result
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Failed to connect to FDS: {str(e)}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"FDS error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
