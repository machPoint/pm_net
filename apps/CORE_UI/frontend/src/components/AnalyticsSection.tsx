"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, BarChart3, CheckCircle2, Zap, FolderKanban, ListTodo, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const OPAL_BASE_URL = '/api/opal/proxy';

interface AnalyticsData {
	totalNodes: number;
	totalEdges: number;
	projects: number;
	tasks: number;
	tasksDone: number;
	tasksInProgress: number;
	plans: number;
	runs: number;
	verifications: number;
	taskCoverage: number;
	traceability: number;
	typeCounts: Record<string, number>;
}

export default function AnalyticsSection() {
	const [data, setData] = useState<AnalyticsData | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchAnalytics = useCallback(async () => {
		setLoading(true);
		try {
			const [nodesRes, edgesRes] = await Promise.all([
				fetch(`${OPAL_BASE_URL}/api/nodes`),
				fetch(`${OPAL_BASE_URL}/api/edges`),
			]);
			const nodesData = nodesRes.ok ? await nodesRes.json() : { nodes: [] };
			const edgesData = edgesRes.ok ? await edgesRes.json() : { edges: [] };
			const nodes = nodesData.nodes || [];
			const edges = edgesData.edges || [];

			const typeCounts: Record<string, number> = {};
			const statusCounts: Record<string, number> = {};
			for (const n of nodes) {
				typeCounts[n.node_type] = (typeCounts[n.node_type] || 0) + 1;
				statusCounts[n.status] = (statusCounts[n.status] || 0) + 1;
			}

			const tasks = typeCounts['task'] || 0;
			const taskNodes = nodes.filter((n: any) => n.node_type === 'task');
			const tasksDone = taskNodes.filter((n: any) => n.status === 'done' || n.status === 'complete').length;
			const tasksInProgress = taskNodes.filter((n: any) => n.status === 'in_progress' || n.status === 'active').length;

			// Coverage: % of tasks with at least one edge
			const taskIds = new Set(taskNodes.map((n: any) => n.id));
			const connectedTaskIds = new Set<string>();
			for (const e of edges) {
				if (taskIds.has(e.source_node_id)) connectedTaskIds.add(e.source_node_id);
				if (taskIds.has(e.target_node_id)) connectedTaskIds.add(e.target_node_id);
			}
			const taskCoverage = tasks > 0 ? Math.round((connectedTaskIds.size / tasks) * 100) : 0;

			// Traceability: % of all nodes with at least one edge
			const connectedNodes = new Set<string>();
			for (const e of edges) {
				connectedNodes.add(e.source_node_id);
				connectedNodes.add(e.target_node_id);
			}
			const traceability = nodes.length > 0 ? Math.round((connectedNodes.size / nodes.length) * 100) : 0;

			setData({
				totalNodes: nodes.length,
				totalEdges: edges.length,
				projects: typeCounts['project'] || 0,
				tasks,
				tasksDone,
				tasksInProgress,
				plans: typeCounts['plan'] || 0,
				runs: typeCounts['run'] || 0,
				verifications: typeCounts['verification'] || 0,
				taskCoverage,
				traceability,
				typeCounts,
			});
		} catch (err) {
			console.error('Failed to fetch analytics:', err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

	if (loading || !data) {
		return (
			<div className="flex items-center justify-center h-full">
				<Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-secondary)]" />
			</div>
		);
	}

	const completionRate = data.tasks > 0 ? Math.round((data.tasksDone / data.tasks) * 100) : 0;

	return (
		<ScrollArea className="h-full">
			<div className="p-6 space-y-6 max-w-[1200px] mx-auto">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Analytics</h1>
						<p className="text-sm text-[var(--color-text-secondary)] mt-1">
							Project and task metrics at a glance
						</p>
					</div>
					<Button variant="outline" size="sm" onClick={fetchAnalytics} className="gap-2">
						<RefreshCw className="w-3.5 h-3.5" />
						Refresh
					</Button>
				</div>

				{/* KPI Cards */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					{[
						{ label: "Projects", value: data.projects, color: "text-blue-400", icon: FolderKanban },
						{ label: "Total Tasks", value: data.tasks, color: "text-violet-400", icon: ListTodo },
						{ label: "Tasks Done", value: data.tasksDone, color: "text-emerald-400", icon: CheckCircle2 },
						{ label: "In Progress", value: data.tasksInProgress, color: "text-amber-400", icon: Zap },
					].map((kpi) => {
						const Icon = kpi.icon;
						return (
							<div key={kpi.label} className="rounded-lg border border-border bg-[var(--color-card)] p-4">
								<div className="flex items-center gap-2 mb-1">
									<Icon className={cn("w-4 h-4", kpi.color)} />
									<p className="text-xs text-[var(--color-text-secondary)]">{kpi.label}</p>
								</div>
								<p className={cn("text-2xl font-bold", kpi.color)}>{kpi.value}</p>
							</div>
						);
					})}
				</div>

				{/* Progress Bars */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{[
						{ label: "Task Completion", value: completionRate, color: "bg-emerald-500" },
						{ label: "Task Coverage", value: data.taskCoverage, color: "bg-blue-500" },
						{ label: "Graph Connectivity", value: data.traceability, color: "bg-violet-500" },
					].map((bar) => (
						<div key={bar.label} className="rounded-lg border border-border bg-[var(--color-card)] p-4">
							<div className="flex items-center justify-between mb-2">
								<p className="text-sm font-medium text-[var(--color-text-primary)]">{bar.label}</p>
								<span className="text-sm font-bold text-[var(--color-text-primary)]">{bar.value}%</span>
							</div>
							<Progress value={bar.value} className="h-2" />
						</div>
					))}
				</div>

				{/* Node Type Breakdown */}
				<div className="rounded-lg border border-border bg-[var(--color-card)] p-5">
					<h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Graph Breakdown</h3>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
						{Object.entries(data.typeCounts)
							.sort(([, a], [, b]) => b - a)
							.map(([type, count]) => (
								<div key={type} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
									<span className="text-xs text-[var(--color-text-secondary)] capitalize">{type}</span>
									<span className="text-sm font-bold text-[var(--color-text-primary)]">{count}</span>
								</div>
							))}
					</div>
					<div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
						<span>Total Nodes: <strong className="text-[var(--color-text-primary)]">{data.totalNodes}</strong></span>
						<span>Total Edges: <strong className="text-[var(--color-text-primary)]">{data.totalEdges}</strong></span>
					</div>
				</div>
			</div>
		</ScrollArea>
	);
}
