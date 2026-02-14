"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Toaster } from "sonner";
import { ChevronDown, ChevronRight, Bot, Wrench, Info, Settings, ShieldCheck, Cable, ScrollText, Monitor } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeProvider, useTheme } from "@/hooks/use-theme";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import TopBar from "@/components/TopBar";
import LeftNav from "@/components/LeftNav";
import AIChatPanel from "@/components/AIChatPanel";
import NotesSection from "@/components/NotesSection";
import TasksSection from "@/components/TasksSection";
import AgentsSection from "@/components/AgentsSection";
import SystemAdminSection from "@/components/SystemAdminSection";
import GanttSection from "@/components/GanttSection";
import ApprovalsSection from "@/components/ApprovalsSection";
import AnalyticsSection from "@/components/AnalyticsSection";
import ProjectIntakeSection from "@/components/ProjectIntakeSection";
import DashboardSection from "@/components/DashboardSection";
import AgentAdminSection from "@/components/AgentAdminSection";
import IntegrationMapSection from "@/components/IntegrationMapSection";
import PromptsSection from "@/components/PromptsSection";
import TaskLibrarySection from "@/components/TaskLibrarySection";
import ProjectsSection from "@/components/ProjectsSection";
import MessagesSection from "@/components/MessagesSection";
import ExecutionConsoleSection from "@/components/ExecutionConsoleSection";
import SchedulerSection from "@/components/SchedulerSection";

const OPAL_BASE_URL = '/api/opal/proxy';

function PageContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [leftNavCollapsed, setLeftNavCollapsed] = useState(false);
  const [contextPanelCollapsed, setContextPanelCollapsed] = useState(false);
  const [agentListCollapsed, setAgentListCollapsed] = useState(true);
  const [capabilitiesCollapsed, setCapabilitiesCollapsed] = useState(true);
  const [systemInfoCollapsed, setSystemInfoCollapsed] = useState(true);
  const [adminCollapsed, setAdminCollapsed] = useState(true);
  const [useAIChat, setUseAIChat] = useState(true); // Kept for compatibility
  const { baseTheme } = useTheme();

  const [agentListData, setAgentListData] = useState<any[]>([]);
  const [capabilitiesData, setCapabilitiesData] = useState<any[]>([]);
  const [systemInfo, setSystemInfo] = useState({
    version: "1.0.0-alpha",
    provider: "OpenClaw",
    providerVersion: "",
    agentCount: 0,
    uptime: "",
    graphNodes: "0",
    architecture: "5-Layer Agent System",
    mode: "Development"
  });

  // Fetch sidebar data from OpenClaw + graph API
  useEffect(() => {
    async function fetchSidebarData() {
      try {
        const [ocRes, nodesRes, skillsRes] = await Promise.all([
          fetch('/api/openclaw/status').catch(() => null),
          fetch(`${OPAL_BASE_URL}/api/nodes?limit=500`).catch(() => null),
          fetch(`${OPAL_BASE_URL}/api/diagnostics/tools`).catch(() => null),
        ]);

        // --- Parse responses ---
        let ocData: any = null;
        if (ocRes?.ok) {
          ocData = await ocRes.json();
        }

        let nodeCount = 0;
        if (nodesRes?.ok) {
          const nd = await nodesRes.json();
          nodeCount = (nd.nodes || []).length;
        }

        // --- System Info ---
        const ocAgents = ocData?.health?.agents || ocData?.status?.heartbeat?.agents || [];
        const providerVersion = ocData?.status?.update?.registry?.latestVersion || '';
        const model = ocData?.health?.sessions?.defaults?.model || ocData?.status?.sessions?.defaults?.model || '';

        setSystemInfo({
          version: "1.0.0-alpha",
          provider: "OpenClaw",
          providerVersion,
          agentCount: ocAgents.length,
          uptime: model ? `Model: ${model}` : '',
          graphNodes: String(nodeCount),
          architecture: "5-Layer Agent System",
          mode: "Development",
        });

        // --- Agent List (from OpenClaw) ---
        if (ocAgents.length > 0) {
          const colors = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f87171'];
          setAgentListData(ocAgents.map((a: any, i: number) => ({
            id: `oc-${a.agentId}`,
            name: a.agentId,
            layer: a.heartbeat?.enabled ? `Every ${a.heartbeat?.every || '?'}` : 'Disabled',
            status: a.heartbeat?.enabled ? 'active' : 'idle',
            color: colors[i % colors.length],
          })));
        }

        // --- Capabilities (from diagnostics tools) ---
        if (skillsRes?.ok) {
          const toolsData = await skillsRes.json();
          const tools = toolsData.tools || [];
          const categories = new Map<string, string[]>();
          for (const t of tools) {
            const cat = t.category || 'General';
            if (!categories.has(cat)) categories.set(cat, []);
            categories.get(cat)!.push(t.name);
          }
          const capColors = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#fb923c'];
          let ci = 0;
          setCapabilitiesData(Array.from(categories.entries()).map(([cat, agents]) => ({
            id: cat.toLowerCase().replace(/\s/g, '-'),
            capability: cat,
            agents,
            color: capColors[ci++ % capColors.length],
          })));
        }
      } catch (err) {
        console.error('Failed to fetch sidebar data:', err);
      }
    }
    fetchSidebarData();
  }, []);


  const renderActiveSection = () => {
    switch (activeTab) {
      case "notes":
        return <NotesSection />;
      case "gantt":
        return <GanttSection />;
      case "scheduler":
        return <SchedulerSection />;
      case "approvals":
        return <ApprovalsSection />;
      case "analytics":
        return <AnalyticsSection />;
      case "tasks":
        return <TasksSection onNavigate={setActiveTab} />;
      case "project-intake":
        return <ProjectIntakeSection onNavigateToExecution={() => setActiveTab("execution-console")} />;
      case "execution-console":
        return <ExecutionConsoleSection />;
      case "task-library":
        return <TaskLibrarySection />;
      case "messages":
        return <MessagesSection />;
      case "dashboard":
        return <DashboardSection />;
      case "projects":
        return <ProjectsSection />;
      case "agent-admin":
        return <AgentAdminSection />;
      case "integration-map":
        return <IntegrationMapSection />;
      case "ai-chat":
        return (
          <div className="h-full">
            <AIChatPanel
              onContextChange={(context) => {
                console.log('AI Chat context changed:', context);
              }}
            />
          </div>
        );
      case "agents":
        return <AgentsSection />;
      case "prompts":
        return <PromptsSection />;
      case "system-admin":
        return <SystemAdminSection />;
      default:
        return <DashboardSection />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--color-background)]">
      {/* Top Bar */}
      <TopBar
        breadcrumbs={[
          { id: "workspace", label: "Workspace" },
          { id: "section", label: activeTab.charAt(0).toUpperCase() + activeTab.slice(1) }
        ]}
        onSearchSubmit={(query) => console.log("Search:", query)}
        onBreadcrumbClick={(id) => console.log("Breadcrumb clicked:", id)}
        onAdminClick={() => router.push('/admin-settings')}
        className="flex-shrink-0 h-16"
      />

      {/* Main Content Grid with Resizable Panels */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Left Panel Stack - Navigation + Folders + Tags + Notes */}
          <Panel defaultSize={12} minSize={10} maxSize={40} className="bg-[var(--color-left-panel)] border-r border-border flex flex-col">
            <ScrollArea className="flex-1">
            {/* Navigation Panel */}
            <div className="border-b border-border/50">
              <div className="flex items-center justify-between p-4">
                <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Navigation</h3>
                <button
                  onClick={() => setLeftNavCollapsed(!leftNavCollapsed)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  {leftNavCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-[var(--color-text-primary)]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--color-text-primary)]" />
                  )}
                </button>
              </div>

              <div className={`transition-all duration-200 overflow-hidden ${leftNavCollapsed ? "h-0" : "h-auto"
                }`}>
                <LeftNav
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  className="border-none bg-transparent"
                />
              </div>
            </div>

            {/* Admin Panel */}
            <div className="border-b border-border/50">
              <div className="flex items-center justify-between p-4">
                <h3 className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Admin
                </h3>
                <button
                  onClick={() => setAdminCollapsed(!adminCollapsed)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  {adminCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-[var(--color-text-primary)]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--color-text-primary)]" />
                  )}
                </button>
              </div>

              <div className={`transition-all duration-200 overflow-hidden ${adminCollapsed ? "h-0" : "h-auto"
                }`}>
                <div className="px-4 pb-4 space-y-1">
                  {[
                    { id: "agent-admin", label: "Agent Admin", icon: ShieldCheck },
                    { id: "integration-map", label: "Integration Map", icon: Cable },
                    { id: "prompts", label: "Prompts", icon: ScrollText },
                    { id: "system-admin", label: "System Admin", icon: Monitor },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer group ${
                          activeTab === item.id
                            ? "bg-[#2b2b2b] text-white"
                            : "hover:bg-[#2b2b2b]"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]" />
                        <span className={`text-xs ${
                          activeTab === item.id
                            ? "text-[var(--color-text-primary)] font-medium"
                            : "text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]"
                        }`}>
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Agent List Panel */}
            <div className="border-b border-border/50">
              <div className="flex items-center justify-between p-4">
                <h3 className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  Agent List
                </h3>
                <button
                  onClick={() => setAgentListCollapsed(!agentListCollapsed)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  {agentListCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-[var(--color-text-primary)]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--color-text-primary)]" />
                  )}
                </button>
              </div>

              <div className={`transition-all duration-200 overflow-hidden ${agentListCollapsed ? "h-0" : "h-auto"
                }`}>
                <div className="px-4 pb-4 space-y-1">
                  {agentListData.map((agent) => (
                    <div
                      key={agent.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-[#2b2b2b] cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: agent.color }}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs text-[var(--color-text-primary)] group-hover:text-white truncate">
                            {agent.name}
                          </span>
                          <span className="text-[10px] text-[#666]">
                            {agent.layer}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        agent.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        agent.status === 'busy' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {agent.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Agent Capabilities Panel */}
            <div className="border-b border-border/50">
              <div className="flex items-center justify-between p-4">
                <h3 className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Capabilities
                </h3>
                <button
                  onClick={() => setCapabilitiesCollapsed(!capabilitiesCollapsed)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  {capabilitiesCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-[var(--color-text-primary)]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--color-text-primary)]" />
                  )}
                </button>
              </div>

              <div className={`transition-all duration-200 overflow-hidden ${capabilitiesCollapsed ? "h-0" : "h-auto"
                }`}>
                <div className="px-4 pb-4 space-y-2">
                  {capabilitiesData.map((cap) => (
                    <div
                      key={cap.id}
                      className="p-2 rounded hover:bg-[#2b2b2b] cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: cap.color }}
                        />
                        <span className="text-xs text-[var(--color-text-primary)] group-hover:text-white font-medium">
                          {cap.capability}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 ml-4">
                        {cap.agents.map((agent: string, idx: number) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-[#2b2b2b] text-[#888]">
                            {agent}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* System Info Panel */}
            <div className="flex-1">
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <h3 className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  System Info
                </h3>
                <button
                  onClick={() => setSystemInfoCollapsed(!systemInfoCollapsed)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  {systemInfoCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-[var(--color-text-primary)]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--color-text-primary)]" />
                  )}
                </button>
              </div>

              <div className={`transition-all duration-200 overflow-hidden flex-1 ${systemInfoCollapsed ? "h-0" : "h-auto"
                }`}>
                <div className="px-4 pb-4 pt-4 space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#888]">{"Version"}</span>
                      <span className="text-xs text-[var(--color-text-primary)] font-mono">{systemInfo.version}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#888]">{"Provider"}</span>
                      <span className="text-xs text-[var(--color-text-primary)]">{systemInfo.provider}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#888]">{"Provider Ver"}</span>
                      <span className="text-xs text-[var(--color-text-primary)] font-mono">{systemInfo.providerVersion}</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-border/30 pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#888]">{"Agents"}</span>
                      <span className="text-xs text-[var(--color-text-primary)] font-semibold">{systemInfo.agentCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#888]">{"Graph Nodes"}</span>
                      <span className="text-xs text-[var(--color-text-primary)]">{systemInfo.graphNodes}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#888]">{"Uptime"}</span>
                      <span className="text-xs text-[var(--color-text-primary)]">{systemInfo.uptime}</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-border/30 pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#888]">{"Architecture"}</span>
                      <span className="text-xs text-[var(--color-text-primary)]">{systemInfo.architecture}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#888]">{"Mode"}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">{systemInfo.mode}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </ScrollArea>
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-2 resize-handle cursor-col-resize" />

          {/* Central Content Area - Now full width */}
          <Panel defaultSize={88} minSize={60} className="bg-[var(--color-main-panel)]">
            <div className="h-full overflow-hidden">
              {renderActiveSection()}
            </div>
          </Panel>


        </PanelGroup>
      </div>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        expand={false}
        theme={baseTheme}
        closeButton
      />
    </div>
  );
}

export default function Page() {
  return (
    <ThemeProvider>
      <PageContent />
    </ThemeProvider>
  );
}