# Agent Orchestration Abstraction Layer

## Overview

This module provides a **provider-agnostic abstraction layer** for agent orchestration, allowing you to easily switch between different agent frameworks (OpenClaw, LangGraph, CrewAI, AutoGen, etc.) without changing your application code.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Your Application                       │
│              (FastAPI Routes, UI, etc.)                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  AgentService                            │
│            (Singleton Service Layer)                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 AgentProvider                            │
│              (Abstract Interface)                        │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬────────────┐
        ▼            ▼            ▼            ▼
   ┌────────┐  ┌──────────┐  ┌────────┐  ┌─────────┐
   │  Mock  │  │ OpenClaw │  │LangGraph│  │ CrewAI  │
   │Provider│  │ Provider │  │Provider │  │Provider │
   └────────┘  └──────────┘  └────────┘  └─────────┘
```

## Quick Start

### 1. Configuration

Edit `config/agents.json` to select your provider:

```json
{
  "provider": "mock",  // Change to "openclaw", "langgraph", etc.
  "config": {}
}
```

### 2. Initialize the Service

```python
from src.agents import AgentService

# Initialize with mock provider (default)
await AgentService.initialize(provider_type="mock")

# Or with OpenClaw
await AgentService.initialize(
    provider_type="openclaw",
    config={
        "gateway_url": "http://localhost:18789",
        "api_key": "your-key"
    }
)
```

### 3. Use the Service

```python
from src.agents import get_agent_service

service = get_agent_service()

# List all agents
agents = await service.provider.list_agents()

# Submit a task
task = TaskRequest(
    description="Analyze the network topology",
    input_data={"graph_id": "network-1"}
)
task_status = await service.provider.submit_task(task)

# Get system metrics
metrics = await service.provider.get_system_metrics()
```

## Switching Providers

To switch from one provider to another:

1. **Update Configuration**
   ```json
   {
     "provider": "langgraph",  // Changed from "mock"
     "config": {
       "api_url": "http://localhost:8123"
     }
   }
   ```

2. **Restart the Service**
   ```python
   await AgentService.initialize(provider_type="langgraph", config={...})
   ```

That's it! Your application code doesn't need to change.

## Core Interfaces

### AgentProvider (Abstract Base Class)

All providers must implement these methods:

- `initialize()` - Set up the provider
- `shutdown()` - Clean up resources
- `list_agents()` - Get all agents
- `get_agent_status(agent_id)` - Get specific agent
- `create_agent(config)` - Create new agent
- `delete_agent(agent_id)` - Remove agent
- `submit_task(task)` - Submit task to queue
- `get_task_status(task_id)` - Check task status
- `cancel_task(task_id)` - Cancel task
- `list_tasks()` - List all tasks
- `get_system_metrics()` - Get system stats
- `health_check()` - Health status

### Data Models

- **AgentStatus** - Current state of an agent
- **AgentConfig** - Configuration for creating agents
- **TaskRequest** - Request to execute a task
- **TaskStatus** - Current state of a task
- **SystemMetrics** - Overall system statistics

## API Endpoints

### Agent Management

- `GET /agents/status` - System metrics
- `GET /agents/health` - Health check
- `GET /agents/list` - List all agents
- `GET /agents/{agent_id}` - Get agent status
- `POST /agents/create` - Create new agent
- `DELETE /agents/{agent_id}` - Delete agent

### Task Management

- `POST /agents/tasks/submit` - Submit task
- `GET /agents/tasks/list` - List tasks
- `GET /agents/tasks/{task_id}` - Get task status
- `POST /agents/tasks/{task_id}/cancel` - Cancel task

## Adding a New Provider

1. **Create Provider Class**
   ```python
   # src/agents/providers/my_provider.py
   from ..types import AgentProvider
   
   class MyAgentProvider(AgentProvider):
       async def initialize(self):
           # Connect to your agent system
           pass
       
       async def list_agents(self):
           # Return list of AgentStatus
           pass
       
       # Implement all other required methods...
   ```

2. **Register in Service**
   ```python
   # src/agents/agent_service.py
   elif provider_type == "myprovider":
       from .providers.my_provider import MyAgentProvider
       instance._provider = MyAgentProvider(config)
   ```

3. **Update Configuration**
   ```json
   {
     "provider": "myprovider",
     "providers": {
       "myprovider": {
         "enabled": true,
         "custom_config": "value"
       }
     }
   }
   ```

## Supported Providers

### Mock Provider (Default)
- **Status**: ✅ Implemented
- **Use Case**: Testing and development
- **Features**: In-memory agents and tasks

### OpenClaw Provider
- **Status**: 🚧 Placeholder
- **Use Case**: Multi-channel agent gateway
- **Features**: WhatsApp, Telegram, Discord integration

### LangGraph Provider
- **Status**: 🚧 Placeholder
- **Use Case**: LangChain graph-based agents
- **Features**: Stateful agent workflows

### CrewAI Provider
- **Status**: 🚧 Placeholder
- **Use Case**: Role-based multi-agent teams
- **Features**: Hierarchical agent collaboration

### AutoGen Provider
- **Status**: 🚧 Placeholder
- **Use Case**: Microsoft AutoGen framework
- **Features**: Conversational agents

## Benefits

1. **Flexibility** - Switch providers without code changes
2. **Testing** - Use mock provider for development
3. **Vendor Independence** - Not locked into one framework
4. **Gradual Migration** - Migrate between providers incrementally
5. **Consistent API** - Same interface regardless of provider

## Example: Switching from Mock to OpenClaw

**Before** (using mock):
```python
await AgentService.initialize(provider_type="mock")
```

**After** (using OpenClaw):
```python
await AgentService.initialize(
    provider_type="openclaw",
    config={
        "gateway_url": "http://localhost:18789",
        "workspace_path": "~/.openclaw/workspace"
    }
)
```

All your application code remains the same!

## Future Providers

Planned support for:
- **Semantic Kernel** - Microsoft's AI orchestration
- **Haystack** - NLP pipeline framework
- **Custom** - Your own agent implementation

## Contributing

To add a new provider:
1. Implement the `AgentProvider` interface
2. Add configuration schema
3. Update the factory in `agent_service.py`
4. Add tests
5. Update documentation
