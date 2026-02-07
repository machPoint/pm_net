# Agent Orchestration Interface Specification

**Version:** 1.0  
**Last Updated:** February 7, 2026  
**Status:** Active

---

## Overview

This document defines the **Agent Orchestration Abstraction Layer** interface specification. This interface enables the PM_NET system to work with multiple agent orchestration frameworks (OpenClaw, LangGraph, CrewAI, AutoGen, etc.) through a unified API.

## Design Principles

1. **Provider Agnostic** - No framework-specific code in application layer
2. **Hot-Swappable** - Change providers via configuration without code changes
3. **Type Safe** - Full type definitions for all data structures
4. **Async First** - All operations are asynchronous
5. **Extensible** - Easy to add new providers

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│              (UI, Business Logic, API Routes)                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Uses
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      AgentService                            │
│                   (Singleton Manager)                        │
│  • initialize(provider_type, config)                        │
│  • get_instance()                                            │
│  • shutdown()                                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Delegates to
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    AgentProvider (ABC)                       │
│                   Interface Definition                       │
│  • initialize()          • list_agents()                    │
│  • shutdown()            • get_agent_status()               │
│  • submit_task()         • create_agent()                   │
│  • get_task_status()     • delete_agent()                   │
│  • cancel_task()         • list_tasks()                     │
│  • get_system_metrics()  • health_check()                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Implemented by
                           ▼
        ┌──────────────────┼──────────────────┬──────────────┐
        ▼                  ▼                  ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│MockProvider  │  │OpenClaw      │  │LangGraph     │  │CrewAI        │
│              │  │Provider      │  │Provider      │  │Provider      │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

---

## Core Data Models

### AgentStatus

Represents the current state of an agent.

```python
class AgentStatus(BaseModel):
    agent_id: str                                    # Unique identifier
    name: str                                        # Human-readable name
    status: Literal["active", "idle", "busy",       # Current status
                    "error", "offline"]
    current_task: Optional[str] = None              # Task ID if busy
    tasks_completed: int = 0                        # Total completed
    tasks_failed: int = 0                           # Total failed
    uptime_seconds: float = 0                       # Time since start
    last_activity: Optional[datetime] = None        # Last action timestamp
    metadata: Dict[str, Any] = {}                   # Provider-specific data
```

**Status Values:**
- `active` - Agent is running and ready
- `idle` - Agent is waiting for tasks
- `busy` - Agent is executing a task
- `error` - Agent encountered an error
- `offline` - Agent is not responding

---

### TaskStatus

Represents the state of a task in the system.

```python
class TaskStatus(BaseModel):
    task_id: str                                    # Unique identifier
    agent_id: Optional[str] = None                  # Assigned agent
    status: Literal["queued", "running",            # Current status
                    "completed", "failed", 
                    "cancelled"]
    priority: int = 0                               # Higher = more urgent
    created_at: datetime                            # Creation timestamp
    started_at: Optional[datetime] = None           # Start timestamp
    completed_at: Optional[datetime] = None         # Completion timestamp
    error: Optional[str] = None                     # Error message if failed
    result: Optional[Dict[str, Any]] = None         # Task output
    metadata: Dict[str, Any] = {}                   # Additional data
```

**Status Values:**
- `queued` - Waiting for an agent
- `running` - Currently being executed
- `completed` - Successfully finished
- `failed` - Execution failed
- `cancelled` - Manually cancelled

---

### AgentConfig

Configuration for creating a new agent.

```python
class AgentConfig(BaseModel):
    agent_id: str                                   # Unique identifier
    name: str                                       # Display name
    description: str                                # Purpose description
    provider: str                                   # Provider type
    capabilities: List[AgentCapability] = []        # What agent can do
    max_concurrent_tasks: int = 1                   # Task limit
    workspace_path: Optional[str] = None            # Working directory
    model: Optional[str] = None                     # LLM model
    temperature: float = 0.7                        # Model temperature
    tools: List[str] = []                           # Available tools
    config: Dict[str, Any] = {}                     # Provider config
```

