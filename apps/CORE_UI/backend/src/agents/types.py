"""
Agent Abstraction Layer - Core Types and Interfaces

This module defines the core interfaces for agent orchestration,
allowing easy switching between different agent frameworks
(OpenClaw, LangGraph, CrewAI, AutoGen, etc.)
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field


# ============================================================================
# Core Data Models
# ============================================================================

class AgentStatus(BaseModel):
    """Status information for an agent"""
    agent_id: str
    name: str
    status: Literal["active", "idle", "busy", "error", "offline"]
    current_task: Optional[str] = None
    tasks_completed: int = 0
    tasks_failed: int = 0
    uptime_seconds: float = 0
    last_activity: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TaskStatus(BaseModel):
    """Status of a task in the queue"""
    task_id: str
    agent_id: Optional[str] = None
    status: Literal["queued", "running", "completed", "failed", "cancelled"]
    priority: int = 0
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AgentCapability(BaseModel):
    """Describes what an agent can do"""
    name: str
    description: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    enabled: bool = True


class AgentConfig(BaseModel):
    """Configuration for an agent"""
    agent_id: str
    name: str
    description: str
    provider: str  # "openclaw", "langgraph", "crewai", etc.
    capabilities: List[AgentCapability] = Field(default_factory=list)
    max_concurrent_tasks: int = 1
    workspace_path: Optional[str] = None
    model: Optional[str] = None
    temperature: float = 0.7
    tools: List[str] = Field(default_factory=list)
    config: Dict[str, Any] = Field(default_factory=dict)


class TaskRequest(BaseModel):
    """Request to execute a task"""
    task_id: Optional[str] = None
    agent_id: Optional[str] = None  # If None, auto-route
    description: str
    input_data: Dict[str, Any] = Field(default_factory=dict)
    priority: int = 0
    timeout_seconds: Optional[int] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TaskResult(BaseModel):
    """Result of a task execution"""
    task_id: str
    agent_id: str
    status: Literal["completed", "failed"]
    output: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    execution_time_seconds: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SystemMetrics(BaseModel):
    """Overall system metrics"""
    total_agents: int
    active_agents: int
    idle_agents: int
    busy_agents: int
    error_agents: int
    total_tasks_queued: int
    total_tasks_running: int
    total_tasks_completed: int
    total_tasks_failed: int
    average_task_time_seconds: float
    provider: str
    uptime_seconds: float


# ============================================================================
# Abstract Base Class for Agent Providers
# ============================================================================

class AgentProvider(ABC):
    """
    Abstract base class for agent orchestration providers.
    
    All agent frameworks (OpenClaw, LangGraph, CrewAI, etc.) must implement
    this interface to be compatible with the system.
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the provider with configuration.
        
        Args:
            config: Provider-specific configuration
        """
        self.config = config
        self._initialized = False
    
    @abstractmethod
    async def initialize(self) -> None:
        """Initialize the provider and connect to the agent system"""
        pass
    
    @abstractmethod
    async def shutdown(self) -> None:
        """Gracefully shutdown the provider and cleanup resources"""
        pass
    
    @abstractmethod
    async def list_agents(self) -> List[AgentStatus]:
        """
        Get status of all agents.
        
        Returns:
            List of agent status objects
        """
        pass
    
    @abstractmethod
    async def get_agent_status(self, agent_id: str) -> AgentStatus:
        """
        Get status of a specific agent.
        
        Args:
            agent_id: Unique identifier for the agent
            
        Returns:
            Agent status object
        """
        pass
    
    @abstractmethod
    async def create_agent(self, config: AgentConfig) -> AgentStatus:
        """
        Create a new agent.
        
        Args:
            config: Agent configuration
            
        Returns:
            Status of the newly created agent
        """
        pass
    
    @abstractmethod
    async def delete_agent(self, agent_id: str) -> bool:
        """
        Delete an agent.
        
        Args:
            agent_id: Unique identifier for the agent
            
        Returns:
            True if successful
        """
        pass
    
    @abstractmethod
    async def submit_task(self, task: TaskRequest) -> TaskStatus:
        """
        Submit a task to an agent or the task queue.
        
        Args:
            task: Task request
            
        Returns:
            Initial task status
        """
        pass
    
    @abstractmethod
    async def get_task_status(self, task_id: str) -> TaskStatus:
        """
        Get status of a specific task.
        
        Args:
            task_id: Unique identifier for the task
            
        Returns:
            Task status object
        """
        pass
    
    @abstractmethod
    async def cancel_task(self, task_id: str) -> bool:
        """
        Cancel a running or queued task.
        
        Args:
            task_id: Unique identifier for the task
            
        Returns:
            True if successfully cancelled
        """
        pass
    
    @abstractmethod
    async def list_tasks(
        self,
        agent_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100
    ) -> List[TaskStatus]:
        """
        List tasks, optionally filtered by agent or status.
        
        Args:
            agent_id: Filter by agent (optional)
            status: Filter by status (optional)
            limit: Maximum number of tasks to return
            
        Returns:
            List of task status objects
        """
        pass
    
    @abstractmethod
    async def get_system_metrics(self) -> SystemMetrics:
        """
        Get overall system metrics.
        
        Returns:
            System metrics object
        """
        pass
    
    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """
        Check health of the provider.
        
        Returns:
            Health status dictionary
        """
        pass
