"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  TrendingUp,
  Target,
  Zap,
  Network,
  Activity,
  BarChart3,
  Layers,
  GitBranch,
  Clock,
  Shield,
  Cpu,
  TestTube,
  FileText,
  Users,
  Calendar,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Flame,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRequirementImpact } from "@/hooks/useRequirementImpact";

// Advanced impact analysis interfaces
interface ImpactAnalysisNode {
  id: string;
  name: string;
  type: 'requirement' | 'design' | 'code' | 'test' | 'component' | 'jira' | 'jama';
  criticality: 'DAL-A' | 'DAL-B' | 'DAL-C' | 'DAL-D' | 'DAL-E';
  status: string;
  impactScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  changeFrequency: number; // Changes per month
  dependencies: string[];
  dependents: string[];
  coverage: {
    design: number;
    implementation: number;
    testing: number;
    verification: number;
  };
  metadata: {
    owner: string;
    team: string;
    lastModified: string;
    effort: number; // hours
    cost: number; // dollars
  };
}

interface CascadingImpact {
  nodeId: string;
  level: number;
  impactType: 'direct' | 'indirect' | 'ripple';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  estimatedEffort: number;
  confidence: number; // 0-1
}

interface RiskAssessment {
  requirementId: string;
  riskFactors: Array<{
    factor: string;
    score: number;
    description: string;
    mitigation: string;
  }>;
  overallRisk: number;
  recommendation: string;
  timeline: string;
}

interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  changedRequirements: string[];
  estimatedImpact: {
    affectedNodes: number;
    totalEffort: number;
    totalCost: number;
    riskIncrease: number;
    timeline: string;
  };
}

interface AdvancedImpactAnalysisProps {
  selectedRequirement?: string;
  onRequirementSelect?: (requirementId: string) => void;
  impactData?: any; // Allow injecting data directly
}

