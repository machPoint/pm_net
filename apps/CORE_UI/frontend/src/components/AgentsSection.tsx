"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Package,
  MessageCircle,
  Send,
  Loader2,
  RotateCcw,
  Trash
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

const OPAL_BASE_URL = '/api/opal/proxy';

export default function AgentsSection() {
  const [agents, setAgents] = useState<Agent[]>([]);

  // Fetch agents from OpenClaw status + graph resource nodes
  useEffect(() => {
    async function fetchAgents() {
      try {
        // Fetch from both sources in parallel
        const [openclawRes, graphRes] = await Promise.all([
          fetch('/api/openclaw/status').catch(() => null),
          fetch(`${OPAL_BASE_URL}/api/nodes?node_type=resource`).catch(() => null),
        ]);

        const merged: Agent[] = [];
        const seenIds = new Set<string>();
        const seenNames = new Set<string>(); // track OC agent names to dedup graph nodes

        // 1. OpenClaw agents (live runtime data)
        if (openclawRes?.ok) {
          const oc = await openclawRes.json();
          const ocAgents = oc.health?.agents || oc.status?.heartbeat?.agents || [];
          const ocSkills = Array.isArray(oc.skills) ? oc.skills : (oc.skills?.skills || []);
          const sessionDefaults = oc.health?.sessions?.defaults || oc.status?.sessions?.defaults || {};

          for (const a of ocAgents) {
            const id = `openclaw-${a.agentId}`;
            seenIds.add(id);
            seenNames.add(a.agentId.toLowerCase());
            seenNames.add(a.agentId.toLowerCase().replace(/-/g, ' '));
            const eligibleSkills = (ocSkills || []).filter((s: any) => s.eligible).map((s: any) => s.name);
            const sessionCount = a.sessions?.count || 0;
            const lastSession = a.sessions?.recent?.[0];
            const lastActivityAge = lastSession?.age;
            const lastActivityStr = lastActivityAge
              ? lastActivityAge < 60000 ? 'just now'
              : lastActivityAge < 3600000 ? `${Math.round(lastActivityAge / 60000)}m ago`
              : lastActivityAge < 86400000 ? `${Math.round(lastActivityAge / 3600000)}h ago`
              : `${Math.round(lastActivityAge / 86400000)}d ago`
              : '';
            const heartbeatStr = a.heartbeat?.enabled ? `every ${a.heartbeat.every}` : 'disabled';
            const descParts = [
              `Heartbeat: ${heartbeatStr}`,
              sessionCount > 0 ? `${sessionCount} session${sessionCount > 1 ? 's' : ''}` : 'No sessions',
              lastActivityStr ? `Last active: ${lastActivityStr}` : '',
              a.isDefault ? 'Default agent' : '',
            ].filter(Boolean);

            merged.push({
              id,
              name: `OpenClaw: ${a.agentId}`,
              description: descParts.join(' · '),
              type: 'integrator',
              status: a.heartbeat?.enabled ? 'active' : 'stopped',
              systemPrompt: '',
              model: (sessionDefaults.model || 'gpt-4o') as Agent['model'],
              temperature: 0.7,
              maxTokens: sessionDefaults.contextTokens || 1000,
              schedule: {
                enabled: !!a.heartbeat?.enabled,
                frequency: a.heartbeat?.every?.includes('m') ? 'realtime' : 'hourly',
              },
              dataSources: eligibleSkills.slice(0, 8),
              outputChannels: ['graph-db', 'event-stream'],
              runsCount: sessionCount,
              successRate: sessionCount > 0 ? 100 : 0,
              lastRun: lastActivityStr || undefined,
              metadata: {
                created: '',
                createdBy: 'OpenClaw',
                lastModified: oc.fetchedAt || '',
                version: oc.status?.update?.registry?.latestVersion || '1.0',
              },
            });
          }
        }

        // 2. Graph resource nodes (agent type)
        if (graphRes?.ok) {
          const data = await graphRes.json();
          const nodes = data.nodes || [];
          for (const n of nodes) {
            const meta = typeof n.metadata === 'string' ? JSON.parse(n.metadata) : (n.metadata || {});
            if (meta.resource_type !== 'agent') continue;
            const id = n.id;
            if (seenIds.has(id)) continue;
            // Skip graph nodes that duplicate an OpenClaw agent
            const normalizedTitle = (n.title || '').toLowerCase().trim();
            if (seenNames.has(normalizedTitle)) continue;
            seenIds.add(id);
            merged.push({
              id,
              name: n.title,
              description: n.description || '',
              type: meta.agent_type || 'monitor',
              status: n.status === 'available' ? 'active' : n.status === 'busy' ? 'active' : 'stopped',
              systemPrompt: meta.system_prompt || '',
              model: meta.model || 'gpt-4o',
              temperature: meta.temperature ?? 0.7,
              maxTokens: meta.max_tokens ?? 1000,
              schedule: { enabled: false, frequency: 'manual' },
              dataSources: meta.data_sources || [],
              outputChannels: meta.output_channels || [],
              runsCount: meta.runs_count ?? 0,
              successRate: meta.success_rate ?? 0,
              metadata: {
                created: n.created_at || '',
                createdBy: n.created_by || '',
                lastModified: n.updated_at || '',
                version: meta.version || '1.0',
              },
            });
          }
        }

        setAgents(merged);
      } catch (err) {
        console.error('Failed to fetch agents:', err);
      }
    }
    fetchAgents();
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Workspace editor state
  const [wsFiles, setWsFiles] = useState<Record<string, string>>({});
  const [wsActiveFile, setWsActiveFile] = useState<string>("");
  const [wsEditContent, setWsEditContent] = useState<string>("");
  const [wsLoading, setWsLoading] = useState(false);
  const [wsSaving, setWsSaving] = useState(false);
  const [wsEditing, setWsEditing] = useState(false);

  // Fetch workspace files when an OpenClaw agent is selected
  useEffect(() => {
    if (!selectedAgent?.id.startsWith('openclaw-')) {
      setWsFiles({});
      setWsActiveFile('');
      setWsEditing(false);
      return;
    }
    const ocId = selectedAgent.id.replace('openclaw-', '');
    setWsLoading(true);
    fetch(`/api/openclaw/agents/${ocId}/workspace`)
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.files) {
          setWsFiles(data.files);
          const first = Object.keys(data.files).sort()[0] || '';
          setWsActiveFile(first);
          setWsEditContent(data.files[first] || '');
          setWsEditing(false);
        }
      })
      .catch(() => setWsFiles({}))
      .finally(() => setWsLoading(false));
  }, [selectedAgent]);

  const handleWsSave = async () => {
    if (!selectedAgent?.id.startsWith('openclaw-') || !wsActiveFile) return;
    const ocId = selectedAgent.id.replace('openclaw-', '');
    setWsSaving(true);
    try {
      const res = await fetch(`/api/openclaw/agents/${ocId}/workspace`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: { [wsActiveFile]: wsEditContent } }),
      });
      if (res.ok) {
        setWsFiles(prev => ({ ...prev, [wsActiveFile]: wsEditContent }));
        setWsEditing(false);
        toast.success(`Saved ${wsActiveFile}`);
      } else {
        toast.error('Failed to save file');
      }
    } catch {
      toast.error('Failed to save file');
    } finally {
      setWsSaving(false);
    }
  };

  // Chat state
  interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: string;
    meta?: Record<string, any>;
  }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load chat history when an OpenClaw agent is selected
  useEffect(() => {
    if (!selectedAgent?.id.startsWith('openclaw-')) {
      setChatMessages([]);
      setChatOpen(false);
      return;
    }
    const ocId = selectedAgent.id.replace('openclaw-', '');
    fetch(`/api/openclaw/agents/${ocId}/chat`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) setChatMessages(data.messages || []);
      })
      .catch(() => setChatMessages([]));
  }, [selectedAgent]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim() || !selectedAgent?.id.startsWith('openclaw-') || chatSending) return;
    const ocId = selectedAgent.id.replace('openclaw-', '');
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatSending(true);

    // Optimistic: add user message immediately
    const now = new Date().toISOString();
    setChatMessages(prev => [...prev, { role: "user", content: userMsg, timestamp: now }]);

    try {
      const res = await fetch(`/api/openclaw/agents/${ocId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      if (data.ok) {
        setChatMessages(prev => [...prev, {
          role: "assistant",
          content: data.reply,
          timestamp: new Date().toISOString(),
          meta: data.meta,
        }]);
        // Refresh workspace files in case the agent modified them
        if (selectedAgent?.id.startsWith('openclaw-')) {
          fetch(`/api/openclaw/agents/${ocId}/workspace`)
            .then(r => r.json())
            .then(wsData => {
              if (wsData.ok && wsData.files) {
                setWsFiles(wsData.files);
                if (wsActiveFile) setWsEditContent(wsData.files[wsActiveFile] || '');
              }
            })
            .catch(() => {});
        }
      } else {
        setChatMessages(prev => [...prev, {
          role: "system",
          content: `Error: ${data.error || 'Unknown error'}`,
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch (err: any) {
      setChatMessages(prev => [...prev, {
        role: "system",
        content: `Error: ${err.message}`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setChatSending(false);
    }
  }, [chatInput, selectedAgent, chatSending, wsActiveFile]);

  const handleClearChat = async () => {
    if (!selectedAgent?.id.startsWith('openclaw-')) return;
    const ocId = selectedAgent.id.replace('openclaw-', '');
    await fetch(`/api/openclaw/agents/${ocId}/chat`, { method: 'DELETE' });
    setChatMessages([]);
    toast.success("Chat history cleared");
  };

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

  const handleCreateAgent = async () => {
    try {
      // Derive a CLI-safe agent id from the name
      const agentId = formName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `agent-${Date.now()}`;

      // 1. Create OpenClaw agent with workspace files
      const ocRes = await fetch('/api/openclaw/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: agentId,
          model: 'anthropic/claude-sonnet-4-5',
          workspace: {
            "SOUL.md": `# SOUL.md - ${formName}\n\n${formSystemPrompt || 'You are a helpful agent.'}\n\n## Role\n\nType: ${formType}\n${formDescription ? `\n## Description\n\n${formDescription}\n` : ''}`,
            "IDENTITY.md": `# IDENTITY.md\n\n- **Name:** ${formName}\n- **Vibe:** ${formType}\n- **Emoji:** 🤖\n`,
            "USER.md": "# USER.md\n\nYou are helping the PM_NET engineering team.\n",
          },
        }),
      });

      if (!ocRes.ok) {
        const err = await ocRes.json();
        throw new Error(err.error || 'Failed to create OpenClaw agent');
      }

      const newAgent: Agent = {
        id: `openclaw-${agentId}`,
        name: `OpenClaw: ${agentId}`,
        description: formDescription || `${formType} agent`,
        type: formType,
        status: "active",
        systemPrompt: formSystemPrompt,
        model: 'gpt-4o' as Agent['model'],
        temperature: formTemperature,
        maxTokens: formMaxTokens,
        schedule: {
          enabled: formScheduleEnabled,
          frequency: formScheduleFrequency,
        },
        dataSources: [],
        outputChannels: ['graph-db', 'event-stream'],
        runsCount: 0,
        successRate: 0,
        metadata: {
          created: new Date().toISOString(),
          createdBy: "OpenClaw",
          lastModified: new Date().toISOString(),
          version: "1.0"
        }
      };

      setAgents([...agents, newAgent]);
      setShowCreateDialog(false);
      resetForm();
      toast.success(`Agent "${agentId}" created in OpenClaw`);
    } catch (err: any) {
      console.error('Failed to create agent:', err);
      toast.error(err.message || "Failed to create agent");
    }
  };

  const handleEditAgent = async () => {
    if (!editingAgent) return;

    try {
      // Only update graph nodes (not OpenClaw agents which have openclaw- prefix)
      if (!editingAgent.id.startsWith('openclaw-')) {
        await fetch(`${OPAL_BASE_URL}/api/nodes/${editingAgent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formName,
            description: formDescription,
            metadata: {
              resource_type: 'agent',
              agent_type: formType,
              system_prompt: formSystemPrompt,
              model: formModel,
              temperature: formTemperature,
              max_tokens: formMaxTokens,
              schedule_enabled: formScheduleEnabled,
              schedule_frequency: formScheduleFrequency,
            },
          }),
        });
      }

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
      toast.success("Agent updated");
    } catch (err) {
      console.error('Failed to update agent:', err);
      toast.error("Failed to update agent");
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    try {
      if (agentId.startsWith('openclaw-')) {
        // Delete from OpenClaw
        const ocId = agentId.replace('openclaw-', '');
        if (ocId === 'main') {
          toast.error("Cannot delete the main agent");
          return;
        }
        const res = await fetch(`/api/openclaw/agents?id=${encodeURIComponent(ocId)}`, { method: 'DELETE' });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to delete OpenClaw agent');
        }
      } else {
        await fetch(`${OPAL_BASE_URL}/api/nodes/${agentId}`, { method: 'DELETE' });
      }
      setAgents(agents.filter(a => a.id !== agentId));
      if (selectedAgent?.id === agentId) {
        setSelectedAgent(null);
      }
      toast.success("Agent deleted");
    } catch (err: any) {
      console.error('Failed to delete agent:', err);
      toast.error(err.message || "Failed to delete agent");
    }
  };

  const handleToggleAgent = async (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    const newStatus = agent.status === "active" ? "paused" : "active";

    try {
      if (!agentId.startsWith('openclaw-')) {
        await fetch(`${OPAL_BASE_URL}/api/nodes/${agentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus === 'active' ? 'available' : 'offline' }),
        });
      }
      setAgents(agents.map(a => a.id === agentId ? { ...a, status: newStatus } : a));
      toast.success(`Agent ${newStatus === 'active' ? 'activated' : 'paused'}`);
    } catch (err) {
      console.error('Failed to toggle agent:', err);
      toast.error("Failed to update agent status");
    }
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
        <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Agent Control Admin</h2>
            <p className="text-xs text-muted-foreground">Configure and manage AI agents</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {selectedAgent ? (
            <div className="space-y-3 max-w-4xl">
              {/* Compact Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">{selectedAgent.name}</h3>
                  <Badge className={cn("text-xs", getStatusColor(selectedAgent.status))}>
                    {selectedAgent.status}
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-mono">
                    {selectedAgent.model}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleToggleAgent(selectedAgent.id)}>
                    {selectedAgent.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(selectedAgent)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteAgent(selectedAgent.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Compact Info Grid */}
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium capitalize">{selectedAgent.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Schedule</span>
                      <span className="font-medium">{selectedAgent.schedule.enabled ? selectedAgent.schedule.frequency : 'disabled'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Temperature</span>
                      <span className="font-medium">{selectedAgent.temperature}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Tokens</span>
                      <span className="font-medium">{selectedAgent.maxTokens?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Runs</span>
                      <span className="font-medium">{selectedAgent.runsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Success</span>
                      <span className="font-medium">{selectedAgent.successRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Active</span>
                      <span className="font-medium">{selectedAgent.lastRun || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Provider</span>
                      <span className="font-medium">{selectedAgent.id.startsWith('openclaw-') ? 'OpenClaw' : 'Graph'}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedAgent.description && (
                    <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border">
                      {selectedAgent.description}
                    </p>
                  )}

                  {/* Skills & Channels row */}
                  {(selectedAgent.dataSources.length > 0 || selectedAgent.outputChannels.length > 0) && (
                    <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-3">
                      {selectedAgent.dataSources.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Skills:</span>
                          <div className="flex flex-wrap gap-1">
                            {selectedAgent.dataSources.map((s) => (
                              <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">{s}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedAgent.outputChannels.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Output:</span>
                          <div className="flex flex-wrap gap-1">
                            {selectedAgent.outputChannels.map((c) => (
                              <Badge key={c} variant="secondary" className="text-[10px] px-1.5 py-0">{c}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* System Prompt (only if non-empty) */}
                  {selectedAgent.systemPrompt && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <Label className="text-xs text-muted-foreground mb-1 block">System Prompt</Label>
                      <div className="p-2 bg-muted/30 rounded text-xs font-mono whitespace-pre-wrap max-h-[100px] overflow-auto">
                        {selectedAgent.systemPrompt}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Workspace Document Editor (OpenClaw agents only) */}
              {selectedAgent.id.startsWith('openclaw-') && (
                <Card>
                  <CardHeader className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <CardTitle className="text-sm">Workspace Documents</CardTitle>
                        <span className="text-xs text-muted-foreground">personality, behavior, memory</span>
                      </div>
                      {wsEditing && (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => {
                            setWsEditContent(wsFiles[wsActiveFile] || '');
                            setWsEditing(false);
                          }}>
                            Cancel
                          </Button>
                          <Button size="sm" onClick={handleWsSave} disabled={wsSaving}>
                            {wsSaving ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {wsLoading ? (
                      <div className="text-sm text-muted-foreground py-8 text-center">Loading workspace files...</div>
                    ) : Object.keys(wsFiles).length === 0 ? (
                      <div className="text-sm text-muted-foreground py-8 text-center">No workspace files found</div>
                    ) : (
                      <div className="space-y-3">
                        {/* File tabs */}
                        <div className="flex flex-wrap gap-1 border-b border-border pb-2">
                          {Object.keys(wsFiles).sort().map((filename) => (
                            <button
                              key={filename}
                              onClick={() => {
                                if (wsEditing && wsActiveFile !== filename) {
                                  if (!confirm('Discard unsaved changes?')) return;
                                }
                                setWsActiveFile(filename);
                                setWsEditContent(wsFiles[filename] || '');
                                setWsEditing(false);
                              }}
                              className={cn(
                                "px-3 py-1.5 text-xs rounded-md transition-colors",
                                wsActiveFile === filename
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
                              )}
                            >
                              {filename}
                            </button>
                          ))}
                        </div>

                        {/* File content */}
                        {wsActiveFile && (
                          <div>
                            {wsEditing ? (
                              <Textarea
                                value={wsEditContent}
                                onChange={(e) => setWsEditContent(e.target.value)}
                                className="font-mono text-sm min-h-[300px] resize-y"
                                placeholder="File content..."
                              />
                            ) : (
                              <div
                                className="p-4 bg-muted/30 rounded-lg text-sm font-mono whitespace-pre-wrap max-h-[400px] overflow-auto cursor-pointer hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                                onClick={() => {
                                  setWsEditContent(wsFiles[wsActiveFile] || '');
                                  setWsEditing(true);
                                }}
                                title="Click to edit"
                              >
                                {wsFiles[wsActiveFile] || '(empty)'}
                              </div>
                            )}
                            {!wsEditing && (
                              <p className="text-xs text-muted-foreground mt-1">Click the content above to edit</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Agent Chat (OpenClaw agents only) */}
              {selectedAgent.id.startsWith('openclaw-') && (
                <Card>
                  <CardHeader className="px-4 py-3 cursor-pointer" onClick={() => setChatOpen(!chatOpen)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-muted-foreground" />
                        <CardTitle className="text-sm">Chat with {selectedAgent.name.replace('OpenClaw: ', '')}</CardTitle>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {chatMessages.length} msg
                        </Badge>
                        <span className="text-xs text-muted-foreground">reads SOUL.md automatically</span>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {chatMessages.length > 0 && (
                          <Button size="sm" variant="ghost" onClick={handleClearChat} title="Clear history">
                            <Trash className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setChatOpen(!chatOpen)}>
                          {chatOpen ? '▲' : '▼'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {chatOpen && (
                    <CardContent>
                      <div className="flex flex-col">
                        {/* Messages area */}
                        <div className="h-[400px] overflow-auto border border-border rounded-lg p-3 mb-3 bg-muted/20 space-y-3">
                          {chatMessages.length === 0 && (
                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                              <div className="text-center">
                                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p>No messages yet. Start a conversation!</p>
                                <p className="text-xs mt-1 opacity-70">The agent will read its SOUL.md and workspace files automatically.</p>
                              </div>
                            </div>
                          )}
                          {chatMessages.map((msg, i) => (
                            <div
                              key={i}
                              className={cn(
                                "flex",
                                msg.role === "user" ? "justify-end" : "justify-start"
                              )}
                            >
                              <div
                                className={cn(
                                  "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                                  msg.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : msg.role === "system"
                                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                                    : "bg-card border border-border"
                                )}
                              >
                                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                                <div className={cn(
                                  "text-[10px] mt-1 opacity-60",
                                  msg.role === "user" ? "text-right" : "text-left"
                                )}>
                                  {new Date(msg.timestamp).toLocaleTimeString()}
                                  {msg.meta?.model && ` · ${msg.meta.model}`}
                                  {msg.meta?.durationMs && ` · ${(msg.meta.durationMs / 1000).toFixed(1)}s`}
                                </div>
                              </div>
                            </div>
                          ))}
                          {chatSending && (
                            <div className="flex justify-start">
                              <div className="bg-card border border-border rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span className="text-muted-foreground">Agent is thinking...</span>
                              </div>
                            </div>
                          )}
                          <div ref={chatEndRef} />
                        </div>

                        {/* Input area */}
                        <div className="flex gap-2">
                          <Input
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            placeholder={chatSending ? "Waiting for response..." : "Type a message..."}
                            disabled={chatSending}
                            className="flex-1"
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={chatSending || !chatInput.trim()}
                            size="sm"
                          >
                            {chatSending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}
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
