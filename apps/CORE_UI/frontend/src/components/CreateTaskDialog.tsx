"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Bot, HelpCircle, Sparkles, Plus, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const OPAL_BASE_URL = process.env.NEXT_PUBLIC_OPAL_BASE_URL || 'http://localhost:7788';

interface Agent {
  id: string;
  name: string;
  capabilities: string[];
}

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated?: () => void;
  onNeedHelp?: () => void; // Navigate to AI Chat
}

export default function CreateTaskDialog({
  open,
  onOpenChange,
  onTaskCreated,
  onNeedHelp,
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>([""]);
  const [outputFormat, setOutputFormat] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(true);

  // Fetch available agents on mount
  useEffect(() => {
    if (open) {
      fetchAgents();
    }
  }, [open]);

  const fetchAgents = async () => {
    try {
      setLoadingAgents(true);
      const res = await fetch(`${OPAL_BASE_URL}/api/nodes?type=agent`);
      if (res.ok) {
        const responseData = await res.json();
        const data = responseData.nodes || responseData || [];
        const agentList = Array.isArray(data) ? data.map((node: any) => {
          const metadata = typeof node.metadata === 'string' ? JSON.parse(node.metadata) : (node.metadata || {});
          return {
            id: node.id,
            name: node.title,
            capabilities: metadata.capabilities || []
          };
        }) : [];
        setAgents(agentList);
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    try {
      setLoading(true);

      // Create task node via graph API
      const response = await fetch(`${OPAL_BASE_URL}/api/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_type: 'task',
          title: title.trim(),
          description: description.trim(),
          status: 'backlog',
          metadata: {
            priority,
            due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
            acceptance_criteria: acceptanceCriteria.filter(c => c.trim()),
            output_format: outputFormat.trim() || null,
            created_by_user: true
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const newTask = await response.json();

      // If an agent was selected, create assignment edge
      if (selectedAgentId) {
        await fetch(`${OPAL_BASE_URL}/api/edges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            edge_type: 'assigned_to',
            source_node_id: newTask.id,
            target_node_id: selectedAgentId,
            weight: 1.0
          })
        });
      }

      toast.success("Task created! Agent will begin work soon.");

      // Reset form
      setTitle("");
      setDescription("");
      setPriority("medium");
      setSelectedAgentId("");
      setAcceptanceCriteria([""]);
      setOutputFormat("");
      setDueDate(undefined);

      onOpenChange(false);
      onTaskCreated?.();
    } catch (err: any) {
      console.error('Error creating task:', err);
      toast.error("Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  const addCriterion = () => {
    setAcceptanceCriteria([...acceptanceCriteria, ""]);
  };

  const removeCriterion = (index: number) => {
    setAcceptanceCriteria(acceptanceCriteria.filter((_, i) => i !== index));
  };

  const updateCriterion = (index: number, value: string) => {
    const updated = [...acceptanceCriteria];
    updated[index] = value;
    setAcceptanceCriteria(updated);
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-500" />
            Create Agent Task
          </DialogTitle>
          <DialogDescription>
            Define a task for your AI agents to work on. Be specific about what you need.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">What do you need done? *</Label>
            <Input
              id="title"
              placeholder="e.g., Analyze competitor SEO keywords and create a gap report"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Description - Main directive */}
          <div className="space-y-2">
            <Label htmlFor="description">Detailed Instructions</Label>
            <Textarea
              id="description"
              placeholder="Explain what you want the agent to do, any specific requirements, context they should know about, and how you'd like the work approached..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Agent Selection */}
          <div className="space-y-2">
            <Label>Assign to Agent</Label>
            {loadingAgents ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading agents...
              </div>
            ) : (
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent (or leave for auto-assignment)" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-purple-500" />
                        {agent.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedAgent && selectedAgent.capabilities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedAgent.capabilities.map((cap, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {cap.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(val) => setPriority(val as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Acceptance Criteria */}
          <div className="space-y-2">
            <Label>Acceptance Criteria (How will we know it's done?)</Label>
            <div className="space-y-2">
              {acceptanceCriteria.map((criterion, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Criterion ${index + 1}...`}
                    value={criterion}
                    onChange={(e) => updateCriterion(index, e.target.value)}
                  />
                  {acceptanceCriteria.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCriterion(index)}
                      className="flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addCriterion}
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Criterion
              </Button>
            </div>
          </div>

          {/* Output Format */}
          <div className="space-y-2">
            <Label htmlFor="outputFormat">Expected Output (optional)</Label>
            <Input
              id="outputFormat"
              placeholder="e.g., Markdown report, CSV file, summarized bullet points..."
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
              onNeedHelp?.();
            }}
            className="mr-auto text-muted-foreground"
          >
            <HelpCircle className="w-4 h-4 mr-1" />
            Need help defining this task?
          </Button>

          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!title.trim() || loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1" />
                Create Task
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
