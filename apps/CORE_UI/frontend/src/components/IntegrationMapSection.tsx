"use client";

import { useState, useEffect, useCallback } from "react";
import {
	CheckCircle2,
	XCircle,
	Loader2,
	RefreshCw,
	ArrowRight,
	ArrowDown,
	Wifi,
	Database,
	Brain,
	Bot,
	Monitor,
	Server,
	Globe,
	Zap,
	Radio,
	AlertTriangle,
	Clock,
	Activity,
	ExternalLink,
	ChevronDown,
	ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type ConnStatus = "checking" | "online" | "offline" | "degraded" | "not_configured";

interface ConnectionPoint {
	id: string;
	label: string;
	description: string;
	icon: any;
	status: ConnStatus;
	latencyMs?: number;
	detail?: string;
	url?: string;
	externalUrl?: string;
}

interface ConnectionLink {
	from: string;
	to: string;
	label: string;
	protocol: string;
	status: ConnStatus;
	detail?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export default function IntegrationMapSection() {
	const [nodes, setNodes] = useState<ConnectionPoint[]>(initialNodes());
	const [links, setLinks] = useState<ConnectionLink[]>(initialLinks());
	const [loading, setLoading] = useState(false);
	const [lastRefresh, setLastRefresh] = useState("");
	const [expandedDetail, setExpandedDetail] = useState<string | null>(null);
	const [detailData, setDetailData] = useState<Record<string, any>>({});

	const runHealthChecks = useCallback(async () => {
		setLoading(true);
		setNodes((prev) => prev.map((n) => ({ ...n, status: "checking" as ConnStatus })));
		setLinks((prev) => prev.map((l) => ({ ...l, status: "checking" as ConnStatus })));

		const results: Record<string, { status: ConnStatus; latencyMs?: number; detail?: string; data?: any }> = {};

		// 1. Check OPAL_SE backend
		try {
			const t0 = Date.now();
			const res = await fetch("/api/opal/health");
			const latency = Date.now() - t0;
			if (res.ok) {
				const data = await res.json();
				results["opal-se"] = { status: "online", latencyMs: latency, detail: `Uptime: ${Math.round(data.uptime || 0)}s`, data };
			} else {
				results["opal-se"] = { status: "offline", detail: `HTTP ${res.status}` };
			}
		} catch (e: any) {
			results["opal-se"] = { status: "offline", detail: e.message };
		}

		// 2. Check CORE_UI (we're running on it)
		results["core-ui"] = { status: "online", latencyMs: 0, detail: "Current application" };

		// 3. Check OpenClaw gateway
		try {
			const t0 = Date.now();
			const res = await fetch("/api/openclaw/status");
			const latency = Date.now() - t0;
			if (res.ok) {
				const data = await res.json();
				const gw = data.status?.gateway;
				if (gw?.reachable) {
					results["openclaw"] = {
						status: "online",
						latencyMs: gw.connectLatencyMs || latency,
						detail: `Gateway ${gw.url || "ws://127.0.0.1:18789"}`,
						data: data.status,
					};
					// Skills info
					if (data.skills?.skills) {
						const eligible = data.skills.skills.filter((s: any) => s.eligible).length;
						results["openclaw-skills"] = {
							status: eligible > 0 ? "online" : "degraded",
							detail: `${eligible}/${data.skills.skills.length} skills ready`,
							data: data.skills,
						};
					}
					// Agents info
					if (data.status?.agents) {
						results["openclaw-agents"] = {
							status: data.status.agents.agents?.length > 0 ? "online" : "degraded",
							detail: `${data.status.agents.agents?.length || 0} agents, ${data.status.agents.totalSessions || 0} sessions`,
							data: data.status.agents,
						};
					}
					// Security
					if (data.status?.securityAudit) {
						const crit = data.status.securityAudit.summary?.critical || 0;
						results["openclaw-security"] = {
							status: crit > 0 ? "degraded" : "online",
							detail: `${crit} critical, ${data.status.securityAudit.summary?.warn || 0} warnings`,
							data: data.status.securityAudit,
						};
					}
				} else {
					results["openclaw"] = { status: "offline", detail: gw?.error || "Gateway unreachable" };
				}
			} else {
				results["openclaw"] = { status: "offline", detail: "CLI query failed" };
			}
		} catch (e: any) {
			results["openclaw"] = { status: "offline", detail: e.message };
		}

		// 4. Check OpenAI API (via OPAL_SE proxy)
		try {
			const t0 = Date.now();
			const res = await fetch("/api/opal/proxy/api/llm/providers");
			const latency = Date.now() - t0;
			if (res.ok) {
				const data = await res.json();
				const providers = data.providers || data.data || [];
				const openai = Array.isArray(providers) ? providers.find((p: any) => p.name === "openai") : null;
				if (openai?.available) {
					results["openai"] = { status: "online", latencyMs: latency, detail: `Provider available`, data: openai };
				} else {
					results["openai"] = { status: "degraded", latencyMs: latency, detail: "Provider listed but may not be available", data: openai };
				}
				const ollama = Array.isArray(providers) ? providers.find((p: any) => p.name === "ollama") : null;
				if (ollama?.available) {
					results["ollama"] = { status: "online", detail: "Local LLM available", data: ollama };
				} else {
					results["ollama"] = { status: "offline", detail: "Ollama not running" };
				}
			} else {
				// Try the agent gateway test endpoint
				try {
					const res2 = await fetch("/api/opal/proxy/api/agent-gateway/test");
					if (res2.ok) {
						const data2 = await res2.json();
						if (data2.status === "ok") {
							results["openai"] = { status: "online", detail: `${data2.model_count || "?"} models available`, data: data2 };
						} else {
							results["openai"] = { status: "offline", detail: data2.error || "Test failed" };
						}
					} else {
						results["openai"] = { status: "not_configured", detail: "LLM provider endpoint unavailable" };
					}
				} catch {
					results["openai"] = { status: "not_configured", detail: "Could not reach LLM provider status" };
				}
				results["ollama"] = results["ollama"] || { status: "not_configured", detail: "Provider status unavailable" };
			}
		} catch (e: any) {
			results["openai"] = { status: "not_configured", detail: e.message };
			results["ollama"] = { status: "not_configured", detail: e.message };
		}

		// 5. Check Graph DB (via OPAL_SE — query nodes endpoint)
		try {
			const t0 = Date.now();
			const [nodesRes, edgesRes] = await Promise.all([
				fetch("/api/opal/proxy/api/nodes?limit=1"),
				fetch("/api/opal/proxy/api/edges?limit=1"),
			]);
			const latency = Date.now() - t0;
			if (nodesRes.ok) {
				const nodesData = await nodesRes.json();
				const edgesData = edgesRes.ok ? await edgesRes.json() : {};
				const nodeCount = nodesData.total ?? nodesData.nodes?.length ?? "?";
				const edgeCount = edgesData.total ?? edgesData.edges?.length ?? "?";
				results["graph-db"] = { status: "online", latencyMs: latency, detail: `${nodeCount} nodes, ${edgeCount} edges`, data: { nodes: nodeCount, edges: edgeCount } };
			} else {
				results["graph-db"] = { status: "degraded", detail: `HTTP ${nodesRes.status}` };
			}
		} catch (e: any) {
			results["graph-db"] = { status: "offline", detail: e.message };
		}

		// 6. Check SSE Event Stream
		try {
			const res = await fetch("/api/events/stream", { method: "GET", signal: AbortSignal.timeout(2000) });
			if (res.ok || res.status === 200) {
				results["sse"] = { status: "online", detail: "Event stream endpoint reachable" };
			} else {
				results["sse"] = { status: "degraded", detail: `HTTP ${res.status}` };
			}
		} catch (e: any) {
			// SSE might timeout on purpose (it's a stream), that's actually OK
			if (e.name === "TimeoutError" || e.name === "AbortError") {
				results["sse"] = { status: "online", detail: "Stream endpoint active (timeout expected)" };
			} else {
				results["sse"] = { status: "offline", detail: e.message };
			}
		}

		// Apply results to nodes
		setNodes((prev) =>
			prev.map((n) => {
				const r = results[n.id];
				if (r) return { ...n, status: r.status, latencyMs: r.latencyMs, detail: r.detail };
				return { ...n, status: "not_configured" as ConnStatus };
			})
		);

		// Derive link statuses from node statuses
		setLinks((prev) =>
			prev.map((l) => {
				const fromR = results[l.from];
				const toR = results[l.to];
				let status: ConnStatus = "not_configured";
				if (fromR && toR) {
					if (fromR.status === "online" && toR.status === "online") status = "online";
					else if (fromR.status === "offline" || toR.status === "offline") status = "offline";
					else status = "degraded";
				} else if (fromR?.status === "online" || toR?.status === "online") {
					status = "degraded";
				}
				return { ...l, status };
			})
		);

		// Store detail data
		const dd: Record<string, any> = {};
		for (const [k, v] of Object.entries(results)) {
			if (v.data) dd[k] = v.data;
		}
		setDetailData(dd);

		setLastRefresh(new Date().toLocaleTimeString());
		setLoading(false);
	}, []);

	useEffect(() => {
		runHealthChecks();
	}, [runHealthChecks]);

	// Count statuses
	const onlineCount = nodes.filter((n) => n.status === "online").length;
	const offlineCount = nodes.filter((n) => n.status === "offline").length;
	const degradedCount = nodes.filter((n) => n.status === "degraded").length;

	return (
		<ScrollArea className="h-full">
			<div className="p-6 space-y-6 max-w-[1400px] mx-auto">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-3">
							<Activity className="w-6 h-6 text-cyan-400" />
							Integration Map
						</h1>
						<p className="text-sm text-[var(--color-text-secondary)] mt-1">
							Live connection status between PM_NET services and the OpenClaw agent framework
						</p>
					</div>
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2 text-xs">
							<StatusDot status="online" /> {onlineCount} online
							<StatusDot status="degraded" /> {degradedCount} degraded
							<StatusDot status="offline" /> {offlineCount} offline
						</div>
						{lastRefresh && (
							<span className="text-xs text-[var(--color-text-secondary)]">{lastRefresh}</span>
						)}
						<Button variant="outline" size="sm" onClick={runHealthChecks} disabled={loading} className="gap-1.5">
							<RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
							Check All
						</Button>
					</div>
				</div>

				{/* Architecture Diagram */}
				<div className="rounded-xl border border-border bg-[var(--color-background)] p-6">
					<h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-6">
						System Architecture
					</h2>

					{/* Row 1: User-facing layer */}
					<div className="flex items-center justify-center gap-4 mb-2">
						<NodeCard
							node={nodes.find((n) => n.id === "core-ui")!}
							expanded={expandedDetail === "core-ui"}
							onToggle={() => setExpandedDetail(expandedDetail === "core-ui" ? null : "core-ui")}
							detailData={detailData["core-ui"]}
						/>
					</div>

					{/* Arrow down */}
					<div className="flex justify-center my-1">
						<LinkArrow link={links.find((l) => l.from === "core-ui" && l.to === "opal-se")!} vertical />
					</div>

					{/* Row 2: OPAL_SE + OpenClaw */}
					<div className="flex items-start justify-center gap-8 mb-2">
						<NodeCard
							node={nodes.find((n) => n.id === "opal-se")!}
							expanded={expandedDetail === "opal-se"}
							onToggle={() => setExpandedDetail(expandedDetail === "opal-se" ? null : "opal-se")}
							detailData={detailData["opal-se"]}
						/>
						<div className="flex items-center self-center">
							<LinkArrow link={links.find((l) => l.from === "core-ui" && l.to === "openclaw")!} />
						</div>
						<NodeCard
							node={nodes.find((n) => n.id === "openclaw")!}
							expanded={expandedDetail === "openclaw"}
							onToggle={() => setExpandedDetail(expandedDetail === "openclaw" ? null : "openclaw")}
							detailData={detailData["openclaw"]}
						/>
					</div>

					{/* Row 3: Services */}
					<div className="flex items-start justify-center gap-3 mt-2">
						{/* OPAL_SE downstream */}
						<div className="flex flex-col items-center gap-1">
							<LinkArrow link={links.find((l) => l.from === "opal-se" && l.to === "graph-db")!} vertical />
							<NodeCard
								node={nodes.find((n) => n.id === "graph-db")!}
								expanded={expandedDetail === "graph-db"}
								onToggle={() => setExpandedDetail(expandedDetail === "graph-db" ? null : "graph-db")}
								detailData={detailData["graph-db"]}
								compact
							/>
						</div>

						<div className="flex flex-col items-center gap-1">
							<LinkArrow link={links.find((l) => l.from === "opal-se" && l.to === "openai")!} vertical />
							<NodeCard
								node={nodes.find((n) => n.id === "openai")!}
								expanded={expandedDetail === "openai"}
								onToggle={() => setExpandedDetail(expandedDetail === "openai" ? null : "openai")}
								detailData={detailData["openai"]}
								compact
							/>
						</div>

						<div className="flex flex-col items-center gap-1">
							<LinkArrow link={links.find((l) => l.from === "opal-se" && l.to === "ollama")!} vertical />
							<NodeCard
								node={nodes.find((n) => n.id === "ollama")!}
								expanded={expandedDetail === "ollama"}
								onToggle={() => setExpandedDetail(expandedDetail === "ollama" ? null : "ollama")}
								detailData={detailData["ollama"]}
								compact
							/>
						</div>

						<div className="flex flex-col items-center gap-1">
							<LinkArrow link={links.find((l) => l.from === "opal-se" && l.to === "sse")!} vertical />
							<NodeCard
								node={nodes.find((n) => n.id === "sse")!}
								expanded={expandedDetail === "sse"}
								onToggle={() => setExpandedDetail(expandedDetail === "sse" ? null : "sse")}
								detailData={detailData["sse"]}
								compact
							/>
						</div>

						{/* OpenClaw downstream */}
						<div className="w-4" /> {/* spacer */}
						<div className="flex flex-col items-center gap-1">
							<LinkArrow link={links.find((l) => l.from === "openclaw" && l.to === "openclaw-agents")!} vertical />
							<NodeCard
								node={nodes.find((n) => n.id === "openclaw-agents")!}
								expanded={expandedDetail === "openclaw-agents"}
								onToggle={() => setExpandedDetail(expandedDetail === "openclaw-agents" ? null : "openclaw-agents")}
								detailData={detailData["openclaw-agents"]}
								compact
							/>
						</div>

						<div className="flex flex-col items-center gap-1">
							<LinkArrow link={links.find((l) => l.from === "openclaw" && l.to === "openclaw-skills")!} vertical />
							<NodeCard
								node={nodes.find((n) => n.id === "openclaw-skills")!}
								expanded={expandedDetail === "openclaw-skills"}
								onToggle={() => setExpandedDetail(expandedDetail === "openclaw-skills" ? null : "openclaw-skills")}
								detailData={detailData["openclaw-skills"]}
								compact
							/>
						</div>
					</div>
				</div>

				{/* Connection Details Table */}
				<div className="rounded-xl border border-border bg-[var(--color-background)]">
					<div className="p-4 border-b border-border">
						<h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Connection Details</h2>
					</div>
					<div className="divide-y divide-border">
						{links.map((link) => {
							const fromNode = nodes.find((n) => n.id === link.from);
							const toNode = nodes.find((n) => n.id === link.to);
							return (
								<div key={`${link.from}-${link.to}`} className="px-4 py-3 flex items-center gap-4">
									<StatusDot status={link.status} />
									<div className="flex items-center gap-2 min-w-[200px]">
										<span className="text-xs font-medium text-[var(--color-text-primary)]">{fromNode?.label}</span>
										<ArrowRight className="w-3 h-3 text-[var(--color-text-secondary)]" />
										<span className="text-xs font-medium text-[var(--color-text-primary)]">{toNode?.label}</span>
									</div>
									<Badge variant="outline" className="text-[10px] font-mono">{link.protocol}</Badge>
									<span className="text-xs text-[var(--color-text-secondary)]">{link.label}</span>
									<span className="text-xs text-[var(--color-text-secondary)] ml-auto">{link.detail || ""}</span>
									<StatusBadge status={link.status} />
								</div>
							);
						})}
					</div>
				</div>

				{/* Integration Checklist */}
				<div className="rounded-xl border border-border bg-[var(--color-background)]">
					<div className="p-4 border-b border-border">
						<h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Integration Checklist</h2>
						<p className="text-xs text-[var(--color-text-secondary)] mt-0.5">What&apos;s connected and what still needs wiring</p>
					</div>
					<div className="p-4 space-y-2">
						<ChecklistItem
							done={nodes.find((n) => n.id === "opal-se")?.status === "online"}
							label="OPAL_SE Backend"
							description="Express server on port 7788 serving graph API, LLM gateway, task intake"
						/>
						<ChecklistItem
							done={nodes.find((n) => n.id === "core-ui")?.status === "online"}
							label="CORE_UI Frontend"
							description="Next.js app on port 3000 with proxy to OPAL_SE"
						/>
						<ChecklistItem
							done={nodes.find((n) => n.id === "openclaw")?.status === "online"}
							label="OpenClaw Gateway"
							description="Agent framework gateway on ws://127.0.0.1:18789"
						/>
						<ChecklistItem
							done={nodes.find((n) => n.id === "graph-db")?.status === "online"}
							label="Graph Database (Chelex)"
							description="SQLite-backed 2-layer graph schema (PM + Governance)"
						/>
						<ChecklistItem
							done={nodes.find((n) => n.id === "openai")?.status === "online"}
							label="OpenAI API"
							description="Cloud LLM provider for agent gateway (GPT-4o)"
						/>
						<ChecklistItem
							done={nodes.find((n) => n.id === "ollama")?.status === "online"}
							label="Ollama (Local LLM)"
							description="Local fallback LLM on port 11434"
						/>
						<ChecklistItem
							done={nodes.find((n) => n.id === "sse")?.status === "online"}
							label="SSE Event Stream"
							description="Real-time server-sent events from OPAL_SE to browser"
						/>
						<ChecklistItem
							done={false}
							label="OpenClaw MCP Channel → OPAL_SE"
							description="Wire OpenClaw as an MCP client to OPAL_SE's MCP endpoint for bidirectional agent control"
							future
						/>
						<ChecklistItem
							done={false}
							label="OpenClaw Skill: PM_NET"
							description="Custom OpenClaw skill that exposes graph queries, task creation, and plan execution"
							future
						/>
						<ChecklistItem
							done={false}
							label="Agent Heartbeat → Dashboard"
							description="Route OpenClaw heartbeat events into the PM_NET event stream for dashboard display"
							future
						/>
					</div>
				</div>
			</div>
		</ScrollArea>
	);
}

// ============================================================================
// Initial Data
// ============================================================================

function initialNodes(): ConnectionPoint[] {
	return [
		{ id: "core-ui", label: "CORE_UI", description: "Next.js 15 Frontend", icon: Monitor, status: "checking", url: "http://localhost:3000" },
		{ id: "opal-se", label: "OPAL_SE", description: "Express Backend (MCP + Graph)", icon: Server, status: "checking", url: "http://localhost:7788" },
		{ id: "openclaw", label: "OpenClaw Gateway", description: "Agent Framework", icon: Bot, status: "checking", url: "ws://127.0.0.1:18789", externalUrl: "http://127.0.0.1:18789" },
		{ id: "graph-db", label: "Graph DB", description: "Chelex SQLite (2-layer)", icon: Database, status: "checking" },
		{ id: "openai", label: "OpenAI API", description: "Cloud LLM (GPT-4o)", icon: Globe, status: "checking", externalUrl: "https://api.openai.com" },
		{ id: "ollama", label: "Ollama", description: "Local LLM Fallback", icon: Brain, status: "checking", url: "http://localhost:11434" },
		{ id: "sse", label: "SSE Stream", description: "Real-time Events", icon: Radio, status: "checking" },
		{ id: "openclaw-agents", label: "OC Agents", description: "Registered Agents", icon: Bot, status: "checking" },
		{ id: "openclaw-skills", label: "OC Skills", description: "Available Skills", icon: Zap, status: "checking" },
	];
}

function initialLinks(): ConnectionLink[] {
	return [
		{ from: "core-ui", to: "opal-se", label: "API Proxy", protocol: "HTTP /api/opal/proxy/*", status: "checking" },
		{ from: "core-ui", to: "openclaw", label: "CLI Status Queries", protocol: "HTTP /api/openclaw/*", status: "checking" },
		{ from: "opal-se", to: "graph-db", label: "Node/Edge CRUD + History", protocol: "SQLite (knex)", status: "checking" },
		{ from: "opal-se", to: "openai", label: "Agent Gateway LLM Calls", protocol: "HTTPS REST", status: "checking" },
		{ from: "opal-se", to: "ollama", label: "Local LLM Fallback", protocol: "HTTP REST", status: "checking" },
		{ from: "opal-se", to: "sse", label: "Event Broadcasting", protocol: "SSE", status: "checking" },
		{ from: "openclaw", to: "openclaw-agents", label: "Agent Registry", protocol: "Internal", status: "checking" },
		{ from: "openclaw", to: "openclaw-skills", label: "Skill Registry", protocol: "Internal", status: "checking" },
	];
}

// ============================================================================
// Sub-components
// ============================================================================

function StatusDot({ status }: { status: ConnStatus }) {
	const colorMap: Record<ConnStatus, string> = {
		checking: "bg-zinc-400 animate-pulse",
		online: "bg-green-400",
		offline: "bg-red-400",
		degraded: "bg-amber-400",
		not_configured: "bg-zinc-600",
	};
	return <span className={cn("inline-block w-2 h-2 rounded-full flex-shrink-0", colorMap[status])} />;
}

function StatusBadge({ status }: { status: ConnStatus }) {
	const map: Record<ConnStatus, { bg: string; text: string; label: string }> = {
		checking: { bg: "bg-zinc-500/20", text: "text-zinc-400", label: "Checking..." },
		online: { bg: "bg-green-500/20", text: "text-green-400", label: "Connected" },
		offline: { bg: "bg-red-500/20", text: "text-red-400", label: "Offline" },
		degraded: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Degraded" },
		not_configured: { bg: "bg-zinc-500/20", text: "text-zinc-500", label: "Not Configured" },
	};
	const m = map[status];
	return <Badge className={cn(m.bg, m.text, "text-[10px]")}>{m.label}</Badge>;
}

function NodeCard({
	node,
	expanded,
	onToggle,
	detailData,
	compact,
}: {
	node: ConnectionPoint;
	expanded: boolean;
	onToggle: () => void;
	detailData?: any;
	compact?: boolean;
}) {
	if (!node) return null;
	const Icon = node.icon;

	const borderColor: Record<ConnStatus, string> = {
		checking: "border-zinc-500/30",
		online: "border-green-500/30",
		offline: "border-red-500/30",
		degraded: "border-amber-500/30",
		not_configured: "border-zinc-700/30",
	};

	const bgColor: Record<ConnStatus, string> = {
		checking: "bg-zinc-500/5",
		online: "bg-green-500/5",
		offline: "bg-red-500/5",
		degraded: "bg-amber-500/5",
		not_configured: "bg-zinc-700/5",
	};

	return (
		<div
			className={cn(
				"rounded-lg border transition-all cursor-pointer hover:brightness-110",
				borderColor[node.status],
				bgColor[node.status],
				compact ? "p-2.5 min-w-[130px] max-w-[150px]" : "p-4 min-w-[200px] max-w-[240px]"
			)}
			onClick={onToggle}
		>
			<div className="flex items-center gap-2 mb-1">
				<Icon className={cn("flex-shrink-0", compact ? "w-3.5 h-3.5" : "w-4 h-4", "text-[var(--color-text-secondary)]")} />
				<span className={cn("font-semibold text-[var(--color-text-primary)] truncate", compact ? "text-xs" : "text-sm")}>
					{node.label}
				</span>
				<StatusDot status={node.status} />
			</div>
			<p className={cn("text-[var(--color-text-secondary)] truncate", compact ? "text-[10px]" : "text-xs")}>
				{node.description}
			</p>
			{node.detail && (
				<p className={cn("text-[var(--color-text-secondary)] mt-1 truncate", compact ? "text-[9px]" : "text-[11px]")}>
					{node.detail}
				</p>
			)}
			{node.latencyMs !== undefined && node.status === "online" && (
				<div className="flex items-center gap-1 mt-1">
					<Clock className="w-2.5 h-2.5 text-[var(--color-text-secondary)]" />
					<span className="text-[10px] text-[var(--color-text-secondary)]">{node.latencyMs}ms</span>
				</div>
			)}
			{node.externalUrl && (
				<a
					href={node.externalUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-1 mt-1 text-[10px] text-cyan-400 hover:underline"
					onClick={(e) => e.stopPropagation()}
				>
					<ExternalLink className="w-2.5 h-2.5" />
					Open
				</a>
			)}

			{/* Expanded detail */}
			{expanded && detailData && (
				<div className="mt-2 pt-2 border-t border-border">
					<pre className="text-[9px] text-[var(--color-text-secondary)] overflow-auto max-h-40 whitespace-pre-wrap">
						{JSON.stringify(detailData, null, 2).substring(0, 800)}
					</pre>
				</div>
			)}
		</div>
	);
}

function LinkArrow({ link, vertical }: { link: ConnectionLink; vertical?: boolean }) {
	if (!link) return null;
	const colorMap: Record<ConnStatus, string> = {
		checking: "text-zinc-500",
		online: "text-green-500",
		offline: "text-red-500",
		degraded: "text-amber-500",
		not_configured: "text-zinc-600",
	};

	if (vertical) {
		return (
			<div className="flex flex-col items-center py-0.5">
				<ArrowDown className={cn("w-4 h-4", colorMap[link.status])} />
				<span className="text-[8px] text-[var(--color-text-secondary)]">{link.protocol.split(" ")[0]}</span>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center px-1">
			<ArrowRight className={cn("w-5 h-5", colorMap[link.status])} />
			<span className="text-[8px] text-[var(--color-text-secondary)] whitespace-nowrap">{link.protocol.split(" ")[0]}</span>
		</div>
	);
}

function ChecklistItem({
	done,
	label,
	description,
	future,
}: {
	done?: boolean;
	label: string;
	description: string;
	future?: boolean;
}) {
	return (
		<div className="flex items-start gap-3 py-1.5">
			{future ? (
				<div className="w-4 h-4 rounded-full border border-dashed border-zinc-600 flex-shrink-0 mt-0.5" />
			) : done ? (
				<CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
			) : (
				<XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
			)}
			<div>
				<span className={cn(
					"text-sm font-medium",
					future ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-primary)]"
				)}>
					{label}
					{future && <Badge className="ml-2 bg-zinc-500/20 text-zinc-400 text-[9px]">Future</Badge>}
				</span>
				<p className="text-xs text-[var(--color-text-secondary)]">{description}</p>
			</div>
		</div>
	);
}
