"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  Filter,
  GitBranch,
  FileText,
  Users,
  Calendar,
  ArrowRight,
  Network,
  Zap,
  TrendingUp,
  BarChart3,
  Settings,
  Download,
  Share,
  RefreshCw,
  Maximize2,
  CheckCircle,
  Award,
  Component,
  Cpu,
  Info,
  ExternalLink,
  Clock,
  AlertTriangle,
  Shield,
  History,
  Tag,
  User,
  BookOpen,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import TraceGraph from "./TraceGraph";
import ImpactGraph from "./ImpactGraph";
import { useRequirementImpact } from "@/hooks/useRequirementImpact";

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
    criticality?: "Critical" | "High" | "Medium" | "Low" | "Info";
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

interface ImpactAnalysis {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  affectedItems: number;
  estimatedEffort: string;
  recommendation: string;
}

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

const mockTraceNodes: TraceNode[] = [
  {
    id: "1",
    type: "requirement",
    title: "Data Ingestion Pipeline Task",
    status: "verified",
    connections: ["2", "3", "4"],
    metadata: {
      owner: "Dr. Sarah Mitchell",
      lastUpdated: "2 hours ago",
      source: "System",
      criticality: "Critical"
    },
    position: { x: 120, y: 80 },
    details: {
      description: "The data ingestion pipeline shall process incoming records within 5 seconds end-to-end. The system shall provide redundant processing paths for critical data streams and implement retry mechanisms to ensure no data loss in case of agent failures.",
      documentId: "TASK-2024-DIP-001",
      version: "2.1",
      approvalStatus: "Approved",
      certificationBasis: "SLA-001, SLA-002",
      verificationMethod: "Integration Test + Load Test + Analysis",
      parentRequirement: "SYS-001 Platform Reliability",
      childRequirements: ["TASK-2024-DIP-002", "TASK-2024-DIP-003", "TASK-2024-DIP-004"],
      testCases: ["TC-001", "TC-002", "TC-003"],
      riskAssessment: "High - Data Loss Critical",
      complianceStatus: "Compliant",
      lastReviewDate: "2024-01-15",
      nextReviewDate: "2024-07-15",
      stakeholders: ["Platform Engineering", "Data Team", "Operations", "SRE"],
      tags: ["data-pipeline", "reliability", "Critical", "sla", "redundancy"],
      changeHistory: [
        {
          date: "2024-01-10",
          author: "Dr. Sarah Mitchell",
          change: "Updated retry requirements for agent failures",
          reason: "Incorporation of SRE feedback on reliability targets"
        },
        {
          date: "2023-12-15",
          author: "James Rodriguez",
          change: "Added error handling for malformed input records",
          reason: "Load test results indicated need for enhanced error handling"
        },
        {
          date: "2023-11-20",
          author: "Lisa Chen",
          change: "Initial task creation",
          reason: "Project initiation for next-generation ingestion pipeline"
        }
      ]
    }
  },
  {
    id: "2",
    type: "design",
    title: "Pipeline Architecture Design",
    status: "completed",
    connections: ["5", "6"],
    metadata: {
      owner: "James Rodriguez",
      lastUpdated: "1 day ago",
      source: "Design Documents",
      criticality: "Critical"
    },
    position: { x: 280, y: 180 }
  },
  {
    id: "3",
    type: "component",
    title: "Ingestion Agent Worker",
    status: "active",
    connections: ["7"],
    metadata: {
      owner: "Lisa Chen",
      lastUpdated: "4 hours ago",
      source: "Graph",
      criticality: "High"
    },
    position: { x: 450, y: 120 }
  },
  {
    id: "4",
    type: "test",
    title: "Pipeline Throughput Validation",
    status: "pending",
    connections: ["8"],
    metadata: {
      owner: "Michael Thompson",
      lastUpdated: "6 hours ago",
      source: "Test Suite",
      criticality: "Critical"
    },
    position: { x: 120, y: 280 }
  },
  {
    id: "5",
    type: "code",
    title: "Stream Processing Module",
    status: "active",
    connections: ["9"],
    metadata: {
      owner: "Anna Kowalski",
      lastUpdated: "1 hour ago",
      source: "Version Control",
      criticality: "Critical"
    },
    position: { x: 280, y: 340 }
  },
  {
    id: "6",
    type: "certification",
    title: "SLA Compliance Verification",
    status: "pending",
    connections: [],
    metadata: {
      owner: "David Park",
      lastUpdated: "3 hours ago",
      source: "Compliance Team",
      criticality: "Critical"
    },
    position: { x: 450, y: 280 }
  },
  {
    id: "7",
    type: "test",
    title: "Agent Performance Benchmark",
    status: "completed",
    connections: [],
    metadata: {
      owner: "Jennifer Williams",
      lastUpdated: "2 days ago",
      source: "Test Lab",
      criticality: "High"
    },
    position: { x: 580, y: 180 }
  },
  {
    id: "8",
    type: "component",
    title: "Monitoring Instrumentation",
    status: "verified",
    connections: [],
    metadata: {
      owner: "Robert Johnson",
      lastUpdated: "5 hours ago",
      source: "Observability",
      criticality: "Medium"
    },
    position: { x: 30, y: 420 }
  },
  {
    id: "9",
    type: "certification",
    title: "Configuration Audit Review",
    status: "active",
    connections: [],
    metadata: {
      owner: "Maria Garcia",
      lastUpdated: "1 day ago",
      source: "Governance",
      criticality: "Critical"
    },
    position: { x: 380, y: 480 }
  }
];

