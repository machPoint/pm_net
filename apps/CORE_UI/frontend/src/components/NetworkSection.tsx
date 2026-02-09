"use client";

import { useState, useEffect } from "react";
import NetworkTopologyGraph from "./NetworkTopologyGraph";
import AgentTaskFlow from "./AgentTaskFlow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Network as NetworkIcon, Workflow } from "lucide-react";

const OPAL_BASE_URL = '/api/opal/proxy';

interface NetworkNodeData {
	id: string;
	type: string;
	title: string;
	metadata?: any;
}

interface NetworkEdgeData {
	id: string;
	source: string;
	target: string;
	type: string;
	weight?: number;
	metadata?: any;
}

// Build TaskFlow data from graph nodes + edges for the AgentTaskFlow component
function buildTaskFlows(nodes: NetworkNodeData[], edges: NetworkEdgeData[]) {
	const nodeMap = new Map(nodes.map(n => [n.id, n]));

	// Find task nodes
	const taskNodes = nodes.filter(n => n.type === 'task');

	// Build edge lookup: target -> sources, source -> targets
	const edgesByTarget = new Map<string, NetworkEdgeData[]>();
	const edgesBySource = new Map<string, NetworkEdgeData[]>();
	for (const e of edges) {
		if (!edgesByTarget.has(e.target)) edgesByTarget.set(e.target, []);
		edgesByTarget.get(e.target)!.push(e);
		if (!edgesBySource.has(e.source)) edgesBySource.set(e.source, []);
		edgesBySource.get(e.source)!.push(e);
	}

	return taskNodes.map(task => {
		const activities: Array<{
			id: string; name: string; description: string;
			status: 'completed' | 'in_progress' | 'pending' | 'failed';
			agents: Array<{ id: string; name: string; type: string; metadata: any }>;
			timestamp?: string;
		}> = [];

		// Find plans for this task (plan --for_task--> task)
		const planEdges = (edgesByTarget.get(task.id) || []).filter(e => e.type === 'for_task');
		for (const pe of planEdges) {
			const plan = nodeMap.get(pe.source);
			if (!plan || plan.type !== 'plan') continue;
			const planStatus = plan.metadata?.status === 'approved' ? 'completed'
				: plan.metadata?.status === 'rejected' ? 'failed'
				: plan.metadata?.status === 'pending' ? 'pending' : 'in_progress';

			// Find agent that proposed this plan
			const proposerEdges = (edgesByTarget.get(plan.id) || []).filter(e => e.type === 'proposes');
			const agents = proposerEdges.map(ae => {
				const agent = nodeMap.get(ae.source);
				return agent ? { id: agent.id, name: agent.title, type: agent.type, metadata: agent.metadata || {} } : null;
			}).filter(Boolean) as any[];

			// Add plan steps as activities
			const steps = plan.metadata?.steps || [];
			if (steps.length > 0) {
				steps.forEach((step: any, i: number) => {
					activities.push({
						id: `${plan.id}-step-${i}`,
						name: `${step.order || i + 1}. ${step.action}`,
						description: step.expected_outcome || '',
						status: planStatus as any,
						agents: agents.length > 0 ? agents : [],
						timestamp: step.tool || undefined,
					});
				});
			} else {
				activities.push({
					id: plan.id,
					name: `Plan: ${plan.title}`,
					description: plan.metadata?.description || '',
					status: planStatus as any,
					agents,
				});
			}
		}

		// Find runs for this task (run --for_task--> task)
		const runEdges = (edgesByTarget.get(task.id) || []).filter(e => e.type === 'for_task');
		for (const re of runEdges) {
			const run = nodeMap.get(re.source);
			if (!run || run.type !== 'run') continue;
			const runStatus = run.metadata?.status === 'completed' ? 'completed'
				: run.metadata?.status === 'running' ? 'in_progress'
				: run.metadata?.status === 'failed' ? 'failed' : 'pending';

			const executorEdges = (edgesByTarget.get(run.id) || []).filter(e => e.type === 'executed');
			const agents = executorEdges.map(ae => {
				const agent = nodeMap.get(ae.source);
				return agent ? { id: agent.id, name: agent.title, type: agent.type, metadata: agent.metadata || {} } : null;
			}).filter(Boolean) as any[];

			activities.push({
				id: run.id,
				name: `Run: ${run.title}`,
				description: run.metadata?.description || '',
				status: runStatus as any,
				agents,
			});
		}

		// Find gates for this task
		const gateEdges = (edgesByTarget.get(task.id) || [])
			.filter(e => e.type === 'requires_approval')
			.map(e => nodeMap.get(e.source))
			.filter(n => n && n.type === 'gate');

		for (const gate of gateEdges) {
			if (!gate) continue;
			activities.push({
				id: gate.id,
				name: `Gate: ${gate.title}`,
				description: gate.metadata?.gate_type || '',
				status: gate.metadata?.status === 'approved' ? 'completed'
					: gate.metadata?.status === 'rejected' ? 'failed' : 'pending' as any,
				agents: [],
			});
		}

		// If no activities found, add a placeholder
		if (activities.length === 0) {
			activities.push({
				id: `${task.id}-placeholder`,
				name: 'Task created',
				description: task.metadata?.description || 'No plan generated yet',
				status: task.metadata?.status === 'done' ? 'completed'
					: task.metadata?.status === 'in_progress' ? 'in_progress' : 'pending' as any,
				agents: [],
			});
		}

		return {
			id: task.id,
			taskName: task.title,
			description: task.metadata?.description || '',
			activities,
		};
	});
}

