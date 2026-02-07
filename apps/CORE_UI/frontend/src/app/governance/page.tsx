"use client";

import { useEffect, useState } from "react";
import AgentActivityGraph, { ActivityNode } from "@/components/chelex/AgentActivityGraph";
import PlanReviewPanel from "@/components/chelex/PlanReviewPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Data Types
interface LogEntry {
	id: string;
	timestamp: string;
	message: string;
	type: "info" | "warning" | "error" | "success";
}

export default function GovernancePage() {
	const [nodes, setNodes] = useState<ActivityNode[]>([]);
	const [edges, setEdges] = useState<any[]>([]);
	const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [stats, setStats] = useState({ activeAgents: 0, pendingPlans: 0, approvals24h: 0 });

	// Mock Data Loading
	useEffect(() => {
		// Initial Mock Data
		const initialNodes: ActivityNode[] = [
			{ id: 'task-1', type: 'task', title: 'Refactor System Graph', status: 'completed', timestamp: new Date().toISOString(), position: { x: 100, y: 100 } },
			{ id: 'plan-1', type: 'plan', title: 'Migration Plan v1', status: 'approved', timestamp: new Date().toISOString(), position: { x: 350, y: 100 } },
			{ id: 'run-1', type: 'run', title: 'Execution #102', status: 'completed', timestamp: new Date().toISOString(), position: { x: 600, y: 100 } },
			{ id: 'task-2', type: 'task', title: 'Optimize Queries', status: 'completed', timestamp: new Date().toISOString(), position: { x: 100, y: 300 } },
			{ id: 'plan-2', type: 'plan', title: 'Index Optimization', status: 'pending', timestamp: new Date().toISOString(), position: { x: 350, y: 300 } },
		];

		const initialEdges = [
			{ source: 'task-1', target: 'plan-1' },
			{ source: 'plan-1', target: 'run-1' },
			{ source: 'task-2', target: 'plan-2' },
		];

		setNodes(initialNodes);
		setEdges(initialEdges);

		setLogs([
			{ id: '1', timestamp: new Date().toISOString(), message: 'Agent OpenClaw submitted Plan-2 for review', type: 'info' },
			{ id: '2', timestamp: new Date(Date.now() - 10000).toISOString(), message: 'Run #102 completed successfully', type: 'success' },
		]);

		setStats({
			activeAgents: 3,
			pendingPlans: 1,
			approvals24h: 12
		});

		// Simulate polling
		const interval = setInterval(() => {
			// In a real app, fetch from /api/chelex/activity here
		}, 5000);

		return () => clearInterval(interval);
	}, []);

	const handleNodeClick = (node: ActivityNode) => {
		if (node.type === 'plan') {
			// Mock fetching plan details
			if (node.id === 'plan-2') {
				setSelectedPlan({
					id: 'plan-2',
					taskId: 'task-2',
					status: 'pending',
					rationale: 'Adding composite indexes to system_edges table will improve traversal performance by 40% based on query logs.',
					createdAt: new Date().toISOString(),
					steps: [
						{ step_number: 1, action: 'Run SQL Migration', tool: 'run_command', args: { command: 'npm run migrate:up' }, expected_output: 'Migration successful' },
						{ step_number: 2, action: 'Verify Performance', tool: 'run_benchmark', args: { endpoint: '/api/graph/traverse' }, expected_output: '< 200ms latency' }
					]
				});
			} else {
				setSelectedPlan({
					id: 'plan-1',
					taskId: 'task-1',
					status: 'approved',
					rationale: 'Refactoring needed to support new Chelex schema.',
					createdAt: new Date().toISOString(),
					steps: []
				});
			}
		}
	};

	const handleApprove = (planId: string) => {
		// In real app: POST /api/chelex/approvals
		console.log(`Approved plan ${planId}`);

		// Optimistic update
		setNodes(nds => nds.map(n => n.id === planId ? { ...n, status: 'approved' as const } : n));
		setSelectedPlan(null);
		setLogs(prev => [{ id: Date.now().toString(), timestamp: new Date().toISOString(), message: `Plan ${planId} approved by user`, type: 'success' }, ...prev]);
	};

	const handleReject = (planId: string, feedback: string) => {
		console.log(`Rejected plan ${planId}: ${feedback}`);
		setNodes(nds => nds.map(n => n.id === planId ? { ...n, status: 'rejected' as const } : n));
		setSelectedPlan(null);
		setLogs(prev => [{ id: Date.now().toString(), timestamp: new Date().toISOString(), message: `Plan ${planId} rejected: ${feedback}`, type: 'warning' }, ...prev]);
	};

	return (
		<div className="container mx-auto p-6 space-y-6 max-w-[1600px] h-screen flex flex-col">
			{/* Header */}
			<div className="flex justify-between items-center shrink-0">
				<div>
					<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
						<ShieldCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
						Chelex Governance
					</h1>
					<p className="text-muted-foreground mt-1">
						Monitor and control autonomous agent activities
					</p>
				</div>
				<div className="flex gap-4">
					<Card className="w-32 bg-slate-50 dark:bg-slate-900">
						<CardContent className="p-3 text-center">
							<div className="text-2xl font-bold">{stats.activeAgents}</div>
							<div className="text-xs text-muted-foreground uppercase font-semibold">Active Agents</div>
						</CardContent>
					</Card>
					<Card className="w-32 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
						<CardContent className="p-3 text-center">
							<div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingPlans}</div>
							<div className="text-xs text-amber-800 dark:text-amber-300 uppercase font-semibold">Pending Review</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Main Content */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

				{/* Left Column: Visualization */}
				<div className="lg:col-span-2 flex flex-col gap-6 min-h-0">
					<Card className="flex-1 flex flex-col min-h-0 border-slate-200 dark:border-slate-800 shadow-sm">
						<CardHeader className="pb-2 shrink-0">
							<CardTitle className="text-lg flex items-center gap-2">
								<Activity className="w-5 h-5" />
								Live Agent Activity
							</CardTitle>
						</CardHeader>
						<CardContent className="flex-1 min-h-0 p-0 relative">
							<div className="absolute inset-0">
								<AgentActivityGraph
									nodes={nodes}
									edges={edges}
									onNodeClick={handleNodeClick}
								/>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Right Column: Interaction & Logs */}
				<div className="flex flex-col gap-6 min-h-0 overflow-y-auto pr-1">
					{selectedPlan ? (
						<div className="animate-in slide-in-from-right duration-300">
							<PlanReviewPanel
								plan={selectedPlan}
								onApprove={handleApprove}
								onReject={handleReject}
							/>
						</div>
					) : (
						<Card className="bg-slate-50 border-dashed border-2 flex items-center justify-center p-12 text-center text-muted-foreground h-[300px]">
							<div>
								<ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
								<p>Select a plan from the graph to review details</p>
							</div>
						</Card>
					)}

					<Card className="flex-1 min-h-[300px]">
						<CardHeader>
							<CardTitle className="text-base">System Logs</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{logs.map(log => (
									<div key={log.id} className="flex gap-3 text-sm">
										<div className="mt-0.5 text-xs font-mono text-muted-foreground w-16 shrink-0">
											{new Date(log.timestamp).toLocaleTimeString()}
										</div>
										<div className={cn(
											"flex-1",
											log.type === 'error' && "text-red-500",
											log.type === 'warning' && "text-amber-500",
											log.type === 'success' && "text-green-600 dark:text-green-400"
										)}>
											{log.message}
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
