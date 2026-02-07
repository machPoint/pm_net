"use client";

import { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
	Node,
	Edge,
	MiniMap,
	Controls,
	Background,
	useNodesState,
	useEdgesState,
	MarkerType,
	Position,
	NodeTypes,
	Handle,
	ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Server, Network, Database, Router, HardDrive, Search, FileText, Layers, Link2 } from 'lucide-react';

// Network node data interface
interface NetworkNodeData {
	id: string;
	type: string;
	title: string;
	metadata?: {
		ip?: string;
		hostname?: string;
		vendor?: string;
		model?: string;
		status?: string;
		bandwidth?: string;
		position?: { x: number; y: number };
	};
}

// Network edge data interface
interface NetworkEdgeData {
	id: string;
	source: string;
	target: string;
	type: string;
	weight?: number;
	metadata?: {
		bandwidth?: string;
		latency?: string;
		status?: string;
	};
}

// Custom network device node component
const NetworkDeviceNode = ({ data, selected }: { data: any; id: string; selected: boolean }) => {
	const { title, type, metadata } = data;

	const getNodeStyles = (nodeType: string) => {
		switch (nodeType) {
			case 'NetworkDevice':
				return {
					bg: "bg-blue-50 dark:bg-blue-900/20",
					border: "border-blue-300 dark:border-blue-700",
					icon: <Router className="w-5 h-5 text-blue-600 dark:text-blue-400" />
				};
			case 'NetworkInterface':
				return {
					bg: "bg-purple-50 dark:bg-purple-900/20",
					border: "border-purple-300 dark:border-purple-700",
					icon: <Network className="w-5 h-5 text-purple-600 dark:text-purple-400" />
				};
			case 'Subnet':
				return {
					bg: "bg-green-50 dark:bg-green-900/20",
					border: "border-green-300 dark:border-green-700",
					icon: <Network className="w-5 h-5 text-green-600 dark:text-green-400" />
				};
			case 'NetworkService':
				return {
					bg: "bg-amber-50 dark:bg-amber-900/20",
					border: "border-amber-300 dark:border-amber-700",
					icon: <Server className="w-5 h-5 text-amber-600 dark:text-amber-400" />
				};
			// SEO Vertical Types
			case 'keyword':
				return {
					bg: "bg-yellow-50 dark:bg-yellow-900/20",
					border: "border-yellow-300 dark:border-yellow-700",
					icon: <Search className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
				};
			case 'content_piece':
				return {
					bg: "bg-pink-50 dark:bg-pink-900/20",
					border: "border-pink-300 dark:border-pink-700",
					icon: <FileText className="w-5 h-5 text-pink-600 dark:text-pink-400" />
				};
			case 'topic_cluster':
				return {
					bg: "bg-violet-50 dark:bg-violet-900/20",
					border: "border-violet-300 dark:border-violet-700",
					icon: <Layers className="w-5 h-5 text-violet-600 dark:text-violet-400" />
				};
			case 'backlink':
				return {
					bg: "bg-orange-50 dark:bg-orange-900/20",
					border: "border-orange-300 dark:border-orange-700",
					icon: <Link2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
				};
			default:
				return {
					bg: "bg-slate-50 dark:bg-slate-900/20",
					border: "border-slate-300 dark:border-slate-700",
					icon: <HardDrive className="w-5 h-5 text-slate-600 dark:text-slate-400" />
				};
		}
	};

	const getStatusColor = (status?: string) => {
		switch (status?.toLowerCase()) {
			case 'active':
			case 'up': return "bg-green-500";
			case 'warning': return "bg-yellow-500";
			case 'down':
			case 'error': return "bg-red-500";
			default: return "bg-gray-400";
		}
	};

	const styles = getNodeStyles(type);

	return (
		<div
			className={cn(
				"px-4 py-3 rounded-lg shadow-md border-2 min-w-[200px] transition-all",
				styles.bg, styles.border,
				selected ? "ring-2 ring-primary shadow-lg scale-105" : "hover:shadow-lg"
			)}
		>
			<div className="flex items-start justify-between mb-2">
				<div className="flex items-center gap-2">
					<div className="p-1.5 rounded bg-white/50 dark:bg-black/20">
						{styles.icon}
					</div>
					<div>
						<div className="font-semibold text-sm">{title}</div>
						{metadata?.hostname && (
							<div className="text-xs text-muted-foreground">{metadata.hostname}</div>
						)}
					</div>
				</div>
				{metadata?.status && (
					<div className={cn("w-3 h-3 rounded-full", getStatusColor(metadata.status))} />
				)}
			</div>

			{metadata?.ip && (
				<div className="text-xs text-muted-foreground mb-1">
					<span className="font-mono">{metadata.ip}</span>
				</div>
			)}

			{(metadata?.vendor || metadata?.model) && (
				<div className="text-xs text-muted-foreground">
					{metadata.vendor} {metadata.model}
				</div>
			)}

			{metadata?.bandwidth && (
				<Badge variant="outline" className="mt-2 text-xs">
					{metadata.bandwidth}
				</Badge>
			)}

			<Handle type="target" position={Position.Top} className="w-3 h-3 !bg-blue-500" />
			<Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-blue-500" />
		</div>
	);
};

const nodeTypes: NodeTypes = {
	networkDevice: NetworkDeviceNode,
};

interface NetworkTopologyGraphProps {
	nodes: NetworkNodeData[];
	edges: NetworkEdgeData[];
	onNodeClick?: (node: NetworkNodeData) => void;
}

export default function NetworkTopologyGraph({ nodes: rawNodes, edges: rawEdges, onNodeClick }: NetworkTopologyGraphProps) {
	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);

	useEffect(() => {
		// Transform raw network data to ReactFlow format
		const flowNodes: Node[] = rawNodes.map(n => ({
			id: n.id,
			type: 'networkDevice',
			position: n.metadata?.position || { x: Math.random() * 500, y: Math.random() * 400 },
			data: {
				...n,
				title: n.title,
				type: n.type,
				metadata: n.metadata
			}
		}));

		const flowEdges: Edge[] = rawEdges.map((e, i) => ({
			id: e.id || `edge-${i}`,
			source: e.source,
			target: e.target,
			type: 'smoothstep',
			markerEnd: { type: MarkerType.ArrowClosed },
			label: e.metadata?.bandwidth || undefined,
			style: {
				stroke: e.metadata?.status === 'up' ? '#10b981' : '#94a3b8',
				strokeWidth: e.weight ? Math.max(1, e.weight * 3) : 2
			},
			animated: e.metadata?.status === 'up'
		}));

		setNodes(flowNodes);
		setEdges(flowEdges);
	}, [rawNodes, rawEdges, setNodes, setEdges]);

	return (
		<div className="h-full w-full bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
			<ReactFlowProvider>
				<ReactFlow
					nodes={nodes}
					edges={edges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onNodeClick={(_, node) => {
						const rawNode = rawNodes.find(n => n.id === node.id);
						if (rawNode && onNodeClick) onNodeClick(rawNode);
					}}
					nodeTypes={nodeTypes}
					fitView
					attributionPosition="bottom-right"
				>
					<Background color="#cbd5e1" gap={20} size={1} />
					<Controls />
					<MiniMap nodeStrokeWidth={3} zoomable pannable />
				</ReactFlow>
			</ReactFlowProvider>
		</div>
	);
}