const AdvancedImpactAnalysis: React.FC<AdvancedImpactAnalysisProps> = ({
  selectedRequirement,
  onRequirementSelect,
  impactData: injectedData
}) => {
  const [analysisMode, setAnalysisMode] = useState<'cascading' | 'risk' | 'coverage' | 'simulation'>('cascading');
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [impactRadius, setImpactRadius] = useState([3]);
  const [showOnlyCritical, setShowOnlyCritical] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  const { data: fetchedData, loading: hookLoading } = useRequirementImpact(selectedRequirement || null);

  // Use injected data if provided, otherwise use fetched data
  const impactData = injectedData || fetchedData;
  const loading = injectedData ? false : hookLoading;

  // Generate enhanced analysis nodes from real impact data
  const analysisNodes = useMemo((): ImpactAnalysisNode[] => {
    if (!impactData) return [];

    return impactData.impactTree.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type,
      criticality: (node.metadata?.criticality || 'DAL-C') as 'DAL-A' | 'DAL-B' | 'DAL-C' | 'DAL-D' | 'DAL-E',
      status: node.status,
      impactScore: calculateImpactScore(node),
      riskLevel: calculateRiskLevel(node),
      changeFrequency: Math.random() * 5, // Mock data
      dependencies: node.connections?.map(c => c.target) || [],
      dependents: [], // Would be calculated from reverse connections
      coverage: {
        design: node.type === 'design' || node.type === 'jama' ? 100 : Math.random() * 100,
        implementation: node.type === 'code' || node.type === 'jira' ? 100 : Math.random() * 100,
        testing: node.type === 'test' ? 100 : Math.random() * 100,
        verification: node.status === 'verified' ? 100 : Math.random() * 100,
      },
      metadata: {
        owner: node.metadata?.owner || 'Unknown',
        team: getTeamFromType(node.type),
        lastModified: node.metadata?.lastUpdated || node.metadata?.modifiedDate || 'Recently',
        effort: Math.floor(Math.random() * 200) + 20,
        cost: Math.floor(Math.random() * 50000) + 5000,
      }
    }));
  }, [impactData]);

  // Calculate cascading impacts
  const cascadingImpacts = useMemo((): CascadingImpact[] => {
    if (!selectedRequirement || analysisNodes.length === 0) return [];

    const impacts: CascadingImpact[] = [];
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; level: number }> = [{ nodeId: selectedRequirement, level: 0 }];

    while (queue.length > 0 && impacts.length < impactRadius[0] * 5) {
      const { nodeId, level } = queue.shift()!;
      if (visited.has(nodeId) || level > impactRadius[0]) continue;

      visited.add(nodeId);
      const node = analysisNodes.find(n => n.id === nodeId);
      if (!node) continue;

      if (level > 0) {
        impacts.push({
          nodeId,
          level,
          impactType: level === 1 ? 'direct' : level === 2 ? 'indirect' : 'ripple',
          severity: node.riskLevel,
          description: generateImpactDescription(node, level),
          estimatedEffort: node.metadata.effort * (level === 1 ? 1 : level === 2 ? 0.6 : 0.3),
          confidence: Math.max(0.3, 1 - (level * 0.2))
        });
      }

      // Add dependencies to queue
      node.dependencies.forEach(depId => {
        if (!visited.has(depId)) {
          queue.push({ nodeId: depId, level: level + 1 });
        }
      });
    }

    return impacts.sort((a, b) => b.confidence - a.confidence);
  }, [selectedRequirement, analysisNodes, impactRadius]);

  // Risk assessment calculation
  const riskAssessment = useMemo((): RiskAssessment | null => {
    if (!selectedRequirement) return null;

    const node = analysisNodes.find(n => n.id === selectedRequirement);
    if (!node) return null;

    const riskFactors = [
      {
        factor: 'Criticality Level',
        score: node.criticality === 'DAL-A' ? 100 : node.criticality === 'DAL-B' ? 80 : node.criticality === 'DAL-C' ? 60 : 40,
        description: `${node.criticality} criticality level`,
        mitigation: 'Implement additional verification and validation procedures'
      },
      {
        factor: 'Change Frequency',
        score: Math.min(100, node.changeFrequency * 20),
        description: `${node.changeFrequency.toFixed(1)} changes per month`,
        mitigation: 'Stabilize requirements through better stakeholder alignment'
      },
      {
        factor: 'Coverage Gaps',
        score: Math.max(0, 100 - ((node.coverage.design + node.coverage.implementation + node.coverage.testing + node.coverage.verification) / 4)),
        description: 'Incomplete coverage across lifecycle phases',
        mitigation: 'Implement comprehensive traceability and verification'
      },
      {
        factor: 'Dependency Complexity',
        score: Math.min(100, node.dependencies.length * 15),
        description: `${node.dependencies.length} dependencies`,
        mitigation: 'Reduce coupling and implement interface specifications'
      }
    ];

    const overallRisk = riskFactors.reduce((sum, factor) => sum + factor.score, 0) / riskFactors.length;

    return {
      requirementId: selectedRequirement,
      riskFactors,
      overallRisk,
      recommendation: generateRiskRecommendation(overallRisk),
      timeline: estimateRiskMitigationTimeline(overallRisk)
    };
  }, [selectedRequirement, analysisNodes]);

  // Simulation scenarios
  const simulationScenarios = useMemo((): SimulationScenario[] => [
    {
      id: 'change-dal-a',
      name: 'Modify DAL-A Requirement',
      description: 'Simulate impact of changing a safety-critical requirement',
      changedRequirements: analysisNodes.filter(n => n.criticality === 'DAL-A').map(n => n.id).slice(0, 1),
      estimatedImpact: {
        affectedNodes: Math.floor(analysisNodes.length * 0.6),
        totalEffort: 480,
        totalCost: 120000,
        riskIncrease: 0.3,
        timeline: '8-12 weeks'
      }
    },
    {
      id: 'add-verification',
      name: 'Add Verification Requirements',
      description: 'Impact of adding additional verification requirements',
      changedRequirements: analysisNodes.filter(n => n.coverage.verification < 70).map(n => n.id).slice(0, 3),
      estimatedImpact: {
        affectedNodes: Math.floor(analysisNodes.length * 0.4),
        totalEffort: 320,
        totalCost: 80000,
        riskIncrease: -0.2,
        timeline: '6-8 weeks'
      }
    },
    {
      id: 'technology-change',
      name: 'Technology Platform Change',
      description: 'Impact of changing underlying technology platform',
      changedRequirements: analysisNodes.filter(n => n.type === 'code' || n.type === 'component').map(n => n.id),
      estimatedImpact: {
        affectedNodes: analysisNodes.length,
        totalEffort: 2400,
        totalCost: 600000,
        riskIncrease: 0.8,
        timeline: '24-36 weeks'
      }
    }
  ], [analysisNodes]);

  // Run impact simulation
  const runSimulation = useCallback(async (scenarioId: string) => {
    setSimulationRunning(true);
    setSelectedScenario(scenarioId);

    // Simulate analysis time
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setSimulationRunning(false);
  }, []);

  // Helper functions
  function calculateImpactScore(node: any): number {
    const criticalityWeight = node.metadata?.criticality === 'DAL-A' ? 100 :
      node.metadata?.criticality === 'DAL-B' ? 80 : 60;
    const connectionsWeight = Math.min(50, (node.connections?.length || 0) * 10);
    return Math.min(100, criticalityWeight * 0.6 + connectionsWeight * 0.4);
  }

  function calculateRiskLevel(node: any): 'low' | 'medium' | 'high' | 'critical' {
    const score = calculateImpactScore(node);
    if (score >= 90) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

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

  function generateImpactDescription(node: ImpactAnalysisNode, level: number): string {
    const impacts = [
      `Requires ${node.type} updates to ${node.name}`,
      `May affect ${node.metadata.team} deliverables`,
      `Could impact ${node.dependencies.length} downstream components`,
      `Might require additional ${Math.floor(node.metadata.effort * 0.3)} hours of work`
    ];
    return impacts[Math.min(level - 1, impacts.length - 1)];
  }

  function generateRiskRecommendation(riskScore: number): string {
    if (riskScore >= 80) return 'Immediate attention required. Consider risk mitigation strategies.';
    if (riskScore >= 60) return 'Monitor closely. Implement preventive measures.';
    if (riskScore >= 40) return 'Standard monitoring. Regular reviews recommended.';
    return 'Low risk. Continue with normal processes.';
  }

  function estimateRiskMitigationTimeline(riskScore: number): string {
    if (riskScore >= 80) return '2-4 weeks';
    if (riskScore >= 60) return '4-6 weeks';
    if (riskScore >= 40) return '6-8 weeks';
    return '8-12 weeks';
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 animate-spin" />
            <span>Loading advanced impact analysis...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-500" />
              Advanced Impact Analysis
            </span>
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="text-sm text-muted-foreground">
                {selectedRequirement ? `Analyzing: ${selectedRequirement}` : 'Select a requirement'}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Analysis Mode</label>
              <Select value={analysisMode} onValueChange={(value: any) => setAnalysisMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cascading">Cascading Impact</SelectItem>
                  <SelectItem value="risk">Risk Assessment</SelectItem>
                  <SelectItem value="coverage">Coverage Analysis</SelectItem>
                  <SelectItem value="simulation">Impact Simulation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Impact Radius: {impactRadius[0]} levels</label>
              <Slider
                value={impactRadius}
                onValueChange={setImpactRadius}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Switch
                  checked={showOnlyCritical}
                  onCheckedChange={setShowOnlyCritical}
                />
                Show Critical Only
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={analysisMode} onValueChange={(value: any) => setAnalysisMode(value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cascading">Cascading</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="simulation">Simulation</TabsTrigger>
        </TabsList>

        {/* Cascading Impact Analysis */}
        <TabsContent value="cascading" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Impact Flow */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  Impact Flow
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cascadingImpacts.length > 0 ? (
                  <div className="space-y-3">
                    {cascadingImpacts.slice(0, 8).map((impact, index) => (
                      <div key={impact.nodeId} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            impact.impactType === 'direct' ? 'bg-red-500' :
                              impact.impactType === 'indirect' ? 'bg-orange-500' : 'bg-yellow-500'
                          )} />
                          <Badge variant="outline" className="text-xs">
                            L{impact.level}
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{analysisNodes.find(n => n.id === impact.nodeId)?.name}</div>
                          <div className="text-xs text-muted-foreground">{impact.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{Math.floor(impact.estimatedEffort)}h</div>
                          <div className="text-xs text-muted-foreground">
                            {Math.floor(impact.confidence * 100)}% conf.
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Network className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Select a requirement to see cascading impacts</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Impact Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Impact Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{cascadingImpacts.length}</div>
                    <div className="text-sm text-muted-foreground">Affected Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.floor(cascadingImpacts.reduce((sum, i) => sum + i.estimatedEffort, 0))}h
                    </div>
                    <div className="text-sm text-muted-foreground">Total Effort</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Direct Impact</span>
                    <span>{cascadingImpacts.filter(i => i.impactType === 'direct').length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Indirect Impact</span>
                    <span>{cascadingImpacts.filter(i => i.impactType === 'indirect').length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Ripple Effects</span>
                    <span>{cascadingImpacts.filter(i => i.impactType === 'ripple').length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Risk Assessment */}
        <TabsContent value="risk" className="space-y-4">
          {riskAssessment ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Risk Factors
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {riskAssessment.riskFactors.map((factor, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{factor.factor}</span>
                        <Badge className={getRiskColor(factor.score >= 80 ? 'critical' : factor.score >= 60 ? 'high' : factor.score >= 40 ? 'medium' : 'low')}>
                          {factor.score}/100
                        </Badge>
                      </div>
                      <Progress value={factor.score} className="h-2" />
                      <p className="text-xs text-muted-foreground">{factor.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Overall Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className={cn(
                      "text-4xl font-bold mb-2",
                      riskAssessment.overallRisk >= 80 ? 'text-red-600' :
                        riskAssessment.overallRisk >= 60 ? 'text-orange-600' :
                          riskAssessment.overallRisk >= 40 ? 'text-yellow-600' : 'text-green-600'
                    )}>
                      {Math.floor(riskAssessment.overallRisk)}
                    </div>
                    <div className="text-sm text-muted-foreground">Risk Score</div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Recommendation</label>
                      <p className="text-sm text-muted-foreground">{riskAssessment.recommendation}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Mitigation Timeline</label>
                      <p className="text-sm text-muted-foreground">{riskAssessment.timeline}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Select a requirement for risk assessment</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Coverage Analysis */}
        <TabsContent value="coverage" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coverage Heat Map */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Coverage Heat Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-1">
                  {analysisNodes.slice(0, 20).map((node, index) => (
                    <div
                      key={node.id}
                      className={cn(
                        "w-8 h-8 rounded cursor-pointer transition-all duration-200 hover:scale-110",
                        node.coverage.verification >= 80 ? 'bg-green-500' :
                          node.coverage.verification >= 60 ? 'bg-yellow-500' :
                            node.coverage.verification >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      )}
                      title={`${node.name}: ${Math.floor(node.coverage.verification)}% coverage`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>Low</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-orange-500 rounded"></div>
                    <span>Medium</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span>Good</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Excellent</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Coverage Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Coverage Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysisNodes.length > 0 && (
                  <>
                    {['design', 'implementation', 'testing', 'verification'].map((coverageType) => (
                      <div key={coverageType} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{coverageType}</span>
                          <span>{Math.floor(analysisNodes.reduce((sum, node) => sum + node.coverage[coverageType as keyof typeof node.coverage], 0) / analysisNodes.length)}%</span>
                        </div>
                        <Progress
                          value={analysisNodes.reduce((sum, node) => sum + node.coverage[coverageType as keyof typeof node.coverage], 0) / analysisNodes.length}
                          className="h-2"
                        />
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Impact Simulation */}
        <TabsContent value="simulation" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Simulation Scenarios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Simulation Scenarios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {simulationScenarios.map((scenario) => (
                  <div key={scenario.id} className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedScenario === scenario.id ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:bg-muted/50'
                  )} onClick={() => runSimulation(scenario.id)}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{scenario.name}</h4>
                      {simulationRunning && selectedScenario === scenario.id ? (
                        <Activity className="w-4 h-4 animate-spin" />
                      ) : (
                        <Button size="sm" variant="outline">Run</Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{scenario.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Effort: </span>
                        <span className="font-medium">{scenario.estimatedImpact.totalEffort}h</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Timeline: </span>
                        <span className="font-medium">{scenario.estimatedImpact.timeline}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Simulation Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Simulation Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedScenario ? (
                  <div className="space-y-4">
                    {simulationRunning ? (
                      <div className="text-center py-8">
                        <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground">Running simulation...</p>
                      </div>
                    ) : (
                      <div>
                        <h4 className="font-medium mb-3">
                          {simulationScenarios.find(s => s.id === selectedScenario)?.name}
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(simulationScenarios.find(s => s.id === selectedScenario)?.estimatedImpact || {}).map(([key, value]) => (
                            <div key={key} className="text-center">
                              <div className="text-lg font-bold text-blue-600">
                                {typeof value === 'number' ? (key === 'riskIncrease' ? `${value > 0 ? '+' : ''}${Math.floor(value * 100)}%` : value) : value}
                              </div>
                              <div className="text-xs text-muted-foreground capitalize">
                                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Run a simulation to see results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedImpactAnalysis;