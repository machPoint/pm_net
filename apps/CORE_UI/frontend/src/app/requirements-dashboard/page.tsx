"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Network,
  BarChart3,
  Zap,
  RefreshCw,
  Download,
  Settings,
  Search,
  Filter,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

import TraceImpactSection from "@/components/TraceImpactSection";
import RequirementFlowDiagram from "@/components/RequirementFlowDiagram";
import RequirementImpactAnalytics from "@/components/RequirementImpactAnalytics";
import AdvancedImpactAnalysis from "@/components/AdvancedImpactAnalysis";
import CriticalPathAnalyzer from "@/components/CriticalPathAnalyzer";
import { useRequirementImpact, useBatchRequirementImpact } from "@/hooks/useRequirementImpact";

// Mock data for dashboard overview
const mockDashboardStats = {
  totalRequirements: 1247,
  tracedRequirements: 1089,
  verifiedRequirements: 945,
  riskyCoverage: 34,
  traceabilityScore: 87.4,
  recentChanges: 23,
};

const mockRecentRequirements = [
  {
    id: "REQ-FCS-001",
    title: "Flight Control System Authority",
    status: "verified",
    criticality: "DAL-A",
    lastUpdated: "2 hours ago",
    coverageScore: 94
  },
  {
    id: "REQ-NAV-002",
    title: "Navigation System Integration", 
    status: "active",
    criticality: "DAL-B",
    lastUpdated: "4 hours ago",
    coverageScore: 78
  },
  {
    id: "REQ-HYD-003",
    title: "Hydraulic Pressure Control",
    status: "pending",
    criticality: "DAL-A", 
    lastUpdated: "6 hours ago",
    coverageScore: 65
  },
  {
    id: "REQ-ECS-004",
    title: "Environmental Control System",
    status: "active",
    criticality: "DAL-C",
    lastUpdated: "1 day ago",
    coverageScore: 82
  },
  {
    id: "REQ-COM-005",
    title: "Communication System Requirements",
    status: "verified",
    criticality: "DAL-B",
    lastUpdated: "2 days ago",
    coverageScore: 91
  }
];

const mockHighRiskRequirements = [
  {
    id: "REQ-PWR-001",
    title: "Primary Power Distribution",
    issues: ["Missing test coverage", "No implementation link"],
    severity: "critical"
  },
  {
    id: "REQ-FMS-002", 
    title: "Flight Management System Core",
    issues: ["Outdated design docs", "Incomplete verification"],
    severity: "high"
  },
  {
    id: "REQ-ICE-003",
    title: "Ice Protection System",
    issues: ["Low traceability score"],
    severity: "medium"
  }
];

