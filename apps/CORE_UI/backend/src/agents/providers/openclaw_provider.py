"""
OpenClaw Agent Provider

Integrates with OpenClaw gateway via the CLI (openclaw --json).
The gateway is WebSocket-based; the CLI is the supported integration surface.
"""

import asyncio
import json
import logging
import shutil
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
    AgentCapability,
)

logger = logging.getLogger(__name__)


async def _run_cli(*args: str, timeout: float = 30.0) -> Dict[str, Any]:
    """Run an openclaw CLI command and return parsed JSON output."""
    cli = shutil.which("openclaw")
    if not cli:
        raise FileNotFoundError("openclaw CLI not found on PATH")

    cmd = [cli, *args]
    logger.debug(f"Running: {' '.join(cmd)}")

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        raise TimeoutError(f"openclaw command timed out after {timeout}s: {' '.join(args)}")

    out = stdout.decode().strip()
    err = stderr.decode().strip()

    if proc.returncode != 0:
        logger.warning(f"openclaw exited {proc.returncode}: {err or out}")

    # Try to parse JSON from stdout
    if out:
        try:
            return json.loads(out)
        except json.JSONDecodeError:
            return {"raw": out}

    return {"raw": err or "", "returncode": proc.returncode}


class OpenClawProvider(AgentProvider):
    """
    OpenClaw provider — talks to the gateway via the ``openclaw`` CLI.

    Key CLI commands used:
      openclaw health --json          → gateway health + agent list
      openclaw agents list --json     → configured agents
      openclaw agent --agent <id> --message <text> --json  → run a task
      openclaw agents add <id>        → create agent
      openclaw agents delete <id>     → delete agent
    """

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.gateway_url = config.get("gateway_url", "http://localhost:18789")
        self.workspace_path = config.get("workspace_path", "~/.openclaw/workspace")
        self.default_model = config.get("default_model", "anthropic/claude-sonnet-4-5")

        self._agents: Dict[str, AgentStatus] = {}
        self._tasks: Dict[str, TaskStatus] = {}
        self._health_cache: Dict[str, Any] = {}
        self._start_time = time.time()

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def initialize(self) -> None:
        """Verify the gateway is reachable and load agents."""
        health = await _run_cli("health", "--json")

        if not health.get("ok"):
            raise ConnectionError(
                f"OpenClaw gateway not healthy: {health}"
            )

        self._health_cache = health
        await self._sync_agents()
        self._initialized = True
        logger.info(
            f"OpenClaw provider initialized — "
            f"{len(self._agents)} agent(s), gateway ok"
        )

    async def shutdown(self) -> None:
        self._agents.clear()
        self._tasks.clear()
        self._initialized = False

    # ------------------------------------------------------------------
    # Agent sync
    # ------------------------------------------------------------------

    async def _sync_agents(self) -> None:
        """Pull the real agent list from ``openclaw agents list --json``."""
        try:
            agents_data = await _run_cli("agents", "list", "--json")
        except Exception as e:
            logger.error(f"Failed to list agents: {e}")
            return

        # agents_data is a list of dicts
        agent_list = agents_data if isinstance(agents_data, list) else agents_data.get("agents", [])

        seen: set = set()
        for ad in agent_list:
            agent_id = ad.get("id", ad.get("agentId", "unknown"))
            seen.add(agent_id)

            if agent_id in self._agents:
                # Update metadata but keep task counters
                self._agents[agent_id].metadata.update({
                    "workspace": ad.get("workspace"),
                    "model": ad.get("model"),
                    "isDefault": ad.get("isDefault", False),
                    "bindings": ad.get("bindings", 0),
                })
            else:
                self._agents[agent_id] = AgentStatus(
                    agent_id=agent_id,
                    name=ad.get("name", agent_id.title() + " Agent"),
                    status="idle",
                    tasks_completed=0,
                    tasks_failed=0,
                    uptime_seconds=time.time() - self._start_time,
                    last_activity=datetime.utcnow(),
                    metadata={
                        "workspace": ad.get("workspace"),
                        "model": ad.get("model"),
                        "isDefault": ad.get("isDefault", False),
                        "bindings": ad.get("bindings", 0),
                        "provider": "openclaw",
                    },
                )

        # Remove agents that no longer exist in OpenClaw
        for stale_id in set(self._agents.keys()) - seen:
            del self._agents[stale_id]

    # ------------------------------------------------------------------
    # Agent CRUD
    # ------------------------------------------------------------------

    async def list_agents(self) -> List[AgentStatus]:
        await self._sync_agents()
        return list(self._agents.values())

    async def get_agent_status(self, agent_id: str) -> AgentStatus:
        if agent_id not in self._agents:
            await self._sync_agents()
        if agent_id not in self._agents:
            raise ValueError(f"Agent {agent_id} not found")
        return self._agents[agent_id]

    async def create_agent(self, config: AgentConfig) -> AgentStatus:
        """Create agent via ``openclaw agents add``."""
        try:
            result = await _run_cli("agents", "add", config.agent_id)
            logger.info(f"Created OpenClaw agent: {config.agent_id} → {result}")
        except Exception as e:
            logger.warning(f"openclaw agents add failed: {e}, registering locally")

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
                "model": config.model or self.default_model,
                "provider": "openclaw",
            },
        )
        self._agents[config.agent_id] = status
        return status

    async def delete_agent(self, agent_id: str) -> bool:
        try:
            await _run_cli("agents", "delete", agent_id)
        except Exception as e:
            logger.warning(f"openclaw agents delete failed: {e}")

        if agent_id in self._agents:
            del self._agents[agent_id]
            return True
        return False

    # ------------------------------------------------------------------
    # Task execution
    # ------------------------------------------------------------------

    async def submit_task(self, task: TaskRequest) -> TaskStatus:
        """Submit a task — runs ``openclaw agent`` in background."""
        task_id = task.task_id or f"task-{uuid4().hex[:8]}"

        agent_id = task.agent_id
        if not agent_id:
            idle = [a for a in self._agents.values() if a.status == "idle"]
            agent_id = idle[0].agent_id if idle else "main"

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
            },
        )
        self._tasks[task_id] = task_status

        asyncio.create_task(self._execute_task(task_id, task, agent_id))
        return task_status

    async def _execute_task(self, task_id: str, task: TaskRequest, agent_id: str):
        """Execute via ``openclaw agent --agent <id> --message <msg> --json``."""
        ts = self._tasks[task_id]

        try:
            ts.status = "running"
            ts.started_at = datetime.utcnow()

            if agent_id in self._agents:
                self._agents[agent_id].status = "busy"
                self._agents[agent_id].current_task = task_id

            timeout = task.timeout_seconds or 300
            result = await _run_cli(
                "agent",
                "--agent", agent_id,
                "--message", task.description,
                "--json",
                timeout=float(timeout),
            )

            status_field = result.get("status", "")
            if status_field == "ok" or result.get("result"):
                ts.status = "completed"
                ts.completed_at = datetime.utcnow()

                payloads = result.get("result", {}).get("payloads", [])
                output_text = payloads[0].get("text", "") if payloads else ""

                ts.result = {
                    "output": output_text,
                    "runId": result.get("runId"),
                    "durationMs": result.get("result", {}).get("meta", {}).get("durationMs"),
                    "model": result.get("result", {}).get("meta", {}).get("agentMeta", {}).get("model"),
                }

                if agent_id in self._agents:
                    self._agents[agent_id].tasks_completed += 1
            else:
                raise RuntimeError(f"Agent returned non-ok status: {json.dumps(result)[:500]}")

        except Exception as e:
            ts.status = "failed"
            ts.completed_at = datetime.utcnow()
            ts.error = str(e)
            logger.error(f"Task {task_id} failed: {e}")

            if agent_id in self._agents:
                self._agents[agent_id].tasks_failed += 1

        finally:
            if agent_id in self._agents:
                self._agents[agent_id].status = "idle"
                self._agents[agent_id].current_task = None
                self._agents[agent_id].last_activity = datetime.utcnow()

    # ------------------------------------------------------------------
    # Task queries
    # ------------------------------------------------------------------

    async def get_task_status(self, task_id: str) -> TaskStatus:
        if task_id not in self._tasks:
            raise ValueError(f"Task {task_id} not found")
        return self._tasks[task_id]

    async def cancel_task(self, task_id: str) -> bool:
        if task_id in self._tasks:
            t = self._tasks[task_id]
            if t.status in ["queued", "running"]:
                t.status = "cancelled"
                t.completed_at = datetime.utcnow()
                return True
        return False

    async def list_tasks(
        self,
        agent_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
    ) -> List[TaskStatus]:
        tasks = list(self._tasks.values())
        if agent_id:
            tasks = [t for t in tasks if t.agent_id == agent_id]
        if status:
            tasks = [t for t in tasks if t.status == status]
        tasks.sort(key=lambda t: t.created_at, reverse=True)
        return tasks[:limit]

    # ------------------------------------------------------------------
    # Metrics & health
    # ------------------------------------------------------------------

    async def get_system_metrics(self) -> SystemMetrics:
        agents = list(self._agents.values())
        tasks = list(self._tasks.values())

        completed = [t for t in tasks if t.status == "completed" and t.started_at and t.completed_at]
        avg_time = 0.0
        if completed:
            times = [(t.completed_at - t.started_at).total_seconds() for t in completed]
            avg_time = sum(times) / len(times)

        return SystemMetrics(
            total_agents=len(agents),
            active_agents=sum(1 for a in agents if a.status in ("idle", "busy")),
            idle_agents=sum(1 for a in agents if a.status == "idle"),
            busy_agents=sum(1 for a in agents if a.status == "busy"),
            error_agents=sum(1 for a in agents if a.status == "error"),
            total_tasks_queued=sum(1 for t in tasks if t.status == "queued"),
            total_tasks_running=sum(1 for t in tasks if t.status == "running"),
            total_tasks_completed=sum(1 for t in tasks if t.status == "completed"),
            total_tasks_failed=sum(1 for t in tasks if t.status == "failed"),
            average_task_time_seconds=avg_time,
            provider="openclaw",
            uptime_seconds=time.time() - self._start_time,
        )

    async def health_check(self) -> Dict[str, Any]:
        try:
            health = await _run_cli("health", "--json", timeout=10.0)
            gw_ok = health.get("ok", False)

            return {
                "status": "healthy" if (self._initialized and gw_ok) else "degraded",
                "provider": "openclaw",
                "gateway_url": self.gateway_url,
                "gateway_healthy": gw_ok,
                "default_agent": health.get("defaultAgentId"),
                "agents": len(self._agents),
                "tasks": len(self._tasks),
                "uptime": time.time() - self._start_time,
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "provider": "openclaw",
                "error": str(e),
                "agents": len(self._agents),
                "tasks": len(self._tasks),
            }
