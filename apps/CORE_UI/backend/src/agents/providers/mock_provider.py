"""
Mock Agent Provider - For testing and development

This is a simple in-memory implementation that can be used for testing
before integrating with a real agent orchestration framework.
"""

import asyncio
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from ..types import (
    AgentProvider,
    AgentStatus,
    AgentConfig,
    TaskRequest,
    TaskStatus,
    TaskResult,
    SystemMetrics,
)


class MockAgentProvider(AgentProvider):
    """Mock implementation for testing"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self._agents: Dict[str, AgentStatus] = {}
        self._tasks: Dict[str, TaskStatus] = {}
        self._start_time = time.time()
    
    async def initialize(self) -> None:
        """Initialize with some default agents"""
        self._initialized = True
        
        # Create default agents
        default_agents = [
            AgentConfig(
                agent_id="agent-planning",
                name="Planning Agent",
                description="Handles task planning and decomposition",
                provider="mock",
                tools=["task_breakdown", "dependency_analysis"],
                config={"role": "planner"}
            ),
            AgentConfig(
                agent_id="agent-execution",
                name="Execution Agent",
                description="Executes approved tasks and reports progress",
                provider="mock",
                tools=["code_execution", "file_operations"],
                config={"role": "executor"}
            ),
            AgentConfig(
                agent_id="agent-verification",
                name="Verification Agent",
                description="Verifies task completion and quality",
                provider="mock",
                tools=["test_runner", "quality_check"],
                config={"role": "verifier"}
            ),
        ]
        
        for agent_config in default_agents:
            await self.create_agent(agent_config)
    
    async def shutdown(self) -> None:
        """Cleanup resources"""
        self._agents.clear()
        self._tasks.clear()
        self._initialized = False
    
    async def list_agents(self) -> List[AgentStatus]:
        """Get all agents"""
        return list(self._agents.values())
    
    async def get_agent_status(self, agent_id: str) -> AgentStatus:
        """Get specific agent status"""
        if agent_id not in self._agents:
            raise ValueError(f"Agent {agent_id} not found")
        return self._agents[agent_id]
    
    async def create_agent(self, config: AgentConfig) -> AgentStatus:
        """Create a new agent"""
        status = AgentStatus(
            agent_id=config.agent_id,
            name=config.name,
            status="idle",
            tasks_completed=0,
            tasks_failed=0,
            uptime_seconds=0,
            last_activity=datetime.utcnow(),
            metadata={
                "description": config.description,
                "tools": config.tools,
                "config": config.config
            }
        )
        self._agents[config.agent_id] = status
        return status
    
    async def delete_agent(self, agent_id: str) -> bool:
        """Delete an agent"""
        if agent_id in self._agents:
            del self._agents[agent_id]
            return True
        return False
    
    async def submit_task(self, task: TaskRequest) -> TaskStatus:
        """Submit a task"""
        task_id = task.task_id or f"task-{uuid4().hex[:8]}"
        
        # Auto-route to first idle agent if not specified
        agent_id = task.agent_id
        if not agent_id:
            idle_agents = [a for a in self._agents.values() if a.status == "idle"]
            if idle_agents:
                agent_id = idle_agents[0].agent_id
        
        task_status = TaskStatus(
            task_id=task_id,
            agent_id=agent_id,
            status="queued",
            priority=task.priority,
            created_at=datetime.utcnow(),
            metadata=task.metadata
        )
        
        self._tasks[task_id] = task_status
        
        # Simulate task execution in background
        asyncio.create_task(self._execute_task(task_id, task))
        
        return task_status
    
    async def _execute_task(self, task_id: str, task: TaskRequest):
        """Simulate task execution"""
        task_status = self._tasks[task_id]
        agent_id = task_status.agent_id
        
        if agent_id and agent_id in self._agents:
            agent = self._agents[agent_id]
            
            # Update agent status
            agent.status = "busy"
            agent.current_task = task_id
            agent.last_activity = datetime.utcnow()
            
            # Update task status
            task_status.status = "running"
            task_status.started_at = datetime.utcnow()
            
            # Simulate work
            await asyncio.sleep(2)
            
            # Complete task
            task_status.status = "completed"
            task_status.completed_at = datetime.utcnow()
            task_status.result = {
                "output": f"Task {task_id} completed successfully",
                "data": task.input_data
            }
            
            # Update agent
            agent.status = "idle"
            agent.current_task = None
            agent.tasks_completed += 1
            agent.last_activity = datetime.utcnow()
    
    async def get_task_status(self, task_id: str) -> TaskStatus:
        """Get task status"""
        if task_id not in self._tasks:
            raise ValueError(f"Task {task_id} not found")
        return self._tasks[task_id]
    
    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a task"""
        if task_id in self._tasks:
            task = self._tasks[task_id]
            if task.status in ["queued", "running"]:
                task.status = "cancelled"
                return True
        return False
    
    async def list_tasks(
        self,
        agent_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100
    ) -> List[TaskStatus]:
        """List tasks with optional filters"""
        tasks = list(self._tasks.values())
        
        if agent_id:
            tasks = [t for t in tasks if t.agent_id == agent_id]
        
        if status:
            tasks = [t for t in tasks if t.status == status]
        
        return tasks[:limit]
    
    async def get_system_metrics(self) -> SystemMetrics:
        """Get system metrics"""
        agents = list(self._agents.values())
        tasks = list(self._tasks.values())
        
        active_agents = sum(1 for a in agents if a.status in ["idle", "busy"])
        idle_agents = sum(1 for a in agents if a.status == "idle")
        busy_agents = sum(1 for a in agents if a.status == "busy")
        error_agents = sum(1 for a in agents if a.status == "error")
        
        queued_tasks = sum(1 for t in tasks if t.status == "queued")
        running_tasks = sum(1 for t in tasks if t.status == "running")
        completed_tasks = sum(1 for t in tasks if t.status == "completed")
        failed_tasks = sum(1 for t in tasks if t.status == "failed")
        
        # Calculate average task time
        completed = [t for t in tasks if t.status == "completed" and t.started_at and t.completed_at]
        avg_time = 0.0
        if completed:
            times = [(t.completed_at - t.started_at).total_seconds() for t in completed]
            avg_time = sum(times) / len(times)
        
        return SystemMetrics(
            total_agents=len(agents),
            active_agents=active_agents,
            idle_agents=idle_agents,
            busy_agents=busy_agents,
            error_agents=error_agents,
            total_tasks_queued=queued_tasks,
            total_tasks_running=running_tasks,
            total_tasks_completed=completed_tasks,
            total_tasks_failed=failed_tasks,
            average_task_time_seconds=avg_time,
            provider="mock",
            uptime_seconds=time.time() - self._start_time
        )
    
    async def health_check(self) -> Dict[str, Any]:
        """Health check"""
        return {
            "status": "healthy" if self._initialized else "not_initialized",
            "provider": "mock",
            "agents": len(self._agents),
            "tasks": len(self._tasks),
            "uptime": time.time() - self._start_time
        }
