"use client";

import { useState, useEffect, useCallback } from "react";
import {
	Bot,
	Wifi,
	WifiOff,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Cpu,
	Activity,
	RefreshCw,
	Clock,
	Zap,
	AlertTriangle,
	CheckCircle2,
	XCircle,
	ChevronDown,
	ChevronRight,
	ExternalLink,
	Server,
	Cog,
	Brain,
	Terminal,
	Lock,
	Info,
	Search,
	Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface OpenClawData {
	ok: boolean;
	status: any;
	health: any;
	skills: any;
	fetchedAt: string;
}

// ============================================================================
// Main Component
// ============================================================================

export default function AgentAdminSection() {
	const [data, setData] = useState<OpenClawData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lastRefresh, setLastRefresh] = useState<string>("");
	const [skillSearch, setSkillSearch] = useState("");
	const [skillFilter, setSkillFilter] = useState<"all" | "eligible" | "missing">("all");
	const [expandedSections, setExpandedSections] = useState<Set<string>>(
		new Set(["gateway", "agents", "skills", "security"])
	);

	const fetchData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/openclaw/status");
			const json = await res.json();
			if (!json.ok) throw new Error(json.error || "Failed to fetch OpenClaw status");
			setData(json);
			setLastRefresh(new Date().toLocaleTimeString());
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const toggleSection = (section: string) => {
		setExpandedSections((prev) => {
			const next = new Set(prev);
			if (next.has(section)) next.delete(section);
			else next.add(section);
			return next;
		});
	};

	const status = data?.status;
	const health = data?.health;
	const skills = data?.skills;

	return (
		<ScrollArea className="h-full">
			<div className="p-6 space-y-6 max-w-[1400px] mx-auto">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-3">
							<Bot className="w-6 h-6 text-purple-400" />
							Agent Framework Admin
						</h1>
						<p className="text-sm text-[var(--color-text-secondary)] mt-1">
							OpenClaw gateway status, agents, skills, and security
						</p>
					</div>
					<div className="flex items-center gap-3">
						{lastRefresh && (
							<span className="text-xs text-[var(--color-text-secondary)]">
								Last refresh: {lastRefresh}
							</span>
						)}
						<Button
							variant="outline"
							size="sm"
							onClick={fetchData}
							disabled={loading}
							className="gap-1.5"
						>
							<RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
							Refresh All
						</Button>
					</div>
				</div>

				{/* Error banner */}
				{error && (
					<div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-3">
						<AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
						<div className="flex-1">
							<p className="text-sm font-medium text-red-400">Failed to fetch OpenClaw status</p>
							<p className="text-xs text-red-400/70 mt-0.5">{error}</p>
						</div>
						<Button variant="ghost" size="sm" onClick={fetchData}>Retry</Button>
					</div>
				)}

				{/* Loading skeleton */}
				{loading && !data && (
					<div className="flex items-center justify-center py-20">
						<Loader2 className="w-6 h-6 animate-spin text-purple-400" />
						<span className="ml-3 text-sm text-[var(--color-text-secondary)]">
							Querying OpenClaw gateway...
						</span>
					</div>
				)}

				{data && (
					<>
						{/* Status Cards Row */}
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
							<StatusCard
								label="Gateway"
								value={status?.gateway?.reachable ? "Online" : "Offline"}
								detail={`${status?.gateway?.connectLatencyMs ?? "?"}ms latency`}
								icon={status?.gateway?.reachable ? Wifi : WifiOff}
								color={status?.gateway?.reachable ? "green" : "red"}
							/>
							<StatusCard
								label="Gateway Service"
								value={status?.gatewayService?.runtimeShort?.includes("running") ? "Running" : "Stopped"}
								detail={status?.gatewayService?.label || "unknown"}
								icon={Server}
								color={status?.gatewayService?.runtimeShort?.includes("running") ? "green" : "red"}
							/>
							<StatusCard
								label="Agents"
								value={`${status?.agents?.agents?.length ?? 0} registered`}
								detail={`${status?.agents?.totalSessions ?? 0} total sessions`}
								icon={Bot}
								color="purple"
							/>
							<StatusCard
								label="Security"
								value={`${status?.securityAudit?.summary?.critical ?? 0} critical`}
								detail={`${status?.securityAudit?.summary?.warn ?? 0} warnings`}
								icon={status?.securityAudit?.summary?.critical > 0 ? ShieldAlert : ShieldCheck}
								color={status?.securityAudit?.summary?.critical > 0 ? "red" : "green"}
							/>
						</div>

						{/* Gateway Section */}
						<CollapsibleSection
							title="Gateway"
							icon={<Wifi className="w-4 h-4 text-green-400" />}
							expanded={expandedSections.has("gateway")}
							onToggle={() => toggleSection("gateway")}
						>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* Connection Info */}
								<div className="space-y-3">
									<h4 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Connection</h4>
									<InfoRow label="URL" value={status?.gateway?.url || "—"} />
									<InfoRow label="Mode" value={status?.gateway?.mode || "—"} />
									<InfoRow label="Bind" value={status?.gateway?.urlSource || "—"} />
									<InfoRow label="Latency" value={`${status?.gateway?.connectLatencyMs ?? "?"}ms`} />
									<InfoRow
										label="Reachable"
										value={
											status?.gateway?.reachable ? (
												<Badge className="bg-green-500/20 text-green-400 text-[10px]">Yes</Badge>
											) : (
												<Badge className="bg-red-500/20 text-red-400 text-[10px]">No</Badge>
											)
										}
									/>
								</div>

								{/* Host Info */}
								<div className="space-y-3">
									<h4 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Host</h4>
									<InfoRow label="Hostname" value={status?.gateway?.self?.host || "—"} />
									<InfoRow label="IP" value={status?.gateway?.self?.ip || "—"} />
									<InfoRow label="Platform" value={status?.gateway?.self?.platform || "—"} />
									<InfoRow label="OS" value={status?.os?.label || "—"} />
								</div>

								{/* Services */}
								<div className="space-y-3">
									<h4 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Services</h4>
									<InfoRow
										label="Gateway Service"
										value={
											<div className="flex items-center gap-2">
												<span>{status?.gatewayService?.runtimeShort || "—"}</span>
												{status?.gatewayService?.installed && (
													<Badge className="bg-green-500/20 text-green-400 text-[10px]">installed</Badge>
												)}
											</div>
										}
									/>
									<InfoRow
										label="Node Service"
										value={
											<div className="flex items-center gap-2">
												<span>{status?.nodeService?.runtimeShort || "—"}</span>
												{status?.nodeService?.installed ? (
													<Badge className="bg-green-500/20 text-green-400 text-[10px]">installed</Badge>
												) : (
													<Badge className="bg-zinc-500/20 text-zinc-400 text-[10px]">not installed</Badge>
												)}
											</div>
										}
									/>
								</div>

								{/* Model & Config */}
								<div className="space-y-3">
									<h4 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Configuration</h4>
									<InfoRow label="Default Model" value={status?.sessions?.defaults?.model || "—"} />
									<InfoRow label="Context Tokens" value={status?.sessions?.defaults?.contextTokens?.toLocaleString() || "—"} />
									<InfoRow label="Update Channel" value={status?.updateChannel || "—"} />
									<InfoRow label="Latest Version" value={status?.update?.registry?.latestVersion || "—"} />
								</div>
							</div>
						</CollapsibleSection>

						{/* Agents Section */}
						<CollapsibleSection
							title={`Agents (${status?.agents?.agents?.length ?? 0})`}
							icon={<Bot className="w-4 h-4 text-purple-400" />}
							expanded={expandedSections.has("agents")}
							onToggle={() => toggleSection("agents")}
						>
							<div className="space-y-3">
								{status?.agents?.agents?.map((agent: any) => (
									<div
										key={agent.id}
										className="rounded-lg border border-border bg-[var(--color-text-primary)]/5 p-4"
									>
										<div className="flex items-center justify-between mb-3">
											<div className="flex items-center gap-2">
												<Bot className="w-4 h-4 text-purple-400" />
												<span className="text-sm font-semibold text-[var(--color-text-primary)]">
													{agent.id}
												</span>
												{agent.id === status?.agents?.defaultId && (
													<Badge className="bg-purple-500/20 text-purple-400 text-[10px]">default</Badge>
												)}
												{agent.bootstrapPending && (
													<Badge className="bg-amber-500/20 text-amber-400 text-[10px]">bootstrap pending</Badge>
												)}
											</div>
											<span className="text-xs text-[var(--color-text-secondary)]">
												{agent.sessionsCount} sessions
											</span>
										</div>

										<div className="grid grid-cols-2 gap-2 text-xs">
											<InfoRow label="Workspace" value={agent.workspaceDir || "—"} small />
											<InfoRow label="Sessions Path" value={agent.sessionsPath?.split("/").slice(-2).join("/") || "—"} small />
										</div>

										{/* Heartbeat info from health */}
										{health?.agents?.find((a: any) => a.agentId === agent.id)?.heartbeat && (
											<div className="mt-3 pt-3 border-t border-border">
												<h5 className="text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Heartbeat</h5>
												<div className="grid grid-cols-2 gap-2 text-xs">
													<InfoRow
														label="Enabled"
														value={
															health.agents.find((a: any) => a.agentId === agent.id)?.heartbeat?.enabled ? (
																<Badge className="bg-green-500/20 text-green-400 text-[10px]">yes</Badge>
															) : (
																<Badge className="bg-zinc-500/20 text-zinc-400 text-[10px]">no</Badge>
															)
														}
														small
													/>
													<InfoRow
														label="Interval"
														value={health.agents.find((a: any) => a.agentId === agent.id)?.heartbeat?.every || "—"}
														small
													/>
												</div>
											</div>
										)}
									</div>
								))}

								{(!status?.agents?.agents || status.agents.agents.length === 0) && (
									<p className="text-sm text-[var(--color-text-secondary)] text-center py-4">No agents registered</p>
								)}
							</div>
						</CollapsibleSection>

						{/* Skills Section */}
						<CollapsibleSection
							title={`Skills (${skills?.skills?.length ?? 0})`}
							icon={<Zap className="w-4 h-4 text-amber-400" />}
							expanded={expandedSections.has("skills")}
							onToggle={() => toggleSection("skills")}
						>
							{/* Skills filters */}
							<div className="flex items-center gap-3 mb-4">
								<div className="relative flex-1 max-w-xs">
									<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
									<Input
										value={skillSearch}
										onChange={(e) => setSkillSearch(e.target.value)}
										placeholder="Search skills..."
										className="pl-8 h-8 text-xs"
									/>
								</div>
								<div className="flex items-center gap-1 bg-[var(--color-text-primary)]/5 rounded-lg p-0.5">
									{(["all", "eligible", "missing"] as const).map((f) => (
										<button
											key={f}
											onClick={() => setSkillFilter(f)}
											className={cn(
												"px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
												skillFilter === f
													? "bg-[var(--color-text-primary)]/10 text-[var(--color-text-primary)]"
													: "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
											)}
										>
											{f === "all" ? "All" : f === "eligible" ? "Ready" : "Missing Deps"}
										</button>
									))}
								</div>
								{skills?.skills && (
									<span className="text-xs text-[var(--color-text-secondary)]">
										{skills.skills.filter((s: any) => s.eligible).length} ready / {skills.skills.length} total
									</span>
								)}
							</div>

							{/* Skills grid */}
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
								{skills?.skills
									?.filter((s: any) => {
										if (skillFilter === "eligible" && !s.eligible) return false;
										if (skillFilter === "missing" && s.eligible) return false;
										if (skillSearch.trim()) {
											const q = skillSearch.toLowerCase();
											return s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
										}
										return true;
									})
									.map((skill: any) => (
										<SkillCard key={skill.name} skill={skill} />
									))}
							</div>

							{skills?.skills?.length === 0 && (
								<p className="text-sm text-[var(--color-text-secondary)] text-center py-4">No skills found</p>
							)}
						</CollapsibleSection>

						{/* Security Section */}
						<CollapsibleSection
							title="Security Audit"
							icon={<Shield className="w-4 h-4 text-blue-400" />}
							expanded={expandedSections.has("security")}
							onToggle={() => toggleSection("security")}
						>
							{/* Summary badges */}
							<div className="flex items-center gap-3 mb-4">
								<Badge className="bg-red-500/20 text-red-400 text-xs gap-1">
									<XCircle className="w-3 h-3" />
									{status?.securityAudit?.summary?.critical ?? 0} Critical
								</Badge>
								<Badge className="bg-amber-500/20 text-amber-400 text-xs gap-1">
									<AlertTriangle className="w-3 h-3" />
									{status?.securityAudit?.summary?.warn ?? 0} Warnings
								</Badge>
								<Badge className="bg-blue-500/20 text-blue-400 text-xs gap-1">
									<Info className="w-3 h-3" />
									{status?.securityAudit?.summary?.info ?? 0} Info
								</Badge>
							</div>

							{/* Findings */}
							<div className="space-y-2">
								{status?.securityAudit?.findings?.map((finding: any, i: number) => (
									<div
										key={i}
										className={cn(
											"rounded-lg border p-3",
											finding.severity === "critical" && "border-red-500/30 bg-red-500/5",
											finding.severity === "warn" && "border-amber-500/30 bg-amber-500/5",
											finding.severity === "info" && "border-blue-500/30 bg-blue-500/5"
										)}
									>
										<div className="flex items-center gap-2 mb-1">
											{finding.severity === "critical" && <XCircle className="w-3.5 h-3.5 text-red-400" />}
											{finding.severity === "warn" && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
											{finding.severity === "info" && <Info className="w-3.5 h-3.5 text-blue-400" />}
											<span className="text-sm font-medium text-[var(--color-text-primary)]">{finding.title}</span>
											<Badge variant="outline" className="text-[10px] ml-auto">{finding.checkId}</Badge>
										</div>
										<p className="text-xs text-[var(--color-text-secondary)] ml-5.5 whitespace-pre-wrap">{finding.detail}</p>
										{finding.remediation && (
											<p className="text-xs text-[var(--color-text-secondary)] ml-5.5 mt-1 italic">
												Fix: {finding.remediation}
											</p>
										)}
									</div>
								))}

								{(!status?.securityAudit?.findings || status.securityAudit.findings.length === 0) && (
									<p className="text-sm text-green-400 text-center py-4 flex items-center justify-center gap-2">
										<CheckCircle2 className="w-4 h-4" />
										No security findings
									</p>
								)}
							</div>
						</CollapsibleSection>

						{/* System Info Section */}
						<CollapsibleSection
							title="System Info"
							icon={<Cpu className="w-4 h-4 text-zinc-400" />}
							expanded={expandedSections.has("system")}
							onToggle={() => toggleSection("system")}
						>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-3">
									<h4 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Runtime</h4>
									<InfoRow label="Platform" value={status?.os?.platform || "—"} />
									<InfoRow label="Architecture" value={status?.os?.arch || "—"} />
									<InfoRow label="Kernel" value={status?.os?.release || "—"} />
								</div>
								<div className="space-y-3">
									<h4 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Install</h4>
									<InfoRow label="Install Kind" value={status?.update?.installKind || "—"} />
									<InfoRow label="Package Manager" value={status?.update?.packageManager || "—"} />
									<InfoRow label="Update Channel" value={status?.updateChannel || "—"} />
									<InfoRow label="Latest Version" value={status?.update?.registry?.latestVersion || "—"} />
								</div>
								<div className="space-y-3">
									<h4 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Memory Plugin</h4>
									<InfoRow
										label="Enabled"
										value={
											status?.memoryPlugin?.enabled ? (
												<Badge className="bg-green-500/20 text-green-400 text-[10px]">yes</Badge>
											) : (
												<Badge className="bg-zinc-500/20 text-zinc-400 text-[10px]">no</Badge>
											)
										}
									/>
									<InfoRow label="Slot" value={status?.memoryPlugin?.slot || "—"} />
								</div>
								<div className="space-y-3">
									<h4 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Sessions</h4>
									<InfoRow label="Default Agent" value={status?.agents?.defaultId || "—"} />
									<InfoRow label="Total Sessions" value={String(status?.agents?.totalSessions ?? 0)} />
									<InfoRow label="Bootstrap Pending" value={String(status?.agents?.bootstrapPendingCount ?? 0)} />
								</div>
							</div>
						</CollapsibleSection>
					</>
				)}
			</div>
		</ScrollArea>
	);
}

