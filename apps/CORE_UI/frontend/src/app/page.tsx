"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Toaster } from "sonner";
import { ChevronDown, ChevronRight, Bot, Wrench, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeProvider, useTheme } from "@/hooks/use-theme";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import TopBar from "@/components/TopBar";
import LeftNav from "@/components/LeftNav";
import AIChatPanel from "@/components/AIChatPanel";
import NotesSection from "@/components/NotesSection";
import PulseSection from "@/components/PulseSection";
import TasksSection from "@/components/TasksSection";
import AgentsSection from "@/components/AgentsSection";
import SystemAdminSection from "@/components/SystemAdminSection";
import NetworkSection from "@/components/NetworkSection";
import GanttSection from "@/components/GanttSection";
import RisksSection from "@/components/RisksSection";
import DecisionsSection from "@/components/DecisionsSection";
import AnalyticsSection from "@/components/AnalyticsSection";

// Generate mock context data
function generateContextData() {
  return {
    relatedItems: [
      {
        id: "1",
        type: "requirement" as const,
        title: "API Documentation v2.1",
        owner: "Sarah Chen",
        lastUpdated: "2 hours ago",
        sourceColor: "#3b82f6",
        isReadOnly: false
      },
      {
        id: "2",
        type: "test" as const,
        title: "OAuth2 Integration Tests",
        owner: "Mike Rodriguez",
        lastUpdated: "4 hours ago",
        sourceColor: "#10b981",
        isReadOnly: true
      },
      {
        id: "3",
        type: "issue" as const,
        title: "Database Schema Changes",
        owner: "Alex Kim",
        lastUpdated: "1 day ago",
        sourceColor: "#f59e0b",
        isReadOnly: false
      }
    ],
    aiInsights: [
      {
        id: "1",
        type: "coverage" as const,
        title: "Test Coverage Analysis",
        description: "Current test coverage is at 78% across all modules. Consider adding tests for edge cases.",
        severity: "medium" as const,
        source: "AI Analysis",
        timestamp: "1 hour ago",
        percentage: 78
      },
      {
        id: "2",
        type: "suggestion" as const,
        title: "Performance Optimization",
        description: "Database queries can be optimized by adding proper indexes to user table.",
        severity: "low" as const,
        source: "Performance AI",
        timestamp: "3 hours ago"
      },
      {
        id: "3",
        type: "risk" as const,
        title: "Security Vulnerability",
        description: "Potential SQL injection risk detected in user input validation.",
        severity: "high" as const,
        source: "Security AI",
        timestamp: "5 hours ago"
      }
    ]
  };
}

// Generate agent list data
function generateAgentListData() {
  return [
    { id: "orchestrator", name: "Orchestrator", layer: "Meta", status: "active", color: "#22c55e" },
    { id: "query", name: "Query Agent", layer: "Operational", status: "idle", color: "#3b82f6" },
    { id: "artifact", name: "Artifact Agent", layer: "Operational", status: "idle", color: "#3b82f6" },
    { id: "network-builder", name: "Network Builder", layer: "Construction", status: "idle", color: "#8b5cf6" },
    { id: "data-ingestion", name: "Data Ingestion", layer: "Construction", status: "busy", color: "#8b5cf6" },
    { id: "onboarding", name: "Onboarding", layer: "Schema Gen", status: "idle", color: "#f59e0b" },
    { id: "schema-builder", name: "Schema Builder", layer: "Schema Gen", status: "idle", color: "#f59e0b" }
  ];
}

// Generate agent capabilities data
function generateCapabilitiesData() {
  return [
    { id: "1", capability: "Graph Traversal", agents: ["Query", "Network Builder"], color: "#3b82f6" },
    { id: "2", capability: "Report Generation", agents: ["Artifact"], color: "#10b981" },
    { id: "3", capability: "Data Ingestion", agents: ["Data Ingestion"], color: "#8b5cf6" },
    { id: "4", capability: "Schema Building", agents: ["Schema Builder", "Onboarding"], color: "#f59e0b" },
    { id: "5", capability: "Agent Routing", agents: ["Orchestrator"], color: "#22c55e" }
  ];
}

// Generate system info data
function generateSystemInfoData() {
  return {
    version: "1.0.0-alpha",
    provider: "OpenClaw",
    providerVersion: "0.9.x",
    agentCount: 7,
    uptime: "2h 34m",
    graphNodes: "~500",
    architecture: "5-Layer Agent System",
    mode: "Development"
  };
}

function PageContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("pulse");
  const [leftNavCollapsed, setLeftNavCollapsed] = useState(false);
  const [contextPanelCollapsed, setContextPanelCollapsed] = useState(false);
  const [agentListCollapsed, setAgentListCollapsed] = useState(false);
  const [capabilitiesCollapsed, setCapabilitiesCollapsed] = useState(false);
  const [systemInfoCollapsed, setSystemInfoCollapsed] = useState(false);
  const [useAIChat, setUseAIChat] = useState(true); // Kept for compatibility
  const { theme } = useTheme();

  const agentListData = generateAgentListData();
  const capabilitiesData = generateCapabilitiesData();
  const systemInfo = generateSystemInfoData();


  const renderActiveSection = () => {
    switch (activeTab) {
      case "notes":
        return <NotesSection />;
      case "pulse":
        return <PulseSection />;
      case "network":
        return <NetworkSection />;
      case "gantt":
        return <GanttSection />;
      case "risks":
        return <RisksSection />;
      case "decisions":
        return <DecisionsSection />;
      case "analytics":
        return <AnalyticsSection />;
      case "tasks":
        return <TasksSection onNavigate={setActiveTab} />;
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
      case "system-admin":
        return <SystemAdminSection />;
      default:
        return <PulseSection />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--color-background)]">
      {/* Top Bar */}
      <TopBar
        breadcrumbs={[
          { id: "workspace", label: "Aerospace Engineering Workspace" },
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
                        {cap.agents.map((agent, idx) => (
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
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-2 resize-handle cursor-col-resize" />

          {/* Central Content Area - Now full width */}
          <Panel defaultSize={88} minSize={60} className="bg-[var(--color-main-panel)]">
            <ScrollArea className="h-full">
              {renderActiveSection()}
            </ScrollArea>
          </Panel>


        </PanelGroup>
      </div>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        expand={false}
        theme={theme}
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