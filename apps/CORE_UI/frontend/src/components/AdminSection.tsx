"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  Filter,
  Settings,
  Users,
  Database,
  Shield,
  Activity,
  BarChart3,
  RefreshCw,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Server,
  HardDrive,
  Cpu,
  Wifi,
  MoreHorizontal,
  Factory,
  Trash2,
  PlayCircle,
  StopCircle,
  RotateCcw,
  FileText,
  PlusCircle,
  Eye,
  EyeOff,
  Key,
  Copy,
  Save,
  XCircle,
  Loader2,
  Play,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDataMode, DataMode } from "@/contexts/DataModeContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface SystemMetric {
  id: string;
  name: string;
  value: string;
  status: "healthy" | "warning" | "critical";
  trend: "up" | "down" | "stable";
  lastUpdated: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "moderator" | "user";
  status: "active" | "inactive" | "suspended";
  lastActive: string;
  permissions: string[];
}

const mockSystemMetrics: SystemMetric[] = [
  {
    id: "1",
    name: "CPU Usage",
    value: "23%",
    status: "healthy",
    trend: "stable",
    lastUpdated: "2 minutes ago"
  },
  {
    id: "2",
    name: "Memory Usage",
    value: "78%",
    status: "warning",
    trend: "up",
    lastUpdated: "2 minutes ago"
  },
  {
    id: "3",
    name: "Disk Space",
    value: "45%",
    status: "healthy",
    trend: "stable",
    lastUpdated: "2 minutes ago"
  },
  {
    id: "4",
    name: "Network I/O",
    value: "1.2 GB/s",
    status: "healthy",
    trend: "down",
    lastUpdated: "2 minutes ago"
  }
];

const mockUsers: AdminUser[] = [
  {
    id: "1",
    name: "Sarah Chen",
    email: "sarah.chen@company.com",
    role: "admin",
    status: "active",
    lastActive: "5 minutes ago",
    permissions: ["read", "write", "delete", "admin"]
  },
  {
    id: "2",
    name: "Mike Rodriguez",
    email: "mike.rodriguez@company.com",
    role: "moderator",
    status: "active",
    lastActive: "1 hour ago",
    permissions: ["read", "write", "moderate"]
  },
  {
    id: "3",
    name: "Alex Kim",
    email: "alex.kim@company.com",
    role: "user",
    status: "inactive",
    lastActive: "2 days ago",
    permissions: ["read", "write"]
  }
];

interface FDSStatus {
  isRunning: boolean;
  dataStats: {
    jamaItems: number;
    jiraIssues: number;
    agentConfigs: number;
    emailMessages: number;
    outlookMessages: number;
    pulseItems: number;
  };
  lastSeeded: string | null;
}

