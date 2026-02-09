"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Legend,
} from "recharts";
import {
	CheckSquare,
	Clock,
	AlertTriangle,
	Shield,
	TrendingUp,
	TrendingDown,
	ArrowRight,
	Filter,
	Search,
	ChevronDown,
	Activity,
	Zap,
	BarChart3,
	Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface KpiCard {
	label: string;
	value: string | number;
	change: number;
	icon: any;
	color: string;
}

interface ChartDataPoint {
	period: string;
	tasks: number;
	plans: number;
	runs: number;
	verifications: number;
}

interface PendingApproval {
	id: string;
	title: string;
	type: "plan" | "gate" | "verification";
	requestedBy: string;
	requestedAt: string;
	priority: "low" | "medium" | "high" | "critical";
}

interface RecentTask {
	id: string;
	title: string;
	status: string;
	priority: string;
	assignee: string;
	updatedAt: string;
}

type TimeRange = "7d" | "30d" | "90d" | "12m";
type ChartLayer = "tasks" | "plans" | "runs" | "verifications";

const OPAL_BASE_URL = '/api/opal/proxy';

function timeAgo(date: Date): string {
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
	if (seconds < 60) return 'just now';
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

// ============================================================================
// Default empty states
// ============================================================================

const DEFAULT_KPIS: KpiCard[] = [
	{ label: "Active Tasks", value: 0, change: 0, icon: CheckSquare, color: "blue" },
	{ label: "Pending Approvals", value: 0, change: 0, icon: Shield, color: "amber" },
	{ label: "Running Plans", value: 0, change: 0, icon: Zap, color: "green" },
	{ label: "Open Risks", value: 0, change: 0, icon: AlertTriangle, color: "red" },
];

// ============================================================================
// Color maps
// ============================================================================

const KPI_COLORS: Record<string, { bg: string; text: string; border: string }> = {
	blue:  { bg: "bg-blue-500/10",  text: "text-blue-400",  border: "border-blue-500/20" },
	amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
	green: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" },
	red:   { bg: "bg-red-500/10",   text: "text-red-400",   border: "border-red-500/20" },
};

const CHART_COLORS: Record<ChartLayer, { stroke: string; fill: string }> = {
	tasks:         { stroke: "#60a5fa", fill: "#60a5fa" },
	plans:         { stroke: "#a78bfa", fill: "#a78bfa" },
	runs:          { stroke: "#34d399", fill: "#34d399" },
	verifications: { stroke: "#fbbf24", fill: "#fbbf24" },
};

const PRIORITY_COLORS: Record<string, string> = {
	low: "text-[var(--color-text-secondary)]",
	medium: "text-blue-400",
	high: "text-amber-400",
	critical: "text-red-400",
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
	backlog:     { bg: "bg-zinc-500/20",   text: "text-zinc-400" },
	ready:       { bg: "bg-blue-500/20",   text: "text-blue-400" },
	in_progress: { bg: "bg-amber-500/20",  text: "text-amber-400" },
	review:      { bg: "bg-purple-500/20", text: "text-purple-400" },
	done:        { bg: "bg-green-500/20",  text: "text-green-400" },
	blocked:     { bg: "bg-red-500/20",    text: "text-red-400" },
};

// ============================================================================
// Main Component
// ============================================================================

export default function DashboardSection() {
	const [timeRange, setTimeRange] = useState<TimeRange>("30d");
	const [activeLayers, setActiveLayers] = useState<Set<ChartLayer>>(
		new Set(["tasks", "plans", "runs", "verifications"])
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [loading, setLoading] = useState(true);

	const [kpis, setKpis] = useState<KpiCard[]>(DEFAULT_KPIS);
	const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
	const [approvals, setApprovals] = useState<PendingApproval[]>([]);
	const [allTasks, setAllTasks] = useState<RecentTask[]>([]);

	const fetchDashboardData = useCallback(async () => {
		try {
			setLoading(true);

			// Fetch all node types in parallel
			const [tasksRes, gatesRes, milestonesRes, risksRes] = await Promise.all([
				fetch(`${OPAL_BASE_URL}/api/nodes?node_type=task`),
				fetch(`${OPAL_BASE_URL}/api/nodes?node_type=gate`),
				fetch(`${OPAL_BASE_URL}/api/nodes?node_type=milestone`),
				fetch(`${OPAL_BASE_URL}/api/nodes?node_type=risk`),
			]);

			const tasks = tasksRes.ok ? (await tasksRes.json()).nodes || [] : [];
			const gates = gatesRes.ok ? (await gatesRes.json()).nodes || [] : [];
			const milestones = milestonesRes.ok ? (await milestonesRes.json()).nodes || [] : [];
			const risks = risksRes.ok ? (await risksRes.json()).nodes || [] : [];

			// --- KPIs ---
			const activeTasks = tasks.filter((n: any) => ['backlog', 'in_progress', 'review', 'blocked'].includes(n.status));
			const pendingGates = gates.filter((n: any) => n.status === 'pending');
			const upcomingMilestones = milestones.filter((n: any) => ['upcoming', 'at_risk'].includes(n.status));
			const openRisks = risks.filter((n: any) => ['open', 'mitigating', 'identified', 'active'].includes(n.status));

			setKpis([
				{ label: "Active Tasks", value: activeTasks.length, change: 0, icon: CheckSquare, color: "blue" },
				{ label: "Pending Approvals", value: pendingGates.length, change: 0, icon: Shield, color: "amber" },
				{ label: "Milestones", value: upcomingMilestones.length, change: 0, icon: Zap, color: "green" },
				{ label: "Open Risks", value: openRisks.length, change: 0, icon: AlertTriangle, color: "red" },
			]);

			// --- Recent Tasks (last 10 by updated_at) ---
			const sorted = [...tasks].sort((a: any, b: any) =>
				new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
			).slice(0, 10);

			setAllTasks(sorted.map((n: any) => {
				const meta = typeof n.metadata === 'string' ? JSON.parse(n.metadata) : (n.metadata || {});
				const updatedAt = n.updated_at ? timeAgo(new Date(n.updated_at)) : '';
				return {
					id: n.id,
					title: n.title,
					status: n.status || 'backlog',
					priority: meta.priority || 'medium',
					assignee: meta.assignee || n.created_by || '',
					updatedAt,
				};
			}));

			// --- Pending Approvals ---
			setApprovals(pendingGates.slice(0, 10).map((g: any) => {
				const meta = typeof g.metadata === 'string' ? JSON.parse(g.metadata) : (g.metadata || {});
				const createdAt = g.created_at ? timeAgo(new Date(g.created_at)) : '';
				return {
					id: g.id,
					title: g.title,
					type: (meta.gate_type || 'gate') as PendingApproval['type'],
					requestedBy: g.created_by || 'System',
					requestedAt: createdAt,
					priority: meta.priority || 'medium',
				};
			}));

			// --- Chart data (aggregate node counts — placeholder until history endpoint) ---
			// For now, show a single data point with current counts
			setChartData([{
				period: 'Now',
				tasks: tasks.length,
				plans: milestones.length,
				runs: gates.length,
				verifications: risks.length,
			}]);

		} catch (err) {
			console.error('Dashboard fetch error:', err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchDashboardData();
	}, [fetchDashboardData]);

	const filteredTasks = useMemo(() => {
		let tasks = allTasks;
		if (statusFilter !== "all") {
			tasks = tasks.filter((t) => t.status === statusFilter);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			tasks = tasks.filter(
				(t) => t.title.toLowerCase().includes(q) || t.assignee.toLowerCase().includes(q)
			);
		}
		return tasks;
	}, [allTasks, statusFilter, searchQuery]);

	const toggleLayer = (layer: ChartLayer) => {
		setActiveLayers((prev) => {
			const next = new Set(prev);
			if (next.has(layer)) {
				if (next.size > 1) next.delete(layer);
			} else {
				next.add(layer);
			}
			return next;
		});
	};

	return (
		<ScrollArea className="h-full">
			<div className="p-6 space-y-6 max-w-[1400px] mx-auto">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Dashboard</h1>
						<p className="text-sm text-[var(--color-text-secondary)] mt-1">
							Project overview and current status
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Badge variant="outline" className="text-xs gap-1">
							<Activity className="w-3 h-3" />
							Live
						</Badge>
					</div>
				</div>

				{/* KPI Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					{kpis.map((kpi) => (
						<KpiCardComponent key={kpi.label} kpi={kpi} />
					))}
				</div>

				{/* Main Chart */}
				<div className="rounded-xl border border-border bg-[var(--color-background)] p-5">
					{/* Chart header with data selectors */}
					<div className="flex items-center justify-between mb-4 flex-wrap gap-3">
						<div className="flex items-center gap-2">
							<BarChart3 className="w-4 h-4 text-[var(--color-text-secondary)]" />
							<h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Activity Overview</h2>
						</div>

						{/* Layer toggles */}
						<div className="flex items-center gap-1.5">
							{(Object.keys(CHART_COLORS) as ChartLayer[]).map((layer) => (
								<button
									key={layer}
									onClick={() => toggleLayer(layer)}
									className={cn(
										"px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
										activeLayers.has(layer)
											? "border-transparent"
											: "border-border text-[var(--color-text-secondary)]/50 bg-transparent"
									)}
									style={
										activeLayers.has(layer)
											? {
													backgroundColor: CHART_COLORS[layer].fill + "20",
													color: CHART_COLORS[layer].stroke,
													borderColor: CHART_COLORS[layer].fill + "40",
											  }
											: undefined
									}
								>
									<span
										className="inline-block w-2 h-2 rounded-full mr-1.5"
										style={{ backgroundColor: CHART_COLORS[layer].fill }}
									/>
									{layer.charAt(0).toUpperCase() + layer.slice(1)}
								</button>
							))}
						</div>

						{/* Time range selector */}
						<div className="flex items-center gap-1 bg-[var(--color-text-primary)]/5 rounded-lg p-0.5">
							{(["7d", "30d", "90d", "12m"] as TimeRange[]).map((range) => (
								<button
									key={range}
									onClick={() => setTimeRange(range)}
									className={cn(
										"px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
										timeRange === range
											? "bg-[var(--color-text-primary)]/10 text-[var(--color-text-primary)]"
											: "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
									)}
								>
									{range}
								</button>
							))}
						</div>
					</div>

					{/* Chart */}
					<div className="h-[320px]">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
								<defs>
									{(Object.keys(CHART_COLORS) as ChartLayer[]).map((layer) => (
										<linearGradient key={layer} id={`grad-${layer}`} x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor={CHART_COLORS[layer].fill} stopOpacity={0.3} />
											<stop offset="95%" stopColor={CHART_COLORS[layer].fill} stopOpacity={0.02} />
										</linearGradient>
									))}
								</defs>
								<CartesianGrid strokeDasharray="3 3" stroke="var(--color-text-secondary)" strokeOpacity={0.1} />
								<XAxis
									dataKey="period"
									tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
									axisLine={{ stroke: "var(--color-text-secondary)", strokeOpacity: 0.2 }}
									tickLine={false}
								/>
								<YAxis
									tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
									axisLine={false}
									tickLine={false}
								/>
								<Tooltip
									contentStyle={{
										backgroundColor: "var(--color-background)",
										border: "1px solid var(--color-text-secondary)",
										borderRadius: "8px",
										fontSize: "12px",
										boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
									}}
									labelStyle={{ color: "var(--color-text-primary)", fontWeight: 600 }}
								/>
								{activeLayers.has("verifications") && (
									<Area
										type="monotone"
										dataKey="verifications"
										stroke={CHART_COLORS.verifications.stroke}
										fill={`url(#grad-verifications)`}
										strokeWidth={2}
										dot={false}
										activeDot={{ r: 4, strokeWidth: 0 }}
									/>
								)}
								{activeLayers.has("runs") && (
									<Area
										type="monotone"
										dataKey="runs"
										stroke={CHART_COLORS.runs.stroke}
										fill={`url(#grad-runs)`}
										strokeWidth={2}
										dot={false}
										activeDot={{ r: 4, strokeWidth: 0 }}
									/>
								)}
								{activeLayers.has("plans") && (
									<Area
										type="monotone"
										dataKey="plans"
										stroke={CHART_COLORS.plans.stroke}
										fill={`url(#grad-plans)`}
										strokeWidth={2}
										dot={false}
										activeDot={{ r: 4, strokeWidth: 0 }}
									/>
								)}
								{activeLayers.has("tasks") && (
									<Area
										type="monotone"
										dataKey="tasks"
										stroke={CHART_COLORS.tasks.stroke}
										fill={`url(#grad-tasks)`}
										strokeWidth={2}
										dot={false}
										activeDot={{ r: 4, strokeWidth: 0 }}
									/>
								)}
							</AreaChart>
						</ResponsiveContainer>
					</div>

					{/* Active filter chips */}
					<div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
						<span className="text-xs text-[var(--color-text-secondary)]">Showing:</span>
						{Array.from(activeLayers).map((layer) => (
							<Badge
								key={layer}
								variant="outline"
								className="text-[10px] gap-1 cursor-pointer hover:opacity-80"
								style={{ color: CHART_COLORS[layer].stroke, borderColor: CHART_COLORS[layer].fill + "40" }}
								onClick={() => toggleLayer(layer)}
							>
								<span
									className="w-1.5 h-1.5 rounded-full"
									style={{ backgroundColor: CHART_COLORS[layer].fill }}
								/>
								{layer}
								<span className="ml-0.5 opacity-60">×</span>
							</Badge>
						))}
					</div>
				</div>

				{/* Bottom row: Approvals + Tasks */}
				<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
					{/* Pending Approvals */}
					<div className="lg:col-span-2 rounded-xl border border-border bg-[var(--color-background)] p-5">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
								<Shield className="w-4 h-4 text-amber-400" />
								Pending Approvals
							</h2>
							<Badge variant="outline" className="text-xs">{approvals.length}</Badge>
						</div>

						<div className="space-y-2">
							{approvals.map((a) => (
								<div
									key={a.id}
									className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--color-text-primary)]/5 transition-colors cursor-pointer group"
								>
									<div className={cn(
										"w-2 h-2 rounded-full flex-shrink-0",
										a.priority === "critical" && "bg-red-400",
										a.priority === "high" && "bg-amber-400",
										a.priority === "medium" && "bg-blue-400",
										a.priority === "low" && "bg-zinc-400",
									)} />
									<div className="flex-1 min-w-0">
										<p className="text-sm text-[var(--color-text-primary)] truncate">{a.title}</p>
										<div className="flex items-center gap-2 mt-0.5">
											<span className="text-[10px] text-[var(--color-text-secondary)]">{a.requestedBy}</span>
											<span className="text-[10px] text-[var(--color-text-secondary)]">·</span>
											<span className="text-[10px] text-[var(--color-text-secondary)]">{a.requestedAt}</span>
										</div>
									</div>
									<Badge variant="outline" className="text-[10px] flex-shrink-0">{a.type}</Badge>
									<ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
								</div>
							))}
						</div>
					</div>

					{/* Recent Tasks */}
					<div className="lg:col-span-3 rounded-xl border border-border bg-[var(--color-background)] p-5">
						<div className="flex items-center justify-between mb-4 flex-wrap gap-2">
							<h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
								<CheckSquare className="w-4 h-4 text-blue-400" />
								Recent Tasks
							</h2>

							<div className="flex items-center gap-2">
								{/* Status filter */}
								<select
									value={statusFilter}
									onChange={(e) => setStatusFilter(e.target.value)}
									className="rounded-md border border-border bg-transparent px-2 py-1 text-xs text-[var(--color-text-secondary)]"
								>
									<option value="all">All Status</option>
									<option value="backlog">Backlog</option>
									<option value="ready">Ready</option>
									<option value="in_progress">In Progress</option>
									<option value="review">Review</option>
									<option value="done">Done</option>
								</select>

								{/* Search */}
								<div className="relative">
									<Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-text-secondary)]" />
									<Input
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Search..."
										className="pl-7 h-7 text-xs w-[140px]"
									/>
								</div>
							</div>
						</div>

						{/* Task table */}
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-border">
										<th className="text-left py-2 px-2 text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Task</th>
										<th className="text-left py-2 px-2 text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Status</th>
										<th className="text-left py-2 px-2 text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Priority</th>
										<th className="text-left py-2 px-2 text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Assignee</th>
										<th className="text-right py-2 px-2 text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Updated</th>
									</tr>
								</thead>
								<tbody>
									{filteredTasks.map((task) => {
										const ss = STATUS_STYLES[task.status] || STATUS_STYLES.backlog;
										return (
											<tr
												key={task.id}
												className="border-b border-border/50 hover:bg-[var(--color-text-primary)]/5 transition-colors cursor-pointer"
											>
												<td className="py-2.5 px-2">
													<span className="text-[var(--color-text-primary)]">{task.title}</span>
												</td>
												<td className="py-2.5 px-2">
													<Badge className={cn("text-[10px]", ss.bg, ss.text)}>
														{task.status.replace("_", " ")}
													</Badge>
												</td>
												<td className="py-2.5 px-2">
													<span className={cn("text-xs font-medium", PRIORITY_COLORS[task.priority])}>
														{task.priority}
													</span>
												</td>
												<td className="py-2.5 px-2 text-xs text-[var(--color-text-secondary)]">
													{task.assignee}
												</td>
												<td className="py-2.5 px-2 text-right text-xs text-[var(--color-text-secondary)]">
													{task.updatedAt}
												</td>
											</tr>
										);
									})}
									{filteredTasks.length === 0 && (
										<tr>
											<td colSpan={5} className="py-8 text-center text-xs text-[var(--color-text-secondary)]">
												No tasks match your filters.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</ScrollArea>
	);
}

// ============================================================================
// KPI Card
// ============================================================================

function KpiCardComponent({ kpi }: { kpi: KpiCard }) {
	const Icon = kpi.icon;
	const c = KPI_COLORS[kpi.color] || KPI_COLORS.blue;
	const isPositive = kpi.change >= 0;

	return (
		<div className={cn("rounded-xl border p-4 transition-colors hover:border-opacity-60", c.border, c.bg)}>
			<div className="flex items-center justify-between mb-3">
				<span className="text-xs font-medium text-[var(--color-text-secondary)]">{kpi.label}</span>
				<Icon className={cn("w-4 h-4", c.text)} />
			</div>
			<div className="flex items-end justify-between">
				<span className="text-2xl font-bold text-[var(--color-text-primary)]">
					{typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}
				</span>
				<div className={cn("flex items-center gap-0.5 text-xs font-medium", isPositive ? "text-green-400" : "text-red-400")}>
					{isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
					{isPositive ? "+" : ""}
					{kpi.change}%
				</div>
			</div>
		</div>
	);
}