export default function NetworkSection() {
	const [nodes, setNodes] = useState<NetworkNodeData[]>([]);
	const [edges, setEdges] = useState<NetworkEdgeData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedNode, setSelectedNode] = useState<NetworkNodeData | null>(null);

	useEffect(() => {
		fetchNetworkTopology();
	}, []);

	const fetchNetworkTopology = async () => {
		try {
			setLoading(true);
			setError(null);

			// Fetch all nodes from the new graph API
			const nodesResponse = await fetch(`${OPAL_BASE_URL}/api/nodes`);
			if (!nodesResponse.ok) {
				throw new Error(`Failed to fetch nodes: ${nodesResponse.statusText}`);
			}
			const nodesResult = await nodesResponse.json();
			const nodesData = nodesResult.nodes || nodesResult || [];

			// Fetch all edges from the new graph API
			const edgesResponse = await fetch(`${OPAL_BASE_URL}/api/edges`);
			if (!edgesResponse.ok) {
				throw new Error(`Failed to fetch edges: ${edgesResponse.statusText}`);
			}
			const edgesResult = await edgesResponse.json();
			const edgesData = edgesResult.edges || edgesResult || [];

			// Transform nodes for the graph visualization
			const networkNodes: NetworkNodeData[] = (Array.isArray(nodesData) ? nodesData : []).map((node: any) => ({
				id: node.id,
				type: node.node_type,
				title: node.title,
				metadata: {
					...(typeof node.metadata === 'string' ? JSON.parse(node.metadata) : node.metadata),
					status: node.status,
					description: node.description
				}
			}));

			// Transform edges for the graph visualization
			const networkEdges: NetworkEdgeData[] = (Array.isArray(edgesData) ? edgesData : []).map((edge: any) => ({
				id: edge.id,
				source: edge.source_node_id,
				target: edge.target_node_id,
				type: edge.edge_type,
				weight: edge.weight || 1.0,
				metadata: typeof edge.metadata === 'string' ? JSON.parse(edge.metadata) : edge.metadata
			}));

			setNodes(networkNodes);
			setEdges(networkEdges);
		} catch (err: any) {
			console.error('Error fetching network topology:', err);
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleNodeClick = (node: NetworkNodeData) => {
		setSelectedNode(node);
	};

	if (loading) {
		return (
			<div className="h-full flex items-center justify-center">
				<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
				<span className="ml-2 text-muted-foreground">Loading network topology...</span>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col p-6 gap-4">
			<div className="flex justify-between items-start">
				<div className="flex flex-col space-y-2">
					<h2 className="text-2xl font-bold tracking-tight">Project Network</h2>
					<p className="text-muted-foreground">
						Visualize tasks, agents, decisions, and their relationships
					</p>
				</div>
				<div className="flex gap-2">
					<Badge variant="outline">
						{nodes.length} Nodes
					</Badge>
					<Badge variant="outline">
						{edges.length} Connections
					</Badge>
				</div>
			</div>

			{error && (
				<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-3 text-sm text-amber-800 dark:text-amber-300">
					<strong>Note:</strong> Using demo data. {error}
				</div>
			)}

			<Tabs defaultValue="task-flow" className="flex-1 flex flex-col">
				<TabsList className="w-fit">
					<TabsTrigger value="task-flow" className="gap-2">
						<Workflow className="h-4 w-4" />
						Agent Task Flow
					</TabsTrigger>
					<TabsTrigger value="topology" className="gap-2">
						<NetworkIcon className="h-4 w-4" />
						Network Topology
					</TabsTrigger>
				</TabsList>

				<TabsContent value="task-flow" className="flex-1 mt-4">
					<div className="border rounded-lg overflow-hidden bg-background shadow-sm h-full">
						<AgentTaskFlow taskFlows={buildTaskFlows(nodes, edges)} />
					</div>
				</TabsContent>

				<TabsContent value="topology" className="flex-1 mt-4">
					<div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[600px]">
						<div className="lg:col-span-2 border rounded-lg overflow-hidden bg-background shadow-sm h-full min-h-[600px]">
							<NetworkTopologyGraph
								nodes={nodes}
								edges={edges}
								onNodeClick={handleNodeClick}
							/>
						</div>

						<div className="flex flex-col gap-4 overflow-y-auto">
							{selectedNode ? (
								<Card>
									<CardHeader>
										<CardTitle className="text-lg">{selectedNode.title}</CardTitle>
										<Badge variant="outline" className="w-fit capitalize">
											{selectedNode.type}
										</Badge>
									</CardHeader>
									<CardContent className="space-y-3">
										{selectedNode.metadata?.description && (
											<div>
												<div className="text-xs font-semibold text-muted-foreground">Description</div>
												<div className="text-sm">{selectedNode.metadata.description}</div>
											</div>
										)}
										{selectedNode.metadata?.status && (
											<div>
												<div className="text-xs font-semibold text-muted-foreground">Status</div>
												<Badge variant={
													selectedNode.metadata.status === 'completed' ? 'default' :
														selectedNode.metadata.status === 'in_progress' ? 'secondary' :
															selectedNode.metadata.status === 'approved' ? 'default' :
																'outline'
												} className="capitalize">
													{selectedNode.metadata.status.replace('_', ' ')}
												</Badge>
											</div>
										)}
										{selectedNode.metadata?.priority && (
											<div>
												<div className="text-xs font-semibold text-muted-foreground">Priority</div>
												<Badge variant={
													selectedNode.metadata.priority === 'high' ? 'destructive' :
														selectedNode.metadata.priority === 'medium' ? 'secondary' : 'outline'
												} className="capitalize">
													{selectedNode.metadata.priority}
												</Badge>
											</div>
										)}
										{selectedNode.metadata?.due_date && (
											<div>
												<div className="text-xs font-semibold text-muted-foreground">Due Date</div>
												<div className="text-sm">{selectedNode.metadata.due_date}</div>
											</div>
										)}
										{selectedNode.metadata?.email && (
											<div>
												<div className="text-xs font-semibold text-muted-foreground">Email</div>
												<div className="text-sm">{selectedNode.metadata.email}</div>
											</div>
										)}
										{selectedNode.metadata?.capabilities && (
											<div>
												<div className="text-xs font-semibold text-muted-foreground">Capabilities</div>
												<div className="flex flex-wrap gap-1 mt-1">
													{selectedNode.metadata.capabilities.map((cap: string, i: number) => (
														<Badge key={i} variant="outline" className="text-xs">
															{cap.replace('_', ' ')}
														</Badge>
													))}
												</div>
											</div>
										)}
									</CardContent>
								</Card>
							) : (
								<Card className="bg-muted/50 border-dashed">
									<CardContent className="pt-6 text-center text-muted-foreground text-sm">
										Click a node to view details
									</CardContent>
								</Card>
							)}
						</div>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
