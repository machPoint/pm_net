"use client";

import { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  ConnectionLineType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Loader2, Network, Info, X } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

interface SystemNode {
  id: string;
  label: string;
  type: string;
  metadata?: Record<string, any>;
}

interface SystemEdge {
  id: string;
  from: string;
  to: string;
  relation: string;
  metadata?: Record<string, any>;
}

interface SystemSlice {
  nodes: SystemNode[];
  edges: SystemEdge[];
}

interface SliceResponse {
  slice: SystemSlice;
  summary: string;
  status: string;
}

export default function SystemModelSection() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<SystemNode | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [modelGenerated, setModelGenerated] = useState(false);

  const fetchSystemModel = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/system-model/root-slice?radius=1');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SliceResponse = await response.json();
      
      // Convert to React Flow format
      const flowNodes = convertToFlowNodes(data.slice.nodes);
      const flowEdges = convertToFlowEdges(data.slice.edges);

      setNodes(flowNodes);
      setEdges(flowEdges);
      setSummary(data.summary);
      setModelGenerated(true);
    } catch (err) {
      console.error('Error fetching system model:', err);
      setError(err instanceof Error ? err.message : 'Failed to load system model');
    } finally {
      setLoading(false);
    }
  };

  // Convert system nodes to React Flow nodes
  const convertToFlowNodes = (systemNodes: SystemNode[]): Node[] => {
    // Simple hierarchical layout
    const systemNode = systemNodes.find(n => n.type === 'system');
    const subsystemNodes = systemNodes.filter(n => n.type === 'subsystem');
    const componentNodes = systemNodes.filter(n => n.type === 'component');
    const requirementNodes = systemNodes.filter(n => n.type === 'requirement');

    const flowNodes: Node[] = [];

    // System node at top center
    if (systemNode) {
      flowNodes.push({
        id: systemNode.id,
        type: 'default',
        data: { 
          label: systemNode.label,
          nodeType: systemNode.type,
          metadata: systemNode.metadata
        },
        position: { x: 400, y: 50 },
        style: {
          background: '#3b82f6',
          color: 'white',
          border: '2px solid #2563eb',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '16px',
          fontWeight: 'bold',
          width: 200,
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });
    }

    // Subsystems in a grid below
    const subsystemsPerRow = 5;
    const subsystemSpacing = 180;
    const subsystemStartX = 100;
    const subsystemY = 200;

    subsystemNodes.forEach((node, index) => {
      const row = Math.floor(index / subsystemsPerRow);
      const col = index % subsystemsPerRow;
      
      flowNodes.push({
        id: node.id,
        type: 'default',
        data: { 
          label: node.label,
          nodeType: node.type,
          metadata: node.metadata
        },
        position: { 
          x: subsystemStartX + (col * subsystemSpacing), 
          y: subsystemY + (row * 180)
        },
        style: {
          background: '#10b981',
          color: 'white',
          border: '2px solid #059669',
          borderRadius: '6px',
          padding: '12px',
          fontSize: '14px',
          fontWeight: '600',
          width: 150,
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });
    });

    // Components below their subsystems
    componentNodes.forEach((node, index) => {
      flowNodes.push({
        id: node.id,
        type: 'default',
        data: { 
          label: node.label,
          nodeType: node.type,
          metadata: node.metadata
        },
        position: { 
          x: 150 + (index * 200), 
          y: 450
        },
        style: {
          background: '#8b5cf6',
          color: 'white',
          border: '2px solid #7c3aed',
          borderRadius: '4px',
          padding: '8px',
          fontSize: '12px',
          width: 120,
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });
    });

    // Requirements (if any)
    requirementNodes.forEach((node, index) => {
      flowNodes.push({
        id: node.id,
        type: 'default',
        data: { 
          label: node.label,
          nodeType: node.type,
          metadata: node.metadata
        },
        position: { 
          x: 200 + (index * 180), 
          y: 600
        },
        style: {
          background: '#f59e0b',
          color: 'white',
          border: '2px solid #d97706',
          borderRadius: '4px',
          padding: '8px',
          fontSize: '11px',
          width: 140,
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });
    });

    return flowNodes;
  };

  // Convert system edges to React Flow edges
  const convertToFlowEdges = (systemEdges: SystemEdge[]): Edge[] => {
    return systemEdges.map(edge => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: ConnectionLineType.SmoothStep,
      animated: edge.relation === 'INTERFACES',
      label: edge.relation,
      labelStyle: { 
        fontSize: 10, 
        fontWeight: 600,
        fill: '#64748b'
      },
      labelBgStyle: { 
        fill: 'white', 
        fillOpacity: 0.8 
      },
      style: { 
        stroke: edge.relation === 'CONTAINS' ? '#3b82f6' : 
                edge.relation === 'SATISFIES' ? '#f59e0b' : 
                '#10b981',
        strokeWidth: 2
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edge.relation === 'CONTAINS' ? '#3b82f6' : 
               edge.relation === 'SATISFIES' ? '#f59e0b' : 
               '#10b981',
      },
    }));
  };

  // Handle node click
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const systemNode: SystemNode = {
      id: node.id,
      label: node.data.label,
      type: node.data.nodeType,
      metadata: node.data.metadata
    };
    setSelectedNode(systemNode);
    setShowDetails(true);
  }, []);

  // Initial state - no model generated yet
  if (!modelGenerated && !loading && !error) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="border-b border-border p-4 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Network className="w-5 h-5 text-primary" />
                System Model
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Generate a block model from requirements
              </p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Network className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold mb-3">System Model Builder</h3>
            <p className="text-muted-foreground mb-6">
              Generate a hierarchical block model from your requirements. The model will show
              the system, subsystems, components, and their relationships.
            </p>
            <Button onClick={fetchSystemModel} size="lg" className="gap-2">
              <Network className="w-4 h-4" />
              Generate System Model
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              This will analyze requirements and create a block diagram
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="border-b border-border p-4 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Network className="w-5 h-5 text-primary" />
                System Model
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Generating model from requirements...
              </p>
            </div>
          </div>
        </div>

        {/* Loading */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Building system model...</p>
            <p className="text-xs text-muted-foreground mt-2">
              Analyzing requirements and deriving blocks
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="border-b border-border p-4 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Network className="w-5 h-5 text-primary" />
                System Model
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Failed to generate model
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Network className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Failed to Generate System Model</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={fetchSystemModel} variant="outline">
                Try Again
              </Button>
              <Button onClick={() => setError(null)} variant="ghost">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="border-b border-border p-4 bg-card flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Network className="w-5 h-5 text-primary" />
              System Model
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{summary}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={fetchSystemModel} variant="outline" size="sm" className="gap-2">
              <Network className="w-3 h-3" />
              Regenerate Model
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#3b82f6]" />
            <span>System</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#10b981]" />
            <span>Subsystem</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#8b5cf6]" />
            <span>Component</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#f59e0b]" />
            <span>Requirement</span>
          </div>
        </div>
      </div>

      {/* React Flow Graph */}
      <div className="flex-1" style={{ width: '100%', height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{
            type: ConnectionLineType.SmoothStep,
          }}
        >
          <Background />
          <Controls />
        </ReactFlow>

        {/* Node Details Panel */}
        {showDetails && selectedNode && (
          <div className="absolute top-4 right-4 w-80 bg-card border border-border rounded-lg shadow-lg">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Info className="w-4 h-4" />
                Node Details
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">ID</label>
                  <p className="text-sm font-mono mt-1">{selectedNode.id}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Name</label>
                  <p className="text-sm font-semibold mt-1">{selectedNode.label}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <div className="mt-1">
                    <Badge variant="secondary">{selectedNode.type}</Badge>
                  </div>
                </div>
                {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Metadata</label>
                    <div className="mt-2 space-y-2">
                      {Object.entries(selectedNode.metadata).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="font-medium">{key}:</span>{' '}
                          <span className="text-muted-foreground">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