// ============================================================================
// Sub-components
// ============================================================================

function StatusCard({
	label,
	value,
	detail,
	icon: Icon,
	color,
}: {
	label: string;
	value: string;
	detail: string;
	icon: any;
	color: "green" | "red" | "purple" | "amber" | "blue";
}) {
	const colorMap = {
		green:  { bg: "bg-green-500/10",  text: "text-green-400",  border: "border-green-500/20" },
		red:    { bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/20" },
		purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
		amber:  { bg: "bg-amber-500/10",  text: "text-amber-400",  border: "border-amber-500/20" },
		blue:   { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/20" },
	};
	const c = colorMap[color];

	return (
		<div className={cn("rounded-xl border p-4", c.border, c.bg)}>
			<div className="flex items-center justify-between mb-2">
				<span className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</span>
				<Icon className={cn("w-4 h-4", c.text)} />
			</div>
			<p className="text-lg font-bold text-[var(--color-text-primary)]">{value}</p>
			<p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{detail}</p>
		</div>
	);
}

function CollapsibleSection({
	title,
	icon,
	expanded,
	onToggle,
	children,
}: {
	title: string;
	icon: React.ReactNode;
	expanded: boolean;
	onToggle: () => void;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-xl border border-border bg-[var(--color-background)]">
			<button
				onClick={onToggle}
				className="w-full flex items-center gap-2 p-4 hover:bg-[var(--color-text-primary)]/5 transition-colors rounded-t-xl"
			>
				{expanded ? <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" /> : <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />}
				{icon}
				<span className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</span>
			</button>
			{expanded && <div className="px-4 pb-4">{children}</div>}
		</div>
	);
}

function InfoRow({
	label,
	value,
	small,
}: {
	label: string;
	value: React.ReactNode;
	small?: boolean;
}) {
	return (
		<div className="flex items-center justify-between">
			<span className={cn("text-[var(--color-text-secondary)]", small ? "text-[10px]" : "text-xs")}>{label}</span>
			<span className={cn("text-[var(--color-text-primary)] font-mono", small ? "text-[10px]" : "text-xs")}>{value}</span>
		</div>
	);
}

function SkillCard({ skill }: { skill: any }) {
	const hasMissing =
		skill.missing?.bins?.length > 0 ||
		skill.missing?.anyBins?.length > 0 ||
		skill.missing?.env?.length > 0 ||
		skill.missing?.config?.length > 0 ||
		skill.missing?.os?.length > 0;

	return (
		<div
			className={cn(
				"rounded-lg border p-3 transition-colors",
				skill.eligible
					? "border-green-500/20 bg-green-500/5"
					: "border-border bg-[var(--color-text-primary)]/5"
			)}
		>
			<div className="flex items-center gap-2 mb-1.5">
				{skill.emoji && <span className="text-sm">{skill.emoji}</span>}
				<span className="text-sm font-medium text-[var(--color-text-primary)] truncate">{skill.name}</span>
				<div className="ml-auto flex items-center gap-1">
					{skill.eligible ? (
						<Badge className="bg-green-500/20 text-green-400 text-[10px]">ready</Badge>
					) : (
						<Badge className="bg-zinc-500/20 text-zinc-400 text-[10px]">missing deps</Badge>
					)}
					{skill.bundled && (
						<Badge variant="outline" className="text-[10px]">bundled</Badge>
					)}
				</div>
			</div>
			<p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2 mb-2">
				{skill.description}
			</p>
			{hasMissing && (
				<div className="flex flex-wrap gap-1">
					{skill.missing?.bins?.map((b: string) => (
						<Badge key={b} className="bg-red-500/10 text-red-400 text-[9px]">bin: {b}</Badge>
					))}
					{skill.missing?.anyBins?.map((b: string) => (
						<Badge key={b} className="bg-amber-500/10 text-amber-400 text-[9px]">bin: {b}</Badge>
					))}
					{skill.missing?.env?.map((e: string) => (
						<Badge key={e} className="bg-amber-500/10 text-amber-400 text-[9px]">env: {e}</Badge>
					))}
					{skill.missing?.config?.map((c: string) => (
						<Badge key={c} className="bg-blue-500/10 text-blue-400 text-[9px]">cfg: {c}</Badge>
					))}
					{skill.missing?.os?.map((o: string) => (
						<Badge key={o} className="bg-zinc-500/10 text-zinc-400 text-[9px]">os: {o}</Badge>
					))}
				</div>
			)}
		</div>
	);
}
