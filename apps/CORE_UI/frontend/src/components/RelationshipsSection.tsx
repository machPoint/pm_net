"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  GitBranch,
  Search,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Zap,
  FileText,
  Mail,
  Package,
  Link2,
  ArrowRight,
  Loader2,
  Brain,
  TrendingUp,
  Shield,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DataSource {
  id: string;
  type: "jira" | "jama" | "email" | "document" | "requirement" | "code";
  title: string;
  content: string;
  metadata: {
    owner?: string;
    date?: string;
    system?: string;
  };
}

interface DiscoveredRelationship {
  id: string;
  sourceA: DataSource;
  sourceB: DataSource;
  relationshipType: "dependency" | "shared-resource" | "integration" | "conflict" | "opportunity";
  confidence: number; // 0-100
  description: string;
  aiInsight: string;
  potentialRisks?: string[];
  recommendations?: string[];
  systemsInvolved: string[];
}

export default function RelationshipsSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSources, setSelectedSources] = useState<DataSource[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [discoveredRelationships, setDiscoveredRelationships] = useState<DiscoveredRelationship[]>([]);
  const [selectedRelationship, setSelectedRelationship] = useState<DiscoveredRelationship | null>(null);

  // Mock data sources
  const mockDataSources: DataSource[] = [
    {
      id: "jira-prop-001",
      type: "jira",
      title: "PROP-456: Propulsion System O2 Pressure Regulation",
      content: "Update oxygen pressure regulation system for main propulsion. Requirements include maintaining 3000 PSI oxygen supply for combustion chamber with redundant pressure sensors.",
      metadata: {
        owner: "Sarah Chen",
        date: "2024-01-15",
        system: "Propulsion"
      }
    },
    {
      id: "jama-eclss-002",
      type: "jama",
      title: "REQ-ECLSS-789: Air Revitalization System Requirements",
      content: "The Environmental Control and Life Support System (ECLSS) shall provide breathable atmosphere for crew. Oxygen supply requirements: 0.84 kg/day per crew member at 14.7 PSI cabin pressure.",
      metadata: {
        owner: "Dr. Michael Rodriguez",
        date: "2024-01-10",
        system: "Life Support"
      }
    },
    {
      id: "email-safety-003",
      type: "email",
      title: "Email: Cross-System Safety Review Meeting Notes",
      content: "Discussed oxygen distribution across propulsion and ECLSS. Chief Engineer noted potential shared supply tank between systems. Action item: verify O2 routing and ensure adequate supply for both critical systems.",
      metadata: {
        owner: "Chief Engineer Lisa Park",
        date: "2024-01-12",
        system: "Systems Engineering"
      }
    },
    {
      id: "jama-power-004",
      type: "jama",
      title: "REQ-PWR-334: Battery System Power Distribution",
      content: "Primary battery system shall provide power to critical avionics, ECLSS fans, and propulsion ignition systems. Load analysis required for concurrent operations.",
      metadata: {
        owner: "James Wilson",
        date: "2024-01-08",
        system: "Power Systems"
      }
    },
    {
      id: "doc-thermal-005",
      type: "document",
      title: "Thermal Control System Design Document",
      content: "Heat rejection from propulsion combustion affects cabin thermal management. ECLSS cooling loops must account for additional thermal load during propulsion burns.",
      metadata: {
        owner: "Anna Kowalski",
        date: "2024-01-05",
        system: "Thermal Management"
      }
    }
  ];

  const handleAnalyzeRelationships = async () => {
    if (selectedSources.length < 2) {
      toast.error("Select at least 2 data sources to analyze relationships");
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Call the OpenAI API to analyze relationships
      const response = await fetch('/api/ai/discover-relationships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sources: selectedSources
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMsg = errorData.error || errorData.details || `HTTP error! status: ${response.status}`;
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const relationships: DiscoveredRelationship[] = data.relationships || [];

      setDiscoveredRelationships(relationships);
      toast.success(`✅ Discovered ${relationships.length} cross-system relationship${relationships.length !== 1 ? 's' : ''}!`, { duration: 5000 });
    } catch (error) {
      console.error('Error analyzing relationships:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`❌ Failed to analyze relationships: ${errorMsg}\n\nMake sure OPAL_SE is running and the OpenAI API key is configured.`, { duration: 8000 });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSourceSelection = (source: DataSource) => {
    if (selectedSources.find(s => s.id === source.id)) {
      setSelectedSources(selectedSources.filter(s => s.id !== source.id));
    } else {
      setSelectedSources([...selectedSources, source]);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "jira": return Package;
      case "jama": return FileText;
      case "email": return Mail;
      case "document": return FileText;
      default: return FileText;
    }
  };

  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case "shared-resource": return Link2;
      case "dependency": return ArrowRight;
      case "integration": return GitBranch;
      case "conflict": return AlertCircle;
      case "opportunity": return Zap;
      default: return Link2;
    }
  };

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case "shared-resource": return "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300";
      case "dependency": return "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-300";
      case "integration": return "bg-green-500/20 text-green-700 dark:text-green-300 border-green-300";
      case "conflict": return "bg-red-500/20 text-red-700 dark:text-red-300 border-red-300";
      case "opportunity": return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-300";
      default: return "bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-300";
    }
  };

  const filteredSources = mockDataSources.filter(source =>
    source.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    source.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    source.metadata.system?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full bg-background">
      {/* Left Panel - Data Sources */}
      <div className="w-96 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">AI Relationship Discovery</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Select multiple data sources to discover hidden cross-system relationships using AI
          </p>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search data sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9"
            />
          </div>

          {/* Selected Sources Badge */}
          {selectedSources.length > 0 && (
            <div className="mb-4">
              <Badge variant="secondary" className="text-xs">
                {selectedSources.length} source{selectedSources.length !== 1 ? 's' : ''} selected
              </Badge>
            </div>
          )}

          {/* Analyze Button */}
          <Button
            onClick={handleAnalyzeRelationships}
            disabled={isAnalyzing || selectedSources.length < 2}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Relationships
              </>
            )}
          </Button>
        </div>

        {/* Data Sources List */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Available Data Sources</h3>
          {filteredSources.map((source) => {
            const Icon = getSourceIcon(source.type);
            const isSelected = selectedSources.find(s => s.id === source.id);
            
            return (
              <div
                key={source.id}
                onClick={() => toggleSourceSelection(source)}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-all",
                  isSelected
                    ? "bg-primary/10 border-primary shadow-sm"
                    : "bg-background border-border hover:bg-muted/50"
                )}
              >
                <div className="flex items-start gap-2 mb-2">
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm leading-tight mb-1">{source.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {source.content}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-[9px]">
                    {source.type.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {source.metadata.system}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content - Discovered Relationships */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-border bg-card">
          <h2 className="text-xl font-semibold mb-2">Cross-System Relationships</h2>
          <p className="text-sm text-muted-foreground">
            AI-discovered connections between systems, requirements, and data sources
          </p>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {discoveredRelationships.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                  <GitBranch className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Relationships Discovered Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Select at least 2 data sources from the left panel and click "Analyze Relationships" 
                  to discover hidden connections across your systems using AI.
                </p>
                <div className="bg-muted/30 rounded-lg p-4 text-left">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Example Use Case
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    A propulsion Jira ticket, life support requirements, and a meeting email 
                    might reveal that O2 in the propulsion system is also used as breathing air 
                    for the crew—a critical relationship that could be missed!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {discoveredRelationships.map((relationship) => {
                const RelIcon = getRelationshipIcon(relationship.relationshipType);
                
                return (
                  <Card
                    key={relationship.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      selectedRelationship?.id === relationship.id && "ring-2 ring-primary"
                    )}
                    onClick={() => setSelectedRelationship(relationship)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">
                            <RelIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base mb-2">{relationship.description}</CardTitle>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={cn("text-xs", getRelationshipColor(relationship.relationshipType))}>
                                {relationship.relationshipType.replace('-', ' ')}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {relationship.confidence}% confidence
                              </Badge>
                              {relationship.systemsInvolved.map((system) => (
                                <Badge key={system} variant="outline" className="text-xs">
                                  {system}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* AI Insight */}
                      <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-start gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-primary mt-0.5" />
                          <h4 className="font-medium text-sm">AI Insight</h4>
                        </div>
                        <p className="text-sm text-muted-foreground pl-6">
                          {relationship.aiInsight}
                        </p>
                      </div>

                      {/* Connected Sources */}
                      {relationship.sourceA && relationship.sourceB && (
                        <div className="mb-4">
                          <h4 className="font-medium text-sm mb-2 text-muted-foreground">Connected Sources</h4>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 p-2 bg-muted/50 rounded text-xs">
                              {relationship.sourceA.title || 'Unknown Source'}
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 p-2 bg-muted/50 rounded text-xs">
                              {relationship.sourceB.title || 'Unknown Source'}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Risks */}
                      {relationship.potentialRisks && relationship.potentialRisks.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                            <h4 className="font-medium text-sm">Potential Risks</h4>
                          </div>
                          <ul className="space-y-1 pl-6">
                            {relationship.potentialRisks.map((risk, idx) => (
                              <li key={idx} className="text-xs text-muted-foreground">
                                • {risk}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommendations */}
                      {relationship.recommendations && relationship.recommendations.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            <h4 className="font-medium text-sm">Recommendations</h4>
                          </div>
                          <ul className="space-y-1 pl-6">
                            {relationship.recommendations.map((rec, idx) => (
                              <li key={idx} className="text-xs text-muted-foreground">
                                • {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
