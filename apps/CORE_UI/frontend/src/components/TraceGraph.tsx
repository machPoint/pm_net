"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
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
  ReactFlowProvider,
  Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Share, Download, Maximize2, ExternalLink, Network, Plus, Link, Filter, Search } from 'lucide-react';
import { createRequirementConnection, getRequirementImpactData } from '@/utils/requirements-transform';
import { RequirementConnection } from '@/services/database/requirements-connection-service';

// Import your TraceNode interface
interface TraceNode {
  id: string;
  type: "requirement" | "design" | "code" | "test" | "component" | "certification";
  title: string;
  status: "active" | "pending" | "completed" | "verified" | "failed";
  connections: string[];
  metadata: {
    owner: string;
    lastUpdated: string;
    source: string;
    criticality?: "DAL-A" | "DAL-B" | "DAL-C" | "DAL-D" | "DAL-E";
  };
  position?: { x: number; y: number };
  details?: {
    description: string;
    documentId: string;
    version: string;
    approvalStatus: string;
    certificationBasis: string;
    verificationMethod: string;
    parentRequirement?: string;
    childRequirements?: string[];
    testCases?: string[];
    riskAssessment: string;
    complianceStatus: string;
    lastReviewDate: string;
    nextReviewDate: string;
    stakeholders: string[];
    tags: string[];
    changeHistory: Array<{
      date: string;
      author: string;
      change: string;
      reason: string;
    }>;
  };
}

