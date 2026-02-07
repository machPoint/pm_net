"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, Filter, RefreshCw, Network, BarChart3, AlertTriangle, CheckCircle } from 'lucide-react';

import TraceGraph from '@/components/TraceGraph';
import AIChatPanel from '@/components/AIChatPanel';
import { 
  loadRequirementsAsTraceNodes, 
  searchRequirementsForTrace,
  getRequirementImpactData,
  updateTraceNodePositions 
} from '@/utils/requirements-transform';
import { RequirementConnection } from '@/services/database/requirements-connection-service';

// TraceNode interface (should match the one in utils)
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
    criticality?: "DAL-A" | "DAL-B" | "DAL-C" | "DAL-D" | "DAL-E";
  };
  position?: { x: number; y: number };
  details?: any;
}

export default function RequirementsTracePage() {
  // State management
  const [traceNodes, setTraceNodes] = useState<TraceNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<TraceNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [criticalityFilter, setCriticalityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  
  // Impact analysis state
  const [impactData, setImpactData] = useState<any>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    pending: 0,
    connections: 0,
    criticalRequirements: 0
  });

  // Load requirements on component mount
  useEffect(() => {
    loadRequirements();
  }, []);

  // Calculate stats when nodes change
  useEffect(() => {
    calculateStats();
  }, [traceNodes]);

  // Load all requirements and transform to TraceNodes
  const loadRequirements = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const nodes = await loadRequirementsAsTraceNodes();
      setTraceNodes(nodes);
      
    } catch (err) {
      console.error('Error loading requirements:', err);
      setError('Failed to load requirements. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Search and filter requirements
  const handleSearch = async () => {
    try {
      setLoading(true);
      
      const filters = {
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        criticality: criticalityFilter || undefined
      };
      
      const filteredNodes = await searchRequirementsForTrace(searchQuery, filters);
      setTraceNodes(filteredNodes);
      
    } catch (err) {
      console.error('Error searching requirements:', err);
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Clear filters and reload all requirements
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setCriticalityFilter('');
    setCategoryFilter('');
    loadRequirements();
  };

  // Handle node selection and load impact data
  const handleNodeClick = useCallback(async (node: TraceNode) => {
    setSelectedNode(node);
    
    // Load impact analysis data for the selected requirement
    try {
      setLoadingImpact(true);
      const impact = await getRequirementImpactData(node.id);
      setImpactData(impact);
    } catch (err) {
      console.error('Error loading impact data:', err);
    } finally {
      setLoadingImpact(false);
    }
  }, []);

  // Handle new connection creation
  const handleConnectionCreate = useCallback((connection: RequirementConnection) => {
    console.log('New connection created:', connection);
    
    // Update the trace nodes to reflect the new connection
    setTraceNodes(currentNodes => {
      return currentNodes.map(node => {
        if (node.id === connection.sourceId) {
          return {
            ...node,
            connections: [...node.connections, connection.targetId]
          };
        }
        if (node.id === connection.targetId) {
          return {
            ...node,
            connections: [...node.connections, connection.sourceId]
          };
        }
        return node;
      });
    });
    
    // Recalculate stats
    calculateStats();
  }, []);

  // Handle nodes update (e.g., position changes)
  const handleNodesUpdate = useCallback(async (updatedNodes: TraceNode[]) => {
    setTraceNodes(updatedNodes);
    
    // Persist position changes
    try {
      await updateTraceNodePositions(updatedNodes);
    } catch (err) {
      console.error('Error updating node positions:', err);
    }
  }, []);

  // Calculate statistics
  const calculateStats = () => {
    const total = traceNodes.length;
    const verified = traceNodes.filter(n => n.status === 'verified').length;
    const pending = traceNodes.filter(n => n.status === 'pending').length;
    const connections = traceNodes.reduce((sum, node) => sum + node.connections.length, 0) / 2; // Divide by 2 since connections are bidirectional
    const criticalRequirements = traceNodes.filter(n => 
      n.metadata.criticality === 'DAL-A' || n.metadata.criticality === 'DAL-B'
    ).length;
    
    setStats({
      total,
      verified,
      pending,
      connections,
      criticalRequirements
    });
  };

  if (loading && traceNodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading requirements trace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Requirements Trace</h1>
          <p className="text-muted-foreground">
            Visualize requirement connections and analyze downstream impacts
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadRequirements} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requirements</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connections</CardTitle>
            <Network className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.connections}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical (DAL-A/B)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.criticalRequirements}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search requirements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Criticality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All DAL</SelectItem>
                <SelectItem value="DAL-A">DAL-A</SelectItem>
                <SelectItem value="DAL-B">DAL-B</SelectItem>
                <SelectItem value="DAL-C">DAL-C</SelectItem>
                <SelectItem value="DAL-D">DAL-D</SelectItem>
                <SelectItem value="DAL-E">DAL-E</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            
            <Button variant="outline" onClick={clearFilters}>
              <Filter className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Trace Graph */}
        <div className="lg:col-span-3">
          <Card className="h-[600px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Requirements Trace Graph
              </CardTitle>
              <CardDescription>
                Click nodes to view details and connections. Use "Connect Nodes" to create relationships.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[500px] p-0">
              <TraceGraph
                traceNodes={traceNodes}
                selectedNode={selectedNode}
                onNodeClick={handleNodeClick}
                onConnectionCreate={handleConnectionCreate}
                onNodesUpdate={handleNodesUpdate}
                allowEditing={true}
              />
            </CardContent>
          </Card>
        </div>

        {/* AI Chat Panel */}
        <div className="h-[600px]">
          <AIChatPanel 
            selectedRequirement={selectedNode}
            onContextChange={(context) => {
              console.log('Chat context changed:', context);
              // You can add additional context change handling here if needed
            }}
          />
        </div>
      </div>
    </div>
  );
}