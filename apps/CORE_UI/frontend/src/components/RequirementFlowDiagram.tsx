"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText,
  GitBranch,
  CheckCircle,
  Cpu,
  Award,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Activity,
  Target,
  AlertTriangle,
  Info
} from "lucide-react";

interface FlowNode {
  id: string;
  name: string;
  type: 'requirement' | 'design' | 'code' | 'test' | 'component' | 'jira' | 'jama';
  status: string;
  position: { x: number; y: number };
  metadata: {
    owner?: string;
    source?: string;
    priority?: string;
    lastUpdated?: string;
  };
  connections: string[];
}

interface FlowConnection {
  id: string;
  from: string;
  to: string;
  type: 'traces_to' | 'verified_by' | 'implemented_by' | 'tested_by' | 'depends_on';
  animated?: boolean;
}

interface RequirementFlowDiagramProps {
  nodes: FlowNode[];
  connections: FlowConnection[];
  centerNodeId?: string;
  className?: string;
  showAnimation?: boolean;
  onNodeClick?: (node: FlowNode) => void;
  onConnectionClick?: (connection: FlowConnection) => void;
}

const RequirementFlowDiagram: React.FC<RequirementFlowDiagramProps> = ({
  nodes = [],
  connections = [],
  centerNodeId,
  className,
  showAnimation = true,
  onNodeClick,
  onConnectionClick,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Auto-layout nodes if positions aren't provided
  useEffect(() => {
    if (nodes.length === 0) return;

    const needsLayout = nodes.some(node => !node.position);
    if (!needsLayout) return;

    // Simple circular layout around center node
    const centerNode = centerNodeId ? nodes.find(n => n.id === centerNodeId) : nodes[0];
    if (!centerNode) return;

    const centerX = 400;
    const centerY = 300;
    const radius = 200;
    const otherNodes = nodes.filter(n => n.id !== centerNode.id);

    // Position center node
    centerNode.position = { x: centerX, y: centerY };

    // Position other nodes in a circle
    otherNodes.forEach((node, index) => {
      const angle = (index / otherNodes.length) * 2 * Math.PI;
      node.position = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    });
  }, [nodes, centerNodeId]);

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'requirement': return FileText;
      case 'design': return FileText;
      case 'code': return GitBranch;
      case 'test': return CheckCircle;
      case 'component': return Cpu;
      case 'jama': return FileText;
      case 'jira': return Target;
      default: return FileText;
    }
  };

  const getNodeColor = (type: string, status: string) => {
    const colorMap = {
      requirement: "bg-blue-100 border-blue-300 text-blue-800",
      design: "bg-purple-100 border-purple-300 text-purple-800", 
      code: "bg-green-100 border-green-300 text-green-800",
      test: "bg-orange-100 border-orange-300 text-orange-800",
      component: "bg-gray-100 border-gray-300 text-gray-800",
      jama: "bg-indigo-100 border-indigo-300 text-indigo-800",
      jira: "bg-red-100 border-red-300 text-red-800",
    };
    
    const baseColor = colorMap[type as keyof typeof colorMap] || colorMap.requirement;
    
    if (status === 'completed' || status === 'verified' || status === 'passed') {
      return baseColor + " ring-2 ring-green-400";
    }
    if (status === 'failed' || status === 'error') {
      return baseColor + " ring-2 ring-red-400";
    }
    if (status === 'pending' || status === 'analyzing') {
      return baseColor + " ring-2 ring-yellow-400";
    }
    
    return baseColor;
  };

  const getConnectionColor = (type: string) => {
    switch (type) {
      case 'traces_to': return '#3b82f6'; // blue
      case 'verified_by': return '#10b981'; // green
      case 'implemented_by': return '#f59e0b'; // amber
      case 'tested_by': return '#ef4444'; // red
      case 'depends_on': return '#8b5cf6'; // purple
      default: return '#6b7280'; // gray
    }
  };

  const handleNodeClick = (node: FlowNode) => {
    setSelectedNode(node.id === selectedNode ? null : node.id);
    onNodeClick?.(node);
  };

  const playAnimation = () => {
    setIsPlaying(true);
    setCurrentStep(0);
    
    // Animate through connections
    const animationInterval = setInterval(() => {
      setCurrentStep((step) => {
        if (step >= connections.length) {
          setIsPlaying(false);
          clearInterval(animationInterval);
          return 0;
        }
        return step + 1;
      });
    }, 1000);
  };

  const resetAnimation = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  // Calculate SVG viewBox based on node positions
  const bounds = nodes.reduce(
    (acc, node) => {
      if (!node.position) return acc;
      return {
        minX: Math.min(acc.minX, node.position.x - 60),
        maxX: Math.max(acc.maxX, node.position.x + 60),
        minY: Math.min(acc.minY, node.position.y - 30),
        maxY: Math.max(acc.maxY, node.position.y + 30),
      };
    },
    { minX: 0, maxX: 800, minY: 0, maxY: 600 }
  );

  const viewBox = `${bounds.minX} ${bounds.minY} ${bounds.maxX - bounds.minX} ${bounds.maxY - bounds.minY}`;

  return (
    <TooltipProvider>
      <div className={cn("relative bg-card rounded-lg border", className)}>
        {/* Control Panel */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={isPlaying ? () => setIsPlaying(false) : playAnimation}
            className="bg-background/80 backdrop-blur"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-3 h-3 mr-1" />
                Animate
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={resetAnimation}
            className="bg-background/80 backdrop-blur"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>

        {/* Legend */}
        <div className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur rounded-lg border p-3">
          <h4 className="text-xs font-medium mb-2">Legend</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>Traces To</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Verified By</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span>Implemented By</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>Tested By</span>
            </div>
          </div>
        </div>

        {/* Flow Diagram */}
        <div className="p-6 pt-16">
          <svg
            ref={svgRef}
            viewBox={viewBox}
            className="w-full h-[600px] border border-border rounded"
            style={{ background: 'radial-gradient(circle at center, #f8fafc 0%, #f1f5f9 100%)' }}
          >
            {/* Definitions for animations and arrows */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#6b7280"
                />
              </marker>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Connections */}
            {connections.map((connection, index) => {
              const fromNode = nodes.find(n => n.id === connection.from);
              const toNode = nodes.find(n => n.id === connection.to);
              
              if (!fromNode?.position || !toNode?.position) return null;

              const isAnimated = showAnimation && isPlaying && index < currentStep;
              const isSelected = selectedNode === connection.from || selectedNode === connection.to;
              
              return (
                <g key={connection.id}>
                  <line
                    x1={fromNode.position.x}
                    y1={fromNode.position.y}
                    x2={toNode.position.x}
                    y2={toNode.position.y}
                    stroke={getConnectionColor(connection.type)}
                    strokeWidth={isSelected ? "3" : "2"}
                    markerEnd="url(#arrowhead)"
                    className={cn(
                      "transition-all duration-300 cursor-pointer hover:stroke-[3]",
                      isAnimated && "animate-pulse filter: url(#glow)"
                    )}
                    onClick={() => onConnectionClick?.(connection)}
                  />
                  
                  {/* Connection label */}
                  {isSelected && (
                    <text
                      x={(fromNode.position.x + toNode.position.x) / 2}
                      y={(fromNode.position.y + toNode.position.y) / 2 - 5}
                      textAnchor="middle"
                      className="text-xs fill-muted-foreground"
                    >
                      {connection.type.replace('_', ' ')}
                    </text>
                  )}
                  
                  {/* Animation indicator */}
                  {isAnimated && (
                    <circle
                      r="4"
                      fill={getConnectionColor(connection.type)}
                      className="animate-pulse"
                    >
                      <animateMotion
                        dur="2s"
                        repeatCount="indefinite"
                        path={`M${fromNode.position.x},${fromNode.position.y} L${toNode.position.x},${toNode.position.y}`}
                      />
                    </circle>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              if (!node.position) return null;
              
              const Icon = getNodeIcon(node.type);
              const isHovered = hoveredNode === node.id;
              const isSelected = selectedNode === node.id;
              const isCenterNode = centerNodeId === node.id;
              
              return (
                <Tooltip key={node.id}>
                  <TooltipTrigger>
                    <g
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      onClick={() => handleNodeClick(node)}
                      transform={`translate(${node.position.x - 50}, ${node.position.y - 20})`}
                    >
                      {/* Node background */}
                      <rect
                        width="100"
                        height="40"
                        rx="8"
                        className={cn(
                          "fill-current transition-all duration-200",
                          getNodeColor(node.type, node.status),
                          isHovered && "brightness-110 scale-105",
                          isSelected && "ring-2 ring-primary",
                          isCenterNode && "ring-2 ring-blue-500"
                        )}
                      />
                      
                      {/* Node icon */}
                      <foreignObject x="8" y="12" width="16" height="16">
                        <Icon className="w-4 h-4" />
                      </foreignObject>
                      
                      {/* Node title */}
                      <text
                        x="28"
                        y="26"
                        className="text-xs font-medium fill-current"
                        textLength="65"
                        lengthAdjust="spacingAndGlyphs"
                      >
                        {node.name}
                      </text>
                      
                      {/* Status indicator */}
                      <circle
                        cx="85"
                        cy="12"
                        r="3"
                        className={cn(
                          "fill-current",
                          node.status === 'completed' || node.status === 'verified' ? "text-green-500" :
                          node.status === 'failed' ? "text-red-500" :
                          node.status === 'pending' ? "text-yellow-500" :
                          "text-blue-500"
                        )}
                      />
                      
                      {/* Pulse animation for center node */}
                      {isCenterNode && (
                        <rect
                          width="100"
                          height="40"
                          rx="8"
                          className="fill-none stroke-blue-500 stroke-2 animate-ping opacity-30"
                        />
                      )}
                    </g>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <div className="font-medium">{node.name}</div>
                      <div className="text-xs text-muted-foreground">
                        <div>Type: {node.type}</div>
                        <div>Status: {node.status}</div>
                        {node.metadata.owner && <div>Owner: {node.metadata.owner}</div>}
                        {node.metadata.source && <div>Source: {node.metadata.source}</div>}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </svg>
        </div>

        {/* Selected Node Details */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur border rounded-lg p-4">
            {(() => {
              const node = nodes.find(n => n.id === selectedNode);
              if (!node) return null;
              
              const Icon = getNodeIcon(node.type);
              const connectedNodes = connections
                .filter(c => c.from === node.id || c.to === node.id)
                .map(c => c.from === node.id ? c.to : c.from)
                .map(id => nodes.find(n => n.id === id))
                .filter(Boolean);
              
              return (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <Icon className="w-5 h-5" />
                    <div>
                      <h4 className="font-medium">{node.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{node.type}</Badge>
                        <Badge variant="outline" className="text-xs">{node.status}</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Owner:</span>
                      <span className="ml-2">{node.metadata.owner || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Source:</span>
                      <span className="ml-2">{node.metadata.source || 'N/A'}</span>
                    </div>
                  </div>
                  
                  {connectedNodes.length > 0 && (
                    <div className="mt-3">
                      <span className="text-sm text-muted-foreground">Connected to:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {connectedNodes.slice(0, 5).map((connectedNode, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {connectedNode?.name}
                          </Badge>
                        ))}
                        {connectedNodes.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{connectedNodes.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Empty State */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Activity className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No Flow Data</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Select a requirement to visualize its impact flow
              </p>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default RequirementFlowDiagram;