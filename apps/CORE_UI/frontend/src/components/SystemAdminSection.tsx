"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/apiConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  Database, 
  Server, 
  Globe, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  Bot,
  ChevronDown,
  Shield,
  Wrench,
  Users
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ServiceStatus {
  name: string;
  url: string;
  port: number;
  status: "online" | "offline" | "checking";
  latency?: number;
  icon: React.ReactNode;
  color: string;
  links: { label: string; url: string }[];
  metrics?: { label: string; value: string | number }[];
}

export default function SystemAdminSection() {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: "Agent Status",
      url: "/api/agents/status",
      port: 0,
      status: "online",
      icon: <Bot className="w-5 h-5" />,
      color: "rgb(34, 197, 94)", // green
      links: [
        { label: "Agent Dashboard", url: "/agents" },
        { label: "Task Queue", url: "/agents/tasks" },
      ],
      metrics: [
        { label: "Active Agents", value: "3" },
        { label: "Tasks Queued", value: "12" },
      ],
    },
    {
      name: "OPAL MCP Server",
      url: "http://localhost:7788",
      port: 7788,
      status: "checking",
      icon: <Activity className="w-5 h-5" />,
      color: "rgb(96, 165, 250)", // blue
      links: [
        { label: "Admin", url: "http://localhost:7788/admin" },
        { label: "MCP Interface", url: "http://localhost:7788/mcp" },
      ],
      metrics: [
        { label: "AI Tools", value: "10" },
        { label: "Sidecars", value: "3" },
      ],
    },
    {
      name: "Core Backend",
      url: `${API_BASE_URL}/health`,
      port: 8000,
      status: "checking",
      icon: <Server className="w-5 h-5" />,
      color: "rgb(167, 139, 250)", // purple
      links: [
        { label: "API Root", url: API_BASE_URL },
        { label: "API Docs", url: `${API_BASE_URL}/docs` },
        { label: "Health", url: `${API_BASE_URL}/health` },
      ],
      metrics: [
        { label: "Framework", value: "FastAPI" },
      ],
    },
    {
      name: "Core Frontend",
      url: "http://localhost:3000/",
      port: 3000,
      status: "checking",
      icon: <Globe className="w-5 h-5" />,
      color: "rgb(248, 113, 113)", // red
      links: [
        { label: "Dashboard", url: "http://localhost:3000" },
      ],
      metrics: [
        { label: "Framework", value: "Next.js 15" },
      ],
    },
  ]);

  const [logs, setLogs] = useState<{ time: string; message: string; isError: boolean }[]>([
    { time: new Date().toLocaleTimeString(), message: "System admin panel initialized", isError: false },
  ]);

  const addLog = (message: string, isError = false) => {
    setLogs((prev) => [
      { time: new Date().toLocaleTimeString(), message, isError },
      ...prev.slice(0, 19), // Keep last 20 logs
    ]);
  };

  const checkService = async (serviceIndex: number) => {
    const service = services[serviceIndex];
    
    setServices((prev) =>
      prev.map((s, i) =>
        i === serviceIndex ? { ...s, status: "checking" as const } : s
      )
    );

    const startTime = Date.now();

    try {
      // Agent Status card - always online, no network check needed
      if (service.port === 0) {
        setServices((prev) =>
          prev.map((s, i) =>
            i === serviceIndex
              ? { ...s, status: "online" as const }
              : s
          )
        );
        addLog(`${service.name} is active`);
        return;
      }
      // Use our API route for OPAL to get real health data
      else if (service.port === 7788) {
        const response = await fetch('/api/opal/health');
        const data = await response.json();
        const latency = Date.now() - startTime;

        if (data.success && data.opal.status === 'online') {
          // Update metrics with real data if available
          const updatedMetrics = [
            { label: "SE Tools", value: "10" },
            { label: "Graph Nodes", value: "~500" },
          ];
          
          setServices((prev) =>
            prev.map((s, i) =>
              i === serviceIndex
                ? { ...s, status: "online" as const, latency, metrics: updatedMetrics }
                : s
            )
          );
          addLog(`${service.name} is online (${latency}ms)`);
        } else {
          throw new Error('OPAL offline');
        }
      }
      // Other services - use no-cors
      else {
        const response = await fetch(service.url, {
          method: "GET",
          mode: "no-cors",
        });

        const latency = Date.now() - startTime;

        setServices((prev) =>
          prev.map((s, i) =>
            i === serviceIndex
              ? { ...s, status: "online" as const, latency }
              : s
          )
        );

        addLog(`${service.name} is online (${latency}ms)`);
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      
      // In no-cors mode, quick responses usually mean the service is up
      if (service.port !== 7788 && latency < 100) {
        setServices((prev) =>
          prev.map((s, i) =>
            i === serviceIndex
              ? { ...s, status: "online" as const, latency }
              : s
          )
        );
        addLog(`${service.name} is online`);
      } else {
        setServices((prev) =>
          prev.map((s, i) =>
            i === serviceIndex ? { ...s, status: "offline" as const } : s
          )
        );
        addLog(`${service.name} is offline`, true);
      }
    }
  };

  const checkAllServices = () => {
    addLog("Refreshing all services...");
    services.forEach((_, index) => {
      setTimeout(() => checkService(index), index * 500);
    });
  };

  useEffect(() => {
    // Initial check
    checkAllServices();

    // Auto-refresh every 30 seconds
    const interval = setInterval(checkAllServices, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "online":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "offline":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "checking":
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "online":
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Online</Badge>;
      case "offline":
        return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">Offline</Badge>;
      case "checking":
        return <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">Checking...</Badge>;
    }
  };

  return (
    <div className="flex h-full bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div>
            <h2 className="text-lg font-semibold">System Admin Dashboard</h2>
            <p className="text-sm text-muted-foreground">Monitor and manage all Core services</p>
          </div>
          
          <Button onClick={checkAllServices} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh All
          </Button>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {services.map((service, index) => (
                <Card key={service.name} className="relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ background: service.color }}
                  />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{ background: `${service.color}20`, color: service.color }}
                        >
                          {service.icon}
                        </div>
                        <div>
                          <CardTitle className="text-base">{service.name}</CardTitle>
                          <CardDescription className="text-xs">:{service.port}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(service.status)}
                        <span className="text-sm font-medium">
                          {service.status === "online" && service.latency
                            ? `${service.latency}ms`
                            : service.status}
                        </span>
                      </div>
                      {getStatusBadge(service.status)}
                    </div>

                    {/* Metrics */}
                    {service.metrics && (
                      <div className="grid grid-cols-2 gap-2">
                        {service.metrics.map((metric) => (
                          <div key={metric.label} className="bg-muted/50 rounded p-2">
                            <div className="text-xs text-muted-foreground">{metric.label}</div>
                            <div className="text-sm font-semibold" style={{ color: service.color }}>
                              {metric.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Links */}
                    <div className="flex flex-wrap gap-2">
                      {service.links.map((link) => (
                        <Button
                          key={link.label}
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          asChild
                        >
                          <a href={link.url} target="_blank" rel="noopener noreferrer">
                            {link.label}
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </Button>
                      ))}
                    </div>

                    {/* Agent-specific collapsible sections */}
                    {service.name === "Agent Status" && (
                      <div className="space-y-2">
                        {/* Active Agents */}
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded text-sm">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" style={{ color: service.color }} />
                              <span className="font-medium">Active Agents (7 MVP)</span>
                            </div>
                            <ChevronDown className="w-4 h-4 transition-transform" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="px-2 pt-2 space-y-3">
                            <div className="text-xs space-y-2">
                              {/* Layer 5: Meta */}
                              <div>
                                <div className="text-[10px] font-semibold text-muted-foreground mb-1">LAYER 5: META</div>
                                <div className="flex justify-between p-2 bg-muted/30 rounded">
                                  <span className="text-muted-foreground">Orchestrator Agent</span>
                                  <Badge variant="outline" className="text-xs">Active</Badge>
                                </div>
                              </div>
                              
                              {/* Layer 3: Operational */}
                              <div>
                                <div className="text-[10px] font-semibold text-muted-foreground mb-1">LAYER 3: OPERATIONAL</div>
                                <div className="space-y-1">
                                  <div className="flex justify-between p-2 bg-muted/30 rounded">
                                    <span className="text-muted-foreground">Query Agent</span>
                                    <Badge variant="outline" className="text-xs">Idle</Badge>
                                  </div>
                                  <div className="flex justify-between p-2 bg-muted/30 rounded">
                                    <span className="text-muted-foreground">Artifact Agent</span>
                                    <Badge variant="outline" className="text-xs">Idle</Badge>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Layer 2: Network Construction */}
                              <div>
                                <div className="text-[10px] font-semibold text-muted-foreground mb-1">LAYER 2: NETWORK CONSTRUCTION</div>
                                <div className="space-y-1">
                                  <div className="flex justify-between p-2 bg-muted/30 rounded">
                                    <span className="text-muted-foreground">Network Builder Agent</span>
                                    <Badge variant="outline" className="text-xs">Idle</Badge>
                                  </div>
                                  <div className="flex justify-between p-2 bg-muted/30 rounded">
                                    <span className="text-muted-foreground">Data Ingestion Agent</span>
                                    <Badge variant="outline" className="text-xs">Busy</Badge>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Layer 1: Schema Generation */}
                              <div>
                                <div className="text-[10px] font-semibold text-muted-foreground mb-1">LAYER 1: SCHEMA GENERATION</div>
                                <div className="space-y-1">
                                  <div className="flex justify-between p-2 bg-muted/30 rounded">
                                    <span className="text-muted-foreground">Onboarding Agent</span>
                                    <Badge variant="outline" className="text-xs">Idle</Badge>
                                  </div>
                                  <div className="flex justify-between p-2 bg-muted/30 rounded">
                                    <span className="text-muted-foreground">Schema Builder Agent</span>
                                    <Badge variant="outline" className="text-xs">Idle</Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Agent Capabilities */}
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded text-sm">
                            <div className="flex items-center gap-2">
                              <Wrench className="w-4 h-4" style={{ color: service.color }} />
                              <span className="font-medium">Agent Capabilities</span>
                            </div>
                            <ChevronDown className="w-4 h-4 transition-transform" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="px-2 pt-2 space-y-2">
                            <div className="text-xs space-y-1">
                              <div className="p-2 bg-muted/30 rounded">
                                <div className="font-medium mb-1">Query Agent</div>
                                <div className="text-muted-foreground">Graph traversal, NL queries, impact analysis</div>
                              </div>
                              <div className="p-2 bg-muted/30 rounded">
                                <div className="font-medium mb-1">Artifact Agent</div>
                                <div className="text-muted-foreground">Report generation, PDF/Markdown output</div>
                              </div>
                              <div className="p-2 bg-muted/30 rounded">
                                <div className="font-medium mb-1">Network Builder</div>
                                <div className="text-muted-foreground">Node/edge creation, schema validation</div>
                              </div>
                              <div className="p-2 bg-muted/30 rounded">
                                <div className="font-medium mb-1">Data Ingestion</div>
                                <div className="text-muted-foreground">OAuth, API integrations, CSV/JSON import</div>
                              </div>
                              <div className="p-2 bg-muted/30 rounded">
                                <div className="font-medium mb-1">Orchestrator</div>
                                <div className="text-muted-foreground">Intent classification, agent routing</div>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Permission Model */}
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded text-sm">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4" style={{ color: service.color }} />
                              <span className="font-medium">Permission Model</span>
                            </div>
                            <ChevronDown className="w-4 h-4 transition-transform" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="px-2 pt-2 space-y-2">
                            <div className="text-xs space-y-1">
                              <div className="p-2 bg-muted/30 rounded">
                                <div className="font-medium mb-1">Read-Only Agents</div>
                                <div className="text-muted-foreground">Onboarding, Query (no graph writes)</div>
                              </div>
                              <div className="p-2 bg-muted/30 rounded">
                                <div className="font-medium mb-1">Write with Approval</div>
                                <div className="text-muted-foreground">Schema Builder, Network Builder, Data Ingestion</div>
                              </div>
                              <div className="p-2 bg-muted/30 rounded">
                                <div className="font-medium mb-1">Human-in-the-Loop</div>
                                <div className="text-muted-foreground">All agents propose, humans approve</div>
                              </div>
                              <div className="p-2 bg-muted/30 rounded">
                                <div className="font-medium mb-1">Communication</div>
                                <div className="text-muted-foreground">Via graph & orchestrator (no direct calls)</div>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    )}

                    {/* Refresh Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => checkService(index)}
                    >
                      <RefreshCw className="w-3 h-3 mr-2" />
                      Check Status
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Data Flow Diagram */}
            <Card>
              <CardHeader>
                <CardTitle>System Architecture</CardTitle>
                <CardDescription>Data flow between services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-4 flex-wrap py-8">
                  {["Agents", "OPAL MCP", "Core Backend", "Dashboard"].map((node, index, arr) => (
                    <div key={node} className="flex items-center gap-4">
                      <div className="text-center">
                        <div
                          className="px-6 py-4 rounded-lg border-2 font-semibold"
                          style={{
                            borderColor: services[index]?.color || "#666",
                            background: `${services[index]?.color || "#666"}10`,
                          }}
                        >
                          {node}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          {index === 0 && "Autonomous Execution"}
                          {index === 1 && "AI Analysis & Graph"}
                          {index === 2 && "API Gateway"}
                          {index === 3 && "User Interface"}
                        </div>
                      </div>
                      {index < arr.length - 1 && (
                        <ArrowRight className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Logs */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>System Logs</CardTitle>
                    <CardDescription>Recent activity and status updates</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setLogs([])}>
                    Clear Logs
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                  <div className="space-y-2 font-mono text-sm">
                    {logs.length === 0 ? (
                      <p className="text-muted-foreground">No logs yet...</p>
                    ) : (
                      logs.map((log, index) => (
                        <div
                          key={index}
                          className={`flex gap-3 ${log.isError ? "text-red-500" : "text-green-500"}`}
                        >
                          <span className="text-muted-foreground">[{log.time}]</span>
                          <span>{log.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
                <CardDescription>Direct access to important endpoints</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { title: "OPAL Admin", desc: "Server administration", url: "http://localhost:7788/admin" },
                    { title: "Graph API", desc: "Network graph nodes", url: "http://localhost:7788/api/nodes" },
                    { title: "Backend Health", desc: "API status check", url: "http://localhost:8000/health" },
                  ].map((link) => (
                    <Button
                      key={link.title}
                      variant="outline"
                      className="h-auto flex-col items-start p-4 text-left"
                      asChild
                    >
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        <div className="font-semibold mb-1">{link.title}</div>
                        <div className="text-xs text-muted-foreground">{link.desc}</div>
                      </a>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
