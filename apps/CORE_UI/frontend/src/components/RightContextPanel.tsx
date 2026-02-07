"use client";

import { ExternalLink, BookOpen, Plus, MoreHorizontal, FileText, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RelatedItemType = "requirement" | "test" | "issue" | "design" | "part";
type InsightType = "gap" | "risk" | "coverage" | "suggestion";
type SeverityLevel = "high" | "medium" | "low";

interface RelatedItem {
  id: string;
  type: RelatedItemType;
  title: string;
  owner: string;
  lastUpdated: string;
  sourceColor: string;
  isReadOnly: boolean;
}

interface AIInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  severity: SeverityLevel;
  source: string;
  timestamp: string;
  percentage?: number;
}

interface ContextData {
  relatedItems: RelatedItem[];
  aiInsights: AIInsight[];
}

interface RightContextPanelProps {
  contextData: ContextData;
  className?: string;
}

const getTypeIcon = (type: RelatedItemType) => {
  switch (type) {
    case "requirement":
      return FileText;
    case "test":
      return CheckCircle;
    case "issue":
      return AlertTriangle;
    case "design":
      return FileText;
    case "part":
      return FileText;
    default:
      return FileText;
  }
};

const getInsightIcon = (type: InsightType) => {
  switch (type) {
    case "gap":
      return AlertTriangle;
    case "risk":
      return AlertTriangle;
    case "coverage":
      return Info;
    case "suggestion":
      return Info;
    default:
      return Info;
  }
};

const getSeverityColor = (severity: SeverityLevel) => {
  switch (severity) {
    case "high":
      return "destructive";
    case "medium":
      return "secondary";
    case "low":
      return "outline";
    default:
      return "outline";
  }
};

const getBadgeVariant = (type: string, severity?: string): "default" | "destructive" | "outline" | "secondary" => {
  switch (type) {
    case "requirement":
      return "outline";
    case "test":
      return "outline";
    case "issue":
      return "outline";
    case "design":
      return "outline";
    case "part":
      return "outline";
    default:
      return "outline";
  }
};

export default function RightContextPanel({ 
  contextData, 
  className 
}: RightContextPanelProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Related Items Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Related Items</h3>
          <Button variant="ghost" size="sm" className="text-[var(--color-text-primary)] hover:bg-[var(--color-main-panel)]">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-3">
          {contextData.relatedItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-lg border border-border bg-[var(--color-main-panel)] hover:bg-[#333333] transition-colors group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Badge variant={getBadgeVariant(item.type)} className="flex-shrink-0">
                    {item.type}
                  </Badge>
                  {item.isReadOnly && (
                    <Badge variant="outline" className="text-xs flex-shrink-0 text-[var(--color-text-primary)] border-border">
                      Read-only
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-[var(--color-text-primary)] hover:bg-[#333333]">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-[var(--color-text-primary)] hover:bg-[#333333]">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <h4 className="font-medium text-sm mb-1 text-[var(--color-text-primary)] line-clamp-2">
                {item.title}
              </h4>
              
              <div className="flex items-center justify-between text-xs text-[#888]">
                <span>{item.owner}</span>
                <span>{item.lastUpdated}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Insights Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">AI Insights</h3>
          <Button variant="ghost" size="sm" className="text-[var(--color-text-primary)] hover:bg-[var(--color-main-panel)]">
            <BookOpen className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-3">
          {contextData.aiInsights.map((insight) => (
            <div
              key={insight.id}
              className="p-4 rounded-lg border border-border bg-[var(--color-main-panel)] hover:bg-[#333333] transition-colors group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={getBadgeVariant(insight.type)} 
                    className={cn(
                      "flex-shrink-0",
                      getSeverityColor(insight.severity)
                    )}
                  >
                    {insight.type}
                  </Badge>
                  <Badge variant="outline" className="text-xs text-[var(--color-text-primary)] border-border">
                    {insight.severity}
                  </Badge>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-[var(--color-text-primary)] hover:bg-[#333333] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </div>
              
              <h4 className="font-medium text-sm mb-1 text-[var(--color-text-primary)]">
                {insight.title}
              </h4>
              <p className="text-xs text-[#888] mb-2 line-clamp-2">
                {insight.description}
              </p>
              
              {insight.percentage !== undefined && (
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#888]">Coverage</span>
                    <span className="font-medium text-[var(--color-text-primary)]">{insight.percentage}%</span>
                  </div>
                  <div className="w-full bg-[#1c1c1c] rounded-full h-1.5">
                    <div 
                      className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                      style={{ width: `${insight.percentage}%` }}
                    />
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between text-xs text-[#666]">
                <span>{insight.source}</span>
                <span>{insight.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="text-xs text-[var(--color-text-primary)] border-border hover:bg-[var(--color-main-panel)]">
            Save to Note
          </Button>
          <Button variant="outline" size="sm" className="text-xs text-[var(--color-text-primary)] border-border hover:bg-[var(--color-main-panel)]">
            Add to Tasks
          </Button>
          <Button variant="outline" size="sm" className="text-xs text-[var(--color-text-primary)] border-border hover:bg-[var(--color-main-panel)]">
            Summarize
          </Button>
          <Button variant="outline" size="sm" className="text-xs text-[var(--color-text-primary)] border-border hover:bg-[var(--color-main-panel)]">
            Create Subtasks
          </Button>
        </div>
      </div>
    </div>
  );
}