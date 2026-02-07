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
	NodeToolbar,
	Panel,
	ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bot, FileText, Play, CheckCircle, AlertCircle, GitCommit, Search } from 'lucide-react';

// Define agent activity node interface
export interface ActivityNode {
	id: string;
	type: "task" | "plan" | "run" | "decision" | "verification";
	title: string;
	status: "pending" | "approved" | "rejected" | "running" | "completed" | "failed";
	timestamp: string;
	agentId?: string;
	metadata?: any;
	position?: { x: number; y: number };
}

// Define custom activity node component
const ActivityCustomNode = ({ data, id, selected }: { data: any; id: string; selected: boolean }) => {
	const { type, title, status, timestamp, agentId } = data;

	const getNodeStyles = (type: string, status: string) => {
		switch (type) {
			case 'task':
				return {
					bg: "bg-blue-50 dark:bg-blue-900/20",
					border: "border-blue-200 dark:border-blue-800",
					icon: <Bot className="w-4 h-4 text-blue-500" />
				};
			case 'plan':
				return {
					bg: "bg-purple-50 dark:bg-purple-900/20",
					border: "border-purple-200 dark:border-purple-800",
					icon: <FileText className="w-4 h-4 text-purple-500" />
				};
			case 'run':
				return {
					bg: "bg-amber-50 dark:bg-amber-900/20",
					border: "border-amber-200 dark:border-amber-800",
					icon: <Play className="w-4 h-4 text-amber-500" />
				};
			case 'decision':
				return {
					bg: "bg-slate-50 dark:bg-slate-900/20",
					border: "border-slate-200 dark:border-slate-800",
					icon: <GitCommit className="w-4 h-4 text-slate-500" />
				};
			case 'verification':
				return {
					bg: "bg-green-50 dark:bg-green-900/20",
					border: "border-green-200 dark:border-green-800",
					icon: <CheckCircle className="w-4 h-4 text-green-500" />
				};
			default:
				return {
					bg: "bg-gray-50 dark:bg-gray-900/20",
					border: "border-gray-200 dark:border-gray-800",
					icon: <AlertCircle className="w-4 h-4 text-gray-500" />
				};
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'approved':
			case 'completed': return "text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-400";
			case 'rejected':
			case 'failed': return "text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-400";
			case 'running': return "text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400";
			default: return "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400";
		}
	};

	const styles = getNodeStyles(type, status);

	return (
		<>
			<NodeToolbar isVisible={selected} position={Position.Top}>
				<div className="bg-white dark:bg-gray-900 shadow-lg rounded border border-gray-200 dark:border-gray-700 p-2 flex gap-2">
					<Button variant="outline" size="sm" className="h-6 text-xs">
						View Details
					</Button>
				</div>
			</NodeToolbar>

			<div
				className={cn(
					"px-3 py-2 rounded-lg shadow-sm border w-[180px] transition-all",
					styles.bg, styles.border,
					selected ? "ring-2 ring-primary shadow-md" : "hover:shadow-md"
				)}
			>
				<div className="flex justify-between items-start mb-2">
					<div className="p-1 rounded bg-white/50 dark:bg-black/20">
						{styles.icon}
					</div>
					<Badge className={cn("text-[10px] px-1.5 py-0 h-5 border-0", getStatusColor(status))}>
						{status}
					</Badge>
				</div>

				<div className="font-medium text-sm mb-1 line-clamp-2 leading-snug">
					{title}
				</div>

				<div className="flex justify-between items-center text-[10px] text-muted-foreground mt-2">
					<span>{type.toUpperCase()}</span>
					<span>{new Date(timestamp).toLocaleTimeString()}</span>
				</div>

				<Handle type="target" position={Position.Top} className="w-2 h-2 !bg-gray-400" />
				<Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-gray-400" />
			</div>
		</>
	);
};

const nodeTypes: NodeTypes = {
	activity: ActivityCustomNode,
};

interface AgentActivityGraphProps {
	nodes: ActivityNode[];
	edges: { source: string; target: string; label?: string }[];
	onNodeClick?: (node: ActivityNode) => void;
}

export default function AgentActivityGraph({ nodes: rawNodes, edges: rawEdges, onNodeClick }: AgentActivityGraphProps) {
	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);

	useEffect(() => {
		// Transform props to ReactFlow format
		const flowNodes: Node[] = rawNodes.map(n => ({
			id: n.id,
			type: 'activity',
			position: n.position || { x: 0, y: 0 },
			data: { ...n }
		}));

		const flowEdges: Edge[] = rawEdges.map((e, i) => ({
			id: `e-${i}`,
			source: e.source,
			target: e.target,
			label: e.label,
			type: 'smoothstep',
			markerEnd: { type: MarkerType.ArrowClosed },
			animated: true,
			style: { stroke: '#94a3b8' }
		}));

		setNodes(flowNodes);
		setEdges(flowEdges);
	}, [rawNodes, rawEdges, setNodes, setEdges]);

	return (
		<div className="h-[500px] w-full bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
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
					<Background color="#94a3b8" gap={20} size={1} />
					<Controls />
					<MiniMap nodeStrokeWidth={3} zoomable pannable />
				</ReactFlow>
			</ReactFlowProvider>
		</div>
	);
}