const mockImpactAnalysis: ImpactAnalysis[] = [
  {
    id: "1",
    title: "Database Schema Migration Impact",
    description: "Proposed schema change will affect 12 downstream agents and require revalidation of all queries",
    severity: "high",
    affectedItems: 12,
    estimatedEffort: "6-8 weeks",
    recommendation: "Coordinate with data team before implementing schema changes. Update all agent query templates."
  },
  {
    id: "2",
    title: "API Gateway Rate Limit Update",
    description: "New rate limits will require updates to retry logic and backoff strategies across 8 agents",
    severity: "medium",
    affectedItems: 8,
    estimatedEffort: "3-4 weeks",
    recommendation: "Update agent configurations and run load tests with new limits"
  },
  {
    id: "3",
    title: "Message Queue Provider Migration",
    description: "Queue provider change will impact all event-driven agents and require integration revalidation",
    severity: "critical",
    affectedItems: 15,
    estimatedEffort: "8-12 weeks",
    recommendation: "Full integration test required. Coordinate with platform team for rollback plan."
  }
];

const mockImpactNodes: ImpactNode[] = [
  {
    id: "impact-source-1",
    type: "source",
    title: "TASK-001 Ingestion Pipeline Update",
    severity: "high",
    impactType: "requirement",
    effort: "2 weeks",
    status: "analyzing",
    connections: ["impact-affected-1", "impact-affected-2", "impact-related-1"],
    metadata: {
      owner: "Dr. Sarah Mitchell",
      lastUpdated: "2 hours ago",
      source: "System",
      estimatedHours: 80,
      affectedTeams: ["Data Processing", "Platform"]
    },
    position: { x: 150, y: 100 },
    details: {
      description: "Updated ingestion pipeline requirements for enhanced throughput",
      changeDescription: "Added redundancy requirements for primary data streams",
      riskLevel: "High - Data Loss Critical",
      mitigation: "Parallel development with existing pipeline as fallback",
      dependencies: ["Infrastructure provisioning", "Load test scheduling"],
      timeline: "Q2 2024",
      approvalRequired: true,
      costEstimate: "$120K",
      stakeholders: ["Platform Team", "SRE", "Engineering"]
    }
  },
  {
    id: "impact-affected-1",
    type: "affected",
    title: "Stream Processing Agent",
    severity: "critical",
    impactType: "component",
    effort: "6 weeks",
    status: "identified",
    connections: ["impact-downstream-1", "impact-downstream-2"],
    metadata: {
      owner: "James Rodriguez",
      lastUpdated: "4 hours ago",
      source: "Graph",
      estimatedHours: 240
    },
    position: { x: 400, y: 50 }
  },
  {
    id: "impact-affected-2",
    type: "affected",
    title: "Pipeline Orchestration Code",
    severity: "high",
    impactType: "code",
    effort: "4 weeks",
    status: "planned",
    connections: ["impact-downstream-3"],
    metadata: {
      owner: "Anna Kowalski",
      lastUpdated: "1 hour ago",
      source: "Git Repository",
      estimatedHours: 160
    },
    position: { x: 400, y: 150 }
  },
  {
    id: "impact-related-1",
    type: "related",
    title: "Integration Test Suite",
    severity: "medium",
    impactType: "test",
    effort: "3 weeks",
    status: "in-progress",
    connections: ["impact-downstream-4"],
    metadata: {
      owner: "Michael Thompson",
      lastUpdated: "6 hours ago",
      source: "Test Management",
      estimatedHours: 120
    },
    position: { x: 150, y: 250 }
  },
  {
    id: "impact-downstream-1",
    type: "downstream",
    title: "Queue Consumer Interface",
    severity: "medium",
    impactType: "component",
    effort: "2 weeks",
    status: "identified",
    connections: [],
    metadata: {
      owner: "Lisa Chen",
      lastUpdated: "3 hours ago",
      source: "Architecture",
      estimatedHours: 80
    },
    position: { x: 650, y: 20 }
  },
  {
    id: "impact-downstream-2",
    type: "downstream",
    title: "Fallback Processing Logic",
    severity: "low",
    impactType: "design",
    effort: "1 week",
    status: "completed",
    connections: [],
    metadata: {
      owner: "David Park",
      lastUpdated: "1 day ago",
      source: "Design Documents",
      estimatedHours: 40
    },
    position: { x: 650, y: 80 }
  },
  {
    id: "impact-downstream-3",
    type: "downstream",
    title: "Runbook & Operations Guide",
    severity: "low",
    impactType: "process",
    effort: "1 week",
    status: "planned",
    connections: [],
    metadata: {
      owner: "Jennifer Williams",
      lastUpdated: "2 days ago",
      source: "Documentation",
      estimatedHours: 40
    },
    position: { x: 650, y: 150 }
  },
  {
    id: "impact-downstream-4",
    type: "downstream",
    title: "Compliance Documentation",
    severity: "high",
    impactType: "process",
    effort: "2 weeks",
    status: "analyzing",
    connections: [],
    metadata: {
      owner: "Robert Johnson",
      lastUpdated: "5 hours ago",
      source: "Document Management",
      estimatedHours: 80
    },
    position: { x: 150, y: 400 }
  }
];

