"use client";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bot, User, Calendar, Clock, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface TaskDetailDialogProps {
	task: TaskNode | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function TaskDetailDialog({ task, open, onOpenChange }: TaskDetailDialogProps) {
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
									{task.metadata.acceptance_criteria.map((criterion: string, i: number) => (
										<li key={i} className="flex items-start gap-2 text-sm">
											<Circle className="w-3 h-3 mt-1 flex-shrink-0 text-muted-foreground" />
											{criterion}
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

					{/* Agent Activity Placeholder */}
					<Separator />
					<div>
						<h4 className="text-sm font-medium text-muted-foreground mb-2">Agent Activity</h4>
						<div className="bg-muted/50 rounded-lg p-4 text-center">
							<Bot className="w-8 h-8 mx-auto mb-2 text-purple-500/50" />
							<p className="text-sm text-muted-foreground">
								Agent activity and outputs will appear here as work progresses
							</p>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
