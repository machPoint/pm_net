"""
Agent Management API Routes

Provides REST endpoints for agent orchestration through the abstraction layer.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import logging

from ..agents import (
    get_agent_service,
    AgentStatus,
    AgentConfig,
    TaskRequest,
    TaskStatus,
    SystemMetrics,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("/status", response_model=SystemMetrics)
async def get_system_status():
    """Get overall agent system status and metrics"""
    try:
        service = get_agent_service()
        metrics = await service.provider.get_system_metrics()
        return metrics
    except Exception as e:
        logger.error(f"Error getting system status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Check health of the agent system"""
    try:
        service = get_agent_service()
        health = await service.provider.health_check()
        return health
    except Exception as e:
        logger.error(f"Error in health check: {e}")
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/list", response_model=List[AgentStatus])
async def list_agents():
    """List all agents and their current status"""
    try:
        service = get_agent_service()
        agents = await service.provider.list_agents()
        return agents
    except Exception as e:
        logger.error(f"Error listing agents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{agent_id}", response_model=AgentStatus)
async def get_agent(agent_id: str):
    """Get status of a specific agent"""
    try:
        service = get_agent_service()
        agent = await service.provider.get_agent_status(agent_id)
        return agent
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create", response_model=AgentStatus)
async def create_agent(config: AgentConfig):
    """Create a new agent"""
    try:
        service = get_agent_service()
        agent = await service.provider.create_agent(config)
        return agent
    except Exception as e:
        logger.error(f"Error creating agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete an agent"""
    try:
        service = get_agent_service()
        success = await service.provider.delete_agent(agent_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
        return {"success": True, "agent_id": agent_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tasks/submit", response_model=TaskStatus)
async def submit_task(task: TaskRequest):
    """Submit a task to an agent or the task queue"""
    try:
        service = get_agent_service()
        task_status = await service.provider.submit_task(task)
        return task_status
    except Exception as e:
        logger.error(f"Error submitting task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/list", response_model=List[TaskStatus])
async def list_tasks(
    agent_id: Optional[str] = Query(None, description="Filter by agent ID"),
    status: Optional[str] = Query(None, description="Filter by task status"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of tasks to return")
):
    """List tasks with optional filters"""
    try:
        service = get_agent_service()
        tasks = await service.provider.list_tasks(
            agent_id=agent_id,
            status=status,
            limit=limit
        )
        return tasks
    except Exception as e:
        logger.error(f"Error listing tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/{task_id}", response_model=TaskStatus)
async def get_task(task_id: str):
    """Get status of a specific task"""
    try:
        service = get_agent_service()
        task = await service.provider.get_task_status(task_id)
        return task
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting task {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tasks/{task_id}/cancel")
async def cancel_task(task_id: str):
    """Cancel a running or queued task"""
    try:
        service = get_agent_service()
        success = await service.provider.cancel_task(task_id)
        if not success:
            raise HTTPException(
                status_code=400,
                detail=f"Task {task_id} cannot be cancelled (not found or already completed)"
            )
        return {"success": True, "task_id": task_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling task {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
