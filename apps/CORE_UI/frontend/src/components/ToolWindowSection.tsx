"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter,
  Grid3X3,
  List,
  Download,
  Upload,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  ChevronDown,
  MoreHorizontal
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import RequirementDetailModal from "./RequirementDetailModal";

interface ToolItem {
  id: string;
  title: string;
  type: "requirement" | "design" | "verification";
  status: "active" | "pending" | "completed";
  lastUpdated: string;
  owner: string;
  tags: string[];
  category?: string;
  priority?: string;
  verification_method?: string;
  text?: string;
  source_document?: string;
  source_page?: number;
  confidence?: number;
}

export default function ToolWindowSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "requirement" | "design" | "verification">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [items, setItems] = useState<ToolItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<ToolItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Function to fetch requirements from API
  const fetchRequirements = useCallback(async (searchTerm: string = "", category: string = "", reset: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        limit: "50",
        offset: reset ? "0" : (page * 50).toString(),
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (category && category !== 'all') params.append('category', category);
      
      const response = await fetch(`/api/requirements?${params.toString()}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch requirements');
      }
      
      if (reset) {
        setItems(data.requirements || []);
        setPage(0);
      } else {
        setItems(prev => [...prev, ...(data.requirements || [])]);
      }
      
      setTotal(data.total || 0);
      setHasMore(data.pagination?.hasMore || false);
      
    } catch (err) {
      console.error('Error fetching requirements:', err);
      setError(err instanceof Error ? err.message : 'Cannot connect to data engine: ' + (err instanceof Error ? err.message : 'fetch failed'));
      
      if (reset) {
        setItems([]);
        setTotal(0);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }
  }, [page]);

  // Initial load and search/filter changes
  useEffect(() => {
    fetchRequirements(searchQuery, filterType, true);
  }, [searchQuery, filterType, fetchRequirements]);

  // Items are already filtered by API, no need for additional frontend filtering
  const filteredItems = items;

  const handleRefresh = () => {
    fetchRequirements(searchQuery, filterType, true);
    toast.success("Content refreshed");
  };

  const handleRequirementClick = (requirement: ToolItem) => {
    setSelectedRequirement(requirement);
    setShowDetailModal(true);
  };

  const handleModalClose = () => {
    setShowDetailModal(false);
    setSelectedRequirement(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-[#395a7f]/10 text-[#395a7f] dark:bg-[#395a7f]/20 dark:text-[#6e9fc1]";
      case "pending": return "bg-[#acacac]/20 text-[#acacac] dark:bg-[#acacac]/10 dark:text-[#e9ecee]";
      case "completed": return "bg-[#a3cae9]/30 text-[#395a7f] dark:bg-[#395a7f]/15 dark:text-[#a3cae9]";
      default: return "bg-card text-card-foreground";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "requirement": return "📋";
      case "design": return "🎨";
      case "verification": return "✅";
      default: return "📄";
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64 h-9 bg-background border-border"
            />
          </div>

          <Tabs value={filterType} onValueChange={(value) => setFilterType(value as any)} className="w-auto">
            <TabsList className="bg-muted">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="requirement" className="text-xs">Requirements</TabsTrigger>
              <TabsTrigger value="design" className="text-xs">Design</TabsTrigger>
              <TabsTrigger value="verification" className="text-xs">Verification</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-md p-1">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-7 px-2"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-7 px-2"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={handleRefresh} className="h-8">
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>

          <Button variant="outline" size="sm" className="h-8">
            <Upload className="w-4 h-4 mr-1" />
            Import
          </Button>

          <Button size="sm" className="h-8">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {error && (
          <div className="p-4 bg-destructive/10 border-b border-destructive/20">
            <div className="flex items-center gap-2 text-destructive">
              <span className="text-sm font-medium">⚠️ {error}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => fetchRequirements(searchQuery, filterType, true)}
                className="text-destructive hover:text-destructive"
              >
                Retry
              </Button>
            </div>
          </div>
        )}
        
        <ScrollArea className="h-full">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">
                  {loading ? "Loading..." : `${total} total requirements`}
                </span>
                {!loading && total > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    Click any requirement to view full details
                  </span>
                )}
              </div>
              {loading && (
                <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
            
            {loading && items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Loading Requirements</h3>
                <p className="text-muted-foreground text-sm">
                  Fetching task requirements from database...
                </p>
              </div>
            ) : viewMode === "list" ? (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center justify-between p-4 bg-card rounded-lg border border-border hover:bg-muted/50 hover:border-primary/50 transition-all duration-200 cursor-pointer hover:shadow-sm"
                    onClick={() => handleRequirementClick(item)}
                    title="Click to view full requirement details"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-lg">{getTypeIcon(item.type)}</div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.title}</h4>
                        {item.text && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {item.text.substring(0, 120)}...
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">by {item.owner}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{item.lastUpdated}</span>
                          {item.confidence && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                {Math.round(item.confidence * 100)}% confidence
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {item.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      <Badge className={cn("text-xs", getStatusColor(item.status))}>
                        {item.status}
                      </Badge>
                      
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle more actions
                          }}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="group p-4 bg-card rounded-lg border border-border hover:bg-muted/50 hover:border-primary/50 transition-all duration-200 cursor-pointer hover:shadow-sm"
                    onClick={() => handleRequirementClick(item)}
                    title="Click to view full requirement details"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-lg">{getTypeIcon(item.type)}</div>
                      <Badge className={cn("text-xs", getStatusColor(item.status))}>
                        {item.status}
                      </Badge>
                    </div>
                    
                    <h4 className="font-medium text-sm mb-2">{item.title}</h4>
                    
                    <div className="text-xs text-muted-foreground mb-3">
                      <div>by {item.owner}</div>
                      <div>{item.lastUpdated}</div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="text-lg font-medium mb-2">No items found</h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery ? "Try adjusting your search terms" : "No items match the current filter"}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      
      <RequirementDetailModal 
        open={showDetailModal}
        onOpenChange={handleModalClose}
        requirement={selectedRequirement}
      />
    </div>
  );
}
