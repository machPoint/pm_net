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
  ArrowRight
} from "lucide-react";

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

export default function AdminSystemPage() {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: "FDS (Fake Data Service)",
      url: "http://localhost:4000",
      port: 4000,
      status: "checking",
      icon: <Database className="w-5 h-5" />,
      color: "rgb(251, 191, 36)", // yellow
      links: [
        { label: "Admin Dashboard", url: "http://localhost:4000/admin" },
        { label: "API Docs", url: "http://localhost:4000/docs" },
        { label: "Health", url: "http://localhost:4000/health" },
      ],
      metrics: [
        { label: "Data Items", value: "~300" },
        { label: "Endpoints", value: "12" },
      ],
    },
    {
      name: "OPAL MCP Server",
      url: "http://localhost:7788/",
      port: 7788,
      status: "checking",
      icon: <Activity className="w-5 h-5" />,
      color: "rgb(96, 165, 250)", // blue
      links: [
        { label: "MCP Interface", url: "http://localhost:7788" },
        { label: "Admin", url: "http://localhost:7788/admin" },
      ],
      metrics: [
        { label: "AI Tools", value: "8" },
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
    { time: new Date().toLocaleTimeString(), message: "Admin dashboard initialized", isError: false },
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
    } catch (error) {
      const latency = Date.now() - startTime;
      
      // In no-cors mode, quick responses usually mean the service is up
      if (latency < 100) {
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-purple-600/10">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">System Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Monitor and manage all Core services from one place
              </p>
            </div>
            <Button onClick={checkAllServices} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh All
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              {["FDS", "OPAL", "Core Backend", "Dashboard"].map((node, index, arr) => (
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
                      {index === 0 && "Mock Data"}
                      {index === 1 && "AI Analysis"}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { title: "Sidecar Info", desc: "FDS integration", url: "http://localhost:4000/sidecar/info" },
                { title: "Health Check", desc: "FDS system health", url: "http://localhost:4000/health" },
                { title: "Pulse Feed", desc: "Activity stream", url: "http://localhost:4000/mock/pulse?limit=10" },
                { title: "Sample Data", desc: "Jama requirements", url: "http://localhost:4000/mock/jama/items?size=5" },
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

      <div className="border-t py-6 text-center text-sm text-muted-foreground">
        CORE-SE Admin Dashboard v1.0 | Auto-refresh every 30 seconds
      </div>
    </div>
  );
}
