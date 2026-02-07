"""
System Model Router
Provides endpoints for system model visualization
"""

from fastapi import APIRouter, HTTPException
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["system-model"])


@router.get("/system-model/root-slice")
async def get_root_slice(
    radius: Optional[int] = 1,
    include_types: Optional[str] = None
):
    """
    Get system model slice starting from root
    
    Args:
        radius: How many hops to traverse (default 1)
        include_types: Comma-separated list of node types to include
    
    Returns:
        System slice with nodes and edges
    """
    try:
        # Parse include_types
        include_types_list = None
        if include_types:
            include_types_list = [t.strip() for t in include_types.split(',')]
        
        # TODO: Call OPAL tool getSystemSlice
        # For now, return mock data
        slice_data = get_mock_system_slice(radius, include_types_list)
        
        return {
            "slice": slice_data["slice"],
            "summary": slice_data["summary"],
            "status": "success"
        }
    
    except Exception as e:
        logger.error(f"Error getting system slice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/system-model/slice")
async def get_slice(
    entity_ids: str,
    radius: Optional[int] = 1,
    include_types: Optional[str] = None
):
    """
    Get system model slice starting from specific entities
    
    Args:
        entity_ids: Comma-separated list of entity IDs to start from
        radius: How many hops to traverse (default 1)
        include_types: Comma-separated list of node types to include
    
    Returns:
        System slice with nodes and edges
    """
    try:
        # Parse parameters
        entity_ids_list = [e.strip() for e in entity_ids.split(',')]
        include_types_list = None
        if include_types:
            include_types_list = [t.strip() for t in include_types.split(',')]
        
        # TODO: Call OPAL tool getSystemSlice
        # For now, return mock data
        slice_data = get_mock_system_slice(radius, include_types_list, entity_ids_list)
        
        return {
            "slice": slice_data["slice"],
            "summary": slice_data["summary"],
            "status": "success"
        }
    
    except Exception as e:
        logger.error(f"Error getting system slice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def get_mock_system_slice(
    radius: int = 1,
    include_types: Optional[List[str]] = None,
    entity_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Get mock system slice for testing
    """
    if not entity_ids:
        entity_ids = ["SYS-1"]
    
    # Mock system model
    all_nodes = [
        {
            "id": "SYS-1",
            "label": "Aerospace System",
            "type": "system",
            "metadata": {"discipline": "Systems Engineering"}
        },
        {
            "id": "SS-flight-control",
            "label": "Flight Control",
            "type": "subsystem",
            "metadata": {}
        },
        {
            "id": "SS-avionics",
            "label": "Avionics",
            "type": "subsystem",
            "metadata": {}
        },
        {
            "id": "SS-propulsion",
            "label": "Propulsion",
            "type": "subsystem",
            "metadata": {}
        },
        {
            "id": "SS-landing-gear",
            "label": "Landing Gear",
            "type": "subsystem",
            "metadata": {}
        },
        {
            "id": "SS-eclss",
            "label": "ECLSS",
            "type": "subsystem",
            "metadata": {}
        },
        {
            "id": "SS-communication",
            "label": "Communication",
            "type": "subsystem",
            "metadata": {}
        },
        {
            "id": "SS-hydraulics",
            "label": "Hydraulics",
            "type": "subsystem",
            "metadata": {}
        },
        {
            "id": "SS-fuel-system",
            "label": "Fuel System",
            "type": "subsystem",
            "metadata": {}
        },
        {
            "id": "SS-safety-systems",
            "label": "Safety Systems",
            "type": "subsystem",
            "metadata": {}
        },
        {
            "id": "SS-electrical",
            "label": "Electrical",
            "type": "subsystem",
            "metadata": {}
        }
    ]
    
    all_edges = [
        {"id": "e1", "from": "SYS-1", "to": "SS-flight-control", "relation": "CONTAINS", "metadata": {}},
        {"id": "e2", "from": "SYS-1", "to": "SS-avionics", "relation": "CONTAINS", "metadata": {}},
        {"id": "e3", "from": "SYS-1", "to": "SS-propulsion", "relation": "CONTAINS", "metadata": {}},
        {"id": "e4", "from": "SYS-1", "to": "SS-landing-gear", "relation": "CONTAINS", "metadata": {}},
        {"id": "e5", "from": "SYS-1", "to": "SS-eclss", "relation": "CONTAINS", "metadata": {}},
        {"id": "e6", "from": "SYS-1", "to": "SS-communication", "relation": "CONTAINS", "metadata": {}},
        {"id": "e7", "from": "SYS-1", "to": "SS-hydraulics", "relation": "CONTAINS", "metadata": {}},
        {"id": "e8", "from": "SYS-1", "to": "SS-fuel-system", "relation": "CONTAINS", "metadata": {}},
        {"id": "e9", "from": "SYS-1", "to": "SS-safety-systems", "relation": "CONTAINS", "metadata": {}},
        {"id": "e10", "from": "SYS-1", "to": "SS-electrical", "relation": "CONTAINS", "metadata": {}},
        {"id": "e11", "from": "SS-avionics", "to": "SS-flight-control", "relation": "INTERFACES", "metadata": {}},
        {"id": "e12", "from": "SS-propulsion", "to": "SS-flight-control", "relation": "INTERFACES", "metadata": {}}
    ]
    
    # Simple traversal
    included_node_ids = set(entity_ids)
    included_edges = []
    
    # Traverse outward
    for i in range(radius + 1):
        current_nodes = list(included_node_ids)
        for node_id in current_nodes:
            for edge in all_edges:
                if edge["from"] == node_id:
                    included_node_ids.add(edge["to"])
                    if edge not in included_edges:
                        included_edges.append(edge)
                if edge["to"] == node_id:
                    included_node_ids.add(edge["from"])
                    if edge not in included_edges:
                        included_edges.append(edge)
    
    # Filter nodes
    nodes = [n for n in all_nodes if n["id"] in included_node_ids]
    
    # Apply type filter
    if include_types:
        nodes = [n for n in nodes if n["type"] in include_types]
        included_ids = set(n["id"] for n in nodes)
        included_edges = [e for e in included_edges if e["from"] in included_ids and e["to"] in included_ids]
    
    summary = f"Found {len(nodes)} nodes and {len(included_edges)} edges around {', '.join(entity_ids)} with radius {radius}"
    
    return {
        "slice": {
            "nodes": nodes,
            "edges": included_edges
        },
        "summary": summary
    }
