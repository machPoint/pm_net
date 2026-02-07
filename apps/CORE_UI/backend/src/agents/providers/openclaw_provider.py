"""
OpenClaw Agent Provider

Integrates with OpenClaw multi-agent gateway for agent orchestration.
Based on OpenClaw documentation: https://docs.openclaw.ai/
"""

import asyncio
import time
import httpx
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
    AgentCapability,
)


class OpenClawProvider(AgentProvider):
    """
    OpenClaw provider implementation.
    
    OpenClaw is a self-hosted multi-channel agent gateway that supports
    WhatsApp, Telegram, Discord, and more. It provides agent-native features
    including tool use, sessions, memory, and multi-agent routing.
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.gateway_url = config.get("gateway_url", "http://localhost:18789")
        self.api_key = config.get("api_key")
        self.workspace_path = config.get("workspace_path", "~/.openclaw/workspace")
        self.default_model = config.get("default_model", "claude-3-5-sonnet-20241022")
        self.channels = config.get("channels", ["whatsapp", "telegram", "discord"])
        
        self._client: Optional[httpx.AsyncClient] = None
        self._agents: Dict[str, AgentStatus] = {}
        self._tasks: Dict[str, TaskStatus] = {}
        self._start_time = time.time()
    
    async def initialize(self) -> None:
        """Initialize OpenClaw connection and load agents"""
        # Create HTTP client
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        self._client = httpx.AsyncClient(
            base_url=self.gateway_url,
            headers=headers,
            timeout=30.0
        )
        
        # Test connection
        try:
            response = await self._client.get("/health")
            response.raise_for_status()
        except Exception as e:
            raise ConnectionError(f"Cannot connect to OpenClaw gateway at {self.gateway_url}: {e}")
        
        # Load existing agents from OpenClaw
        await self._sync_agents()
        
        self._initialized = True
    
    async def shutdown(self) -> None:
        """Cleanup resources"""
        if self._client:
            await self._client.aclose()
            self._client = None
        
        self._agents.clear()
        self._tasks.clear()
        self._initialized = False
    
    async def _sync_agents(self) -> None:
        """Sync agents from OpenClaw gateway"""
        try:
            # Get agents list from OpenClaw
            # OpenClaw uses 'openclaw agents list' CLI or API endpoint
            response = await self._client.get("/api/agents/list")
            
            if response.status_code == 200:
                agents_data = response.json()
                
                # Convert OpenClaw agent format to our AgentStatus format
                for agent_data in agents_data.get("agents", []):
                    agent_id = agent_data.get("id", agent_data.get("agentId"))
                    
                    status = AgentStatus(
                        agent_id=agent_id,
                        name=agent_data.get("name", agent_id),
                        status="idle",  # OpenClaw doesn't expose real-time status
                        tasks_completed=0,
                        tasks_failed=0,
                        uptime_seconds=0,
                        last_activity=datetime.utcnow(),
                        metadata={
                            "workspace": agent_data.get("workspace"),
                            "channels": agent_data.get("channels", []),
                            "tools": agent_data.get("tools", []),
                            "sandbox": agent_data.get("sandbox", {}),
                        }
                    )
                    self._agents[agent_id] = status
            
            # If no agents exist, create default ones
            if not self._agents:
                await self._create_default_agents()
                
        except httpx.HTTPStatusError as e:
            # If endpoint doesn't exist, create default agents
            if e.response.status_code == 404:
                await self._create_default_agents()
            else:
                raise
    
    async def _create_default_agents(self) -> None:
        """Create default agents in OpenClaw"""
        default_configs = [
            AgentConfig(
                agent_id="main",
                name="Main Agent",
                description="Primary agent for general tasks",
                provider="openclaw",
                tools=["read", "write", "exec"],
                model=self.default_model,
                config={
                    "workspace": f"{self.workspace_path}/main",
                    "sandbox": {"mode": "off"}
                }
            ),
            AgentConfig(
                agent_id="planning",
                name="Planning Agent",
                description="Task planning and decomposition",
                provider="openclaw",
                tools=["read"],
                model=self.default_model,
                config={
                    "workspace": f"{self.workspace_path}/planning",
                    "sandbox": {"mode": "all", "scope": "agent"}
                }
            ),
            AgentConfig(
                agent_id="execution",
                name="Execution Agent",
                description="Task execution and reporting",
                provider="openclaw",
                tools=["read", "write", "exec"],
                model=self.default_model,
                config={
                    "workspace": f"{self.workspace_path}/execution",
                    "sandbox": {"mode": "all", "scope": "agent"}
                }
            ),
        ]
        
        for config in default_configs:
            try:
                await self.create_agent(config)
            except Exception as e:
                # Log but continue if agent creation fails
                print(f"Warning: Could not create default agent {config.agent_id}: {e}")
    
    async def list_agents(self) -> List[AgentStatus]:
        """Get all agents"""
        await self._sync_agents()
        return list(self._agents.values())
    
    async def get_agent_status(self, agent_id: str) -> AgentStatus:
        """Get specific agent status"""
        if agent_id not in self._agents:
            await self._sync_agents()
        
        if agent_id not in self._agents:
            raise ValueError(f"Agent {agent_id} not found")
        
        return self._agents[agent_id]
    
    async def create_agent(self, config: AgentConfig) -> AgentStatus:
        """
        Create a new agent in OpenClaw.
        
        Uses OpenClaw's agent configuration format:
        - agentId: unique identifier
        - workspace: agent workspace path
        - sandbox: sandbox configuration
        - tools: allowed tools
        """
        try:
            # Prepare OpenClaw agent config
            openclaw_config = {
                "id": config.agent_id,
                "workspace": config.config.get("workspace", f"{self.workspace_path}/{config.agent_id}"),
                "sandbox": config.config.get("sandbox", {"mode": "off"}),
                "tools": {
                    "allow": config.tools if config.tools else None,
                }
            }
            
            # Call OpenClaw API to create agent
            response = await self._client.post(
                "/api/agents/create",
                json=openclaw_config
            )
            
            if response.status_code in [200, 201]:
                # Create our AgentStatus
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
                        "workspace": openclaw_config["workspace"],
                        "tools": config.tools,
                        "sandbox": openclaw_config["sandbox"],
                    }
                )
                
                self._agents[config.agent_id] = status
                return status
            else:
                raise RuntimeError(f"Failed to create agent: {response.text}")
                
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                # API endpoint doesn't exist, create agent locally
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
                        "workspace": config.config.get("workspace"),
                        "tools": config.tools,
                    }
                )
                self._agents[config.agent_id] = status
                return status
            else:
                raise
    
    async def delete_agent(self, agent_id: str) -> bool:
        """Delete an agent"""
        try:
            response = await self._client.delete(f"/api/agents/{agent_id}")
            
            if response.status_code in [200, 204]:
                if agent_id in self._agents:
                    del self._agents[agent_id]
                return True
            
            return False
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                # Agent doesn't exist or API not available
                if agent_id in self._agents:
                    del self._agents[agent_id]
                    return True
                return False
            raise
    
    async def submit_task(self, task: TaskRequest) -> TaskStatus:
        """
        Submit a task to OpenClaw.
        
        OpenClaw processes tasks through its agent routing system.
        Tasks are sent as messages to agents via channels or direct API.
        """
        task_id = task.task_id or f"task-{uuid4().hex[:8]}"
        
        # Determine target agent
        agent_id = task.agent_id
        if not agent_id:
            # Auto-route to first idle agent
            idle_agents = [a for a in self._agents.values() if a.status == "idle"]
            if idle_agents:
                agent_id = idle_agents[0].agent_id
            else:
                agent_id = "main"  # Default to main agent
        
        # Create task status
        task_status = TaskStatus(
            task_id=task_id,
            agent_id=agent_id,
            status="queued",
            priority=task.priority,
            created_at=datetime.utcnow(),
            metadata={
                **task.metadata,
                "description": task.description,
                "input_data": task.input_data,
            }
        )
        
        self._tasks[task_id] = task_status
        
        # Submit to OpenClaw in background
        asyncio.create_task(self._execute_openclaw_task(task_id, task, agent_id))
        
        return task_status
    
    async def _execute_openclaw_task(self, task_id: str, task: TaskRequest, agent_id: str):
        """Execute task through OpenClaw"""
        task_status = self._tasks[task_id]
        
        try:
            # Update status
            task_status.status = "running"
            task_status.started_at = datetime.utcnow()
            
            if agent_id in self._agents:
                self._agents[agent_id].status = "busy"
                self._agents[agent_id].current_task = task_id
            
            # Send task to OpenClaw agent
            # OpenClaw uses message-based communication
            message_payload = {
                "agentId": agent_id,
                "message": task.description,
                "context": task.input_data,
                "taskId": task_id,
            }
            
            response = await self._client.post(
                "/api/messages/send",
                json=message_payload,
                timeout=task.timeout_seconds or 300
            )
            
            if response.status_code == 200:
                result_data = response.json()
                
                task_status.status = "completed"
                task_status.completed_at = datetime.utcnow()
                task_status.result = {
                    "output": result_data.get("response", "Task completed"),
                    "data": result_data.get("data", {}),
                }
                
                if agent_id in self._agents:
                    self._agents[agent_id].tasks_completed += 1
            else:
                raise RuntimeError(f"Task execution failed: {response.text}")
                
        except Exception as e:
            task_status.status = "failed"
            task_status.completed_at = datetime.utcnow()
            task_status.error = str(e)
            
            if agent_id in self._agents:
                self._agents[agent_id].tasks_failed += 1
        
        finally:
            # Reset agent status
            if agent_id in self._agents:
                self._agents[agent_id].status = "idle"
                self._agents[agent_id].current_task = None
                self._agents[agent_id].last_activity = datetime.utcnow()
    
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
                task.completed_at = datetime.utcnow()
                return True
        return False
    
    async def list_tasks(
        self,
        agent_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100
    ) -> List[TaskStatus]:
        """List tasks with filters"""
        tasks = list(self._tasks.values())
        
        if agent_id:
            tasks = [t for t in tasks if t.agent_id == agent_id]
        
        if status:
            tasks = [t for t in tasks if t.status == status]
        
        # Sort by created_at descending
        tasks.sort(key=lambda t: t.created_at, reverse=True)
        
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
            provider="openclaw",
            uptime_seconds=time.time() - self._start_time
        )
    
    async def health_check(self) -> Dict[str, Any]:
        """Health check"""
        try:
            if self._client:
                response = await self._client.get("/health")
                openclaw_healthy = response.status_code == 200
            else:
                openclaw_healthy = False
            
            return {
                "status": "healthy" if (self._initialized and openclaw_healthy) else "degraded",
                "provider": "openclaw",
                "gateway_url": self.gateway_url,
                "gateway_healthy": openclaw_healthy,
                "agents": len(self._agents),
                "tasks": len(self._tasks),
                "uptime": time.time() - self._start_time,
                "channels": self.channels,
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "provider": "openclaw",
                "error": str(e),
                "agents": len(self._agents),
                "tasks": len(self._tasks),
            }
