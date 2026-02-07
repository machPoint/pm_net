"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Database, 
  RefreshCw, 
  Play, 
  Square, 
  Server, 
  Activity, 
  BarChart3,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DataEngineStatus {
  isRunning: boolean;
  port: number;
  uptime?: string;
  lastDataGeneration?: string;
  totalRequests?: number;
}

interface DataStats {
  jama_items: number;
  jira_issues: number;
  windchill_parts: number;
  windchill_ecn: number;
  email_messages: number;
  outlook_messages: number;
}

interface MockDataControl {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  count: number;
  enabled: boolean;
}

export default function DataEngineSection() {
  const [engineStatus, setEngineStatus] = useState<DataEngineStatus>({
    isRunning: false,
    port: 4000,
    uptime: undefined,
    lastDataGeneration: undefined,
    totalRequests: 0
  });

  const [dataStats, setDataStats] = useState<DataStats>({
    jama_items: 0,
    jira_issues: 0,
    windchill_parts: 0,
    windchill_ecn: 0,
    email_messages: 0,
    outlook_messages: 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [engineProcess, setEngineProcess] = useState<string | null>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [uploadedPdfs, setUploadedPdfs] = useState<any[]>([]);

  const mockDataControls: MockDataControl[] = [
    {
      id: "jama",
      name: "Jama Connect",
      description: "Requirements and test cases",
      endpoint: "/mock/jama/items",
      count: dataStats.jama_items,
      enabled: true
    },
    {
      id: "jira",
      name: "Jira Issues",
      description: "Engineering issues and tasks",
      endpoint: "/mock/jira/issues", 
      count: dataStats.jira_issues,
      enabled: true
    },
    {
      id: "windchill",
      name: "Windchill PLM",
      description: "Parts and engineering changes",
      endpoint: "/mock/windchill/parts",
      count: dataStats.windchill_parts + dataStats.windchill_ecn,
      enabled: true
    },
    {
      id: "email",
      name: "Email & Outlook",
      description: "Messages and communications",
      endpoint: "/mock/email/messages",
      count: dataStats.email_messages + dataStats.outlook_messages,
      enabled: true
    }
  ];

  // Check engine status
  const checkEngineStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const startTime = Date.now();
      const response = await fetch('http://localhost:4000/health');
      const endTime = Date.now();
      
      if (response.ok) {
        const data = await response.json();
        setEngineStatus({
          isRunning: true,
          port: 4000,
          uptime: "Running",
          lastDataGeneration: new Date().toLocaleString(),
          totalRequests: (engineStatus.totalRequests || 0) + 1
        });
        setLatencyMs(endTime - startTime);
        
        // Fetch data statistics
        await fetchDataStats();
      } else {
        throw new Error(`Engine returned ${response.status}`);
      }
    } catch (err) {
      setEngineStatus(prev => ({ ...prev, isRunning: false }));
      setError("Fake Data Engine not running. You need to start the server manually.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data statistics
  const fetchDataStats = async () => {
    try {
      // Fetch sample data from different endpoints to get counts
      const [jamaRes, jiraRes, windchillRes, emailRes] = await Promise.all([
        fetch('http://localhost:4000/mock/jama/items?size=1'),
        fetch('http://localhost:4000/mock/jira/issues?size=1'),
        fetch('http://localhost:4000/mock/windchill/parts?size=1'),
        fetch('http://localhost:4000/mock/email/messages')
      ]);

      // For now, use mock counts since we don't have total count endpoints
      setDataStats({
        jama_items: 137, // From our test earlier
        jira_issues: 35,
        windchill_parts: 24,
        windchill_ecn: 6,
        email_messages: 10,
        outlook_messages: 10
      });
    } catch (err) {
      console.error("Failed to fetch data stats:", err);
    }
  };

  // Regenerate data
  const regenerateData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:4000/mock/admin/seed', {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        // Refresh stats after regeneration
        await fetchDataStats();
        setEngineStatus(prev => ({
          ...prev,
          lastDataGeneration: new Date().toLocaleString()
        }));
      } else {
        throw new Error(`Failed to regenerate data: ${response.status}`);
      }
    } catch (err) {
      setError(`Failed to regenerate data: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Start engine
  const startEngine = async () => {
    try {
      setIsStarting(true);
      setError(null);
      
      // Try to start via API first
      const response = await fetch('/api/fds/start', {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        setEngineProcess(result.processId);
        // Wait a moment then check status
        setTimeout(() => checkEngineStatus(), 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start engine');
      }
    } catch (err) {
      // Show instructions for manual start since you're already in the FDS directory
      setError(
        "Cannot start engine automatically from the web interface. " +
        "Since you're in the backend/fds directory, please run: python start_fds.py"
      );
    } finally {
      setIsStarting(false);
    }
  };

  // Stop engine
  const stopEngine = async () => {
    try {
      setIsStopping(true);
      setError(null);
      
      const response = await fetch('/api/fds/stop', {
        method: 'POST'
      });
      
      if (response.ok) {
        setEngineProcess(null);
        setEngineStatus(prev => ({ ...prev, isRunning: false }));
      } else {
        setError("Cannot stop engine automatically. You may need to stop it manually.");
      }
    } catch (err) {
      setError("Cannot stop engine automatically. You may need to stop it manually.");
    } finally {
      setIsStopping(false);
    }
  };

  // Handle PDF upload
  const handlePdfUpload = async (file: File) => {
    try {
      setIsProcessingPdf(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('pdf', file);
      
      const response = await fetch('/api/pdf/extract', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Success - show results
        setError(null);
        console.log('PDF processed successfully:', result);
        
        // Add to uploaded PDFs list
        setUploadedPdfs(prev => [
          ...prev,
          {
            filename: result.fileName,
            originalName: file.name,
            extractedCount: result.extractedCount,
            uploadedAt: new Date().toLocaleString()
          }
        ]);
        
        // Optionally regenerate data with new requirements
        if (engineStatus.isRunning) {
          setTimeout(() => regenerateData(), 2000);
        }
      } else {
        throw new Error(result.error || 'Failed to process PDF');
      }
    } catch (err) {
      setError(`Failed to process PDF: ${err}`);
    } finally {
      setIsProcessingPdf(false);
    }
  };

  // Test endpoint
  const testEndpoint = async (endpoint: string) => {
    try {
      setIsLoading(true);
      const startTime = Date.now();
      const response = await fetch(`http://localhost:4000${endpoint}?size=5`);
      const endTime = Date.now();
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Test ${endpoint}:`, data);
        setLatencyMs(endTime - startTime);
      } else {
        throw new Error(`Test failed: ${response.status}`);
      }
    } catch (err) {
      setError(`Test failed for ${endpoint}: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial status check
  useEffect(() => {
    checkEngineStatus();
    // Set up periodic status checking
    const interval = setInterval(checkEngineStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full p-6 space-y-6 bg-[var(--color-main-panel)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] flex items-center gap-3">
            <Database className="w-6 h-6" />
            Fake Data Engine
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Manage and control the mock data service for engineering systems
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {!engineStatus.isRunning ? (
            <Button 
              onClick={startEngine}
              disabled={isStarting || isLoading}
              className="gap-2"
            >
              <Play className={cn("w-4 h-4", isStarting && "animate-pulse")} />
              {isStarting ? "Starting..." : "Start Engine"}
            </Button>
          ) : (
            <Button 
              variant="destructive"
              onClick={stopEngine}
              disabled={isStopping || isLoading}
              className="gap-2"
            >
              <Square className={cn("w-4 h-4", isStopping && "animate-pulse")} />
              {isStopping ? "Stopping..." : "Stop Engine"}
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={checkEngineStatus}
            disabled={isLoading || isStarting || isStopping}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="data-sources">Data Sources</TabsTrigger>
          <TabsTrigger value="controls">Controls</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engine Status</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    engineStatus.isRunning ? "bg-green-500" : "bg-red-500"
                  )} />
                  <Badge variant={engineStatus.isRunning ? "default" : "destructive"}>
                    {engineStatus.isRunning ? "Running" : "Stopped"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Port {engineStatus.port}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Response Time</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{latencyMs}ms</div>
                <p className="text-xs text-muted-foreground">
                  Last request latency
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.values(dataStats).reduce((a, b) => a + b, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all systems
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {engineStatus.lastDataGeneration || "Never"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Data generation
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Data Distribution</CardTitle>
              <CardDescription>
                Current mock data counts by system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Jama Items</p>
                  <p className="text-2xl font-bold text-blue-600">{dataStats.jama_items}</p>
                  <p className="text-xs text-muted-foreground">Requirements & tests</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Jira Issues</p>
                  <p className="text-2xl font-bold text-orange-600">{dataStats.jira_issues}</p>
                  <p className="text-xs text-muted-foreground">Engineering issues</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Windchill Parts</p>
                  <p className="text-2xl font-bold text-green-600">{dataStats.windchill_parts}</p>
                  <p className="text-xs text-muted-foreground">CAD components</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">ECN Records</p>
                  <p className="text-2xl font-bold text-purple-600">{dataStats.windchill_ecn}</p>
                  <p className="text-xs text-muted-foreground">Engineering changes</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Email Messages</p>
                  <p className="text-2xl font-bold text-red-600">{dataStats.email_messages}</p>
                  <p className="text-xs text-muted-foreground">Email system</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Outlook Items</p>
                  <p className="text-2xl font-bold text-indigo-600">{dataStats.outlook_messages}</p>
                  <p className="text-xs text-muted-foreground">Calendar & messages</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-sources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockDataControls.map((control) => (
              <Card key={control.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{control.name}</CardTitle>
                      <CardDescription>{control.description}</CardDescription>
                    </div>
                    <Badge variant={control.enabled ? "default" : "secondary"}>
                      {control.count} records
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Endpoint: {control.endpoint}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => testEndpoint(control.endpoint)}
                      disabled={!engineStatus.isRunning || isLoading}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="controls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real Requirements Integration</CardTitle>
              <CardDescription>
                Upload PDF documents to extract real mission requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Upload Requirements PDF</h4>
                  <p className="text-sm text-muted-foreground">
                    Extract real requirements from GOES-R MRD or other mission documents
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept=".pdf"
                    id="pdf-upload"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handlePdfUpload(file);
                      }
                    }}
                  />
                  <Button 
                    variant="outline"
                    onClick={() => document.getElementById('pdf-upload')?.click()}
                    disabled={!engineStatus.isRunning || isLoading || isProcessingPdf}
                    className="gap-2"
                  >
                    <FileText className={cn("w-4 h-4", isProcessingPdf && "animate-pulse")} />
                    {isProcessingPdf ? "Processing..." : "Upload PDF"}
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                <p><strong>Supported Documents:</strong></p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>GOES-R Mission Requirements Document (MRD)</li>
                  <li>NASA/NOAA Requirements Documents</li>
                  <li>System Requirements Specifications</li>
                  <li>Interface Control Documents</li>
                </ul>
              </div>
              
              {uploadedPdfs.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h5 className="font-medium mb-3">Uploaded Requirements</h5>
                  <div className="space-y-2">
                    {uploadedPdfs.map((pdf, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                        <div>
                          <span className="font-medium">{pdf.originalName}</span>
                          <span className="text-muted-foreground ml-2">({pdf.extractedCount} requirements)</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{pdf.uploadedAt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Control data generation and engine operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Regenerate All Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Generate fresh mock data for all systems
                  </p>
                </div>
                <Button 
                  onClick={regenerateData}
                  disabled={!engineStatus.isRunning || isLoading}
                  className="gap-2"
                >
                  <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                  Regenerate
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Use Real Requirements</h4>
                  <p className="text-sm text-muted-foreground">
                    Switch to using real requirements from uploaded PDFs
                  </p>
                </div>
                <Button 
                  variant="secondary"
                  disabled={!engineStatus.isRunning || isLoading}
                  className="gap-2"
                >
                  <Database className="w-4 h-4" />
                  Switch Mode
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Engine Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latency">Mock Latency (ms)</Label>
                    <Input 
                      id="latency" 
                      type="number" 
                      placeholder="0" 
                      defaultValue="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Simulate network latency for testing
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="error-rate">Error Rate (%)</Label>
                    <Input 
                      id="error-rate" 
                      type="number" 
                      placeholder="0" 
                      defaultValue="0"
                      max="100"
                    />
                    <p className="text-xs text-muted-foreground">
                      Simulate random API errors
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> The Fake Data Engine control from the web interface may not work in all environments.
              {!engineStatus.isRunning && (
                <div className="mt-2 space-y-2">
                  <p className="text-sm">Manual start command (since you're in the FDS directory):</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm flex-1">python start_fds.py</code>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText('python start_fds.py');
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Health</CardTitle>
              <CardDescription>
                Monitor fake data service performance and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Service Status</span>
                  <div className="flex items-center gap-2">
                    {engineStatus.isRunning ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm">
                      {engineStatus.isRunning ? "Healthy" : "Unavailable"}
                    </span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Port:</span>
                    <span>{engineStatus.port}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Requests:</span>
                    <span>{engineStatus.totalRequests || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Average Response:</span>
                    <span>{latencyMs}ms</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Endpoints</CardTitle>
              <CardDescription>
                Available mock data endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span>GET /health</span>
                  <Badge variant="outline" className="text-xs">Health Check</Badge>
                </div>
                <div className="flex justify-between">
                  <span>GET /mock/jama/items</span>
                  <Badge variant="outline" className="text-xs">Requirements</Badge>
                </div>
                <div className="flex justify-between">
                  <span>GET /mock/jira/issues</span>
                  <Badge variant="outline" className="text-xs">Issues</Badge>
                </div>
                <div className="flex justify-between">
                  <span>GET /mock/windchill/parts</span>
                  <Badge variant="outline" className="text-xs">Parts</Badge>
                </div>
                <div className="flex justify-between">
                  <span>GET /mock/pulse</span>
                  <Badge variant="outline" className="text-xs">Activity Feed</Badge>
                </div>
                <div className="flex justify-between">
                  <span>POST /mock/admin/seed</span>
                  <Badge variant="outline" className="text-xs">Regenerate</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
