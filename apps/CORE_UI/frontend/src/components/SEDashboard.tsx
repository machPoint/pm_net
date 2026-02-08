"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Shield, 
  Activity, 
  BarChart3,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Server,
  Database,
  GitBranch,
  Target,
  FileCheck,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VerificationMetrics {
  total_requirements: number;
  verified_requirements: number;
  unverified_requirements: number;
  verification_coverage: number;
}

interface RuleViolation {
  rule_id: string;
  rule_name: string;
  severity: 'error' | 'warning' | 'info';
  node_id?: string;
  node_name?: string;
  message: string;
}

interface SystemNode {
  id: string;
  type: string;
  title: string;
  status?: string;
  source?: string;
  metadata?: Record<string, any>;
}

interface OPALHealth {
  status: string;
  error?: string;
}

export default function SEDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "consistency" | "verification" | "traceability">("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [opalHealth, setOpalHealth] = useState<OPALHealth>({ status: 'unknown' });
  const [metrics, setMetrics] = useState<VerificationMetrics | null>(null);
  const [violations, setViolations] = useState<RuleViolation[]>([]);
  const [nodes, setNodes] = useState<SystemNode[]>([]);
  const [totalNodes, setTotalNodes] = useState(0);

  // Fetch OPAL health on mount
  useEffect(() => {
    checkOPALHealth();
  }, []);

  const checkOPALHealth = async () => {
    try {
      const response = await fetch('/api/opal/health');
      const data = await response.json();
      
      if (data.success) {
        setOpalHealth(data.opal);
        toast.success('OPAL_SE server is online');
      } else {
        setOpalHealth({ status: 'offline', error: data.opal.error });
        toast.error('OPAL_SE server is offline');
      }
    } catch (error: any) {
      setOpalHealth({ status: 'offline', error: error.message });
      console.error('Error checking OPAL health:', error);
    }
  };

  const loadVerificationMetrics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/opal/verification-metrics?project_id=proj-001');
      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.metrics);
        toast.success('Verification metrics loaded');
      } else {
        toast.error('Failed to load metrics: ' + data.message);
      }
    } catch (error: any) {
      toast.error('Error loading metrics: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConsistencyChecks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/opal/consistency-checks?project_id=proj-001');
      const data = await response.json();
      
      if (data.success) {
        setViolations(data.violations || []);
        toast.success(`Found ${data.total_violations} violations`);
      } else {
        toast.error('Failed to run consistency checks: ' + data.message);
      }
    } catch (error: any) {
      toast.error('Error running consistency checks: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSystemModel = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/opal/system-model?project_id=proj-001&limit=20');
      const data = await response.json();
      
      if (data.success) {
        setNodes(data.nodes || []);
        setTotalNodes(data.total || 0);
        toast.success(`Loaded ${data.nodes?.length || 0} nodes`);
      } else {
        toast.error('Failed to load system model: ' + data.message);
      }
    } catch (error: any) {
      toast.error('Error loading system model: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAll = async () => {
    await checkOPALHealth();
    await loadVerificationMetrics();
    await loadConsistencyChecks();
    await loadSystemModel();
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Server Status */}
      <div>
        <h3 className="text-lg font-medium mb-4">OPAL_SE Server Status</h3>
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-3 h-3 rounded-full",
                opalHealth.status === 'online' ? "bg-green-500" : "bg-red-500"
              )} />
              <div>
                <p className="font-medium">
                  {opalHealth.status === 'online' ? 'Server Online' : 'Server Offline'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {opalHealth.status === 'online' 
                    ? 'OPAL_SE is operational on port 7788'
                    : `Cannot connect: ${opalHealth.error || 'Unknown error'}`
                  }
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={checkOPALHealth}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Check Status
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button 
            variant="outline" 
            className="h-auto p-4 flex flex-col items-center gap-2"
            onClick={loadVerificationMetrics}
            disabled={isLoading || opalHealth.status !== 'online'}
          >
            <Target className="w-6 h-6 text-[#6e9fc1]" />
            <span className="text-sm">Verification Metrics</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto p-4 flex flex-col items-center gap-2"
            onClick={loadConsistencyChecks}
            disabled={isLoading || opalHealth.status !== 'online'}
          >
            <Shield className="w-6 h-6 text-[#a3cae9]" />
            <span className="text-sm">Consistency Checks</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto p-4 flex flex-col items-center gap-2"
            onClick={loadSystemModel}
            disabled={isLoading || opalHealth.status !== 'online'}
          >
            <Database className="w-6 h-6 text-[#395a7f]" />
            <span className="text-sm">System Model</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto p-4 flex flex-col items-center gap-2"
            onClick={refreshAll}
            disabled={isLoading || opalHealth.status !== 'online'}
          >
            <RefreshCw className="w-6 h-6" />
            <span className="text-sm">Refresh All</span>
          </Button>
        </div>
      </div>

      {/* Metrics Summary */}
      {metrics && (
        <div>
          <h3 className="text-lg font-medium mb-4">Verification Coverage</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <FileCheck className="w-5 h-5 text-[#6e9fc1]" />
                <Badge variant="outline">{metrics.total_requirements}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Total Requirements</p>
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <Badge variant="outline">{metrics.verified_requirements}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Verified</p>
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <Badge variant="outline">{metrics.unverified_requirements}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Unverified</p>
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-[#395a7f]" />
                <Badge variant="outline">{metrics.verification_coverage.toFixed(1)}%</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Coverage</p>
            </div>
          </div>
        </div>
      )}

      {/* System Model Preview */}
      {nodes.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4">System Model ({totalNodes} total nodes)</h3>
          <div className="bg-card rounded-lg border border-border">
            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-2">
                {nodes.map((node) => (
                  <div 
                    key={node.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {node.type}
                        </Badge>
                        <p className="font-medium text-sm">{node.title}</p>
                      </div>
                      {node.source && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {node.source}
                        </p>
                      )}
                    </div>
                    {node.status && (
                      <Badge 
                        variant={
                          node.status === 'approved' || node.status === 'verified' ? 'default' : 
                          node.status === 'draft' ? 'outline' : 'secondary'
                        }
                        className="text-xs"
                      >
                        {node.status}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );

  const renderConsistency = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Consistency Check Results</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadConsistencyChecks}
          disabled={isLoading || opalHealth.status !== 'online'}
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Run Checks
        </Button>
      </div>

      {violations.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-muted-foreground">No violations found</p>
          <p className="text-sm text-muted-foreground mt-2">
            All consistency rules passed successfully
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border">
          <ScrollArea className="h-[600px]">
            <div className="p-4 space-y-3">
              {violations.map((violation, index) => (
                <div 
                  key={index}
                  className={cn(
                    "p-4 rounded-lg border-l-4",
                    violation.severity === 'error' && "border-l-red-500 bg-red-500/5",
                    violation.severity === 'warning' && "border-l-orange-500 bg-orange-500/5",
                    violation.severity === 'info' && "border-l-blue-500 bg-blue-500/5"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className={cn(
                          "w-4 h-4",
                          violation.severity === 'error' && "text-red-500",
                          violation.severity === 'warning' && "text-orange-500",
                          violation.severity === 'info' && "text-blue-500"
                        )} />
                        <p className="font-medium">{violation.rule_name}</p>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6">
                        {violation.message}
                      </p>
                      {violation.node_name && (
                        <p className="text-xs text-muted-foreground ml-6 mt-1">
                          Node: {violation.node_name}
                        </p>
                      )}
                    </div>
                    <Badge variant={
                      violation.severity === 'error' ? 'destructive' :
                      violation.severity === 'warning' ? 'outline' : 'secondary'
                    }>
                      {violation.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">System Engineering Dashboard</h2>
        <p className="text-muted-foreground">
          Monitor system model, verification coverage, and consistency checks via OPAL_SE
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'consistency', label: 'Consistency', icon: Shield },
          { id: 'verification', label: 'Verification', icon: Target },
          { id: 'traceability', label: 'Traceability', icon: GitBranch }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-[#6e9fc1] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'consistency' && renderConsistency()}
      {activeTab === 'verification' && (
        <div className="bg-card rounded-lg border border-border p-8 text-center">
          <Target className="w-12 h-12 text-[#6e9fc1] mx-auto mb-4" />
          <p className="text-muted-foreground">Verification dashboard coming soon</p>
        </div>
      )}
      {activeTab === 'traceability' && (
        <div className="bg-card rounded-lg border border-border p-8 text-center">
          <GitBranch className="w-12 h-12 text-[#395a7f] mx-auto mb-4" />
          <p className="text-muted-foreground">Traceability matrix coming soon</p>
        </div>
      )}
    </div>
  );
}