---

### TaskRequest

Request to execute a task.

```python
class TaskRequest(BaseModel):
    task_id: Optional[str] = None                   # Optional ID
    agent_id: Optional[str] = None                  # Target agent (or auto)
    description: str                                # Task description
    input_data: Dict[str, Any] = {}                 # Input parameters
    priority: int = 0                               # Task priority
    timeout_seconds: Optional[int] = None           # Max execution time
    metadata: Dict[str, Any] = {}                   # Additional context
```

---

### SystemMetrics

Overall system statistics.

```python
class SystemMetrics(BaseModel):
    total_agents: int                               # Total agent count
    active_agents: int                              # Active agents
    idle_agents: int                                # Idle agents
    busy_agents: int                                # Busy agents
    error_agents: int                               # Error state agents
    total_tasks_queued: int                         # Queued tasks
    total_tasks_running: int                        # Running tasks
    total_tasks_completed: int                      # Completed tasks
    total_tasks_failed: int                         # Failed tasks
    average_task_time_seconds: float                # Avg execution time
    provider: str                                   # Provider name
    uptime_seconds: float                           # System uptime
```

---

## AgentProvider Interface

All agent providers **MUST** implement this abstract base class.

### Lifecycle Methods

#### `async def initialize() -> None`

Initialize the provider and establish connections.

**Responsibilities:**
- Connect to agent orchestration system
- Load configuration
- Initialize default agents
- Set up monitoring

**Raises:**
- `ConnectionError` - Cannot connect to provider
- `ConfigurationError` - Invalid configuration

---

#### `async def shutdown() -> None`

Gracefully shutdown and cleanup resources.

**Responsibilities:**
- Close connections
- Save state if needed
- Cancel pending tasks
- Release resources

---

### Agent Management

#### `async def list_agents() -> List[AgentStatus]`

Get status of all agents.

**Returns:** List of agent status objects

**Example:**
```python
agents = await provider.list_agents()
for agent in agents:
    print(f"{agent.name}: {agent.status}")
```

---

#### `async def get_agent_status(agent_id: str) -> AgentStatus`

Get status of a specific agent.

**Parameters:**
- `agent_id` - Unique agent identifier

**Returns:** Agent status object

**Raises:**
- `ValueError` - Agent not found

---

#### `async def create_agent(config: AgentConfig) -> AgentStatus`

Create a new agent.

**Parameters:**
- `config` - Agent configuration

**Returns:** Status of newly created agent

**Raises:**
- `ValueError` - Invalid configuration
- `RuntimeError` - Creation failed

---

#### `async def delete_agent(agent_id: str) -> bool`

Delete an agent.

**Parameters:**
- `agent_id` - Agent to delete

**Returns:** `True` if successful, `False` if not found

**Note:** Should cancel any running tasks for this agent.

---

### Task Management

#### `async def submit_task(task: TaskRequest) -> TaskStatus`

Submit a task to the queue.

**Parameters:**
- `task` - Task request

**Returns:** Initial task status

**Behavior:**
- If `task.agent_id` is specified, route to that agent
- If `None`, use auto-routing logic
- Task enters `queued` status initially

---

#### `async def get_task_status(task_id: str) -> TaskStatus`

Get current status of a task.

**Parameters:**
- `task_id` - Task identifier

**Returns:** Task status object

**Raises:**
- `ValueError` - Task not found

---

#### `async def cancel_task(task_id: str) -> bool`

Cancel a queued or running task.

**Parameters:**
- `task_id` - Task to cancel

**Returns:** `True` if cancelled, `False` if cannot cancel

**Note:** Cannot cancel completed or failed tasks.

---

#### `async def list_tasks(agent_id: Optional[str] = None, status: Optional[str] = None, limit: int = 100) -> List[TaskStatus]`

List tasks with optional filters.

**Parameters:**
- `agent_id` - Filter by agent (optional)
- `status` - Filter by status (optional)
- `limit` - Maximum results (default 100)

**Returns:** List of task status objects

---

### System Operations

#### `async def get_system_metrics() -> SystemMetrics`

Get overall system metrics.

**Returns:** System metrics object

**Used for:** Monitoring, dashboards, health checks

---

#### `async def health_check() -> Dict[str, Any]`

Check provider health.

**Returns:** Health status dictionary

**Example Response:**
```python
{
    "status": "healthy",
    "provider": "openclaw",
    "agents": 3,
    "tasks": 12,
    "uptime": 3600.5
}
```

---

## REST API Endpoints

### Agent Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/agents/status` | Get system metrics |
| GET | `/agents/health` | Health check |
| GET | `/agents/list` | List all agents |
| GET | `/agents/{agent_id}` | Get agent status |
| POST | `/agents/create` | Create new agent |
| DELETE | `/agents/{agent_id}` | Delete agent |

### Task Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agents/tasks/submit` | Submit task |
| GET | `/agents/tasks/list` | List tasks |
| GET | `/agents/tasks/{task_id}` | Get task status |
| POST | `/agents/tasks/{task_id}/cancel` | Cancel task |

---

## Provider Configuration

Configuration is stored in `config/agents.json`:

```json
{
  "provider": "openclaw",
  "config": {},
  "providers": {
    "openclaw": {
      "enabled": true,
      "gateway_url": "http://localhost:18789",
      "api_key": null
    },
    "langgraph": {
      "enabled": false,
      "api_url": "http://localhost:8123"
    }
  }
}
```

---

## Implementation Checklist

When implementing a new provider:

- [ ] Create provider class inheriting from `AgentProvider`
- [ ] Implement all 12 required methods
- [ ] Add provider to `agent_service.py` factory
- [ ] Add configuration schema to `agents.json`
- [ ] Write unit tests
- [ ] Update documentation
- [ ] Test integration with UI

---

## Error Handling

Providers should raise appropriate exceptions:

- `ValueError` - Invalid input or not found
- `ConnectionError` - Cannot connect to provider
- `RuntimeError` - Operation failed
- `TimeoutError` - Operation timed out

All exceptions are caught by the API layer and returned as HTTP errors.

---

## Testing

Use the `MockProvider` for testing:

```python
from src.agents import AgentService

# Initialize with mock
await AgentService.initialize(provider_type="mock")

# Test operations
service = AgentService.get_instance()
agents = await service.provider.list_agents()
assert len(agents) == 3  # Default agents
```

---

## Migration Guide

### From Hardcoded to Abstraction Layer

**Before:**
```python
# Direct OpenClaw calls
import openclaw
client = openclaw.Client()
agents = client.list_agents()
```

**After:**
```python
# Through abstraction layer
from src.agents import get_agent_service
service = get_agent_service()
agents = await service.provider.list_agents()
```

### Switching Providers

1. Update `config/agents.json`
2. Restart service
3. No code changes needed!

---

## Future Enhancements

Planned features:

- **Streaming** - Real-time task progress updates
- **Webhooks** - Event notifications
- **Batch Operations** - Submit multiple tasks
- **Agent Groups** - Logical agent grouping
- **Resource Limits** - CPU/memory constraints
- **Scheduling** - Cron-like task scheduling

---

## References

- Implementation: `apps/CORE_UI/backend/src/agents/`
- Configuration: `apps/CORE_UI/backend/config/agents.json`
- Documentation: `apps/CORE_UI/backend/README_AGENTS.md`
- OpenClaw Docs: https://docs.openclaw.ai/

---

## Changelog

### Version 1.0 (2026-02-07)
- Initial specification
- Core interfaces defined
- Mock provider implemented
- REST API defined
