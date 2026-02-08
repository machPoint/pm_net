"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Network,
  Zap,
  FileText,
  GitBranch,
  TestTube,
  Cpu,
  Download,
  RefreshCw,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RequirementAnalytics {
  totalArtifacts: number;
  coveragePercentage: number;
  testCoverage: number;
  designCoverage: number;
  implementationCoverage: number;
  traceabilityScore: number;
}

interface RequirementNode {
  id: string;
  name: string;
  type: 'requirement' | 'design' | 'code' | 'test' | 'component' | 'jira' | 'jama';
  status: string;
  metadata: Record<string, any>;
  connections: Array<{ id: string; type: string; target: string }>;
}

interface RequirementImpactAnalyticsProps {
  analytics: RequirementAnalytics;
  impactTree: RequirementNode[];
  requirementTitle: string;
  className?: string;
  onExport?: () => void;
  onRefresh?: () => void;
}

const RequirementImpactAnalytics: React.FC<RequirementImpactAnalyticsProps> = ({
  analytics,
  impactTree,
  requirementTitle,
  className,
  onExport,
  onRefresh,
}) => {
  // Compute detailed metrics from impact tree
  const detailedMetrics = useMemo(() => {
    const byType = impactTree.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = impactTree.reduce((acc, node) => {
      const status = node.status.toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalConnections = impactTree.reduce((acc, node) => {
      return acc + (node.connections?.length || 0);
    }, 0);

    const avgConnectionsPerNode = impactTree.length > 0 ? (totalConnections / impactTree.length).toFixed(1) : '0';

    // Calculate coverage gaps
    const missingTypes: string[] = [];
    if ((byType.design || 0) === 0 && (byType.jama || 0) === 0) missingTypes.push('Design');
    if ((byType.code || 0) === 0 && (byType.jira || 0) === 0) missingTypes.push('Implementation');
    if ((byType.test || 0) === 0) missingTypes.push('Testing');

    return {
      byType,
      byStatus,
      totalConnections,
      avgConnectionsPerNode,
      missingTypes,
    };
  }, [impactTree]);

  const getCoverageLevel = (percentage: number): { level: string; color: string; icon: React.ElementType } => {
    if (percentage >= 90) return { level: 'Excellent', color: 'text-green-600', icon: CheckCircle };
    if (percentage >= 75) return { level: 'Good', color: 'text-blue-600', icon: Target };
    if (percentage >= 50) return { level: 'Fair', color: 'text-yellow-600', icon: Clock };
    return { level: 'Poor', color: 'text-red-600', icon: AlertTriangle };
  };

  const getTraceabilityRecommendations = (): Array<{ type: 'success' | 'warning' | 'error'; message: string }> => {
    const recommendations = [];

    if (analytics.testCoverage < 80) {
      recommendations.push({
        type: 'warning' as const,
        message: 'Consider adding more test cases to improve verification coverage'
      });
    }

    if (analytics.designCoverage < 70) {
      recommendations.push({
        type: 'error' as const,
        message: 'Missing design artifacts - ensure requirement is properly documented'
      });
    }

    if (analytics.implementationCoverage < 60) {
      recommendations.push({
        type: 'error' as const,
        message: 'Implementation artifacts are missing or not linked to requirement'
      });
    }

    if (analytics.traceabilityScore >= 85) {
      recommendations.push({
        type: 'success' as const,
        message: 'Excellent traceability - requirement is well connected across lifecycle'
      });
    }

    if (detailedMetrics.missingTypes.length > 0) {
      recommendations.push({
        type: 'warning' as const,
        message: `Missing artifact types: ${detailedMetrics.missingTypes.join(', ')}`
      });
    }

    return recommendations;
  };

  const typeIcons = {
    requirement: FileText,
    design: FileText,
    code: GitBranch,
    test: TestTube,
    component: Cpu,
    jama: FileText,
    jira: Target,
  };

  const statusColors = {
    active: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    verified: 'bg-emerald-100 text-emerald-800',
    failed: 'bg-red-100 text-red-800',
    analyzing: 'bg-purple-100 text-purple-800',
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Impact Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Coverage and traceability analysis for: {requirementTitle}
          </p>
        </div>
        <div className="flex gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          )}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Network className="w-4 h-4 text-blue-500" />
              Total Artifacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalArtifacts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {parseFloat(detailedMetrics.avgConnectionsPerNode)} avg connections/node
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-green-500" />
              Overall Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.coveragePercentage}%</div>
            <Progress value={analytics.coveragePercentage} className="mt-2 h-2" />
            <p className={cn("text-xs mt-1", getCoverageLevel(analytics.coveragePercentage).color)}>
              {getCoverageLevel(analytics.coveragePercentage).level}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              Traceability Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.traceabilityScore}%</div>
            <Progress value={analytics.traceabilityScore} className="mt-2 h-2" />
            <p className={cn("text-xs mt-1", getCoverageLevel(analytics.traceabilityScore).color)}>
              {getCoverageLevel(analytics.traceabilityScore).level}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((analytics.coveragePercentage + analytics.traceabilityScore) / 2)}%
            </div>
            <div className="flex items-center gap-1 mt-2">
              {detailedMetrics.missingTypes.length === 0 ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-yellow-500" />
              )}
              <p className="text-xs text-muted-foreground">
                {detailedMetrics.missingTypes.length === 0 ? 'Complete' : `${detailedMetrics.missingTypes.length} gaps`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="coverage" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
          <TabsTrigger value="recommendations">Insights</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="coverage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coverage Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <TestTube className="w-4 h-4" />
                    Test Coverage
                  </span>
                  <div className="flex items-center gap-2">
                    <Progress value={analytics.testCoverage} className="w-32 h-2" />
                    <span className="text-sm font-medium w-12">{analytics.testCoverage}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Design Coverage
                  </span>
                  <div className="flex items-center gap-2">
                    <Progress value={analytics.designCoverage} className="w-32 h-2" />
                    <span className="text-sm font-medium w-12">{analytics.designCoverage}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    Implementation Coverage
                  </span>
                  <div className="flex items-center gap-2">
                    <Progress value={analytics.implementationCoverage} className="w-32 h-2" />
                    <span className="text-sm font-medium w-12">{analytics.implementationCoverage}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="artifacts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Artifact Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(detailedMetrics.byType).map(([type, count]) => {
                  const Icon = typeIcons[type as keyof typeof typeIcons] || FileText;
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2 capitalize">
                        <Icon className="w-4 h-4" />
                        {type}
                      </span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(detailedMetrics.byStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{status}</span>
                    <Badge 
                      className={cn(
                        "text-xs",
                        statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
                      )}
                    >
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getTraceabilityRecommendations().map((rec, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border-l-4",
                      rec.type === 'success' && "bg-green-50 border-l-green-500",
                      rec.type === 'warning' && "bg-yellow-50 border-l-yellow-500",
                      rec.type === 'error' && "bg-red-50 border-l-red-500"
                    )}
                  >
                    {rec.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />}
                    {rec.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />}
                    {rec.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />}
                    <div className="text-sm">{rec.message}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button variant="outline" size="sm" className="justify-start">
                  <TestTube className="w-4 h-4 mr-2" />
                  Add Test Cases
                </Button>
                <Button variant="outline" size="sm" className="justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Link Design Docs
                </Button>
                <Button variant="outline" size="sm" className="justify-start">
                  <GitBranch className="w-4 h-4 mr-2" />
                  Connect Code
                </Button>
                <Button variant="outline" size="sm" className="justify-start">
                  <Target className="w-4 h-4 mr-2" />
                  Create Jira Issue
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {impactTree.slice(0, 5).map((node, index) => (
                  <div key={node.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{node.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {node.metadata.lastUpdated || node.metadata.modifiedDate || 'Recently updated'}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {node.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RequirementImpactAnalytics;