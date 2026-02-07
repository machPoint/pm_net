# OpenClaw Integration Setup Guide

## Prerequisites

1. **Node.js** - Required for OpenClaw
2. **OpenClaw installed globally**
   ```bash
   npm install -g openclaw@latest
   ```

## Quick Start

### 1. Install OpenClaw

```bash
npm install -g openclaw@latest
```

### 2. Onboard and Setup

Run the onboarding wizard:

```bash
openclaw onboard --install-daemon
```

This will:
- Create configuration at `~/.openclaw/openclaw.json`
- Set up workspace directories
- Install the OpenClaw service

### 3. Start the Gateway

```bash
openclaw gateway --port 18789
```

The gateway will start on `http://localhost:18789`

### 4. Configure PM_NET

The configuration is already set in `config/agents.json`:

```json
{
  "provider": "openclaw",
  "providers": {
    "openclaw": {
      "enabled": true,
      "gateway_url": "http://localhost:18789",
      "api_key": null,
      "default_model": "claude-3-5-sonnet-20241022",
      "workspace_path": "~/.openclaw/workspace",
      "channels": ["whatsapp", "telegram", "discord"]
    }
  }
}
```

### 5. Initialize Agent Service

In your backend startup code:

```python
from src.agents import AgentService

# Initialize with OpenClaw
await AgentService.initialize(
    provider_type="openclaw",
    config={
        "gateway_url": "http://localhost:18789",
        "workspace_path": "~/.openclaw/workspace",
        "default_model": "claude-3-5-sonnet-20241022",
        "channels": ["whatsapp", "telegram", "discord"]
    }
)
```

### 6. Test the Connection

```bash
curl http://localhost:18789/health
```

Or via Python:

```python
from src.agents import get_agent_service

service = get_agent_service()
health = await service.provider.health_check()
print(health)
```

## OpenClaw Features

### Multi-Agent Routing

OpenClaw supports multiple agents with isolated workspaces:

```bash
# Add a new agent
openclaw agents add work

# List agents with bindings
openclaw agents list --bindings
```

### Channel Integration

Connect messaging channels:

```bash
# WhatsApp
openclaw channels login whatsapp

# Telegram
openclaw channels login telegram

# Discord
openclaw channels login discord
```

### Agent Configuration

Edit `~/.openclaw/openclaw.json` to configure agents:

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "workspace": "~/.openclaw/workspace-main",
        "sandbox": {
          "mode": "off"
        }
      },
      {
        "id": "planning",
        "workspace": "~/.openclaw/workspace-planning",
        "sandbox": {
          "mode": "all",
          "scope": "agent"
        },
        "tools": {
          "allow": ["read"],
          "deny": ["exec", "write"]
        }
      }
    ]
  }
}
```

## API Endpoints

OpenClaw provides these endpoints (used by our provider):

- `GET /health` - Health check
- `GET /api/agents/list` - List agents
- `POST /api/agents/create` - Create agent
- `DELETE /api/agents/{id}` - Delete agent
- `POST /api/messages/send` - Send message to agent

## Troubleshooting

### Gateway Not Starting

Check if port 18789 is available:

```bash
# Windows
netstat -ano | findstr :18789

# Linux/Mac
lsof -i :18789
```

### Connection Refused

Ensure OpenClaw gateway is running:

```bash
openclaw gateway --port 18789
```

### Agent Not Found

Sync agents from OpenClaw:

```python
service = get_agent_service()
agents = await service.provider.list_agents()
print(f"Found {len(agents)} agents")
```

### Workspace Permissions

Ensure workspace directory exists and is writable:

```bash
mkdir -p ~/.openclaw/workspace
chmod 755 ~/.openclaw/workspace
```

## Advanced Configuration

### Custom Model

Change the model in `config/agents.json`:

```json
{
  "openclaw": {
    "default_model": "gpt-4",
    "workspace_path": "~/.openclaw/workspace"
  }
}
```

### Sandbox Configuration

Configure per-agent sandboxing:

```json
{
  "agents": {
    "list": [
      {
        "id": "secure-agent",
        "sandbox": {
          "mode": "all",
          "scope": "agent",
          "docker": {
            "setupCommand": "apt-get update && apt-get install -y git"
          }
        }
      }
    ]
  }
}
```

### Tool Restrictions

Limit tools per agent:

```json
{
  "agents": {
    "list": [
      {
        "id": "read-only-agent",
        "tools": {
          "allow": ["read"],
          "deny": ["exec", "write", "edit", "apply_patch"]
        }
      }
    ]
  }
}
```

## Integration with PM_NET

### System Admin Dashboard

The Agent Status card will show:
- Active agents from OpenClaw
- Task queue status
- System metrics

### Task Submission

Submit tasks via API:

```bash
curl -X POST http://localhost:8000/agents/tasks/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Analyze network topology",
    "input_data": {"graph_id": "network-1"},
    "agent_id": "main"
  }'
```

### Monitoring

Check system status:

```bash
curl http://localhost:8000/agents/status
```

## Switching Back to Mock

To switch back to mock provider for testing:

1. Edit `config/agents.json`:
   ```json
   {
     "provider": "mock"
   }
   ```

2. Restart the backend

No code changes needed!

## Resources

- **OpenClaw Docs**: https://docs.openclaw.ai/
- **GitHub**: https://github.com/openclaw/openclaw
- **Interface Spec**: `docs/AGENT_INTERFACE_SPEC.md`
- **Provider Code**: `src/agents/providers/openclaw_provider.py`

## Support

For issues with:
- **PM_NET Integration**: Check `src/agents/providers/openclaw_provider.py`
- **OpenClaw Gateway**: Check OpenClaw docs and GitHub issues
- **Configuration**: Review `config/agents.json` and `~/.openclaw/openclaw.json`
