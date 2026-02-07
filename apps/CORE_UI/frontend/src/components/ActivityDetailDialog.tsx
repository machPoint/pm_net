"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  Folder,
  AlertTriangle,
  Star,
  Bell,
  ExternalLink,
  Copy,
  CheckCircle,
  Flag,
  Users,
  Calendar,
  Tag,
  Link as LinkIcon,
  Archive,
  Trash2,
  Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ActivityMetadata {
  priority?: string;
  affected_parts?: number;
  document?: string;
  recipients?: number;
}

interface ActivityItem {
  id: string;
  type: string;
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
  metadata?: ActivityMetadata;
}

interface ActivityDetailDialogProps {
  activity: ActivityItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ActivityDetailDialog({
  activity,
  open,
  onOpenChange,
}: ActivityDetailDialogProps) {
  const [importance, setImportance] = useState<string>("medium");
  const [risk, setRisk] = useState<string>("low");
  const [selectedFolder, setSelectedFolder] = useState<string>("");

  if (!activity) return null;

  const handleAction = (action: string) => {
    toast.success(`${action} - ${activity.title}`);
  };

  const handleReminder = (minutes: number) => {
    toast.success(`Reminder set for ${minutes} minutes`, {
      description: activity.title,
    });
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "jama": return "text-blue-500";
      case "jira": return "text-orange-500";
      case "windchill": return "text-purple-500";
      case "email": return "text-green-500";
      default: return "text-gray-500";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "requirement": return "bg-blue-500/10 text-blue-400";
      case "test_case": return "bg-green-500/10 text-green-400";
      case "issue": return "bg-red-500/10 text-red-400";
      case "ecn": return "bg-yellow-500/10 text-yellow-400";
      case "email": return "bg-purple-500/10 text-purple-400";
      default: return "bg-gray-500/10 text-gray-400";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">{activity.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap">
                <Badge className={cn("text-xs", getTypeColor(activity.type))}>
                  {activity.type.replace(/_/g, " ")}
                </Badge>
                <Badge className={cn("text-xs", getSourceColor(activity.source))}>
                  {activity.source}
                </Badge>
                {activity.status && (
                  <Badge variant="outline" className="text-xs">
                    {activity.status}
                  </Badge>
                )}
                {activity.changeType && (
                  <Badge variant="secondary" className="text-xs">
                    {activity.changeType}
                  </Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Triage Control Center */}
        <div className="py-4 border-y border-border bg-muted/30">
          <div className="grid grid-cols-3 gap-4">
            {/* Left Column - Classification */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Importance</label>
                <Select value={importance} onValueChange={setImportance}>
                  <SelectTrigger className="h-9 w-full">
                    <Star className={cn("w-4 h-4 mr-2", importance === "high" || importance === "critical" ? "fill-yellow-500 text-yellow-500" : "")} />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Risk Level</label>
                <Select value={risk} onValueChange={setRisk}>
                  <SelectTrigger className="h-9 w-full">
                    <AlertTriangle className={cn("w-4 h-4 mr-2", risk === "high" ? "text-red-500" : "")} />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Middle Column - Organization */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Move To</label>
                <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                  <SelectTrigger className="h-9 w-full">
                    <Folder className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Select folder..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="requirements">Requirements</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                    <SelectItem value="review">Needs Review</SelectItem>
                    <SelectItem value="archive">Archive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Quick Actions</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9"
                    onClick={() => handleAction("Marked as complete")}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9"
                    onClick={() => handleAction("Flagged")}
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Flag
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Column - Reminders */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Set Reminder</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => handleReminder(15)}
                  >
                    <Bell className="w-4 h-4 mr-1" />
                    15m
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => handleReminder(60)}
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    1h
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => handleReminder(1440)}
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    1d
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">More Actions</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9"
                    onClick={() => handleAction("Archived")}
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="related">Related Items</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4 mt-0">
              <div>
                <h4 className="text-sm font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {activity.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Author</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {activity.user.avatar}
                    </div>
                    <span className="text-sm">{activity.user.name}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Timestamp</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {activity.timestamp}
                  </div>
                </div>
              </div>

              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Quick Info</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {activity.metadata.priority && (
                      <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="text-xs text-muted-foreground">Priority</span>
                        <Badge variant="outline" className="text-xs">
                          {activity.metadata.priority}
                        </Badge>
                      </div>
                    )}
                    {activity.metadata.document && (
                      <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="text-xs text-muted-foreground">Document</span>
                        <Badge variant="outline" className="text-xs">
                          {activity.metadata.document}
                        </Badge>
                      </div>
                    )}
                    {activity.metadata.affected_parts !== undefined && (
                      <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="text-xs text-muted-foreground">Affected Parts</span>
                        <Badge variant="outline" className="text-xs">
                          {activity.metadata.affected_parts}
                        </Badge>
                      </div>
                    )}
                    {activity.metadata.recipients !== undefined && (
                      <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="text-xs text-muted-foreground">Recipients</span>
                        <Badge variant="outline" className="text-xs">
                          {activity.metadata.recipients}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-4">
                <Button size="sm" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Open in {activity.source}
                </Button>
                <Button size="sm" variant="outline" className="gap-2">
                  <Copy className="w-4 h-4" />
                  Copy Link
                </Button>
              </div>
            </TabsContent>

            {/* Metadata Tab */}
            <TabsContent value="metadata" className="space-y-4 mt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded bg-muted/50">
                  <span className="text-sm font-medium">Activity ID</span>
                  <code className="text-xs bg-background px-2 py-1 rounded">{activity.id}</code>
                </div>
                <div className="flex items-center justify-between p-3 rounded bg-muted/50">
                  <span className="text-sm font-medium">Source System</span>
                  <span className="text-sm">{activity.source}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded bg-muted/50">
                  <span className="text-sm font-medium">Type</span>
                  <span className="text-sm">{activity.type.replace(/_/g, " ")}</span>
                </div>
                {activity.changeType && (
                  <div className="flex items-center justify-between p-3 rounded bg-muted/50">
                    <span className="text-sm font-medium">Change Type</span>
                    <span className="text-sm">{activity.changeType}</span>
                  </div>
                )}
                {activity.status && (
                  <div className="flex items-center justify-between p-3 rounded bg-muted/50">
                    <span className="text-sm font-medium">Status</span>
                    <span className="text-sm">{activity.status}</span>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Related Items Tab */}
            <TabsContent value="related" className="space-y-4 mt-0">
              <div className="text-center py-8 text-muted-foreground">
                <LinkIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No related items found</p>
                <p className="text-xs mt-1">AI will suggest related artifacts here</p>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4 mt-0">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded bg-muted/50">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Activity Created</div>
                    <div className="text-xs text-muted-foreground">{activity.timestamp}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      by {activity.user.name}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button size="sm" className="gap-2">
              <Send className="w-4 h-4" />
              Create Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
