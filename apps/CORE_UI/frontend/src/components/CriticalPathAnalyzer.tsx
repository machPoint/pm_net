"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  Network,
  Target,
  Zap,
  BarChart3,
  Route,
  GitBranch,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Flame,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRequirementImpact, useBatchRequirementImpact } from "@/hooks/useRequirementImpact";

interface CriticalPathNode {
  id: string;
  name: string;
  type: 'requirement' | 'design' | 'code' | 'test' | 'component' | 'jira' | 'jama';
  criticality: 'DAL-A' | 'DAL-B' | 'DAL-C' | 'DAL-D' | 'DAL-E';
  status: string;
  effort: number; // hours
  duration: number; // days
  earliestStart: number;
  latestStart: number;
  slack: number; // latestStart - earliestStart
  isCritical: boolean;
  dependencies: string[];
  team: string;
  risk: number; // 0-100
}

interface CriticalPath {
  id: string;
  name: string;
  nodes: CriticalPathNode[];
  totalDuration: number;
  totalEffort: number;
  riskScore: number;
  bottlenecks: string[];
  completion: number; // 0-100
}

interface ResourceConstraint {
  team: string;
  capacity: number; // hours per week
  allocation: number; // current allocation %
  bottleneck: boolean;
  workload: Array<{
    week: number;
    hours: number;
    requirements: string[];
  }>;
}

interface CriticalPathAnalyzerProps {
  requirements?: string[];
  className?: string;
}