export default function RequirementsDashboard() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedRequirement, setSelectedRequirement] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCriticality, setFilterCriticality] = useState("all");

  // Hooks for impact analysis
  const { data: impactData, loading: impactLoading, refetch } = useRequirementImpact(selectedRequirement);
  const { data: batchData, loading: batchLoading, summary } = useBatchRequirementImpact(mockRecentRequirements.slice(0, 3).map(r => r.id));

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case "DAL-A": return "bg-red-100 text-red-800 border-red-200";
      case "DAL-B": return "bg-orange-100 text-orange-800 border-orange-200";
      case "DAL-C": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "DAL-D": return "bg-blue-100 text-blue-800 border-blue-200";
      case "DAL-E": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified": return "bg-green-100 text-green-800";
      case "active": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "text-red-600";
      case "high": return "text-orange-600";
      case "medium": return "text-yellow-600";
      case "low": return "text-green-600";
      default: return "text-gray-600";
    }
  };

  const filteredRequirements = mockRecentRequirements.filter(req => {
    const matchesSearch = req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         req.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCriticality = filterCriticality === "all" || req.criticality === filterCriticality;
    return matchesSearch && matchesCriticality;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">GOES-R Requirements Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive impact analysis and traceability for aerospace requirements
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-1" />
              Settings
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button size="sm">
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="impact-analysis">Impact Analysis</TabsTrigger>
            <TabsTrigger value="advanced-analysis">Advanced Analysis</TabsTrigger>
            <TabsTrigger value="critical-path">Critical Path</TabsTrigger>
            <TabsTrigger value="flow-diagram">Flow Diagram</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    Total Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockDashboardStats.totalRequirements.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Network className="w-4 h-4 text-green-500" />
                    Traced
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockDashboardStats.tracedRequirements.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((mockDashboardStats.tracedRequirements / mockDashboardStats.totalRequirements) * 100)}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Verified
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockDashboardStats.verifiedRequirements.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((mockDashboardStats.verifiedRequirements / mockDashboardStats.totalRequirements) * 100)}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    At Risk
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockDashboardStats.riskyCoverage}</div>
                  <p className="text-xs text-muted-foreground mt-1">Low coverage</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-500" />
                    Traceability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockDashboardStats.traceabilityScore}%</div>
                  <p className="text-xs text-green-600 mt-1">Excellent</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    Recent Changes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockDashboardStats.recentChanges}</div>
                  <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Requirements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Recent Requirements</span>
                    <Button variant="outline" size="sm">View All</Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockRecentRequirements.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedRequirement(req.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm">{req.id}</span>
                            <Badge className={getCriticalityColor(req.criticality)}>
                              {req.criticality}
                            </Badge>
                            <Badge className={getStatusColor(req.status)}>
                              {req.status}
                            </Badge>
                          </div>
                          <h4 className="font-medium text-sm">{req.title}</h4>
                          <p className="text-xs text-muted-foreground">{req.lastUpdated}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{req.coverageScore}%</div>
                          <div className="text-xs text-muted-foreground">Coverage</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* High Risk Requirements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      High Risk Requirements
                    </span>
                    <Button variant="outline" size="sm">Resolve</Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockHighRiskRequirements.map((req, index) => (
                      <div key={req.id} className="p-3 rounded-lg border border-red-200 bg-red-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-sm">{req.id}</span>
                          <Badge className={`text-xs ${getSeverityColor(req.severity)}`}>
                            {req.severity}
                          </Badge>
                        </div>
                        <h4 className="font-medium text-sm mb-2">{req.title}</h4>
                        <div className="space-y-1">
                          {req.issues.map((issue, issueIndex) => (
                            <div key={issueIndex} className="text-xs text-red-700 flex items-center gap-1">
                              <div className="w-1 h-1 rounded-full bg-red-500"></div>
                              {issue}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Batch Analysis Summary */}
            {batchData && summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Batch Analysis Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{summary.total}</div>
                      <div className="text-sm text-muted-foreground">Total Analyzed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{summary.successful}</div>
                      <div className="text-sm text-muted-foreground">Successful</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {batchData.slice(0, 3).map((result, index) => (
                      <div key={index} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                        <span>{result.requirement.name}</span>
                        <div className="flex items-center gap-2">
                          <span>{result.analytics.totalArtifacts} artifacts</span>
                          <Badge variant="outline">{result.analytics.coveragePercentage}% coverage</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Impact Analysis Tab */}
          <TabsContent value="impact-analysis">
            <TraceImpactSection />
          </TabsContent>

          {/* Advanced Analysis Tab */}
          <TabsContent value="advanced-analysis" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Impact Analysis</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Cascading impact analysis, risk assessment, coverage heat maps, and impact simulation
                </p>
              </CardHeader>
              <CardContent>
                <AdvancedImpactAnalysis
                  selectedRequirement={selectedRequirement}
                  onRequirementSelect={setSelectedRequirement}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Critical Path Tab */}
          <TabsContent value="critical-path" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Critical Path Analysis</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Identify bottlenecks, critical paths, and resource constraints in your requirements flow
                </p>
              </CardHeader>
              <CardContent>
                <CriticalPathAnalyzer
                  requirements={mockRecentRequirements.slice(0, 3).map(r => r.id)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Flow Diagram Tab */}
          <TabsContent value="flow-diagram" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Requirement Flow Visualization</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Interactive flow diagram showing requirement relationships and dependencies
                </p>
              </CardHeader>
              <CardContent>
                {impactData ? (
                  <RequirementFlowDiagram
                    nodes={impactData.impactTree.map(node => ({
                      id: node.id,
                      name: node.name,
                      type: node.type,
                      status: node.status,
                      position: { x: 0, y: 0 }, // Auto-layout will handle positioning
                      metadata: node.metadata,
                      connections: node.connections.map(c => c.target),
                    }))}
                    connections={impactData.impactTree.flatMap(node =>
                      (node.connections || []).map(conn => ({
                        id: conn.id,
                        from: node.id,
                        to: conn.target,
                        type: conn.type,
                      }))
                    )}
                    centerNodeId={selectedRequirement || undefined}
                    className="h-[600px]"
                  />
                ) : (
                  <div className="h-[600px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Network className="w-16 h-16 mx-auto mb-4" />
                      <p>Select a requirement from the Impact Analysis tab to view its flow diagram</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {impactData ? (
              <RequirementImpactAnalytics
                analytics={impactData.analytics}
                impactTree={impactData.impactTree}
                requirementTitle={impactData.requirement.name}
                onRefresh={() => refetch()}
                onExport={() => console.log('Exporting analytics...')}
              />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-[400px]">
                  <div className="text-center">
                    <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground">No Analytics Data</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select a requirement from the Impact Analysis tab to view detailed analytics
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}