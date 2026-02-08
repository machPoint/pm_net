"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bot,
  Search,
  Plus,
  Settings,
  Play,
  Pause,
  Trash2,
  Edit,
  Copy,
  Calendar,
  Clock,
  Zap,
  Brain,
  AlertCircle,
  CheckCircle2,
  Activity,
  TrendingUp,
  Shield,
  FileText,
  Database,
  Mail,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string;
  description: string;
  type: "monitor" | "analyzer" | "validator" | "reporter" | "integrator";
  status: "active" | "paused" | "error" | "stopped";
  systemPrompt: string;
  model: "gpt-4o" | "gpt-4o-mini" | "gpt-3.5-turbo";
  temperature: number;
  maxTokens: number;
  schedule: {
    enabled: boolean;
    frequency: "realtime" | "hourly" | "daily" | "weekly" | "manual";
    time?: string;
  };
  dataSources: string[];
  outputChannels: string[];
  lastRun?: string;
  nextRun?: string;
  runsCount: number;
  successRate: number;
  metadata: {
    created: string;
    createdBy: string;
    lastModified: string;
    version: string;
  };
}

const mockAgents: Agent[] = [
  {
    id: "agent-001",
    name: "Requirements Compliance Monitor",
    description: "Continuously monitors requirements for compliance issues and certification gaps",
    type: "monitor",
    status: "active",
    systemPrompt: "You are a requirements compliance specialist. Monitor aerospace requirements for FAR 25 compliance, identify gaps, and flag potential certification issues. Focus on DAL-A and DAL-B requirements.",
    model: "gpt-4o",
    temperature: 0.2,
    maxTokens: 1000,
    schedule: {
      enabled: true,
      frequency: "hourly",
    },
    dataSources: ["Jama", "Jira", "Email"],
    outputChannels: ["Slack", "Email", "Dashboard"],
    lastRun: "2 minutes ago",
    nextRun: "In 58 minutes",
    runsCount: 247,
    successRate: 98.4,
    metadata: {
      created: "2024-01-05",
      createdBy: "Sarah Mitchell",
      lastModified: "2024-01-15",
      version: "2.1"
    }
  },
  {
    id: "agent-002",
    name: "Cross-System Integration Analyzer",
    description: "Analyzes data across systems to discover hidden dependencies and integration points",
    type: "analyzer",
    status: "active",
    systemPrompt: "You are a systems integration expert. Analyze requirements, tickets, and documentation to identify cross-system dependencies, shared resources, and potential integration issues. Focus on safety-critical interfaces.",
    model: "gpt-4o",
    temperature: 0.3,
    maxTokens: 1500,
    schedule: {
      enabled: true,
      frequency: "daily",
      time: "02:00"
    },
    dataSources: ["Jama", "Jira", "Windchill", "Email"],
    outputChannels: ["Dashboard", "Email"],
    lastRun: "4 hours ago",
    nextRun: "Tomorrow at 2:00 AM",
    runsCount: 89,
    successRate: 95.5,
    metadata: {
      created: "2024-01-08",
      createdBy: "James Rodriguez",
      lastModified: "2024-01-14",
      version: "1.3"
    }
  },
  {
    id: "agent-003",
    name: "Test Coverage Validator",
    description: "Validates that all requirements have adequate test coverage and identifies gaps",
    type: "validator",
    status: "paused",
    systemPrompt: "You are a verification and validation specialist. Analyze requirements and test cases to ensure complete traceability and adequate coverage. Flag untested or inadequately tested requirements.",
    model: "gpt-4o-mini",
    temperature: 0.1,
    maxTokens: 800,
    schedule: {
      enabled: false,
      frequency: "weekly",
      time: "Monday 09:00"
    },
    dataSources: ["Jama", "TestRail", "Jira"],
    outputChannels: ["Dashboard", "Slack"],
    lastRun: "3 days ago",
    nextRun: "Paused",
    runsCount: 34,
    successRate: 100,
    metadata: {
      created: "2024-01-10",
      createdBy: "Lisa Chen",
      lastModified: "2024-01-13",
      version: "1.1"
    }
  }
];

