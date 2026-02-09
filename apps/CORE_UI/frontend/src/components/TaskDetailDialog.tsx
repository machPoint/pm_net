"use client";

import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Bot, User, Calendar, Clock, CheckCircle2, Circle, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const OPAL_BASE_URL = '/api/opal/proxy';

interface TaskNode {
	id: string;
	title: string;
	description: string;
	status: string;
	priority: string;
	dueDate?: string;
	assignees: { id: string; name: string; type: 'user' | 'agent' }[];
	metadata: any;
}

interface AvailableAgent {
	id: string;
	name: string;
	source: 'graph' | 'openclaw';
}

interface TaskDetailDialogProps {
	task: TaskNode | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onTaskUpdated?: () => void;
}

export default function TaskDetailDialog({ task, open, onOpenChange, onTaskUpdated }: TaskDetailDialogProps) {
	const [availableAgents, setAvailableAgents] = useState<AvailableAgent[]>([]);
	const [assigning, setAssigning] = useState(false);
	const [showAgentPicker, setShowAgentPicker] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		if (!task || !confirm('Delete this task?')) return;
		setDeleting(true);
		try {
			const res = await fetch(`${OPAL_BASE_URL}/api/nodes/${task.id}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ changed_by: 'ui-user' }),
			});
			if (!res.ok) throw new Error('Failed to delete');
			toast.success('Task deleted');
			onOpenChange(false);
			onTaskUpdated?.();
		} catch (err: any) {
			toast.error(`Delete failed: ${err.message}`);
		} finally {
			setDeleting(false);
		}
	};

	// Fetch available agents when dialog opens
	useEffect(() => {
		if (!open) { setShowAgentPicker(false); return; }
		async function fetchAgents() {
			const agents: AvailableAgent[] = [];
			try {
				const [graphRes, ocRes] = await Promise.all([
					fetch(`${OPAL_BASE_URL}/api/nodes?node_type=resource`).catch(() => null),
					fetch('/api/openclaw/status').catch(() => null),
				]);
				if (graphRes?.ok) {
					const data = await graphRes.json();
					for (const n of (data.nodes || [])) {
						const meta = typeof n.metadata === 'string' ? JSON.parse(n.metadata) : (n.metadata || {});
						if (meta.resource_type === 'agent') {
							agents.push({ id: n.id, name: n.title, source: 'graph' });
						}
					}
				}
				if (ocRes?.ok) {
					const oc = await ocRes.json();
					for (const a of (oc.status?.heartbeat?.agents || [])) {
						agents.push({ id: `openclaw-${a.agentId}`, name: `OpenClaw: ${a.agentId}`, source: 'openclaw' });
					}
				}
			} catch (err) {
				console.error('Failed to fetch agents:', err);
			}
			setAvailableAgents(agents);
		}
		fetchAgents();
	}, [open]);

	const handleAssignAgent = async (agent: AvailableAgent) => {
		if (!task) return;
		setAssigning(true);
		try {
			const res = await fetch(`${OPAL_BASE_URL}/api/agent-ops/assign`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ task_id: task.id, agent_id: agent.id }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || 'Failed to assign');
			}
			toast.success(`Assigned "${agent.name}" to task`);
			setShowAgentPicker(false);
			onTaskUpdated?.();
		} catch (err: any) {
			console.error('Failed to assign agent:', err);
			toast.error(err.message || 'Failed to assign agent');
		} finally {
			setAssigning(false);
		}
	};

	if (!task) return null;

	const getStatusIcon = (status: string) => {
		if (['completed', 'done', 'approved'].includes(status)) return CheckCircle2;
		if (['in_progress', 'in-progress'].includes(status)) return Clock;
		if (['review', 'pending'].includes(status)) return AlertCircle;
		return Circle;
	};

	const getStatusColor = (status: string) => {
		if (['completed', 'done', 'approved'].includes(status)) return "text-green-500";
		if (['in_progress', 'in-progress'].includes(status)) return "text-blue-500";
		if (['review', 'pending'].includes(status)) return "text-yellow-500";
		return "text-muted-foreground";
	};

	const getPriorityBadge = (priority: string) => {
		switch (priority?.toLowerCase()) {
			case 'high': return <Badge variant="destructive">High Priority</Badge>;
			case 'medium': return <Badge variant="secondary">Medium Priority</Badge>;
			case 'low': return <Badge variant="outline">Low Priority</Badge>;
			default: return null;
		}
	};

	const StatusIcon = getStatusIcon(task.status);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<div className="flex items-start gap-3">
						<StatusIcon className={cn("w-6 h-6 mt-1 flex-shrink-0", getStatusColor(task.status))} />
						<div className="flex-1">
							<DialogTitle className="text-lg leading-tight">{task.title}</DialogTitle>
							<div className="flex items-center gap-2 mt-2">
								{getPriorityBadge(task.priority)}
								<Badge variant="outline" className="capitalize">
									{task.status.replace('_', ' ')}
								</Badge>
								<Button
									variant="ghost"
									size="sm"
									onClick={handleDelete}
									disabled={deleting}
									className="ml-auto text-muted-foreground hover:text-red-400 hover:bg-red-500/10 h-7 px-2"
								>
									{deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
									<span className="ml-1 text-xs">Delete</span>
								</Button>
							</div>
						</div>
					</div>
				</DialogHeader>

				<div className="space-y-4 pt-2">
					{/* Description */}
					{task.description && (
						<div>
							<h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
							<p className="text-sm">{task.description}</p>
						</div>
					)}

					<Separator />

					{/* Assignees */}
					<div>
						<h4 className="text-sm font-medium text-muted-foreground mb-2">Assigned To</h4>
						{task.assignees.length > 0 ? (
							<div className="space-y-2">
								{task.assignees.map((assignee) => (
									<div key={assignee.id} className="flex items-center gap-2">
										{assignee.type === 'agent' ? (
											<Bot className="w-4 h-4 text-purple-500" />
										) : (
											<User className="w-4 h-4" />
										)}
										<span className="text-sm">{assignee.name}</span>
										<Badge variant="outline" className="text-xs capitalize">
											{assignee.type}
										</Badge>
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground">Unassigned</p>
						)}
					</div>

					{/* Due Date */}
					{task.dueDate && (
						<>
							<Separator />
							<div className="flex items-center gap-2">
								<Calendar className="w-4 h-4 text-muted-foreground" />
								<span className="text-sm">Due: {task.dueDate}</span>
							</div>
						</>
					)}

					{/* Acceptance Criteria */}
					{task.metadata?.acceptance_criteria && task.metadata.acceptance_criteria.length > 0 && (
						<>
							<Separator />
							<div>
								<h4 className="text-sm font-medium text-muted-foreground mb-2">Acceptance Criteria</h4>
								<ul className="space-y-1">
									{task.metadata.acceptance_criteria.map((criterion: any, i: number) => (
										<li key={i} className="flex items-start gap-2 text-sm">
											<Circle className="w-3 h-3 mt-1 flex-shrink-0 text-muted-foreground" />
											{typeof criterion === 'string' ? criterion : (criterion.text || criterion.title || criterion.description || criterion.id || JSON.stringify(criterion))}
										</li>
									))}
								</ul>
							</div>
						</>
					)}

					{/* Expected Output */}
					{task.metadata?.output_format && (
						<>
							<Separator />
							<div>
								<h4 className="text-sm font-medium text-muted-foreground mb-1">Expected Output</h4>
								<p className="text-sm">{task.metadata.output_format}</p>
							</div>
						</>
					)}

					{/* Assign to Agent */}
					<Separator />
					<div>
						<div className="flex items-center justify-between mb-2">
							<h4 className="text-sm font-medium text-muted-foreground">Agent Assignment</h4>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setShowAgentPicker(!showAgentPicker)}
								disabled={assigning}
							>
								<Bot className="w-3 h-3 mr-1" />
								Assign Agent
							</Button>
						</div>

						{showAgentPicker && (
							<div className="border rounded-lg p-2 space-y-1 mb-3">
								{availableAgents.length === 0 ? (
									<p className="text-xs text-muted-foreground text-center py-2">No agents available</p>
								) : (
									availableAgents.map((agent) => (
										<button
											key={agent.id}
											className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted/50 text-left text-sm transition-colors"
											onClick={() => handleAssignAgent(agent)}
											disabled={assigning}
										>
											<Bot className="w-4 h-4 text-purple-500 flex-shrink-0" />
											<span className="flex-1 truncate">{agent.name}</span>
											<Badge variant="outline" className="text-[10px]">{agent.source}</Badge>
											{assigning && <Loader2 className="w-3 h-3 animate-spin" />}
										</button>
									))
								)}
							</div>
						)}

						{task.assignees.length === 0 ? (
							<div className="bg-muted/50 rounded-lg p-4 text-center">
								<Bot className="w-8 h-8 mx-auto mb-2 text-purple-500/50" />
								<p className="text-sm text-muted-foreground">
									Assign an agent to start working on this task
								</p>
							</div>
						) : (
							<div className="bg-muted/50 rounded-lg p-3 space-y-2">
								{task.assignees.filter(a => a.type === 'agent').map((assignee) => (
									<div key={assignee.id} className="flex items-center gap-2">
										<Bot className="w-4 h-4 text-purple-500" />
										<span className="text-sm font-medium">{assignee.name}</span>
										<Badge variant="secondary" className="text-[10px]">assigned</Badge>
									</div>
								))}
								{task.assignees.filter(a => a.type === 'agent').length === 0 && (
									<p className="text-xs text-muted-foreground">No agents assigned yet</p>
								)}
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
