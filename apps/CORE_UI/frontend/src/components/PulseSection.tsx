"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import ActivityDetailDialog from "@/components/ActivityDetailDialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  Filter,
  Calendar,
  User,
  MessageSquare,
  FileText,
  GitCommit,
  Mail,
  Bell,
  BarChart3,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronRight,
  Eye,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEventStream, ActivityEvent } from "@/hooks/useEventStream";

interface ActivityItem {
  id: string;
  type: "task" | "validation" | "issue" | "change_request" | "notification";
  title: string;
  description: string;
  timestamp: string;
  user: {
    name: string;
    avatar: string;
  };
  source: string;
  isRead: boolean;
  status?: string;
  changeType?: string;
  metadata?: {
    priority?: string;
    affected_parts?: number;
    document?: string;
    recipients?: number;
    repository?: string;
    branch?: string;
    fileName?: string;
    participants?: number;
    [key: string]: any; // Allow additional metadata fields
  };
}

export default function PulseSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const agentLayers = ["meta", "governance", "operational", "construction", "schema"];
  const agentStatuses = ["active", "idle", "busy", "error"];
  const agentCapabilities = ["traversal", "reports", "schema_build", "ingestion", "routing"];
  
  const [selectedAgentLayers, setSelectedAgentLayers] = useState<string[]>([]);
  const [selectedAgentStatuses, setSelectedAgentStatuses] = useState<string[]>([]);
  const [selectedAgentCapabilities, setSelectedAgentCapabilities] = useState<string[]>([]);

  // Real-time event stream (only active in real data mode)
  const { events: sseEvents, connected: sseConnected } = useEventStream({
    maxEvents: 50,
    autoReconnect: true,
  });

  // Merge SSE events into activities when in real mode
  useEffect(() => {
    if (sseEvents.length === 0) return;

    const newItems: ActivityItem[] = sseEvents
      .filter((ev: ActivityEvent) => !activities.some(a => a.id === ev.id))
      .map((ev: ActivityEvent) => ({
        id: ev.id,
        type: (ev.entity_type === 'Task' ? 'task' :
               ev.entity_type === 'Validation' ? 'validation' :
               ev.entity_type === 'Issue' ? 'issue' : 'notification') as ActivityItem['type'],
        title: ev.summary,
        description: `${ev.event_type} by ${ev.source}`,
        timestamp: new Date(ev.timestamp).toLocaleString(),
        user: {
          name: ev.source,
          avatar: ev.source.substring(0, 2).toUpperCase(),
        },
        source: ev.source,
        isRead: false,
        status: ev.event_type,
        changeType: ev.event_type,
        metadata: ev.metadata,
      }));

    if (newItems.length > 0) {
      setActivities(prev => [...newItems, ...prev].slice(0, 100));
    }
  }, [sseEvents]);

  // Fetch initial activity from Chelex governance feed
  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch('/api/opal/proxy/api/chelex/activity');
        if (!res.ok) { setIsLoading(false); return; }
        const data = await res.json();
        const events = data.events || [];
        const mapped: ActivityItem[] = events.map((ev: any) => {
          const typeMap: Record<string, ActivityItem['type']> = {
            task_created: 'task', plan_submitted: 'change_request', plan_decision: 'validation',
          };
          return {
            id: ev.id,
            type: typeMap[ev.event_type] || 'notification',
            title: ev.title || ev.decision || ev.event_type,
            description: ev.status ? `Status: ${ev.status}` : '',
            timestamp: ev.timestamp ? new Date(ev.timestamp).toLocaleString() : '',
            user: { name: ev.approved_by || 'System', avatar: 'SY' },
            source: 'Chelex',
            isRead: false,
            status: ev.status || ev.decision,
            changeType: ev.event_type,
          };
        });
        setActivities(prev => [...mapped, ...prev].slice(0, 100));
      } catch (err) {
        console.error('Failed to fetch Chelex activity:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchActivity();
  }, []);

  const filteredItems = useMemo(() => {
    return activities.filter(item => {
      const matchesSearch = searchQuery === "" || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      // For now, filter logic is placeholder - in real implementation, 
      // activities would have agent metadata to filter against
      const matchesLayer = selectedAgentLayers.length === 0;
      const matchesStatus = selectedAgentStatuses.length === 0;
      const matchesCapability = selectedAgentCapabilities.length === 0;
      
      return matchesSearch && matchesLayer && matchesStatus && matchesCapability;
    });
  }, [activities, searchQuery, selectedAgentLayers, selectedAgentStatuses, selectedAgentCapabilities]);

  const toggleAgentLayer = (layer: string) => {
    setSelectedAgentLayers(prev => 
      prev.includes(layer) 
        ? prev.filter(l => l !== layer)
        : [...prev, layer]
    );
  };

  const toggleAgentStatus = (status: string) => {
    setSelectedAgentStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };
  
  const toggleAgentCapability = (capability: string) => {
    setSelectedAgentCapabilities(prev => 
      prev.includes(capability) 
        ? prev.filter(c => c !== capability)
        : [...prev, capability]
    );
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "requirement": return FileText;
      case "test_case": return GitCommit;
      case "issue": return MessageSquare;
      case "change_request": return Bell;
      case "email": return Mail;
      default: return FileText;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "jama": return "bg-blue-500/10 text-blue-500 border-blue-500/30";
      case "jira": return "bg-orange-500/10 text-orange-500 border-orange-500/30";
      case "agent": return "bg-purple-500/10 text-purple-500 border-purple-500/30";
      case "email": return "bg-green-500/10 text-green-500 border-green-500/30";
      default: return "bg-card text-card-foreground border-border";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "requirement": return "bg-blue-500/10 text-blue-400";
      case "test_case": return "bg-green-500/10 text-green-400";
      case "issue": return "bg-red-500/10 text-red-400";
      case "change_request": return "bg-yellow-500/10 text-yellow-400";
      case "email": return "bg-purple-500/10 text-purple-400";
      default: return "bg-card text-card-foreground border-border";
    }
  };

  return (
    <div className="flex h-full bg-background">
      {/* Filter Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-medium text-sm mb-3">Filters</h3>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 bg-background border-border"
            />
          </div>

          {/* Agent Layer Filter */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Agent Layer</h4>
            <div className="space-y-2">
              {agentLayers.map((layer) => (
                <label key={layer} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAgentLayers.includes(layer)}
                    onChange={() => toggleAgentLayer(layer)}
                    className="rounded border-border"
                  />
                  <span className="capitalize">{layer === 'meta' ? 'Layer 5: Meta' : layer === 'governance' ? 'Layer 4: Governance' : layer === 'operational' ? 'Layer 3: Operational' : layer === 'construction' ? 'Layer 2: Construction' : 'Layer 1: Schema Gen'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Agent Status Filter */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Agent Status</h4>
            <div className="space-y-2">
              {agentStatuses.map((status) => (
                <label key={status} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAgentStatuses.includes(status)}
                    onChange={() => toggleAgentStatus(status)}
                    className="rounded border-border"
                  />
                  <span className="capitalize">{status}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Agent Capability Filter */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Agent Capability</h4>
            <div className="space-y-2">
              {agentCapabilities.map((capability) => (
                <label key={capability} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAgentCapabilities.includes(capability)}
                    onChange={() => toggleAgentCapability(capability)}
                    className="rounded border-border"
                  />
                  <span className="capitalize">{capability === 'traversal' ? 'Graph Traversal' : capability === 'reports' ? 'Report Generation' : capability === 'schema_build' ? 'Schema Building' : capability === 'ingestion' ? 'Data Ingestion' : 'Agent Routing'}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 border-b border-border">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Activity Stats</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Total Events</span>
              <Badge variant="secondary">{activities.length}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Unread</span>
              <Badge variant="secondary">{activities.filter(a => !a.isRead).length}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Filtered</span>
              <Badge variant="secondary">{filteredItems.length}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Activity Pulse</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {'Real-time feed of all project activities'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-1" />
              Analytics
            </Button>
            <Button size="sm">
              <Bell className="w-4 h-4 mr-1" />
              Subscribe
            </Button>
          </div>
        </div>

        {/* Activity Feed */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-sm text-muted-foreground">Loading activity feed...</p>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-lg font-medium mb-2 text-red-500">Error Loading Feed</h3>
                <p className="text-muted-foreground text-sm mb-4">{error}</p>
                <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                  Retry
                </Button>
              </div>
            )}

            {/* Activity Items */}
            {!isLoading && !error && filteredItems.map((item) => {
              const Icon = getActivityIcon(item.type);
              const isExpanded = expandedItems.includes(item.id);
              
              return (
                <div key={item.id} className="bg-card rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm truncate pr-2">{item.title}</h4>
                        <div className="flex items-center gap-2">
                          {!item.isRead && (
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#6e9fc1' }} />
                          )}
                          <Badge className={cn("text-xs", getSourceColor(item.source))}>
                            {item.source}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={cn("text-xs", getTypeColor(item.type))}>
                            {item.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{item.user.name}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{item.timestamp}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setSelectedActivity(item);
                              setShowDetailDialog(true);
                            }}
                            title="View details"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={() => toggleExpanded(item.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && item.metadata && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            {item.metadata.repository && (
                              <div>
                                <span className="text-muted-foreground">Repository:</span>
                                <span className="ml-1 font-medium">{item.metadata.repository}</span>
                              </div>
                            )}
                            {item.metadata.branch && (
                              <div>
                                <span className="text-muted-foreground">Branch:</span>
                                <span className="ml-1 font-medium">{item.metadata.branch}</span>
                              </div>
                            )}
                            {item.metadata.fileName && (
                              <div>
                                <span className="text-muted-foreground">File:</span>
                                <span className="ml-1 font-medium">{item.metadata.fileName}</span>
                              </div>
                            )}
                            {item.metadata.participants && (
                              <div>
                                <span className="text-muted-foreground">Participants:</span>
                                <span className="ml-1 font-medium">{item.metadata.participants}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {!isLoading && !error && filteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-medium mb-2">No activities found</h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery || selectedSources.length > 0 || selectedTypes.length > 0
                    ? "Try adjusting your filters"
                    : "Activity feed will appear here as events occur"
                  }
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Activity Detail Dialog */}
      <ActivityDetailDialog
        activity={selectedActivity}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
      />
    </div>
  );
}