const CriticalPathAnalyzer: React.FC<CriticalPathAnalyzerProps> = ({
  requirements = [],
  className
}) => {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [showResourceView, setShowResourceView] = useState(false);
  const [timeHorizon, setTimeHorizon] = useState(16); // weeks

  const { data: batchData, loading } = useBatchRequirementImpact(requirements);

  // Generate critical path nodes from impact data
  const pathNodes = useMemo((): CriticalPathNode[] => {
    if (!batchData) return [];

    const allNodes: CriticalPathNode[] = [];

    batchData.forEach(impactData => {
      impactData.impactTree.forEach((node, index) => {
        const effort = Math.floor(Math.random() * 120) + 40; // 40-160 hours
        const duration = Math.ceil(effort / 40); // Assuming 40 hours per week

        const pathNode: CriticalPathNode = {
          id: node.id,
          name: node.name,
          type: node.type,
          criticality: (node.metadata?.criticality || 'DAL-C') as any,
          status: node.status,
          effort,
          duration,
          earliestStart: 0,
          latestStart: 0,
          slack: 0,
          isCritical: false,
          dependencies: node.connections?.map(c => c.target) || [],
          team: getTeamFromType(node.type),
          risk: calculateNodeRisk(node)
        };

        allNodes.push(pathNode);
      });
    });

    // Calculate critical path metrics
    return calculateCriticalPathMetrics(allNodes);
  }, [batchData]);

  // Identify critical paths
  const criticalPaths = useMemo((): CriticalPath[] => {
    if (pathNodes.length === 0) return [];

    const paths: CriticalPath[] = [];

    // Group by primary requirement
    const requirementGroups = pathNodes.reduce((groups, node) => {
      const reqId = requirements.find(req => node.id.includes(req.split('-')[1])) || requirements[0];
      if (!groups[reqId]) groups[reqId] = [];
      groups[reqId].push(node);
      return groups;
    }, {} as Record<string, CriticalPathNode[]>);

    Object.entries(requirementGroups).forEach(([reqId, nodes]) => {
      const criticalNodes = nodes.filter(n => n.isCritical || n.criticality === 'DAL-A');
      const totalDuration = criticalNodes.reduce((sum, n) => sum + n.duration, 0);
      const totalEffort = criticalNodes.reduce((sum, n) => sum + n.effort, 0);
      const riskScore = criticalNodes.length > 0 ? criticalNodes.reduce((sum, n) => sum + n.risk, 0) / criticalNodes.length : 0;
      const bottlenecks = criticalNodes.filter(n => n.slack === 0).map(n => n.id);
      const completion = criticalNodes.length > 0 ? criticalNodes.filter(n => n.status === 'completed' || n.status === 'verified').length / criticalNodes.length * 100 : 0;

      paths.push({
        id: reqId,
        name: `Critical Path: ${reqId}`,
        nodes: criticalNodes.sort((a, b) => a.earliestStart - b.earliestStart),
        totalDuration,
        totalEffort,
        riskScore,
        bottlenecks,
        completion
      });
    });

    return paths.sort((a, b) => b.riskScore - a.riskScore);
  }, [pathNodes, requirements]);

  // Resource constraint analysis
  const resourceConstraints = useMemo((): ResourceConstraint[] => {
    const teams = ['Systems Engineering', 'Design Engineering', 'Software Engineering', 'Test Engineering', 'Hardware Engineering'];

    return teams.map(team => {
      const teamNodes = pathNodes.filter(n => n.team === team);
      const totalEffort = teamNodes.reduce((sum, n) => sum + n.effort, 0);
      const capacity = 40 * 4; // 4 people, 40 hours/week
      const allocation = Math.min(100, (totalEffort / Math.max(1, capacity * timeHorizon)) * 100);

      // Generate workload over time
      const workload = Array.from({ length: timeHorizon }, (_, week) => {
        const weekNodes = teamNodes.filter(n => {
          const startWeek = Math.floor(n.earliestStart / 7);
          const endWeek = startWeek + Math.ceil(n.duration / 7);
          return week >= startWeek && week <= endWeek;
        });

        return {
          week: week + 1,
          hours: Math.min(capacity, weekNodes.reduce((sum, n) => sum + (n.effort / Math.ceil(n.duration / 7)), 0)),
          requirements: weekNodes.map(n => n.id)
        };
      });

      return {
        team,
        capacity,
        allocation,
        bottleneck: allocation > 90,
        workload
      };
    });
  }, [pathNodes, timeHorizon]);

  // Helper functions
  function getTeamFromType(type: string): string {
    switch (type) {
      case 'requirement': return 'Systems Engineering';
      case 'design': case 'jama': return 'Design Engineering';
      case 'code': case 'jira': return 'Software Engineering';
      case 'test': return 'Test Engineering';
      case 'component': return 'Hardware Engineering';
      default: return 'Cross-functional';
    }
  }

  function calculateNodeRisk(node: any): number {
    let risk = 0;

    // Criticality risk
    if (node.metadata?.criticality === 'DAL-A') risk += 40;
    else if (node.metadata?.criticality === 'DAL-B') risk += 30;
    else if (node.metadata?.criticality === 'DAL-C') risk += 20;

    // Status risk
    if (node.status === 'pending') risk += 20;
    else if (node.status === 'failed') risk += 30;
    else if (node.status === 'verified') risk -= 10;

    // Connection complexity risk
    risk += Math.min(20, (node.connections?.length || 0) * 3);

    return Math.max(0, Math.min(100, risk));
  }

  function calculateCriticalPathMetrics(nodes: CriticalPathNode[]): CriticalPathNode[] {
    // Simple critical path calculation (forward and backward pass)
    const updatedNodes = [...nodes];

    // Forward pass - calculate earliest start times
    const calculateEarliestStart = (nodeId: string, visited = new Set()): number => {
      if (visited.has(nodeId)) return 0; // Avoid cycles
      visited.add(nodeId);

      const node = updatedNodes.find(n => n.id === nodeId);
      if (!node) return 0;

      if (node.dependencies.length === 0) {
        node.earliestStart = 0;
        return 0;
      }

      const maxPrereqFinish = Math.max(
        ...node.dependencies.map(depId => {
          const depNode = updatedNodes.find(n => n.id === depId);
          if (!depNode) return 0;
          const depStart = calculateEarliestStart(depId, new Set(visited));
          return depStart + depNode.duration;
        })
      );

      node.earliestStart = maxPrereqFinish;
      return maxPrereqFinish;
    };

    updatedNodes.forEach(node => {
      calculateEarliestStart(node.id);
    });

    // Backward pass - calculate latest start times
    const projectDuration = Math.max(...updatedNodes.map(n => n.earliestStart + n.duration));

    const calculateLatestStart = (nodeId: string, visited = new Set()): number => {
      if (visited.has(nodeId)) return projectDuration; // Avoid cycles
      visited.add(nodeId);

      const node = updatedNodes.find(n => n.id === nodeId);
      if (!node) return projectDuration;

      const dependents = updatedNodes.filter(n => n.dependencies.includes(nodeId));

      if (dependents.length === 0) {
        node.latestStart = projectDuration - node.duration;
        return node.latestStart;
      }

      const minSuccessorStart = Math.min(
        ...dependents.map(depNode => calculateLatestStart(depNode.id, new Set(visited)))
      );

      node.latestStart = minSuccessorStart - node.duration;
      return node.latestStart;
    };

    updatedNodes.forEach(node => {
      calculateLatestStart(node.id);
      node.slack = node.latestStart - node.earliestStart;
      node.isCritical = node.slack <= 1; // 1 day tolerance
    });

    return updatedNodes;
  }

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'DAL-A': return 'bg-red-100 text-red-800 border-red-200';
      case 'DAL-B': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'DAL-C': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DAL-D': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DAL-E': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskColor = (risk: number) => {
    if (risk >= 80) return 'text-red-600';
    if (risk >= 60) return 'text-orange-600';
    if (risk >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Route className="w-6 h-6 animate-pulse" />
            <span>Analyzing critical paths...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Route className="w-5 h-5 text-blue-500" />
              Critical Path Analysis
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant={showResourceView ? "default" : "outline"}
                size="sm"
                onClick={() => setShowResourceView(!showResourceView)}
              >
                <Users className="w-4 h-4 mr-1" />
                {showResourceView ? "Path View" : "Resource View"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{criticalPaths.length}</div>
              <div className="text-sm text-muted-foreground">Critical Paths</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {criticalPaths.reduce((sum, p) => sum + p.bottlenecks.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Bottlenecks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.max(...criticalPaths.map(p => p.totalDuration), 0)} days
              </div>
              <div className="text-sm text-muted-foreground">Longest Path</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.floor(criticalPaths.reduce((sum, p) => sum + p.riskScore, 0) / (criticalPaths.length || 1))}
              </div>
              <div className="text-sm text-muted-foreground">Avg Risk Score</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showResourceView ? (
        /* Resource Constraint View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Capacity Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {resourceConstraints.map((resource) => (
                <div key={resource.team} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{resource.team}</span>
                      {resource.bottleneck && (
                        <Badge className="bg-red-100 text-red-800 border-red-200">
                          <Flame className="w-3 h-3 mr-1" />
                          Bottleneck
                        </Badge>
                      )}
                    </div>
                    <span className={cn(
                      "text-sm font-medium",
                      resource.allocation > 100 ? 'text-red-600' :
                        resource.allocation > 80 ? 'text-orange-600' : 'text-green-600'
                    )}>
                      {Math.floor(resource.allocation)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, resource.allocation)}
                    className="h-2"
                  />
                  <div className="text-xs text-muted-foreground">
                    Capacity: {resource.capacity}h/week |
                    Peak: {Math.max(...resource.workload.map(w => w.hours))}h
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Resource Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {resourceConstraints.filter(r => r.bottleneck).slice(0, 2).map((resource) => (
                  <div key={resource.team} className="space-y-2">
                    <div className="text-sm font-medium">{resource.team}</div>
                    <div className="grid grid-cols-8 gap-1">
                      {resource.workload.slice(0, 8).map((week) => (
                        <div
                          key={week.week}
                          className={cn(
                            "h-6 rounded text-xs flex items-center justify-center text-white font-medium",
                            week.hours > resource.capacity * 0.9 ? 'bg-red-500' :
                              week.hours > resource.capacity * 0.7 ? 'bg-orange-500' :
                                week.hours > resource.capacity * 0.5 ? 'bg-yellow-500' : 'bg-green-500'
                          )}
                          title={`Week ${week.week}: ${Math.floor(week.hours)}h`}
                        >
                          W{week.week}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Critical Path View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Critical Paths
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {criticalPaths.map((path) => (
                <div
                  key={path.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedPath === path.id ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:bg-muted/50'
                  )}
                  onClick={() => setSelectedPath(path.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{path.name}</h4>
                    <div className="flex items-center gap-1">
                      {path.bottlenecks.length > 0 && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                      <Badge className={cn(
                        "text-xs",
                        path.riskScore >= 80 ? 'bg-red-100 text-red-800 border-red-200' :
                          path.riskScore >= 60 ? 'bg-orange-100 text-orange-800 border-orange-200' :
                            'bg-green-100 text-green-800 border-green-200'
                      )}>
                        Risk: {Math.floor(path.riskScore)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Duration: </span>
                      <span className="font-medium">{path.totalDuration} days</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Effort: </span>
                      <span className="font-medium">{path.totalEffort}h</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Progress: </span>
                      <span className="font-medium">{Math.floor(path.completion)}%</span>
                    </div>
                  </div>

                  <Progress value={path.completion} className="mt-2 h-1" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5" />
                Path Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPath ? (
                <div className="space-y-4">
                  {(() => {
                    const path = criticalPaths.find(p => p.id === selectedPath);
                    if (!path) return <div>Path not found</div>;

                    return (
                      <>
                        <div>
                          <h4 className="font-medium mb-2">{path.name}</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Total Duration:</span>
                              <span className="ml-2 font-medium">{path.totalDuration} days</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Total Effort:</span>
                              <span className="ml-2 font-medium">{path.totalEffort} hours</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-sm mb-2">Critical Nodes</h5>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {path.nodes.slice(0, 6).map((node, index) => (
                              <div key={node.id} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                                <div className="flex items-center gap-1">
                                  {node.isCritical && <Flame className="w-3 h-3 text-red-500" />}
                                  <Badge variant="outline" className="text-xs">
                                    {node.type}
                                  </Badge>
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-xs">{node.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {node.duration} days | {node.team}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs font-medium">
                                    Slack: {node.slack} days
                                  </div>
                                  <Badge className={getCriticalityColor(node.criticality)}>
                                    {node.criticality}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {path.bottlenecks.length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm mb-2 flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                              Bottlenecks
                            </h5>
                            <div className="space-y-1">
                              {path.bottlenecks.map((bottleneckId) => {
                                const node = path.nodes.find(n => n.id === bottleneckId);
                                return node ? (
                                  <div key={bottleneckId} className="text-xs text-red-700 bg-red-50 p-2 rounded">
                                    {node.name} - Zero slack
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Network className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Select a critical path to see details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CriticalPathAnalyzer;