"use client";

import { useState, useEffect, useCallback } from "react";
import RequirementImpactAnalytics from "./RequirementImpactAnalytics";
import { Loader2 } from "lucide-react";

const OPAL_BASE_URL = '/api/opal/proxy';

export default function AnalyticsSection() {
	const [analytics, setAnalytics] = useState({
		totalArtifacts: 0,
		coveragePercentage: 0,
		testCoverage: 0,
		designCoverage: 0,
		implementationCoverage: 0,
		traceabilityScore: 0,
	});
	const [impactTree, setImpactTree] = useState<any[]>([]);
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

			// Compute analytics from real graph data
			const typeCounts: Record<string, number> = {};
			for (const n of nodes) {
				typeCounts[n.node_type] = (typeCounts[n.node_type] || 0) + 1;
			}

			const total = nodes.length;
			const tasks = typeCounts['task'] || 0;
			const risks = typeCounts['risk'] || 0;
			const decisions = typeCounts['decision'] || 0;
			const gates = typeCounts['gate'] || 0;
			const plans = typeCounts['plan'] || 0;
			const runs = typeCounts['run'] || 0;
			const verifications = typeCounts['verification'] || 0;

			// Coverage: % of tasks that have at least one edge
			const taskIds = new Set(nodes.filter((n: any) => n.node_type === 'task').map((n: any) => n.id));
			const connectedTaskIds = new Set<string>();
			for (const e of edges) {
				if (taskIds.has(e.source_node_id)) connectedTaskIds.add(e.source_node_id);
				if (taskIds.has(e.target_node_id)) connectedTaskIds.add(e.target_node_id);
			}
			const coverage = tasks > 0 ? Math.round((connectedTaskIds.size / tasks) * 100) : 0;

			// Traceability: % of nodes that have at least one edge
			const connectedNodes = new Set<string>();
			for (const e of edges) {
				connectedNodes.add(e.source_node_id);
				connectedNodes.add(e.target_node_id);
			}
			const traceability = total > 0 ? Math.round((connectedNodes.size / total) * 100) : 0;

			setAnalytics({
				totalArtifacts: total,
				coveragePercentage: coverage,
				testCoverage: verifications > 0 ? Math.min(100, Math.round((verifications / Math.max(tasks, 1)) * 100)) : 0,
				designCoverage: plans > 0 ? Math.min(100, Math.round((plans / Math.max(tasks, 1)) * 100)) : 0,
				implementationCoverage: runs > 0 ? Math.min(100, Math.round((runs / Math.max(tasks, 1)) * 100)) : 0,
				traceabilityScore: traceability,
			});

			// Build impact tree from real nodes + edges
			const edgeMap = new Map<string, { id: string; type: string; target: string }[]>();
			for (const e of edges) {
				const list = edgeMap.get(e.source_node_id) || [];
				list.push({ id: e.id, type: e.edge_type, target: e.target_node_id });
				edgeMap.set(e.source_node_id, list);
			}

			const typeMap: Record<string, string> = {
				task: 'requirement', risk: 'requirement', decision: 'requirement',
				gate: 'design', plan: 'design', run: 'code',
				verification: 'test', resource: 'component',
			};

			const tree = nodes.map((n: any) => ({
				id: n.id.substring(0, 8).toUpperCase(),
				name: n.title,
				type: typeMap[n.node_type] || 'requirement',
				status: n.status || 'active',
				metadata: typeof n.metadata === 'string' ? JSON.parse(n.metadata || '{}') : (n.metadata || {}),
				connections: edgeMap.get(n.id) || [],
			}));

			setImpactTree(tree);
		} catch (err) {
			console.error('Failed to fetch analytics:', err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

	return (
		<div className="h-full flex flex-col p-6 space-y-6">
			<div className="flex flex-col space-y-2">
				<h2 className="text-2xl font-bold tracking-tight">Impact Analytics</h2>
				<p className="text-muted-foreground">
					Comprehensive traceability and coverage metrics for the project.
				</p>
			</div>

			{loading ? (
				<div className="flex-1 flex items-center justify-center">
					<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
				</div>
			) : (
				<div className="flex-1 overflow-auto">
					<RequirementImpactAnalytics
						analytics={analytics}
						impactTree={impactTree}
						requirementTitle="Project Graph Analytics"
						onRefresh={fetchAnalytics}
						onExport={() => {}}
					/>
				</div>
			)}
		</div>
	);
}