export default function AdminSection() {
  const { dataMode, setDataMode, isUsingFakeData, isStreaming } = useDataMode();
  const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "system" | "security" | "data" | "diagnostics">("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [metrics, setMetrics] = useState(mockSystemMetrics);
  const [users] = useState(mockUsers);
  const [isLoading, setIsLoading] = useState(false);
  const [fdsStatus, setFdsStatus] = useState<FDSStatus>({
    isRunning: true,
    dataStats: {
      jamaItems: 142,
      jiraIssues: 28,
      agentConfigs: 19,
      emailMessages: 10,
      outlookMessages: 10,
      pulseItems: 89
    },
    lastSeeded: "2 hours ago"
  });
  const [isSeeding, setIsSeeding] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingDirect, setIsTestingDirect] = useState(false);
  const [isTestingOpal, setIsTestingOpal] = useState(false);
  const [testResults, setTestResults] = useState<{
    type: 'direct' | 'opal' | null;
    status: 'success' | 'error' | 'warning' | null;
    message: string;
    details?: string;
    timestamp?: Date;
  }>({ type: null, status: null, message: '' });
  
  // Diagnostics state
  const [diagnosticTests, setDiagnosticTests] = useState<{
    [key: string]: {
      status: 'idle' | 'testing' | 'success' | 'error';
      message: string;
      timestamp?: Date;
      details?: any;
    }
  }>({});

  const refreshMetrics = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success("System metrics refreshed");
    }, 1000);
  };

  const seedFakeData = async () => {
    setIsSeeding(true);
    try {
      const response = await fetch('http://localhost:4000/mock/admin/seed', {
        method: 'POST',
      });
      
      if (response.ok) {
        // Update stats with new random numbers
        setFdsStatus(prev => ({
          ...prev,
          dataStats: {
            jamaItems: Math.floor(Math.random() * 50) + 120,
            jiraIssues: Math.floor(Math.random() * 15) + 20,
            agentConfigs: Math.floor(Math.random() * 10) + 15,
            emailMessages: 10,
            outlookMessages: 10,
            pulseItems: Math.floor(Math.random() * 30) + 70
          },
          lastSeeded: "Just now"
        }));
        toast.success("Fake data regenerated successfully!");
      } else {
        throw new Error('Failed to seed data');
      }
    } catch (error) {
      toast.error("Failed to seed fake data. Make sure FDS is running on port 4000.");
    } finally {
      setIsSeeding(false);
    }
  };

  const checkFDSHealth = async () => {
    try {
      const response = await fetch('http://localhost:4000/health');
      const isHealthy = response.ok;
      setFdsStatus(prev => ({ ...prev, isRunning: isHealthy }));
      return isHealthy;
    } catch (error) {
      setFdsStatus(prev => ({ ...prev, isRunning: false }));
      return false;
    }
  };

  const resetFakeData = () => {
    toast.info("Reset functionality would clear all generated data");
  };

  const exportData = () => {
    toast.info("Data export would download current dataset");
  };

  useEffect(() => {
    // Check FDS health on component mount
    checkFDSHealth();
    
    // Load saved API key from localStorage
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
      setOpenaiApiKey(savedKey);
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return "text-green-600 dark:text-green-400";
      case "warning": return "text-yellow-600 dark:text-yellow-400";
      case "critical": return "text-red-600 dark:text-red-400";
      case "active": return "text-green-600 dark:text-green-400";
      case "inactive": return "text-yellow-600 dark:text-yellow-400";
      case "suspended": return "text-red-600 dark:text-red-400";
      default: return "text-muted-foreground";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "healthy": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "warning": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "critical": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "inactive": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "suspended": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-card text-card-foreground";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "moderator": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "user": return "bg-card text-card-foreground";
      default: return "bg-card text-card-foreground";
    }
  };

  const getMetricIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case "cpu usage": return Cpu;
      case "memory usage": return HardDrive;
      case "disk space": return Database;
      case "network i/o": return Wifi;
      default: return Activity;
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* System Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">System Overview</h3>
          <Button variant="outline" size="sm" onClick={refreshMetrics} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4 mr-1", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => {
            const Icon = getMetricIcon(metric.name);
            return (
              <div key={metric.id} className="bg-card rounded-lg border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <Badge className={cn("text-xs", getStatusBadgeColor(metric.status))}>
                    {metric.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <p className="text-sm text-muted-foreground">{metric.name}</p>
                  <p className="text-xs text-muted-foreground">Updated {metric.lastUpdated}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Button 
            variant="outline" 
            className="h-auto p-4 flex flex-col items-center gap-2"
            onClick={() => setActiveTab("users")}
          >
            <Users className="w-6 h-6" />
            <span className="text-sm">Manage Users</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto p-4 flex flex-col items-center gap-2"
            onClick={() => setActiveTab("data")}
          >
            <Factory className="w-6 h-6" />
            <span className="text-sm">Data Generator</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <Database className="w-6 h-6" />
            <span className="text-sm">Database</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <Shield className="w-6 h-6" />
            <span className="text-sm">Security</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            <span className="text-sm">Analytics</span>
          </Button>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="space-y-3">
            {[
              { action: "User login", user: "sarah.chen@company.com", time: "2 minutes ago", status: "success" },
              { action: "Database backup", user: "System", time: "1 hour ago", status: "success" },
              { action: "Failed login attempt", user: "unknown@example.com", time: "3 hours ago", status: "warning" },
              { action: "Permission change", user: "mike.rodriguez@company.com", time: "5 hours ago", status: "info" }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                <div>
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{activity.user}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                  <Badge variant="outline" className="text-xs">
                    {activity.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderDataManagement = () => (
    <div className="space-y-6">
      {/* Data Mode Selector */}
      <div>
        <h3 className="text-lg font-medium mb-4">Data Source Mode</h3>
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Choose how the application retrieves data. Switch between real server connections or demo modes without server dependencies.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Real Data Mode */}
              <button
                onClick={() => {
                  setDataMode('real');
                  toast.success('Switched to Real Data mode - connecting to OPAL and FDS servers');
                }}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all text-left",
                  dataMode === 'real'
                    ? "border-[#6e9fc1] bg-[#6e9fc1]/10"
                    : "border-border hover:border-[#6e9fc1]/50"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-5 h-5 text-[#6e9fc1]" />
                  <h4 className="font-semibold">Real Data</h4>
                  {dataMode === 'real' && (
                    <Badge className="ml-auto bg-[#6e9fc1] text-white">Active</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Connect to OPAL MCP Server and FDS. Requires both servers running.
                </p>
              </button>

              {/* Static Fake Data Mode */}
              <button
                onClick={() => {
                  setDataMode('fake-static');
                  toast.success('Switched to Static Fake Data mode - using pre-generated demo data');
                }}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all text-left",
                  dataMode === 'fake-static'
                    ? "border-[#a3cae9] bg-[#a3cae9]/10"
                    : "border-border hover:border-[#a3cae9]/50"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-5 h-5 text-[#a3cae9]" />
                  <h4 className="font-semibold">Static Fake Data</h4>
                  {dataMode === 'fake-static' && (
                    <Badge className="ml-auto bg-[#a3cae9] text-white">Active</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Use pre-generated fake data. No server connection needed.
                </p>
              </button>

              {/* Streaming Fake Data Mode */}
              <button
                onClick={() => {
                  setDataMode('fake-streaming');
                  toast.success('Switched to Streaming Fake Data mode - live updates enabled');
                }}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all text-left",
                  dataMode === 'fake-streaming'
                    ? "border-[#395a7f] bg-[#395a7f]/10"
                    : "border-border hover:border-[#395a7f]/50"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-[#395a7f]" />
                  <h4 className="font-semibold">Streaming Fake Data</h4>
                  {dataMode === 'fake-streaming' && (
                    <Badge className="ml-auto bg-[#395a7f] text-white">Active</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Fake data with live streaming updates. Perfect for demos.
                </p>
              </button>
            </div>

            {/* Current Mode Info */}
            <div className="pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  dataMode === 'real' ? "bg-[#6e9fc1]" : 
                  dataMode === 'fake-static' ? "bg-[#a3cae9]" : "bg-[#395a7f]"
                )} />
                <p className="text-sm font-medium">
                  Current Mode: {
                    dataMode === 'real' ? 'Real Data (Server Connected)' :
                    dataMode === 'fake-static' ? 'Static Fake Data (Offline Demo)' :
                    'Streaming Fake Data (Live Demo)'
                  }
                </p>
              </div>
              {isUsingFakeData && (
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ Running in demo mode - no server connection required. All data is simulated.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FDS Status - Only show when in real mode */}
      {dataMode === 'real' && (
        <div>
          <h3 className="text-lg font-medium mb-4">Fake Data Service Status</h3>
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-3 h-3 rounded-full",
                fdsStatus.isRunning ? "bg-[#6e9fc1]" : "bg-[#acacac]"
              )} />
              <div>
                <p className="font-medium">
                  {fdsStatus.isRunning ? "Service Running" : "Service Offline"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {fdsStatus.isRunning 
                    ? "Fake Data Service is operational on port 4000"
                    : "Cannot connect to Fake Data Service"
                  }
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={checkFDSHealth}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Check Status
            </Button>
          </div>
          
          {fdsStatus.lastSeeded && (
            <p className="text-sm text-muted-foreground">
              Last data generation: {fdsStatus.lastSeeded}
            </p>
          )}
        </div>
        </div>
      )}

      {/* Data Statistics - Only show when in real mode */}
      {dataMode === 'real' && (
      <div>
        <h3 className="text-lg font-medium mb-4">Current Dataset</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Jama Items", value: fdsStatus.dataStats.jamaItems, icon: FileText, color: "text-[#395a7f]" },
            { label: "Jira Issues", value: fdsStatus.dataStats.jiraIssues, icon: AlertTriangle, color: "text-[#6e9fc1]" },
            { label: "Agent Configs", value: fdsStatus.dataStats.agentConfigs, icon: Settings, color: "text-[#a3cae9]" },
            { label: "Email Messages", value: fdsStatus.dataStats.emailMessages, icon: Activity, color: "text-[#acacac]" },
            { label: "Outlook Messages", value: fdsStatus.dataStats.outlookMessages, icon: Activity, color: "text-[#395a7f]" },
            { label: "Pulse Items", value: fdsStatus.dataStats.pulseItems, icon: TrendingUp, color: "text-[#6e9fc1]" }
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-card rounded-lg border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Data Management Actions - Only show when in real mode */}
      {dataMode === 'real' && (
      <div>
        <h3 className="text-lg font-medium mb-4">Data Management</h3>
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              onClick={seedFakeData}
              disabled={isSeeding || !fdsStatus.isRunning}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <PlusCircle className={cn("w-6 h-6", isSeeding && "animate-spin")} />
              <span className="text-sm font-medium">
                {isSeeding ? "Generating..." : "Generate New Data"}
              </span>
              <span className="text-xs text-muted-foreground">
                Create fresh dataset
              </span>
            </Button>
            
            <Button 
              variant="outline"
              onClick={resetFakeData}
              disabled={!fdsStatus.isRunning}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <RotateCcw className="w-6 h-6" />
              <span className="text-sm font-medium">Reset Data</span>
              <span className="text-xs text-muted-foreground">
                Clear all generated data
              </span>
            </Button>
            
            <Button 
              variant="outline"
              onClick={exportData}
              disabled={!fdsStatus.isRunning}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Download className="w-6 h-6" />
              <span className="text-sm font-medium">Export Data</span>
              <span className="text-xs text-muted-foreground">
                Download current dataset
              </span>
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => window.open('http://localhost:4000/docs', '_blank')}
              disabled={!fdsStatus.isRunning}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <FileText className="w-6 h-6" />
              <span className="text-sm font-medium">API Docs</span>
              <span className="text-xs text-muted-foreground">
                View FDS documentation
              </span>
            </Button>
          </div>
        </div>
      </div>
      )}

      {/* Data Generation Settings - Only show when in real mode */}
      {dataMode === 'real' && (
      <div>
        <h3 className="text-lg font-medium mb-4">Generation Settings</h3>
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Requirements Count</label>
                <div className="text-sm text-muted-foreground">80-100 items (randomized)</div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Test Cases Count</label>
                <div className="text-sm text-muted-foreground">40-60 items (randomized)</div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Traceability Gaps</label>
                <div className="text-sm text-muted-foreground">~15% coverage gaps</div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Outlook Integration</label>
                <div className="text-sm text-muted-foreground">10 messages with meeting requests</div>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Data generation follows the PRD specifications with realistic engineering artifacts,
                proper cross-linking between systems, and intentional gaps for demo purposes.
              </p>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">User Management</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          <Button size="sm">
            <Upload className="w-4 h-4 mr-1" />
            Import
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-border"
            />
          </div>
        </div>

        <div className="divide-y divide-border">
          {filteredUsers.map((user) => (
            <div key={user.id} className="p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <Badge className={cn("text-xs mb-1", getRoleColor(user.role))}>
                      {user.role}
                    </Badge>
                    <p className="text-xs text-muted-foreground">Last active: {user.lastActive}</p>
                  </div>
                  
                  <Badge className={cn("text-xs", getStatusBadgeColor(user.status))}>
                    {user.status}
                  </Badge>
                  
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Test functions for diagnostics
  const testTool = async (toolName: string, testParams: any) => {
    setDiagnosticTests(prev => ({
      ...prev,
      [toolName]: { status: 'testing', message: 'Testing...', timestamp: new Date() }
    }));

    try {
      const response = await fetch(`/api/opal/proxy/api/diagnostics/test-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName, params: testParams })
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setDiagnosticTests(prev => ({
          ...prev,
          [toolName]: {
            status: 'success',
            message: 'Tool working correctly ✓',
            timestamp: new Date(),
            details: data.result
          }
        }));
        toast.success(`✅ ${toolName} test passed`);
      } else {
        throw new Error(data.error || 'Tool test failed');
      }
    } catch (error: any) {
      setDiagnosticTests(prev => ({
        ...prev,
        [toolName]: {
          status: 'error',
          message: error.message || 'Connection failed',
          timestamp: new Date()
        }
      }));
      toast.error(`❌ ${toolName} test failed: ${error.message}`);
    }
  };

  const testSidecar = async (sidecarName: string, sidecarUrl: string) => {
    setDiagnosticTests(prev => ({
      ...prev,
      [sidecarName]: { status: 'testing', message: 'Checking connection...', timestamp: new Date() }
    }));

    try {
      const response = await fetch(`${sidecarUrl}/health`, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setDiagnosticTests(prev => ({
          ...prev,
          [sidecarName]: {
            status: 'success',
            message: 'Sidecar is healthy and responding',
            timestamp: new Date(),
            details: data
          }
        }));
        toast.success(`✅ ${sidecarName} is online`);
      } else {
        throw new Error('Sidecar not responding');
      }
    } catch (error: any) {
      setDiagnosticTests(prev => ({
        ...prev,
        [sidecarName]: {
          status: 'error',
          message: 'Cannot connect to sidecar',
          timestamp: new Date()
        }
      }));
      toast.error(`❌ ${sidecarName} offline`);
    }
  };

  const testService = async (serviceName: string, serviceEndpoint: string) => {
    setDiagnosticTests(prev => ({
      ...prev,
      [serviceName]: { status: 'testing', message: 'Testing service...', timestamp: new Date() }
    }));

    try {
      const response = await fetch(`/api/opal/proxy${serviceEndpoint}`, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setDiagnosticTests(prev => ({
          ...prev,
          [serviceName]: {
            status: 'success',
            message: 'Service is operational',
            timestamp: new Date(),
            details: data
          }
        }));
        toast.success(`✅ ${serviceName} is working`);
      } else {
        throw new Error('Service not responding');
      }
    } catch (error: any) {
      setDiagnosticTests(prev => ({
        ...prev,
        [serviceName]: {
          status: 'error',
          message: error.message || 'Service unavailable',
          timestamp: new Date()
        }
      }));
      toast.error(`❌ ${serviceName} test failed`);
    }
  };

  const renderDiagnostics = () => {
    return (
      <div className="space-y-6">
        {/* Diagnostics Header */}
        <div className="bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-background border border-orange-500/20 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-500/20 rounded-lg">
              <Activity className="w-8 h-8 text-orange-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">System Diagnostics & Testing</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Test and verify all OPAL tools, sidecars, and services. Click "Test" on any component to verify it's working correctly.
              </p>
              <Button 
                onClick={() => {
                  setDiagnosticTests({});
                  toast.info("Test results cleared");
                }}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Clear All Results
              </Button>
            </div>
          </div>
        </div>

        {/* MCP Tools Testing */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            MCP Tools Testing
          </h3>
          
          <div className="space-y-3">
            {[
              {
                name: 'querySystemModel',
                title: 'Query System Model',
                testParams: { project_id: 'test_project', limit: 10 }
              },
              {
                name: 'getSystemSlice',
                title: 'Get System Slice',
                testParams: { project_id: 'test_project', max_depth: 2 }
              },
              {
                name: 'traceDownstreamImpact',
                title: 'Trace Downstream Impact',
                testParams: { project_id: 'test_project', start_node_ids: ['test_node'], max_depth: 2 }
              },
              {
                name: 'findVerificationGaps',
                title: 'Find Verification Gaps',
                testParams: { project_id: 'test_project' }
              },
              {
                name: 'runConsistencyChecks',
                title: 'Run Consistency Checks',
                testParams: { project_id: 'test_project', rule_set: 'default' }
              }
            ].map((tool) => {
              const testResult = diagnosticTests[tool.name];
              const isLoading = testResult?.status === 'testing';
              
              return (
                <div key={tool.name} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{tool.title}</h4>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">{tool.name}</code>
                      </div>
                      
                      {testResult && (
                        <div className={cn(
                          "text-sm p-2 rounded-md mt-2",
                          testResult.status === 'success' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
                          testResult.status === 'error' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
                          testResult.status === 'testing' && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                        )}>
                          <div className="flex items-center gap-2">
                            {testResult.status === 'success' && <CheckCircle className="w-4 h-4" />}
                            {testResult.status === 'error' && <AlertCircle className="w-4 h-4" />}
                            {testResult.status === 'testing' && <RefreshCw className="w-4 h-4 animate-spin" />}
                            <span className="font-medium">{testResult.message}</span>
                          </div>
                          {testResult.timestamp && (
                            <p className="text-xs mt-1 opacity-70">
                              {testResult.timestamp.toLocaleTimeString()}
                            </p>
                          )}
                          {testResult.details && (
                            <details className="mt-2">
                              <summary className="text-xs cursor-pointer hover:underline">View response</summary>
                              <pre className="text-xs mt-1 p-2 bg-black/10 dark:bg-white/10 rounded overflow-auto max-h-32">
                                {JSON.stringify(testResult.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => testTool(tool.name, tool.testParams)}
                      disabled={isLoading}
                      size="sm"
                      variant="outline"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Test
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidecars Testing */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Factory className="w-5 h-5" />
            Data Sidecars Testing
          </h3>
          
          <div className="space-y-3">
            {[
              {
                name: 'FDS',
                title: 'FDS (Fake Data Server)',
                url: 'http://localhost:4000',
                description: 'Streaming data integration sidecar'
              }
            ].map((sidecar) => {
              const testResult = diagnosticTests[sidecar.name];
              const isLoading = testResult?.status === 'testing';
              
              return (
                <div key={sidecar.name} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-medium">{sidecar.title}</h4>
                        <Badge variant="outline" className="text-xs">{sidecar.url}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{sidecar.description}</p>
                      
                      {testResult && (
                        <div className={cn(
                          "text-sm p-2 rounded-md mt-2",
                          testResult.status === 'success' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
                          testResult.status === 'error' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
                          testResult.status === 'testing' && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                        )}>
                          <div className="flex items-center gap-2">
                            {testResult.status === 'success' && <CheckCircle className="w-4 h-4" />}
                            {testResult.status === 'error' && <AlertCircle className="w-4 h-4" />}
                            {testResult.status === 'testing' && <RefreshCw className="w-4 h-4 animate-spin" />}
                            <span className="font-medium">{testResult.message}</span>
                          </div>
                          {testResult.timestamp && (
                            <p className="text-xs mt-1 opacity-70">
                              {testResult.timestamp.toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => testSidecar(sidecar.name, sidecar.url)}
                      disabled={isLoading}
                      size="sm"
                      variant="outline"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Test Connection
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Services Testing */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5" />
            AI & Knowledge Services Testing
          </h3>
          
          <div className="space-y-3">
            {[
              {
                name: 'AI Chat',
                endpoint: '/api/ai/chat',
                description: 'Test AI chat endpoint availability'
              },
              {
                name: 'Memory Service',
                endpoint: '/api/memory',
                description: 'Test memory service connectivity'
              },
              {
                name: 'Audit Service',
                endpoint: '/api/audit/events',
                description: 'Test audit logging service'
              }
            ].map((service) => {
              const testResult = diagnosticTests[service.name];
              const isLoading = testResult?.status === 'testing';
              
              return (
                <div key={service.name} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-medium">{service.name}</h4>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">{service.endpoint}</code>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                      
                      {testResult && (
                        <div className={cn(
                          "text-sm p-2 rounded-md mt-2",
                          testResult.status === 'success' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
                          testResult.status === 'error' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
                          testResult.status === 'testing' && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                        )}>
                          <div className="flex items-center gap-2">
                            {testResult.status === 'success' && <CheckCircle className="w-4 h-4" />}
                            {testResult.status === 'error' && <AlertCircle className="w-4 h-4" />}
                            {testResult.status === 'testing' && <RefreshCw className="w-4 h-4 animate-spin" />}
                            <span className="font-medium">{testResult.message}</span>
                          </div>
                          {testResult.timestamp && (
                            <p className="text-xs mt-1 opacity-70">
                              {testResult.timestamp.toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => testService(service.name, service.endpoint)}
                      disabled={isLoading}
                      size="sm"
                      variant="outline"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Test
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderSystem = () => {
    return (
      <div className="space-y-6">
        {/* System Overview Card */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/20 rounded-lg">
              <Server className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">OPAL System Capabilities</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Comprehensive view of all tools, sidecars, and knowledge bases available in the OPAL ecosystem.
                These capabilities enable advanced systems engineering analysis, AI-powered insights, and real-time data integration.
              </p>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-muted-foreground">System Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">21 Tools Available</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MCP Tools Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Systems Engineering Tools (MCP)
            </h3>
            <Badge variant="secondary" className="text-xs">
              {21} Tools
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              // System Model Tools (10)
              {
                name: 'getSystemSlice',
                title: 'Get System Slice',
                description: 'Return a bounded subgraph around one or more entities in the system model',
                category: 'System Model',
                icon: FileText,
                status: 'active'
              },
              {
                name: 'querySystemModel',
                title: 'Query System Model',
                description: 'Query the system graph with flexible filters for nodes and edges',
                category: 'System Model',
                icon: Database,
                status: 'active'
              },
              {
                name: 'traceDownstreamImpact',
                title: 'Trace Downstream Impact',
                description: 'Trace downstream impact from one or more starting nodes',
                category: 'System Model',
                icon: TrendingUp,
                status: 'active'
              },
              {
                name: 'traceUpstreamRationale',
                title: 'Trace Upstream Rationale',
                description: 'Trace upstream dependencies and rationale',
                category: 'System Model',
                icon: Activity,
                status: 'active'
              },
              {
                name: 'getVerificationCoverageMetrics',
                title: 'Verification Coverage Metrics',
                description: 'Calculate verification coverage metrics',
                category: 'System Model',
                icon: BarChart3,
                status: 'active'
              },
              {
                name: 'findVerificationGaps',
                title: 'Find Verification Gaps',
                description: 'Identify verification gaps in the system model',
                category: 'System Model',
                icon: AlertTriangle,
                status: 'active'
              },
              {
                name: 'checkAllocationConsistency',
                title: 'Check Allocation Consistency',
                description: 'Check allocation consistency across components and requirements',
                category: 'System Model',
                icon: CheckCircle,
                status: 'active'
              },
              {
                name: 'runConsistencyChecks',
                title: 'Run Consistency Checks',
                description: 'Run consistency checks using the rule engine',
                category: 'System Model',
                icon: Shield,
                status: 'active'
              },
              {
                name: 'getEntityHistory',
                title: 'Get Entity History',
                description: 'Get chronological event history for entities',
                category: 'System Model',
                icon: Clock,
                status: 'active'
              },
              {
                name: 'findSimilarPastChanges',
                title: 'Find Similar Past Changes',
                description: 'Find similar change patterns in historical change sets',
                category: 'System Model',
                icon: Search,
                status: 'active'
              },
              // Triage & Pulse Tools (4)
              {
                name: 'triageActivity',
                title: 'Triage Activity',
                description: 'Triage a single activity with AI-powered decision support',
                category: 'Triage & Pulse',
                icon: Activity,
                status: 'active'
              },
              {
                name: 'confirmTriageDecision',
                title: 'Confirm Triage Decision',
                description: 'Confirm and execute a triage decision',
                category: 'Triage & Pulse',
                icon: CheckCircle,
                status: 'active'
              },
              {
                name: 'bulkTriage',
                title: 'Bulk Triage',
                description: 'Triage multiple activities in batch',
                category: 'Triage & Pulse',
                icon: Database,
                status: 'active'
              },
              {
                name: 'explainPulseItem',
                title: 'Explain Pulse Item',
                description: 'Explain why an item is in the pulse feed',
                category: 'Triage & Pulse',
                icon: FileText,
                status: 'active'
              },
              // Calendar & Workload Tools (4)
              {
                name: 'getUserCalendar',
                title: 'Get User Calendar',
                description: 'Get user calendar events from Outlook',
                category: 'Calendar & Workload',
                icon: Clock,
                status: 'active'
              },
              {
                name: 'workloadDaySummary',
                title: 'Workload Day Summary',
                description: 'Get day-level workload summary',
                category: 'Calendar & Workload',
                icon: BarChart3,
                status: 'active'
              },
              {
                name: 'workloadRangeSummary',
                title: 'Workload Range Summary',
                description: 'Get date range workload summary',
                category: 'Calendar & Workload',
                icon: TrendingUp,
                status: 'active'
              },
              {
                name: 'workloadDayDetail',
                title: 'Workload Day Detail',
                description: 'Get detailed day breakdown with meetings and tasks',
                category: 'Calendar & Workload',
                icon: FileText,
                status: 'active'
              },
              // Lessons Learned Tools (3)
              {
                name: 'searchLessons',
                title: 'Search Lessons',
                description: 'Search lessons learned with filters and semantic search',
                category: 'Lessons Learned',
                icon: Search,
                status: 'active'
              },
              {
                name: 'getLessonDetail',
                title: 'Get Lesson Detail',
                description: 'Get full details of a specific lesson learned',
                category: 'Lessons Learned',
                icon: FileText,
                status: 'active'
              },
              {
                name: 'suggestLessonsForActivity',
                title: 'Suggest Lessons for Activity',
                description: 'Suggest relevant lessons for a specific activity or entity',
                category: 'Lessons Learned',
                icon: Activity,
                status: 'active'
              }
            ].map((tool) => {
              const Icon = tool.icon;
              return (
                <div key={tool.name} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-primary/10 rounded-md">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{tool.title}</h4>
                        <Badge variant="outline" className="text-[9px]">{tool.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        tool.status === 'active' && "bg-green-500"
                      )} />
                      <span className="text-[10px] text-muted-foreground capitalize">{tool.status}</span>
                    </div>
                    <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{tool.name}</code>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidecars Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Factory className="w-5 h-5" />
              Platform Sidecars
            </h3>
            <Badge variant="secondary" className="text-xs">
              {9} Registered
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              // Connectors (6)
              {
                name: 'Outlook Connector',
                description: 'Read-only connector for Outlook / Microsoft 365. Provides calendar events and email metadata.',
                port: 7010,
                category: 'Connector',
                systems: ['Outlook', 'Microsoft 365'],
                status: 'planned',
                icon: Database
              },
              {
                name: 'Jira Connector',
                description: 'Connector for Jira issues, epics, status, priorities, and due dates.',
                port: 7020,
                category: 'Connector',
                systems: ['Jira'],
                status: 'planned',
                icon: Database
              },
              {
                name: 'Jama Connector',
                description: 'Connector for Jama requirements, test cases, and traceability.',
                port: 7030,
                category: 'Connector',
                systems: ['Jama'],
                status: 'planned',
                icon: Database
              },
              {
                name: 'Agent Registry Connector',
                description: 'Connector for agent configuration, capabilities, and change management.',
                port: 7040,
                category: 'Connector',
                systems: ['AgentRegistry'],
                status: 'planned',
                icon: Database
              },
              {
                name: 'MS Tasks Connector',
                description: 'Connector for Microsoft Planner and To Do tasks.',
                port: 7050,
                category: 'Connector',
                systems: ['Planner', 'To Do'],
                status: 'planned',
                icon: Database
              },
              {
                name: 'IMS Connector',
                description: 'Connector for Integrated Master Schedule (IMS) from MS Project or Primavera.',
                port: 7060,
                category: 'Connector',
                systems: ['MS Project', 'Primavera'],
                status: 'planned',
                icon: Database
              },
              // Services (2)
              {
                name: 'Lessons Service',
                description: 'Owns Lessons Learned objects, metadata, and embeddings. Provides semantic search.',
                port: 7070,
                category: 'Service',
                systems: [],
                status: 'active',
                icon: Database
              },
              {
                name: 'Workload Service',
                description: 'Aggregates workload data from connectors and computes load metrics.',
                port: 7080,
                category: 'Service',
                systems: [],
                status: 'planned',
                icon: Database
              },
              // Compute (1)
              {
                name: 'STEM Python Sidecar',
                description: 'Engineering calculations, simulations, and STEM analysis using Python.',
                port: 7090,
                category: 'Compute',
                systems: [],
                status: 'planned',
                icon: Cpu
              }
            ].map((sidecar) => {
              const Icon = sidecar.icon;
              const isActive = sidecar.status === 'active';
              return (
                <div key={sidecar.name} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn(
                        "p-2 rounded-md",
                        isActive ? "bg-green-500/10" : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "w-4 h-4",
                          isActive ? "text-green-500" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{sidecar.name}</h4>
                          <Badge variant="outline" className="text-[9px]">{sidecar.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {sidecar.description}
                        </p>
                        {sidecar.systems.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {sidecar.systems.map((system) => (
                              <Badge key={system} variant="secondary" className="text-[9px]">{system}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-1">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
                      )} />
                      <span className="text-[10px] text-muted-foreground capitalize">{sidecar.status}</span>
                    </div>
                    <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Port {sidecar.port}</code>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI & Knowledge Services */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              AI & Knowledge Services
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                name: 'AI Chat',
                description: 'Context-aware AI assistant with system engineering knowledge',
                icon: Activity,
                endpoint: '/api/ai/chat',
                status: 'active'
              },
              {
                name: 'AI Relationship Discovery',
                description: 'Discover hidden cross-system relationships using AI analysis',
                icon: Search,
                endpoint: '/api/ai/analyze',
                status: 'active'
              },
              {
                name: 'Memory Service',
                description: 'Persistent conversation memory and context storage',
                icon: Database,
                endpoint: '/api/memory',
                status: 'active'
              },
              {
                name: 'Audit Service',
                description: 'Track all system operations and user actions',
                icon: Shield,
                endpoint: '/api/audit',
                status: 'active'
              },
              {
                name: 'Backup Service',
                description: 'Automated database backups and restoration',
                icon: HardDrive,
                endpoint: '/api/backup',
                status: 'active'
              },
              {
                name: 'Metrics Service',
                description: 'Real-time system health and performance metrics',
                icon: BarChart3,
                endpoint: '/api/metrics',
                status: 'active'
              }
            ].map((service) => {
              const Icon = service.icon;
              return (
                <div key={service.name} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-md">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm">{service.name}</h4>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {service.description}
                      </p>
                      <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{service.endpoint}</code>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Health & Actions */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">System Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              <span className="text-xs">Refresh Status</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-2">
              <Download className="w-4 h-4" />
              <span className="text-xs">Export Logs</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="text-xs">Configure</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="text-xs">Run Checks</span>
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderSecurity = () => {
    const saveApiKey = () => {
      if (!openaiApiKey || openaiApiKey.length < 20) {
        toast.error("Please enter a valid OpenAI API key");
        return;
      }
      // In a real app, this would save to a secure backend
      localStorage.setItem('openai_api_key', openaiApiKey);
      toast.success("API key saved successfully!");
    };

    const copyApiKey = () => {
      if (openaiApiKey) {
        navigator.clipboard.writeText(openaiApiKey);
        toast.success("API key copied to clipboard");
      }
    };

    const testDirectConnection = async () => {
      setIsTestingDirect(true);
      setTestResults({ type: 'direct', status: null, message: 'Testing...', timestamp: new Date() });
      toast.info("Testing LLM connection via backend...", { duration: 2000 });
      
      try {
        const response = await fetch('/api/ai/test-connection');
        const data = await response.json();

        if (data.status === 'ok') {
          const message = `Connection successful! Found ${data.model_count} models available.`;
          setTestResults({
            type: 'direct',
            status: 'success',
            message,
            details: `Available models include: ${data.models?.slice(0, 5).join(', ')}...`,
            timestamp: new Date()
          });
          toast.success(`✅ ${message}`, { duration: 5000 });
        } else {
          setTestResults({
            type: 'direct',
            status: 'error',
            message: 'Connection failed',
            details: data.error || 'Unknown error',
            timestamp: new Date()
          });
          toast.error(`❌ Connection failed: ${data.error}`, { duration: 5000 });
        }
      } catch (error: any) {
        setTestResults({
          type: 'direct',
          status: 'error',
          message: 'Connection error',
          details: error.message,
          timestamp: new Date()
        });
        toast.error(`❌ Connection error: ${error.message}`, { duration: 5000 });
      } finally {
        setIsTestingDirect(false);
      }
    };

    const testOpalConnection = async () => {
      if (!openaiApiKey || openaiApiKey.length < 20) {
        toast.error("Please enter a valid API key first");
        return;
      }

      setIsTestingOpal(true);
      setTestResults({ type: 'opal', status: null, message: 'Testing...', timestamp: new Date() });
      toast.info("Testing connection via OPAL server...", { duration: 2000 });
      
      try {
        // Test through OPAL_SE AI endpoint
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: "Hello, this is a connection test. Please respond with a brief confirmation.",
            history: []
          })
        });

        if (response.ok) {
          const data = await response.json();
          const preview = data.message?.substring(0, 80) || 'No response';
          setTestResults({
            type: 'opal',
            status: 'success',
            message: 'OPAL → OpenAI connection successful!',
            details: `AI Response: "${preview}..."\n\nThe full integration chain is working: Frontend → CORE_UI Backend → OPAL_SE → OpenAI API`,
            timestamp: new Date()
          });
          toast.success(`✅ OPAL → OpenAI connection successful!\n\nAI Response: "${preview}..."`, { duration: 6000 });
        } else {
          const error = await response.json();
          const details = error.details || '';
          const openaiError = error.openai_error || '';
          const fullError = `${error.error}${details ? '\n' + details : ''}${openaiError ? '\n' + openaiError : ''}`;
          setTestResults({
            type: 'opal',
            status: 'error',
            message: 'OPAL connection failed',
            details: fullError,
            timestamp: new Date()
          });
          toast.error(`❌ OPAL connection failed:\n${fullError}`, { duration: 8000 });
        }
      } catch (error: any) {
        setTestResults({
          type: 'opal',
          status: 'error',
          message: 'Failed to connect to OPAL server',
          details: `${error.message}\n\nMake sure OPAL_SE is running on port 7788 and the API key is configured in OPAL_SE/.env`,
          timestamp: new Date()
        });
        toast.error(`❌ Failed to connect to OPAL server:\n${error.message}\n\nMake sure OPAL_SE is running on port 7788.`, { duration: 6000 });
      } finally {
        setIsTestingOpal(false);
      }
    };

    return (
      <div className="space-y-6">
        {/* API Keys Section */}
        <div>
          <h3 className="text-lg font-medium mb-4">API Keys</h3>
          <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            
            {/* OpenAI API Key */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="openai-key" className="text-base font-medium">OpenAI API Key</Label>
                    <p className="text-sm text-muted-foreground">
                      Required for AI Assistant functionality
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Required
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="openai-key"
                      type={showApiKey ? "text" : "password"}
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      placeholder="sk-proj-..."
                      className="pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button variant="outline" size="icon" onClick={copyApiKey} disabled={!openaiApiKey}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button onClick={saveApiKey}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
                
                {/* Test Connection Buttons */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={testDirectConnection}
                    disabled={!openaiApiKey || isTestingDirect}
                  >
                    <CheckCircle className={cn("w-4 h-4 mr-2", isTestingDirect && "animate-spin")} />
                    {isTestingDirect ? "Testing..." : "Test Direct Connection"}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={testOpalConnection}
                    disabled={!openaiApiKey || isTestingOpal}
                  >
                    <Server className={cn("w-4 h-4 mr-2", isTestingOpal && "animate-spin")} />
                    {isTestingOpal ? "Testing..." : "Test via OPAL"}
                  </Button>
                </div>

                {/* Test Results Card */}
                {testResults.type && (
                  <div className={cn(
                    "mt-3 p-4 rounded-lg border",
                    testResults.status === 'success' && "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
                    testResults.status === 'error' && "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
                    testResults.status === 'warning' && "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800",
                    !testResults.status && "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                  )}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {testResults.status === 'success' && (
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        )}
                        {testResults.status === 'error' && (
                          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        )}
                        {testResults.status === 'warning' && (
                          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        )}
                        {!testResults.status && (
                          <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={cn(
                            "font-semibold text-sm",
                            testResults.status === 'success' && "text-green-900 dark:text-green-100",
                            testResults.status === 'error' && "text-red-900 dark:text-red-100",
                            testResults.status === 'warning' && "text-yellow-900 dark:text-yellow-100",
                            !testResults.status && "text-blue-900 dark:text-blue-100"
                          )}>
                            {testResults.type === 'direct' ? 'Direct OpenAI Test' : 'OPAL Integration Test'}
                          </h4>
                          {testResults.timestamp && (
                            <span className="text-xs text-muted-foreground">
                              {testResults.timestamp.toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                        <p className={cn(
                          "text-sm font-medium mb-2",
                          testResults.status === 'success' && "text-green-800 dark:text-green-200",
                          testResults.status === 'error' && "text-red-800 dark:text-red-200",
                          testResults.status === 'warning' && "text-yellow-800 dark:text-yellow-200",
                          !testResults.status && "text-blue-800 dark:text-blue-200"
                        )}>
                          {testResults.message}
                        </p>
                        {testResults.details && (
                          <div className={cn(
                            "text-xs rounded p-2 font-mono whitespace-pre-wrap break-words",
                            testResults.status === 'success' && "bg-green-100/50 dark:bg-green-900/20 text-green-700 dark:text-green-300",
                            testResults.status === 'error' && "bg-red-100/50 dark:bg-red-900/20 text-red-700 dark:text-red-300",
                            testResults.status === 'warning' && "bg-yellow-100/50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300",
                            !testResults.status && "bg-blue-100/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                          )}>
                            {testResults.details}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Get your API key from{" "}
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    OpenAI Platform
                  </a>
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-500 flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>Note: For OPAL test to work, the API key must also be configured in <code className="bg-muted px-1 rounded">OPAL_SE/.env</code></span>
                </p>
              </div>
            </div>

            {/* Other API Keys Placeholder */}
            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label className="text-base font-medium">Additional API Keys</Label>
                  <p className="text-sm text-muted-foreground">
                    Configure additional service integrations
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {[
                  { name: "Jira API Token", placeholder: "JIRA_xxxx", status: "Optional" },
                  { name: "Jama API Key", placeholder: "API_KEY_xxxx", status: "Optional" },
                  { name: "Agent Registry Token", placeholder: "AR_TOKEN_xxxx", status: "Optional" },
                  { name: "Azure DevOps PAT", placeholder: "PAT_xxxx", status: "Optional" }
                ].map((apiKey) => (
                  <div key={apiKey.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">{apiKey.name}</Label>
                      <Badge variant="outline" className="text-xs">
                        {apiKey.status}
                      </Badge>
                    </div>
                    <Input
                      type="password"
                      placeholder={apiKey.placeholder}
                      className="font-mono text-sm"
                      disabled
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* LLM Gateway Configuration */}
        <div>
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            LLM Gateway & Model Routing
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configure which AI models handle specific tasks. Route simple tasks to local models (free) and complex analysis to cloud models.
          </p>
          
          <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            {/* Provider Status */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Server className="w-4 h-4" />
                Provider Status
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="font-medium">OpenAI (Cloud)</span>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
                    Available
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    <span className="font-medium">Ollama (Local)</span>
                  </div>
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-400">
                    Not Running
                  </Badge>
                </div>
              </div>
            </div>

            {/* Tool Routing Configuration */}
            <div className="border-t border-border pt-6">
              <h4 className="font-medium mb-3">Tool → Model Routing</h4>
              <div className="space-y-3">
                {[
                  {
                    tool: 'ai.chat',
                    name: 'AI Chat',
                    description: 'Context-aware chat with system engineering knowledge',
                    primary: { provider: 'OpenAI', model: 'gpt-4o' },
                    fallback: { provider: 'Ollama', model: 'llama3.1:8b' },
                    cost: 'High'
                  },
                  {
                    tool: 'ai.analyze',
                    name: 'AI Analysis',
                    description: 'Relationship discovery and impact assessment',
                    primary: { provider: 'OpenAI', model: 'gpt-4o' },
                    fallback: { provider: 'Ollama', model: 'llama3.1:8b' },
                    cost: 'High'
                  },
                  {
                    tool: 'ai.summarize',
                    name: 'Summarization',
                    description: 'Content summarization (headlines, paragraphs)',
                    primary: { provider: 'Ollama', model: 'llama3.1:8b' },
                    fallback: { provider: 'OpenAI', model: 'gpt-4o-mini' },
                    cost: 'Free'
                  },
                  {
                    tool: 'ai.embeddings',
                    name: 'Embeddings',
                    description: 'Vector embeddings for semantic search',
                    primary: { provider: 'OpenAI', model: 'text-embedding-3-small' },
                    fallback: null,
                    cost: 'Low'
                  },
                  {
                    tool: 'ai.code.generate',
                    name: 'Code Generation',
                    description: 'Generate code snippets and implementations',
                    primary: { provider: 'Ollama', model: 'codellama:13b' },
                    fallback: { provider: 'OpenAI', model: 'gpt-4o' },
                    cost: 'Free'
                  }
                ].map((config) => (
                  <div key={config.tool} className="bg-muted/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium">{config.name}</h5>
                          <Badge variant="outline" className={cn(
                            "text-xs",
                            config.cost === 'Free' && "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
                            config.cost === 'Low' && "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
                            config.cost === 'High' && "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400"
                          )}>
                            {config.cost} Cost
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{config.description}</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Primary</Label>
                        <div className="flex items-center gap-2 p-2 bg-background rounded border border-border">
                          <Badge variant="secondary" className="text-xs">{config.primary.provider}</Badge>
                          <span className="text-xs font-mono">{config.primary.model}</span>
                        </div>
                      </div>
                      {config.fallback && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Fallback</Label>
                          <div className="flex items-center gap-2 p-2 bg-background rounded border border-border">
                            <Badge variant="outline" className="text-xs">{config.fallback.provider}</Badge>
                            <span className="text-xs font-mono">{config.fallback.model}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Usage Statistics */}
            <div className="border-t border-border pt-6">
              <h4 className="font-medium mb-3">Usage Statistics (Last 24h)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-xs text-muted-foreground mt-1">Total Calls</div>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold">$0.00</div>
                  <div className="text-xs text-muted-foreground mt-1">Total Cost</div>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-xs text-muted-foreground mt-1">Tokens Used</div>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold">0ms</div>
                  <div className="text-xs text-muted-foreground mt-1">Avg Response</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-border pt-6 flex gap-2">
              <Button variant="outline" className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Status
              </Button>
              <Button variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Export Config
              </Button>
              <Button className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div>
          <h3 className="text-lg font-medium mb-4">Security Settings</h3>
          <div className="bg-card rounded-lg border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Switch disabled />
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <Label className="text-base font-medium">Session Timeout</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically log out after 30 minutes of inactivity
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <Label className="text-base font-medium">Audit Logging</Label>
                <p className="text-sm text-muted-foreground">
                  Track all administrative actions
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64 bg-card rounded-lg border border-border">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard": return renderDashboard();
      case "users": return renderUsers();
      case "data": return renderDataManagement();
      case "security": return renderSecurity();
      case "system": return renderSystem();
      case "diagnostics": return renderDiagnostics();
      default: return renderDashboard();
    }
  };

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Administration</h2>
        </div>
        
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            {[
              { id: "dashboard", label: "Dashboard", icon: BarChart3 },
              { id: "users", label: "Users", icon: Users },
              { id: "data", label: "Data Management", icon: Factory },
              { id: "system", label: "System", icon: Server },
              { id: "diagnostics", label: "Diagnostics", icon: Activity },
              { id: "security", label: "Security", icon: Shield }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div>
            <h3 className="text-lg font-medium capitalize">{activeTab}</h3>
            <p className="text-sm text-muted-foreground">
              {activeTab === "dashboard" && "System overview and quick actions"}
              {activeTab === "users" && "Manage user accounts and permissions"}
              {activeTab === "data" && "Control fake data generation and manage datasets"}
              {activeTab === "system" && "Configure system settings"}
              {activeTab === "security" && "Security and access control"}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-1" />
              Settings
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6">
            {renderContent()}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