// Define custom node component
const CustomNode = ({ data, id, selected }: { data: any; id: string; selected: boolean }) => {
  const { type, title, status, metadata } = data;
  
  const getNodeColor = (type: string, status: string) => {
    // Enhanced node coloring with gradients and better visual hierarchy
    const baseColors = {
      requirement: {
        bg: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30",
        border: "border-blue-300 dark:border-blue-600",
        text: "text-blue-900 dark:text-blue-200",
        shadow: "shadow-blue-100 dark:shadow-blue-900/20"
      },
      design: {
        bg: "bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/30",
        border: "border-indigo-300 dark:border-indigo-600",
        text: "text-indigo-900 dark:text-indigo-200",
        shadow: "shadow-indigo-100 dark:shadow-indigo-900/20"
      },
      code: {
        bg: "bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-800/30",
        border: "border-violet-300 dark:border-violet-600",
        text: "text-violet-900 dark:text-violet-200",
        shadow: "shadow-violet-100 dark:shadow-violet-900/20"
      },
      test: {
        bg: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/30",
        border: "border-emerald-300 dark:border-emerald-600",
        text: "text-emerald-900 dark:text-emerald-200",
        shadow: "shadow-emerald-100 dark:shadow-emerald-900/20"
      },
      component: {
        bg: "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/30",
        border: "border-amber-300 dark:border-amber-600",
        text: "text-amber-900 dark:text-amber-200",
        shadow: "shadow-amber-100 dark:shadow-amber-900/20"
      },
      certification: {
        bg: "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/20 dark:to-slate-800/30",
        border: "border-slate-300 dark:border-slate-600",
        text: "text-slate-900 dark:text-slate-200",
        shadow: "shadow-slate-100 dark:shadow-slate-900/20"
      }
    };
    
    const colors = baseColors[type as keyof typeof baseColors] || baseColors.requirement;
    
    if (status === "completed" || status === "verified") {
      return {
        ...colors,
        bg: colors.bg + " opacity-80",
        border: colors.border + " border-2"
      };
    }
    
    return colors;
  };
  
  const getCriticalityColor = (criticality?: string) => {
    switch (criticality) {
      case "DAL-A": return "bg-red-500";
      case "DAL-B": return "bg-orange-500";
      case "DAL-C": return "bg-yellow-500";
      case "DAL-D": return "bg-blue-500";
      case "DAL-E": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };
  
  const colors = getNodeColor(type, status);
  
  return (
    <>
      <NodeToolbar isVisible={selected} position={Position.Top}>
        <div className="bg-white dark:bg-gray-900 shadow-lg rounded border border-gray-200 dark:border-gray-700 p-2 flex gap-2">
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
            <ExternalLink className="w-3 h-3 mr-1" />
            Open
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
            <Network className="w-3 h-3 mr-1" />
            Connections
          </Button>
        </div>
      </NodeToolbar>
      
      <div 
        className={cn(
          "px-4 py-3 rounded-xl shadow-lg border-2 w-[190px] transition-all duration-300 backdrop-blur-sm",
          colors.bg, colors.border, colors.text, colors.shadow,
          selected 
            ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-black scale-105 shadow-xl" 
            : "hover:shadow-lg hover:scale-102 hover:-translate-y-0.5"
        )}
        style={{
          boxShadow: selected 
            ? '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
            : '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <Badge 
            className={cn(
              "text-[10px] uppercase font-bold px-2 py-1 rounded-md",
              colors.text,
              "bg-white/50 dark:bg-black/30 backdrop-blur-sm border-0"
            )}
          >
            {type}
          </Badge>
          {metadata.criticality && (
            <div className={cn(
              "w-3 h-3 rounded-full border-2 border-white dark:border-black shadow-sm", 
              getCriticalityColor(metadata.criticality)
            )} />
          )}
        </div>
        
        <div className="font-bold text-sm mb-2 leading-tight line-clamp-2">{title}</div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium opacity-70">{metadata.owner.split(' ')[0]}</span>
          <Badge 
            variant="outline" 
            className={cn(
              "text-[9px] font-semibold border-current",
              status === 'verified' ? 'text-green-600 dark:text-green-400' :
              status === 'pending' ? 'text-amber-600 dark:text-amber-400' :
              status === 'failed' ? 'text-red-600 dark:text-red-400' :
              'text-blue-600 dark:text-blue-400'
            )}
          >
            {status}
          </Badge>
        </div>
        
        {/* Handles for connections */}
        <Handle 
          type="target" 
          position={Position.Left} 
          className="w-2 h-2 bg-gradient-to-r from-blue-400 to-blue-600 border-2 border-white dark:border-gray-800 shadow-lg" 
        />
        <Handle 
          type="source" 
          position={Position.Right} 
          className="w-2 h-2 bg-gradient-to-r from-blue-400 to-blue-600 border-2 border-white dark:border-gray-800 shadow-lg" 
        />
      </div>
    </>
  );
};

// Map of node types
const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

interface TraceGraphProps {
  traceNodes: TraceNode[];
  selectedNode: TraceNode | null;
  onNodeClick: (node: TraceNode) => void;
  onConnectionCreate?: (connection: RequirementConnection) => void;
  onNodesUpdate?: (nodes: TraceNode[]) => void;
  isConnectionMode?: boolean;
  allowEditing?: boolean;
}

export default function TraceGraph({ 
  traceNodes, 
  selectedNode, 
  onNodeClick,
  onConnectionCreate,
  onNodesUpdate,
  isConnectionMode = false,
  allowEditing = true
}: TraceGraphProps) {
  // Transform trace nodes into React Flow nodes
  const initialNodes: Node[] = traceNodes.map((node) => ({
    id: node.id,
    type: 'custom',
    position: node.position || { x: 0, y: 0 },
    data: {
      ...node,
      label: node.title,
    },
  }));

  // Create edges from connections with enhanced styling
  const initialEdges: Edge[] = traceNodes.flatMap((node) =>
    node.connections.map((targetId) => {
      const isCritical = node.metadata.criticality === 'DAL-A';
      return {
        id: `${node.id}-${targetId}`,
        source: node.id,
        target: targetId,
        animated: isCritical,
        style: { 
          stroke: isCritical ? '#dc2626' : '#475569', 
          strokeWidth: isCritical ? 3 : 2,
          strokeDasharray: isCritical ? '0' : '5,5'
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCritical ? '#dc2626' : '#475569',
          width: 10,
          height: 10
        },
      };
    })
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Connection creation state
  const [isCreatingConnection, setIsCreatingConnection] = useState(false);
  const [connectionDialog, setConnectionDialog] = useState<{
    isOpen: boolean;
    sourceId?: string;
    targetId?: string;
  }>({ isOpen: false });
  const [connectionForm, setConnectionForm] = useState({
    connectionType: 'related_to' as RequirementConnection['connectionType'],
    strength: 'medium' as RequirementConnection['strength'],
    description: ''
  });
  
  // Handle node selection
  const onNodeSelect = useCallback((event: React.MouseEvent, node: Node) => {
    const foundNode = traceNodes.find(tn => tn.id === node.id);
    if (foundNode) {
      onNodeClick(foundNode);
    }
  }, [traceNodes, onNodeClick]);
  
  // Handle connection creation when user connects nodes
  const onConnect = useCallback((connection: Connection) => {
    if (!allowEditing || !connection.source || !connection.target) return;
    
    // Open connection dialog
    setConnectionDialog({
      isOpen: true,
      sourceId: connection.source,
      targetId: connection.target
    });
  }, [allowEditing]);
  
  // Handle connection form submission
  const handleCreateConnection = async () => {
    if (!connectionDialog.sourceId || !connectionDialog.targetId) return;
    
    try {
      const newConnection = await createRequirementConnection(
        connectionDialog.sourceId,
        connectionDialog.targetId,
        connectionForm.connectionType,
        connectionForm.strength,
        connectionForm.description
      );
      
      // Add the edge to the graph
      const newEdge: Edge = {
        id: newConnection.id,
        source: newConnection.sourceId,
        target: newConnection.targetId,
        animated: newConnection.strength === 'strong',
        style: {
          stroke: newConnection.strength === 'strong' ? '#dc2626' : 
                  newConnection.strength === 'medium' ? '#2563eb' : '#475569',
          strokeWidth: newConnection.strength === 'strong' ? 3 : 2
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: newConnection.strength === 'strong' ? '#dc2626' : 
                 newConnection.strength === 'medium' ? '#2563eb' : '#475569',
          width: 10,
          height: 10
        },
        data: { connection: newConnection }
      };
      
      setEdges(eds => addEdge(newEdge, eds));
      
      // Notify parent component
      if (onConnectionCreate) {
        onConnectionCreate(newConnection);
      }
      
      // Close dialog and reset form
      setConnectionDialog({ isOpen: false });
      setConnectionForm({
        connectionType: 'related_to',
        strength: 'medium',
        description: ''
      });
      
    } catch (error) {
      console.error('Error creating connection:', error);
    }
  };
  
  // Toggle connection creation mode
  const toggleConnectionMode = useCallback(() => {
    setIsCreatingConnection(!isCreatingConnection);
  }, [isCreatingConnection]);
  
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
            traceNodes.find((tn) => tn.id === node.id)?.connections.includes(selectedNode.id)
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
  }, [selectedNode, traceNodes, setNodes, setEdges]);

  return (
    <ReactFlowProvider>
      <div className="h-full w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeSelect}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-right"
          className={cn(
            "bg-card rounded-lg border border-border",
            isCreatingConnection && "cursor-crosshair"
          )}
          connectionMode={isCreatingConnection ? 'strict' : 'snap'}
          snapToGrid={true}
          snapGrid={[15, 15]}
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
              return isDark ? '#374151' : '#9ca3af';
            }}
            nodeBorderRadius={4}
          />
          
          <Panel position="top-right" className="flex gap-2">
            {allowEditing && (
              <Button 
                variant={isCreatingConnection ? "default" : "outline"} 
                size="sm"
                onClick={toggleConnectionMode}
              >
                <Link className="w-4 h-4 mr-1" />
                {isCreatingConnection ? 'Exit Connect' : 'Connect Nodes'}
              </Button>
            )}
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
                  selectedNode.status === 'verified' ? 'bg-green-500' : 
                  selectedNode.status === 'pending' ? 'bg-amber-500' : 
                  'bg-blue-500'
                )} />
                <span className="font-medium">{selectedNode.title}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedNode.metadata.criticality && (
                  <span className="mr-2">Safety Level: {selectedNode.metadata.criticality}</span>
                )}
                Owner: {selectedNode.metadata.owner}
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
      
      {/* Connection Creation Dialog */}
      <Dialog open={connectionDialog.isOpen} onOpenChange={(open) => 
        setConnectionDialog({ isOpen: open })
      }>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Connection</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Creating connection from <span className="font-medium">
                {connectionDialog.sourceId}
              </span> to <span className="font-medium">
                {connectionDialog.targetId}
              </span>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="connectionType">Connection Type</Label>
              <Select 
                value={connectionForm.connectionType}
                onValueChange={(value: RequirementConnection['connectionType']) => 
                  setConnectionForm(prev => ({ ...prev, connectionType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="depends_on">Depends On</SelectItem>
                  <SelectItem value="derived_from">Derived From</SelectItem>
                  <SelectItem value="impacts">Impacts</SelectItem>
                  <SelectItem value="related_to">Related To</SelectItem>
                  <SelectItem value="implements">Implements</SelectItem>
                  <SelectItem value="validates">Validates</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="strength">Connection Strength</Label>
              <Select 
                value={connectionForm.strength}
                onValueChange={(value: RequirementConnection['strength']) => 
                  setConnectionForm(prev => ({ ...prev, strength: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weak">Weak</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="strong">Strong</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea 
                id="description"
                placeholder="Describe the relationship between these requirements..."
                value={connectionForm.description}
                onChange={(e) => 
                  setConnectionForm(prev => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setConnectionDialog({ isOpen: false })}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateConnection}>
                Create Connection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ReactFlowProvider>
  );
}