// Additional interfaces for interactive impact analysis
interface RequirementItem {
  id: string;
  title: string;
  owner: string;
  source: string;
  lastUpdated: string;
  criticality: "Critical" | "High" | "Medium" | "Low" | "Info";
  status: "active" | "pending" | "completed" | "verified" | "failed";
  description?: string;
}

// Mock requirements that users can select for impact analysis
const mockRequirements: RequirementItem[] = [
  {
    id: "TASK-001",
    title: "Data Ingestion Pipeline Task",
    owner: "Dr. Sarah Mitchell",
    source: "System",
    lastUpdated: "2 hours ago",
    criticality: "Critical",
    status: "active",
    description: "Primary data ingestion pipeline throughput and reliability requirements"
  },
  {
    id: "TASK-002",
    title: "Agent Orchestration Integration",
    owner: "James Rodriguez",
    source: "System",
    lastUpdated: "4 hours ago",
    criticality: "High",
    status: "verified",
    description: "Integration requirements for multi-agent orchestration layer"
  },
  {
    id: "TASK-003",
    title: "Monitoring & Alerting Setup",
    owner: "Lisa Chen",
    source: "System",
    lastUpdated: "1 day ago",
    criticality: "Medium",
    status: "pending",
    description: "Health monitoring and alert escalation for all active agents"
  },
  {
    id: "TASK-004",
    title: "API Gateway Configuration",
    owner: "Michael Thompson",
    source: "System",
    lastUpdated: "2 days ago",
    criticality: "High",
    status: "active",
    description: "Rate limiting and authentication for external API endpoints"
  },
  {
    id: "TASK-005",
    title: "Message Queue Scaling Policy",
    owner: "Anna Kowalski",
    source: "System",
    lastUpdated: "3 hours ago",
    criticality: "Critical",
    status: "completed",
    description: "Auto-scaling policies for message queue under peak load"
  }
];