export default function AgentsSection() {
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  
  // Filter states
  const [filterLayer, setFilterLayer] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCapability, setFilterCapability] = useState<string>("all");

  // Form states
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<Agent["type"]>("monitor");
  const [formSystemPrompt, setFormSystemPrompt] = useState("");
  const [formModel, setFormModel] = useState<Agent["model"]>("gpt-4o");
  const [formTemperature, setFormTemperature] = useState(0.7);
  const [formMaxTokens, setFormMaxTokens] = useState(1000);
  const [formScheduleEnabled, setFormScheduleEnabled] = useState(false);
  const [formScheduleFrequency, setFormScheduleFrequency] = useState<Agent["schedule"]["frequency"]>("daily");

  const handleCreateAgent = () => {
    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      name: formName,
      description: formDescription,
      type: formType,
      status: "stopped",
      systemPrompt: formSystemPrompt,
      model: formModel,
      temperature: formTemperature,
      maxTokens: formMaxTokens,
      schedule: {
        enabled: formScheduleEnabled,
        frequency: formScheduleFrequency,
      },
      dataSources: [],
      outputChannels: [],
      runsCount: 0,
      successRate: 0,
      metadata: {
        created: new Date().toISOString(),
        createdBy: "Current User",
        lastModified: new Date().toISOString(),
        version: "1.0"
      }
    };

    setAgents([...agents, newAgent]);
    setShowCreateDialog(false);
    resetForm();
    toast.success("Agent created successfully");
  };

  const handleEditAgent = () => {
    if (!editingAgent) return;

    const updatedAgent = {
      ...editingAgent,
      name: formName,
      description: formDescription,
      type: formType,
      systemPrompt: formSystemPrompt,
      model: formModel,
      temperature: formTemperature,
      maxTokens: formMaxTokens,
      schedule: {
        ...editingAgent.schedule,
        enabled: formScheduleEnabled,
        frequency: formScheduleFrequency,
      },
      metadata: {
        ...editingAgent.metadata,
        lastModified: new Date().toISOString(),
      }
    };

    setAgents(agents.map(a => a.id === editingAgent.id ? updatedAgent : a));
    setShowEditDialog(false);
    setEditingAgent(null);
    resetForm();
    toast.success("Agent updated successfully");
  };

  const handleDeleteAgent = (agentId: string) => {
    setAgents(agents.filter(a => a.id !== agentId));
    if (selectedAgent?.id === agentId) {
      setSelectedAgent(null);
    }
    toast.success("Agent deleted");
  };

  const handleToggleAgent = (agentId: string) => {
    setAgents(agents.map(agent => {
      if (agent.id === agentId) {
        const newStatus = agent.status === "active" ? "paused" : "active";
        return { ...agent, status: newStatus };
      }
      return agent;
    }));
    toast.success("Agent status updated");
  };

  const openEditDialog = (agent: Agent) => {
    setEditingAgent(agent);
    setFormName(agent.name);
    setFormDescription(agent.description);
    setFormType(agent.type);
    setFormSystemPrompt(agent.systemPrompt);
    setFormModel(agent.model);
    setFormTemperature(agent.temperature);
    setFormMaxTokens(agent.maxTokens);
    setFormScheduleEnabled(agent.schedule.enabled);
    setFormScheduleFrequency(agent.schedule.frequency);
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormType("monitor");
    setFormSystemPrompt("");
    setFormModel("gpt-4o");
    setFormTemperature(0.7);
    setFormMaxTokens(1000);
    setFormScheduleEnabled(false);
    setFormScheduleFrequency("daily");
  };

  const getAgentTypeIcon = (type: string) => {
    switch (type) {
      case "monitor": return Activity;
      case "analyzer": return TrendingUp;
      case "validator": return Shield;
      case "reporter": return FileText;
      case "integrator": return Database;
      default: return Bot;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/20 text-green-700 dark:text-green-300";
      case "paused": return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300";
      case "error": return "bg-red-500/20 text-red-700 dark:text-red-300";
      case "stopped": return "bg-gray-500/20 text-gray-700 dark:text-gray-300";
      default: return "bg-gray-500/20 text-gray-700 dark:text-gray-300";
    }
  };

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLayer = filterLayer === "all" || 
      agent.metadata.version.includes(filterLayer); // Using version field temporarily for layer
    
    const matchesStatus = filterStatus === "all" || agent.status === filterStatus;
    
    const matchesCapability = filterCapability === "all" || 
      agent.type === filterCapability;
    
    return matchesSearch && matchesLayer && matchesStatus && matchesCapability;
  });

  return (
    <div className="flex h-full bg-background">
      {/* Left Panel - Agent List */}
      <div className="w-96 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">AI Agents</h2>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              className="h-8 px-3"
            >
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          
          {/* Filter Dropdowns */}
          <div className="space-y-2">
            <Select value={filterLayer} onValueChange={setFilterLayer}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Agent Layer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Layers</SelectItem>
                <SelectItem value="meta">Layer 5: Meta</SelectItem>
                <SelectItem value="governance">Layer 4: Governance</SelectItem>
                <SelectItem value="operational">Layer 3: Operational</SelectItem>
                <SelectItem value="construction">Layer 2: Construction</SelectItem>
                <SelectItem value="schema">Layer 1: Schema Gen</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="idle">Idle</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="stopped">Stopped</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterCapability} onValueChange={setFilterCapability}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Capability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Capabilities</SelectItem>
                <SelectItem value="monitor">Graph Traversal</SelectItem>
                <SelectItem value="analyzer">Report Generation</SelectItem>
                <SelectItem value="validator">Schema Building</SelectItem>
                <SelectItem value="reporter">Data Ingestion</SelectItem>
                <SelectItem value="integrator">Agent Routing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {filteredAgents.map((agent) => {
            const Icon = getAgentTypeIcon(agent.type);
            const isSelected = selectedAgent?.id === agent.id;

            return (
              <Card
                key={agent.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-sm",
                  isSelected && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedAgent(agent)}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      <Icon className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm leading-tight">{agent.name}</CardTitle>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {agent.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge className={cn("text-xs", getStatusColor(agent.status))}>
                      {agent.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {agent.successRate}% success
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Main Content - Agent Details */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-border bg-card">
          <h2 className="text-xl font-semibold mb-2">Agent Control Admin</h2>
          <p className="text-sm text-muted-foreground">
            Configure and manage AI agents with specialized prompts, schedules, and operational parameters
          </p>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {selectedAgent ? (
            <div className="space-y-6 max-w-4xl">
              {/* Agent Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-semibold mb-2">{selectedAgent.name}</h3>
                  <p className="text-muted-foreground">{selectedAgent.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleAgent(selectedAgent.id)}
                  >
                    {selectedAgent.status === "active" ? (
                      <>
                        <Pause className="w-4 h-4 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-1" />
                        Activate
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(selectedAgent)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteAgent(selectedAgent.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>

              {/* Status Overview */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge className={cn("text-xs", getStatusColor(selectedAgent.status))}>
                        {selectedAgent.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">Total Runs</div>
                    <div className="text-2xl font-semibold">{selectedAgent.runsCount}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">Success Rate</div>
                    <div className="text-2xl font-semibold">{selectedAgent.successRate}%</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">Schedule</div>
                    <div className="text-sm font-medium">{selectedAgent.schedule.frequency}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Model</Label>
                    <Badge variant="secondary">{selectedAgent.model}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Temperature</Label>
                    <div className="text-sm">{selectedAgent.temperature}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Max Tokens</Label>
                    <div className="text-sm">{selectedAgent.maxTokens}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">System Prompt</Label>
                    <div className="p-3 bg-muted/50 rounded text-sm font-mono whitespace-pre-wrap">
                      {selectedAgent.systemPrompt}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Schedule Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Scheduled Runs</Label>
                      <p className="text-xs text-muted-foreground">
                        {selectedAgent.schedule.enabled ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                    <Badge variant="secondary">{selectedAgent.schedule.frequency}</Badge>
                  </div>
                  {selectedAgent.lastRun && (
                    <div>
                      <Label className="text-sm font-medium mb-1 block">Last Run</Label>
                      <div className="text-sm text-muted-foreground">{selectedAgent.lastRun}</div>
                    </div>
                  )}
                  {selectedAgent.nextRun && (
                    <div>
                      <Label className="text-sm font-medium mb-1 block">Next Run</Label>
                      <div className="text-sm text-muted-foreground">{selectedAgent.nextRun}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Data Sources & Output */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Data Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedAgent.dataSources.map((source) => (
                        <Badge key={source} variant="outline" className="text-xs">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Output Channels</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedAgent.outputChannels.map((channel) => (
                        <Badge key={channel} variant="outline" className="text-xs">
                          {channel}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <h3 className="text-xl font-semibold mb-2">No Agent Selected</h3>
                <p className="text-muted-foreground mb-6">
                  Select an agent from the list to view and configure its settings, or create a new agent to get started.
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Agent
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Agent Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setShowEditDialog(false);
          setEditingAgent(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAgent ? "Edit Agent" : "Create New Agent"}</DialogTitle>
            <DialogDescription>
              Configure the AI agent's behavior, prompts, and operational parameters
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Requirements Compliance Monitor"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this agent does..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Agent Type</Label>
              <Select value={formType} onValueChange={(value) => setFormType(value as Agent["type"])}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monitor">Monitor</SelectItem>
                  <SelectItem value="analyzer">Analyzer</SelectItem>
                  <SelectItem value="validator">Validator</SelectItem>
                  <SelectItem value="reporter">Reporter</SelectItem>
                  <SelectItem value="integrator">Integrator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="systemPrompt">System Prompt *</Label>
              <Textarea
                id="systemPrompt"
                placeholder="You are an expert in... Your role is to..."
                value={formSystemPrompt}
                onChange={(e) => setFormSystemPrompt(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Select value={formModel} onValueChange={(value) => setFormModel(value as Agent["model"])}>
                  <SelectTrigger id="model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formTemperature}
                  onChange={(e) => setFormTemperature(parseFloat(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  min="100"
                  max="4000"
                  step="100"
                  value={formMaxTokens}
                  onChange={(e) => setFormMaxTokens(parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="scheduleEnabled">Enable Scheduled Runs</Label>
                  <p className="text-xs text-muted-foreground">
                    Run this agent automatically on a schedule
                  </p>
                </div>
                <Switch
                  id="scheduleEnabled"
                  checked={formScheduleEnabled}
                  onCheckedChange={setFormScheduleEnabled}
                />
              </div>

              {formScheduleEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select value={formScheduleFrequency} onValueChange={(value) => setFormScheduleFrequency(value as Agent["schedule"]["frequency"])}>
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Real-time</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="manual">Manual Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setShowEditDialog(false);
                setEditingAgent(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingAgent ? handleEditAgent : handleCreateAgent}
              disabled={!formName || !formSystemPrompt}
            >
              {editingAgent ? "Save Changes" : "Create Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
