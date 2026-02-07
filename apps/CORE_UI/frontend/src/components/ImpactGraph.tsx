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
import { Share, Download, Maximize2, ExternalLink, Zap, AlertTriangle, Clock, TrendingUp } from 'lucide-react';

// Define impact node interface
interface ImpactNode {
  id: string;
  type: "source" | "affected" | "related" | "downstream";
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  impactType: "requirement" | "design" | "code" | "test" | "component" | "process";
  effort: string;
  status: "identified" | "analyzing" | "planned" | "in-progress" | "completed";
  connections: string[];
  metadata: {
    owner: string;
    lastUpdated: string;
    source: string;
    estimatedHours?: number;
    affectedTeams?: string[];
  };
  position?: { x: number; y: number };
  details?: {
    description: string;
    changeDescription: string;
    riskLevel: string;
    mitigation: string;
    dependencies: string[];
    timeline: string;
    approvalRequired: boolean;
    costEstimate?: string;
    stakeholders: string[];
  };
}

// Define custom impact node component
const ImpactCustomNode = ({ data, id, selected }: { data: any; id: string; selected: boolean }) => {
  const { type, title, severity, impactType, effort, status, metadata } = data;
  
  const getNodeColor = (nodeType: string, severity: string, impactType: string) => {
    // Enhanced coloring for impact analysis
    const severityColors = {
      critical: {
        bg: "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/40",
        border: "border-red-400 dark:border-red-500",
        text: "text-red-900 dark:text-red-200",
        shadow: "shadow-red-200 dark:shadow-red-900/30"
      },
      high: {
        bg: "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/40",
        border: "border-orange-400 dark:border-orange-500", 
        text: "text-orange-900 dark:text-orange-200",
        shadow: "shadow-orange-200 dark:shadow-orange-900/30"
      },
      medium: {
        bg: "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/40",
        border: "border-yellow-400 dark:border-yellow-500",
        text: "text-yellow-900 dark:text-yellow-200",
        shadow: "shadow-yellow-200 dark:shadow-yellow-900/30"
      },
      low: {
        bg: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30",
        border: "border-green-300 dark:border-green-600",
        text: "text-green-900 dark:text-green-200",
        shadow: "shadow-green-100 dark:shadow-green-900/20"
      }
    };

    // Special styling for source node
    if (nodeType === "source") {
      return {
        bg: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30",
        border: "border-blue-400 dark:border-blue-500 border-4", // Thicker border for source
        text: "text-blue-900 dark:text-blue-200",
        shadow: "shadow-blue-200 dark:shadow-blue-900/30"
      };
    }
    
    return severityColors[severity as keyof typeof severityColors] || severityColors.medium;
  };
  
  const getTypeIcon = (impactType: string) => {
    switch (impactType) {
      case "requirement": return "📋";
      case "design": return "📐";
      case "code": return "💻";
      case "test": return "🧪";
      case "component": return "⚙️";
      case "process": return "🔄";
      default: return "📄";
    }
  };
  
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <AlertTriangle className="w-3 h-3 text-red-500" />;
      case "high": return <TrendingUp className="w-3 h-3 text-orange-500" />;
      case "medium": return <Clock className="w-3 h-3 text-yellow-500" />;
      case "low": return <Zap className="w-3 h-3 text-green-500" />;
      default: return <AlertTriangle className="w-3 h-3" />;
    }
  };
  
  const colors = getNodeColor(type, severity, impactType);
  const isSource = type === "source";
  
  return (
    <>
      <NodeToolbar isVisible={selected} position={Position.Top}>
        <div className="bg-white dark:bg-gray-900 shadow-lg rounded border border-gray-200 dark:border-gray-700 p-2 flex gap-2">
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
            <ExternalLink className="w-3 h-3 mr-1" />
            Analyze
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
            <Zap className="w-3 h-3 mr-1" />
            Details
          </Button>
        </div>
      </NodeToolbar>
      
      <div 
        className={cn(
          "px-4 py-3 rounded-xl shadow-lg border-2 w-[200px] transition-all duration-300 backdrop-blur-sm",
          colors.bg, colors.border, colors.text, colors.shadow,
          selected 
            ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-black scale-105 shadow-xl" 
            : "hover:shadow-lg hover:scale-102 hover:-translate-y-0.5",
          isSource ? "ring-2 ring-blue-400 ring-offset-1" : ""
        )}
        style={{
          boxShadow: selected 
            ? '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
            : isSource
            ? '0 15px 20px -5px rgb(59 130 246 / 0.2), 0 6px 8px -2px rgb(59 130 246 / 0.1)'
            : '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1">
            <span className="text-sm">{getTypeIcon(impactType)}</span>
            <Badge 
              className={cn(
                "text-[10px] uppercase font-bold px-2 py-1 rounded-md",
                colors.text,
                "bg-white/50 dark:bg-black/30 backdrop-blur-sm border-0"
              )}
            >
              {isSource ? "SOURCE" : type}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {getSeverityIcon(severity)}
          </div>
        </div>
        
        <div className="font-bold text-sm mb-2 leading-tight line-clamp-2">{title}</div>
        
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-medium opacity-70">{metadata.owner.split(' ')[0]}</span>
          <Badge 
            variant="outline" 
            className={cn(
              "text-[9px] font-semibold border-current",
              severity === 'critical' ? 'text-red-600 dark:text-red-400 border-red-300' :
              severity === 'high' ? 'text-orange-600 dark:text-orange-400 border-orange-300' :
              severity === 'medium' ? 'text-yellow-600 dark:text-yellow-400 border-yellow-300' :
              'text-green-600 dark:text-green-400 border-green-300'
            )}
          >
            {severity}
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground">
          <div className="flex justify-between items-center">
            <span>Effort: {effort}</span>
            <Badge variant={status === 'completed' ? 'default' : 'secondary'} className="text-[8px] px-1">
              {status}
            </Badge>
          </div>
        </div>
        
        {/* Handles for connections */}
        <Handle 
          type="target" 
          position={Position.Left} 
          className={cn(
            "w-2 h-2 border-2 border-white dark:border-gray-800 shadow-lg",
            isSource 
              ? "bg-gradient-to-r from-blue-400 to-blue-600" 
              : severity === 'critical' ? "bg-gradient-to-r from-red-400 to-red-600"
              : severity === 'high' ? "bg-gradient-to-r from-orange-400 to-orange-600"
              : severity === 'medium' ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
              : "bg-gradient-to-r from-green-400 to-green-600"
          )} 
        />
        <Handle 
          type="source" 
          position={Position.Right} 
          className={cn(
            "w-2 h-2 border-2 border-white dark:border-gray-800 shadow-lg",
            isSource 
              ? "bg-gradient-to-r from-blue-400 to-blue-600" 
              : severity === 'critical' ? "bg-gradient-to-r from-red-400 to-red-600"
              : severity === 'high' ? "bg-gradient-to-r from-orange-400 to-orange-600"
              : severity === 'medium' ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
              : "bg-gradient-to-r from-green-400 to-green-600"
          )} 
        />
      </div>
    </>
  );
};

// Map of node types
const nodeTypes: NodeTypes = {
  impact: ImpactCustomNode,
};

interface ImpactGraphProps {
  impactNodes: ImpactNode[];
  selectedNode: ImpactNode | null;
  onNodeClick: (node: ImpactNode) => void;
  centerNodeId?: string; // ID of the node to center the analysis on
}

export default function ImpactGraph({ impactNodes, selectedNode, onNodeClick, centerNodeId }: ImpactGraphProps) {
  // Transform impact nodes into React Flow nodes
  const initialNodes: Node[] = impactNodes.map((node) => ({
    id: node.id,
    type: 'impact',
    position: node.position || { x: 0, y: 0 },
    data: {
      ...node,
      label: node.title,
    },
  }));

  // Create edges from connections with enhanced styling based on severity
  const initialEdges: Edge[] = impactNodes.flatMap((node) =>
    node.connections.map((targetId) => {
      const isCritical = node.severity === 'critical';
      const isHigh = node.severity === 'high';
      const isSource = node.type === 'source';
      
      let strokeColor = '#475569'; // Darker default color
      let strokeWidth = 2;
      let animated = false;
      
      if (isSource) {
        strokeColor = '#2563eb'; // Darker blue
        strokeWidth = 3;
        animated = true;
      } else if (isCritical) {
        strokeColor = '#dc2626'; // Darker red
        strokeWidth = 3;
        animated = true;
      } else if (isHigh) {
        strokeColor = '#ea580c'; // Darker orange
        strokeWidth = 2.5;
      }
      
      return {
        id: `${node.id}-${targetId}`,
        source: node.id,
        target: targetId,
        animated,
        style: { 
          stroke: strokeColor, 
          strokeWidth,
          strokeDasharray: isSource ? '0' : isCritical ? '0' : '3,3'
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: 10,
          height: 10
        },
      };
    })
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Handle node selection
  const onNodeSelect = useCallback((event: React.MouseEvent, node: Node) => {
    const foundNode = impactNodes.find(in_ => in_.id === node.id);
    if (foundNode) {
      onNodeClick(foundNode);
    }
  }, [impactNodes, onNodeClick]);
  
  // Update nodes when selectedNode changes
  useEffect(() => {
    if (selectedNode) {
      setNodes((nds) =>
        nds.map((node) => {
          // Highlight the selected node
          if (node.id === selectedNode.id) {
            return {
              ...node,
              selected: true,
            };
          }
          
          // Highlight connected nodes
          if (
            selectedNode.connections.includes(node.id) ||
            impactNodes.find((in_) => in_.id === node.id)?.connections.includes(selectedNode.id)
          ) {
            return {
              ...node,
              style: { opacity: 1 },
            };
          }
          
          // Dim other nodes
          return {
            ...node,
            selected: false,
            style: { opacity: 0.5 },
          };
        })
      );
      
      // Highlight connected edges
      setEdges((eds) =>
        eds.map((edge) => {
          if (
            edge.source === selectedNode.id ||
            edge.target === selectedNode.id
          ) {
          return {
            ...edge,
            animated: true,
            style: { 
              stroke: '#2563eb', 
              strokeWidth: 4,
              filter: 'drop-shadow(0 2px 4px rgb(37 99 235 / 0.3))'
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#2563eb',
              width: 12,
              height: 12
            },
          };
          }
          return {
            ...edge,
            animated: false,
            style: { 
              stroke: '#475569', 
              strokeWidth: 2, 
              opacity: 0.3,
              strokeDasharray: '3,3'
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#475569',
              width: 8,
              height: 8
            },
          };
        })
      );
    } else {
      // Reset all nodes and edges when no node is selected
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          selected: false,
          style: { opacity: 1 },
        }))
      );
      
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          animated: false,
          style: { stroke: '#475569', strokeWidth: 2, opacity: 1 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#475569',
            width: 10,
            height: 10
          },
        }))
      );
    }
  }, [selectedNode, impactNodes, setNodes, setEdges]);

  return (
    <ReactFlowProvider>
      <div className="h-full w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeSelect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-right"
          className="bg-card rounded-lg border border-border"
        >
          <Background color="#64748b" gap={16} size={1} />
          <Controls 
            className="!bg-background !border !border-border [&>button]:!bg-[#374151] [&>button]:!border-border [&>button]:!text-white [&>button:hover]:!bg-[#4b5563]"
          />
          <MiniMap 
            nodeStrokeWidth={3} 
            zoomable 
            pannable 
            className="!bg-background !border !border-border"
            maskColor="rgb(0, 0, 0, 0.1)"
            nodeColor={(node) => {
              const isDark = document.documentElement.classList.contains('dark');
              const nodeData = impactNodes.find(n => n.id === node.id);
              if (!nodeData) return isDark ? '#374151' : '#9ca3af';
              
              // Color minimap nodes based on severity
              switch (nodeData.severity) {
                case 'critical': return '#ef4444';
                case 'high': return '#f97316';
                case 'medium': return '#eab308';
                case 'low': return '#22c55e';
                default: return isDark ? '#374151' : '#9ca3af';
              }
            }}
            nodeBorderRadius={4}
          />
          
          <Panel position="top-right" className="flex gap-2">
            <Button variant="outline" size="sm">
              <Maximize2 className="w-4 h-4 mr-1" />
              Fullscreen
            </Button>
            <Button variant="outline" size="sm">
              <Share className="w-4 h-4 mr-1" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </Panel>
          
          {selectedNode && (
            <Panel position="top-left" className="max-w-md bg-background/95 backdrop-blur rounded-lg border p-4 shadow-md">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn(
                  "w-3 h-3 rounded-full", 
                  selectedNode.severity === 'critical' ? 'bg-red-500' : 
                  selectedNode.severity === 'high' ? 'bg-orange-500' : 
                  selectedNode.severity === 'medium' ? 'bg-yellow-500' :
                  'bg-green-500'
                )} />
                <span className="font-medium">{selectedNode.title}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="mr-2">Severity: {selectedNode.severity}</span>
                <span className="mr-2">Effort: {selectedNode.effort}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Owner: {selectedNode.metadata.owner}
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}