export default function TraceImpactSection() {
  const [activeTab, setActiveTab] = useState<"trace" | "impact">("impact");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<TraceNode | null>(null);
  const [selectedImpactNode, setSelectedImpactNode] = useState<ImpactNode | null>(null);
  const [showNodeDetails, setShowNodeDetails] = useState(false);
  const [detailNode, setDetailNode] = useState<TraceNode | null>(null);
  const [traceNodes] = useState(mockTraceNodes);
  const [impactNodes, setImpactNodes] = useState<ImpactNode[]>([]);
  const [impactAnalysis] = useState(mockImpactAnalysis);
  const graphRef = useRef<HTMLDivElement>(null);
  
  // New state for interactive impact analysis
  const [selectedRequirement, setSelectedRequirement] = useState<RequirementItem | null>(null);
  const [requirements] = useState(mockRequirements);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showImpactResults, setShowImpactResults] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);

  // Hook to fetch real impact data for selected requirement
  const { data: impactData, loading: impactLoading, error: impactError, refetch } = useRequirementImpact(selectedRequirement ? selectedRequirement.id : null);

  // When real impact data loads, map it into graph nodes
  useEffect(() => {
    if (!selectedRequirement) return;

    if (impactError) {
      console.warn('Impact API failed, falling back to mock data:', impactError);
      // Fall back to mock data instead of showing error
      if (impactError.includes('Requirement not found')) {
        // Create mock impact data for demonstration
        const mockImpactData = createMockImpactData(selectedRequirement);
        const nodes = transformMockDataToNodes(mockImpactData, selectedRequirement);
        setImpactNodes(nodes);
        setIsAnalyzing(false);
        setShowImpactResults(true);
        setAnalysisStep(4);
        toast.success("Impact analysis loaded (demo data)");
      } else {
        toast.error(`Failed to fetch impact: ${impactError}`);
        setIsAnalyzing(false);
        setShowImpactResults(false);
      }
      return;
    }

    if (!impactLoading && impactData) {
      // Map RequirementImpactData to ImpactNode[]
      const nodes: ImpactNode[] = [];
      const idMap = new Map<string, string>();

      const typeMap: Record<string, ImpactNode["impactType"]> = {
        requirement: "requirement",
        design: "design",
        code: "code",
        test: "test",
        component: "component",
        jama: "design",
        jira: "process"
      } as const;

      // First pass: create nodes without connections
      for (const n of impactData.impactTree) {
        const isSource = n.id === impactData.requirement.id;
        const impactType = typeMap[n.type] || "process";
        const severity: ImpactNode["severity"] = isSource
          ? (selectedRequirement.criticality === "Critical" ? "critical" : selectedRequirement.criticality === "High" ? "high" : "medium")
          : (impactType === "component" || impactType === "code") ? "high" : "medium";

        const newId = `${isSource ? "source" : "affected"}-${n.id}`;
        idMap.set(n.id, newId);
        nodes.push({
          id: newId,
          type: isSource ? "source" : "affected",
          title: n.name || n.id,
          severity,
          impactType,
          effort: isSource ? "-" : "~2 weeks",
          status: isSource ? "analyzing" : "identified",
          connections: [],
          metadata: {
            owner: n.metadata?.owner || selectedRequirement.owner || "Unknown",
            lastUpdated: n.metadata?.modifiedDate || n.metadata?.lastRun || n.metadata?.updated || "",
            source: n.metadata?.source || n.type.toUpperCase(),
            estimatedHours: isSource ? undefined : 80,
            affectedTeams: undefined,
          },
          position: undefined,
        });
      }

      // Second pass: wire up connections
      for (const n of impactData.impactTree) {
        const srcId = idMap.get(n.id);
        if (!srcId) continue;
        const node = nodes.find(x => x.id === srcId);
        if (!node) continue;
        const connTargets = (n.connections || []).map(c => idMap.get(typeof c.target === "string" ? c.target : String(c.target))).filter(Boolean) as string[];
        node.connections = connTargets;
      }

      setImpactNodes(nodes);
      setIsAnalyzing(false);
      setShowImpactResults(true);
      setAnalysisStep(4);
      toast.success("Impact analysis loaded");
    }
  }, [impactData, impactLoading, impactError, selectedRequirement]);
  
  // Helper functions for mock data fallback
  const createMockImpactData = (requirement: RequirementItem) => {
    return {
      requirement: {
        id: requirement.id,
        name: requirement.title,
        type: 'requirement' as const,
        status: requirement.status,
        metadata: {
          owner: requirement.owner,
          source: requirement.source,
          criticality: requirement.criticality
        },
        connections: []
      },
      impactTree: [
        {
          id: requirement.id,
          name: requirement.title,
          type: 'requirement' as const,
          status: requirement.status,
          metadata: { owner: requirement.owner, source: requirement.source },
          connections: []
        },
        {
          id: `design-${requirement.id}`,
          name: `${requirement.title.split(' ')[0]} Architecture`,
          type: 'design' as const,
          status: 'active',
          metadata: { owner: 'Design Team', source: 'Design Docs' },
          connections: []
        },
        {
          id: `code-${requirement.id}`,
          name: `${requirement.title.split(' ')[0]} Implementation`,
          type: 'code' as const,
          status: 'active', 
          metadata: { owner: 'Dev Team', source: 'Repository' },
          connections: []
        },
        {
          id: `test-${requirement.id}`,
          name: `${requirement.title.split(' ')[0]} Tests`,
          type: 'test' as const,
          status: 'pending',
          metadata: { owner: 'QA Team', source: 'Test Suite' },
          connections: []
        }
      ]
    };
  };
  
  const transformMockDataToNodes = (mockData: any, requirement: RequirementItem): ImpactNode[] => {
    const nodes: ImpactNode[] = [];
    
    // Add source node
    nodes.push({
      id: `source-${requirement.id}`,
      type: "source",
      title: requirement.title,
      severity: requirement.criticality === "Critical" ? "critical" : requirement.criticality === "High" ? "high" : "medium",
      impactType: "requirement",
      effort: "-",
      status: "analyzing",
      connections: ["affected-design", "affected-code", "affected-test"],
      metadata: {
        owner: requirement.owner,
        lastUpdated: requirement.lastUpdated,
        source: requirement.source,
      },
      position: { x: 400, y: 200 }
    });
    
    // Add affected nodes
    nodes.push({
      id: "affected-design",
      type: "affected",
      title: `${requirement.title.split(' ')[0]} Architecture`,
      severity: "high",
      impactType: "design",
      effort: "3-4 weeks",
      status: "identified",
      connections: [],
      metadata: {
        owner: "Design Team",
        lastUpdated: "2 days ago",
        source: "Design Documents",
        estimatedHours: 120
      },
      position: { x: 200, y: 100 }
    });
    
    nodes.push({
      id: "affected-code",
      type: "affected", 
      title: `${requirement.title.split(' ')[0]} Implementation`,
      severity: "high",
      impactType: "code",
      effort: "4-6 weeks",
      status: "identified",
      connections: [],
      metadata: {
        owner: "Development Team",
        lastUpdated: "1 day ago",
        source: "Git Repository",
        estimatedHours: 160
      },
      position: { x: 600, y: 100 }
    });
    
    nodes.push({
      id: "affected-test",
      type: "affected",
      title: `${requirement.title.split(' ')[0]} Test Suite`,
      severity: "medium",
      impactType: "test",
      effort: "2-3 weeks",
      status: "identified",
      connections: [],
      metadata: {
        owner: "QA Team",
        lastUpdated: "3 hours ago",
        source: "Test Framework",
        estimatedHours: 80
      },
      position: { x: 400, y: 350 }
    });
    
    return nodes;
  };
  
  // Filter requirements based on search
  const filteredRequirements = requirements.filter(req =>
    req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNodeClick = (node: TraceNode) => {
    setDetailNode(node);
    setShowNodeDetails(true);
  };

  const handleImpactNodeClick = (node: ImpactNode) => {
    setSelectedImpactNode(node);
    // Could add detailed impact node modal here if needed
    console.log('Impact node clicked:', node);
  };
  
// Trigger real impact analysis via API
  const analyzeImpact = async (requirement: RequirementItem) => {
    if (!requirement) return;

    setIsAnalyzing(true);
    setAnalysisStep(1);
    setImpactNodes([]);
    setShowImpactResults(false);

    // Show a temporary source node to keep UI responsive
    const tempSource: ImpactNode = {
      id: `source-${requirement.id}`,
      type: "source",
      title: requirement.title,
      severity: requirement.criticality === "Critical" ? "critical" : requirement.criticality === "High" ? "high" : "medium",
      impactType: "requirement",
      effort: "-",
      status: "analyzing",
      connections: [],
      metadata: {
        owner: requirement.owner,
        lastUpdated: requirement.lastUpdated,
        source: requirement.source,
        estimatedHours: undefined,
      },
      position: { x: 400, y: 250 }
    };
    setImpactNodes([tempSource]);

    toast("🔍 Starting impact analysis...", { duration: 1500 });

    // Kick off fetch; results handled in useEffect above
    try {
      setAnalysisStep(2);
      await refetch();
    } catch (e) {
      // refetch errors are surfaced via impactError in the effect
    }
  };
  
  const getRequirementCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case "Critical": return "bg-red-500/20 text-red-700 dark:text-red-300 border-red-300";
      case "High": return "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-300";
      case "Medium": return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-300";
      case "Low": return "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300";
      case "Info": return "bg-green-500/20 text-green-700 dark:text-green-300 border-green-300";
      default: return "bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-300";
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-blue-500/20 text-blue-700 dark:text-blue-300";
      case "pending": return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300";
      case "completed": return "bg-green-500/20 text-green-700 dark:text-green-300";
      case "verified": return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300";
      case "failed": return "bg-red-500/20 text-red-700 dark:text-red-300";
      default: return "bg-gray-500/20 text-gray-700 dark:text-gray-300";
    }
  };

  const filteredTraceNodes = traceNodes.filter(node =>
    node.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.metadata.owner.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredImpactNodes = impactNodes.filter(node =>
    node.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.metadata.owner.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getNodeColor = (type: string, status: string) => {
    const baseColors = {
      requirement: "bg-[#e9ecee] text-[#395a7f] dark:bg-[#395a7f]/10 dark:text-[#a3cae9]",
      design: "bg-[#e9ecee]/70 text-[#6e9fc1] dark:bg-[#6e9fc1]/10 dark:text-[#e9ecee]",
      code: "bg-[#a3cae9]/20 text-[#395a7f] dark:bg-[#395a7f]/20 dark:text-[#a3cae9]",
      test: "bg-[#e9ecee]/80 text-[#6e9fc1] dark:bg-[#6e9fc1]/10 dark:text-[#e9ecee]",
      component: "bg-[#a3cae9]/30 text-[#395a7f] dark:bg-[#395a7f]/15 dark:text-[#a3cae9]",
      certification: "bg-[#e9ecee]/60 text-[#acacac] dark:bg-[#acacac]/10 dark:text-[#e9ecee]"
    };
    
    if (status === "completed" || status === "verified") {
      return baseColors[type as keyof typeof baseColors] + " opacity-60";
    }
    
    return baseColors[type as keyof typeof baseColors] || "bg-card text-card-foreground";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500/20 text-red-700 dark:text-red-300 border-red-300";
      case "high": return "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-300";
      case "medium": return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-300";
      case "low": return "bg-green-500/20 text-green-700 dark:text-green-300 border-green-300";
      default: return "bg-card text-card-foreground";
    }
  };

  const getImpactTypeIcon = (impactType: string) => {
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

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "requirement": return FileText;
      case "design": return FileText;
      case "code": return GitBranch;
      case "test": return CheckCircle;
      case "component": return Cpu;
      case "certification": return Award;
      default: return FileText;
    }
  };

  return (
    <div className="flex h-full bg-background">
      {/* Left Panel */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant={activeTab === "trace" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("trace")}
              className="h-8 px-3 text-xs"
            >
              <Network className="w-3 h-3 mr-1" />
              Trace
            </Button>
            <Button
              variant={activeTab === "impact" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("impact")}
              className="h-8 px-3 text-xs"
            >
              <Zap className="w-3 h-3 mr-1" />
              Impact
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 bg-background border-border"
            />
          </div>
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-auto dark-scrollbar-native" 
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#666666 #1a1a1a'
          }}
        >
          <div className="p-4">
            {activeTab === "trace" ? (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Trace Graph Nodes</h4>
                {filteredTraceNodes.map((node) => {
                  const Icon = getNodeIcon(node.type);
                  
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                        selectedNode?.id === node.id ? "bg-muted border-primary" : "bg-background border-border"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4" />
                        <Badge className={cn("text-xs", getNodeColor(node.type, node.status))}>
                          {node.type}
                        </Badge>
                      </div>
                      
                      <h5 className="font-medium text-sm mb-1">{node.title}</h5>
                      
                      <div className="text-xs text-muted-foreground">
                        <div>{node.metadata.owner}</div>
                        <div>{node.metadata.lastUpdated}</div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {node.connections.length} connections
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {node.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Select Requirement for Impact Analysis</h4>
                
                {/* Selected Requirement Display */}
                {selectedRequirement && (
                  <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={cn("text-xs", getRequirementCriticalityColor(selectedRequirement.criticality))}>
                        {selectedRequirement.criticality}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedRequirement(null)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <h5 className="font-medium text-sm mb-1">{selectedRequirement.title}</h5>
                    <div className="text-xs text-muted-foreground mb-2">
                      <div>{selectedRequirement.id}</div>
                      <div>{selectedRequirement.owner}</div>
                    </div>
                    
                    <Button 
                      onClick={() => analyzeImpact(selectedRequirement)}
                      disabled={isAnalyzing}
                      className={cn(
                        "w-full text-xs h-8",
                        isAnalyzing ? "animate-pulse" : ""
                      )}
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          {analysisStep === 1 ? "Initializing..." :
                           analysisStep === 2 ? "Finding Impacts..." :
                           analysisStep === 3 ? "Analyzing Dependencies..." :
                           "Finalizing..."}
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3 mr-1" />
                          Analyze Impact
                        </>
                      )}
                    </Button>
                  </div>
                )}
                
                {/* Requirements List */}
                <div className="space-y-2">
                  {filteredRequirements.map((req) => {
                    return (
                      <div
                        key={req.id}
                        onClick={() => setSelectedRequirement(req)}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:bg-muted/50",
                          selectedRequirement?.id === req.id 
                            ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20" 
                            : "bg-background border-border hover:border-primary/20"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4" />
                          <Badge className={cn("text-xs", getRequirementCriticalityColor(req.criticality))}>
                            {req.criticality}
                          </Badge>
                        </div>
                        
                        <h5 className="font-medium text-sm mb-1">{req.title}</h5>
                        
                        <div className="text-xs text-muted-foreground mb-2">
                          <div className="font-mono">{req.id}</div>
                          <div>{req.owner}</div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Badge className={cn("text-[9px]", getStatusColor(req.status))}>
                            {req.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {req.source}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {filteredRequirements.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📋</div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">No requirements found</h4>
                    <p className="text-xs text-muted-foreground">
                      Try adjusting your search query
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div>
            <h2 className="text-lg font-semibold">
              {activeTab === "trace" ? "Trace Graph" : "Impact Analysis"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {activeTab === "trace" 
                ? "Visualize relationships between requirements, design, code, and tests"
                : selectedRequirement
                ? `Analyzing impact for: ${selectedRequirement.title}`
                : "Select a requirement to analyze its impact on connected components"
              }
            </p>
          </div>
          
          <div className="flex items-center gap-2">
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

        {/* Graph/Analysis Area */}
        <div className="flex-1 p-6">
          {activeTab === "trace" ? (
            <div className="h-full">
              <TraceGraph 
                traceNodes={traceNodes}
                selectedNode={selectedNode}
                onNodeClick={handleNodeClick}
              />
            </div>
          ) : (
            <div className="h-full">
              {impactNodes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center bg-card rounded-lg border border-dashed border-border">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                      <Network className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Impact Analysis Ready</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      Select a requirement from the left panel and click "Analyze Impact" to visualize
                      the connected components and downstream effects.
                    </p>
                    <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span>Source</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span>Critical Impact</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span>High Impact</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span>Low Impact</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full relative">
                  <ImpactGraph 
                    impactNodes={impactNodes}
                    selectedNode={selectedImpactNode}
                    onNodeClick={handleImpactNodeClick}
                    centerNodeId={impactNodes.find(n => n.type === "source")?.id}
                  />
                  
                  {/* Analysis Progress Overlay */}
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
                      <div className="bg-card border border-border rounded-lg p-6 shadow-lg max-w-sm w-full mx-4">
                        <div className="text-center">
                          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                            <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                          </div>
                          <h4 className="font-semibold mb-2">
                            {analysisStep === 1 ? "Initializing Analysis" :
                             analysisStep === 2 ? "Identifying Impacts" :
                             analysisStep === 3 ? "Mapping Dependencies" :
                             "Finalizing Results"}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            {analysisStep === 1 ? "Setting up impact analysis for selected requirement..." :
                             analysisStep === 2 ? "Finding directly affected components and systems..." :
                             analysisStep === 3 ? "Discovering downstream impacts and relationships..." :
                             "Completing analysis and generating visualization..."}
                          </p>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-500"
                              style={{ width: `${(analysisStep / 4) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Impact Summary Panel */}
                  {showImpactResults && !isAnalyzing && (
                    <div className="absolute top-4 left-4 bg-card/95 backdrop-blur border border-border rounded-lg p-4 shadow-lg max-w-xs">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Impact Summary
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Items:</span>
                          <span className="font-medium">{impactNodes.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Critical:</span>
                          <span className="font-medium text-red-600">
                            {impactNodes.filter(n => n.severity === 'critical').length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">High:</span>
                          <span className="font-medium text-orange-600">
                            {impactNodes.filter(n => n.severity === 'high').length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Est. Effort:</span>
                          <span className="font-medium">
                            {impactNodes.reduce((acc, n) => acc + (n.metadata.estimatedHours || 0), 0)}h
                          </span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-2"
                          onClick={() => {
                            setImpactNodes([]);
                            setSelectedRequirement(null);
                            setShowImpactResults(false);
                          }}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Clear Analysis
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Node Details Modal */}
      <Dialog open={showNodeDetails} onOpenChange={setShowNodeDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {detailNode && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn("w-3 h-3 rounded-full", 
                    detailNode.status === 'verified' ? 'bg-[#6e9fc1]' : 
                    detailNode.status === 'pending' ? 'bg-[#acacac]' : 
                    detailNode.status === 'failed' ? 'bg-[#acacac]' : 'bg-[#395a7f]'
                  )} />
                  <DialogTitle className="text-xl">{detailNode.title}</DialogTitle>
                  <Badge className={cn("text-xs ml-auto", getNodeColor(detailNode.type, detailNode.status))}>
                    {detailNode.type}
                  </Badge>
                </div>
                {detailNode.details && (
                  <DialogDescription className="text-sm">
                    {detailNode.details.description}
                  </DialogDescription>
                )}
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {/* Overview Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="flex items-center gap-2 font-medium text-sm mb-2">
                        <Info className="w-4 h-4" />
                        Basic Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Document ID:</span>
                          <span className="font-mono">{detailNode.details?.documentId || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Version:</span>
                          <span>{detailNode.details?.version || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant="outline">{detailNode.status}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Approval:</span>
                          <span>{detailNode.details?.approvalStatus || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="flex items-center gap-2 font-medium text-sm mb-2">
                        <Shield className="w-4 h-4" />
                        Safety & Compliance
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Criticality:</span>
                          <Badge className={cn(
                            "text-xs",
                            detailNode.metadata.criticality === 'Critical' ? 'bg-[#acacac]/20 text-[#acacac] dark:bg-[#acacac]/10 dark:text-[#e9ecee]' :
                            detailNode.metadata.criticality === 'High' ? 'bg-[#6e9fc1]/20 text-[#395a7f] dark:bg-[#395a7f]/20 dark:text-[#6e9fc1]' :
                            'bg-[#a3cae9]/30 text-[#395a7f] dark:bg-[#395a7f]/15 dark:text-[#a3cae9]'
                          )}>
                            {detailNode.metadata.criticality || 'N/A'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Certification Basis:</span>
                          <span className="text-right">{detailNode.details?.certificationBasis || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Risk Assessment:</span>
                          <span className="text-right">{detailNode.details?.riskAssessment || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Compliance:</span>
                          <Badge variant={detailNode.details?.complianceStatus === 'Compliant' ? 'default' : 'destructive'}>
                            {detailNode.details?.complianceStatus || 'Unknown'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="flex items-center gap-2 font-medium text-sm mb-2">
                        <User className="w-4 h-4" />
                        Ownership & Reviews
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Owner:</span>
                          <span>{detailNode.metadata.owner}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Updated:</span>
                          <span>{detailNode.metadata.lastUpdated}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Review:</span>
                          <span>{detailNode.details?.lastReviewDate || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Next Review:</span>
                          <span>{detailNode.details?.nextReviewDate || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="flex items-center gap-2 font-medium text-sm mb-2">
                        <CheckCircle className="w-4 h-4" />
                        Verification
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Method:</span>
                          <span className="text-right">{detailNode.details?.verificationMethod || 'N/A'}</span>
                        </div>
                        {detailNode.details?.testCases && (
                          <div>
                            <span className="text-muted-foreground">Test Cases:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {detailNode.details.testCases.map((testCase) => (
                                <Badge key={testCase} variant="outline" className="text-xs">
                                  {testCase}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Relationships Section */}
                {(detailNode.details?.parentRequirement || detailNode.details?.childRequirements) && (
                  <div>
                    <h4 className="flex items-center gap-2 font-medium text-sm mb-3">
                      <Network className="w-4 h-4" />
                      Relationships
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {detailNode.details?.parentRequirement && (
                        <div>
                          <span className="text-muted-foreground">Parent Requirement:</span>
                          <div className="mt-1">
                            <Badge variant="outline" className="text-xs">
                              {detailNode.details.parentRequirement}
                            </Badge>
                          </div>
                        </div>
                      )}
                      {detailNode.details?.childRequirements && (
                        <div>
                          <span className="text-muted-foreground">Child Requirements:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {detailNode.details.childRequirements.map((child) => (
                              <Badge key={child} variant="outline" className="text-xs">
                                {child}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Stakeholders Section */}
                {detailNode.details?.stakeholders && (
                  <div>
                    <h4 className="flex items-center gap-2 font-medium text-sm mb-3">
                      <Users className="w-4 h-4" />
                      Stakeholders
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {detailNode.details.stakeholders.map((stakeholder) => (
                        <Badge key={stakeholder} variant="secondary" className="text-xs">
                          {stakeholder}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags Section */}
                {detailNode.details?.tags && (
                  <div>
                    <h4 className="flex items-center gap-2 font-medium text-sm mb-3">
                      <Tag className="w-4 h-4" />
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {detailNode.details.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Change History Section */}
                {detailNode.details?.changeHistory && (
                  <div>
                    <h4 className="flex items-center gap-2 font-medium text-sm mb-3">
                      <History className="w-4 h-4" />
                      Change History
                    </h4>
                    <div className="space-y-3">
                      {detailNode.details.changeHistory.map((change, index) => (
                        <div key={index} className="border-l-2 border-muted pl-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{change.author}</span>
                            <span className="text-xs text-muted-foreground">{change.date}</span>
                          </div>
                          <p className="text-sm mb-1">{change.change}</p>
                          <p className="text-xs text-muted-foreground italic">{change.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" size="sm" className="flex-1">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Open in {detailNode.metadata.source}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Download className="w-4 h-4 mr-1" />
                    Export Details
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <History className="w-4 h-4 mr-1" />
                    View Full History
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
