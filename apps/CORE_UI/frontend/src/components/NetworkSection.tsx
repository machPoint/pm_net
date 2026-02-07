"use client";

import { useState, useEffect } from "react";
import NetworkTopologyGraph from "./NetworkTopologyGraph";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const OPAL_BASE_URL = process.env.NEXT_PUBLIC_OPAL_BASE_URL || 'http://localhost:7788';

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

			// Fallback to mock data for demo
			setNodes(getMockNetworkNodes());
			setEdges(getMockNetworkEdges());
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
						<Card className="bg-slate-50 dark:bg-slate-900/50 border-dashed">
							<CardContent className="pt-6 text-center text-muted-foreground text-sm">
								Click a node to view details
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</div>
	);
}

// Mock data fallback for demo
function getMockNetworkNodes(): NetworkNodeData[] {
	return [
		{
			id: 'net-router-1',
			type: 'NetworkDevice',
			title: 'Core Router 1',
			metadata: {
				ip: '10.0.1.1',
				hostname: 'rtr-core-01',
				vendor: 'Cisco',
				model: 'ASR9000',
				status: 'active',
				position: { x: 400, y: 100 }
			}
		},
		{
			id: 'net-switch-1',
			type: 'NetworkDevice',
			title: 'Access Switch 1',
			metadata: {
				ip: '10.0.2.10',
				hostname: 'sw-access-01',
				vendor: 'Arista',
				model: '7050',
				status: 'active',
				position: { x: 200, y: 300 }
			}
		},
		{
			id: 'net-switch-2',
			type: 'NetworkDevice',
			title: 'Access Switch 2',
			metadata: {
				ip: '10.0.2.11',
				hostname: 'sw-access-02',
				vendor: 'Arista',
				model: '7050',
				status: 'active',
				position: { x: 600, y: 300 }
			}
		},
		{
			id: 'net-fw-1',
			type: 'NetworkDevice',
			title: 'Firewall 1',
			metadata: {
				ip: '10.0.0.1',
				hostname: 'fw-perimeter-01',
				vendor: 'Palo Alto',
				status: 'active',
				position: { x: 400, y: 500 }
			}
		}
	];
}

function getMockNetworkEdges(): NetworkEdgeData[] {
	return [
		{
			id: 'edge-1',
			source: 'net-router-1',
			target: 'net-switch-1',
			type: 'CONNECTED_TO',
			weight: 1.0,
			metadata: {
				bandwidth: '10Gbps',
				latency: '0.5ms',
				status: 'up'
			}
		},
		{
			id: 'edge-2',
			source: 'net-router-1',
			target: 'net-switch-2',
			type: 'CONNECTED_TO',
			weight: 1.0,
			metadata: {
				bandwidth: '10Gbps',
				latency: '0.5ms',
				status: 'up'
			}
		},
		{
			id: 'edge-3',
			source: 'net-switch-1',
			target: 'net-fw-1',
			type: 'ROUTES_TO',
			weight: 1.2,
			metadata: {
				bandwidth: '1Gbps',
				status: 'up'
			}
		},
		{
			id: 'edge-4',
			source: 'net-switch-2',
			target: 'net-fw-1',
			type: 'ROUTES_TO',
			weight: 1.2,
			metadata: {
				bandwidth: '1Gbps',
				status: 'up'
			}
		}
	];
}
