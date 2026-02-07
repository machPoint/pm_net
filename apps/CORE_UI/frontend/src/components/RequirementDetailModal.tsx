"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Calendar, 
  User, 
  Target, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Copy,
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RequirementDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirement: {
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
  } | null;
}

export default function RequirementDetailModal({ 
  open, 
  onOpenChange, 
  requirement 
}: RequirementDetailModalProps) {
  if (!requirement) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "completed": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "critical": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "high": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "requirement": return <FileText className="w-4 h-4" />;
      case "design": return <Target className="w-4 h-4" />;
      case "verification": return <CheckCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const formatConfidence = (confidence?: number) => {
    if (!confidence) return "N/A";
    const percentage = Math.round(confidence * 100);
    const color = percentage >= 90 ? "text-green-600" : 
                  percentage >= 70 ? "text-yellow-600" : "text-red-600";
    return <span className={color}>{percentage}%</span>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {getTypeIcon(requirement.type)}
                <DialogTitle className="text-xl font-semibold">
                  {requirement.title}
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(requirement.id)}
                  className="p-1"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono">{requirement.id}</span>
                <span>•</span>
                <span>by {requirement.owner}</span>
                <span>•</span>
                <span>{requirement.lastUpdated}</span>
              </div>
            </div>
            
            <DialogDescription className="sr-only">
              Detailed view of requirement {requirement.id} including full text, metadata, and related information.
            </DialogDescription>
            
            <div className="flex flex-col gap-2 items-end">
              <Badge className={cn("text-xs", getStatusColor(requirement.status))}>
                {requirement.status}
              </Badge>
              {requirement.priority && (
                <Badge className={cn("text-xs", getPriorityColor(requirement.priority))}>
                  {requirement.priority} priority
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 pb-6">
            {/* Tags and Category */}
            {(requirement.tags.length > 0 || requirement.category) && (
              <div>
                <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags & Category
                </h3>
                <div className="flex flex-wrap gap-2">
                  {requirement.category && (
                    <Badge variant="outline" className="text-xs">
                      {requirement.category}
                    </Badge>
                  )}
                  {requirement.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Full Requirement Text */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Requirement Text
                </h3>
                {requirement.text && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(requirement.text || "")}
                    className="text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy Text
                  </Button>
                )}
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {requirement.text || "No detailed text available."}
                </p>
              </div>
            </div>

            <Separator />

            {/* Metadata Grid */}
            <div>
              <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Requirements Metadata
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  {requirement.verification_method && (
                    <div>
                      <span className="text-muted-foreground">Verification Method:</span>
                      <div className="font-medium capitalize">{requirement.verification_method}</div>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <div className="font-medium capitalize">{requirement.type}</div>
                  </div>
                  
                  {requirement.confidence && (
                    <div>
                      <span className="text-muted-foreground">Extraction Confidence:</span>
                      <div className="font-medium">{formatConfidence(requirement.confidence)}</div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  {requirement.source_document && (
                    <div>
                      <span className="text-muted-foreground">Source Document:</span>
                      <div className="font-medium font-mono text-xs break-all">
                        {requirement.source_document}
                      </div>
                    </div>
                  )}
                  
                  {requirement.source_page && (
                    <div>
                      <span className="text-muted-foreground">Source Page:</span>
                      <div className="font-medium">Page {requirement.source_page}</div>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-muted-foreground">Last Updated:</span>
                    <div className="font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {requirement.lastUpdated}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div>
              <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Actions
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View in Jama
                </Button>
                <Button variant="outline" size="sm">
                  <FileText className="w-3 h-3 mr-1" />
                  View Source Document
                </Button>
                <Button variant="outline" size="sm">
                  <Target className="w-3 h-3 mr-1" />
                  Create Test Case
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}