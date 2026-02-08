"use client";

import { useState } from 'react';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	CheckCircle2,
	XCircle,
	AlertTriangle,
	FileText,
	List,
	GitBranch,
	MessageSquare,
	Clock
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface PlanStep {
	step_number: number;
	action: string;
	tool: string;
	args: any;
	expected_output: string;
}

interface Plan {
	id: string;
	taskId: string;
	proposedBy: string;
	status: "pending" | "approved" | "rejected" | "executed";
	steps: PlanStep[];
	rationale: string;
	createdAt: string;
}

interface PlanReviewPanelProps {
	plan: Plan;
	onApprove: (planId: string, feedback?: string) => void;
	onReject: (planId: string, feedback: string) => void;
	isProcessing?: boolean;
}

export default function PlanReviewPanel({ plan, onApprove, onReject, isProcessing = false }: PlanReviewPanelProps) {
	const [feedback, setFeedback] = useState("");
	const [showRejectForm, setShowRejectForm] = useState(false);

	// Parse steps if they are strings (from DB)
	const steps = Array.isArray(plan.steps) ? plan.steps : JSON.parse(plan.steps || '[]');

	return (
		<Card className="w-full max-w-2xl border-l-4 border-l-blue-500 shadow-lg">
			<CardHeader>
				<div className="flex justify-between items-start">
					<div className="space-y-1">
						<CardTitle className="flex items-center gap-2">
							<FileText className="w-5 h-5 text-blue-500" />
							Execution Plan Review
						</CardTitle>
						<CardDescription>
							Plan ID: <span className="font-mono text-xs text-muted-foreground">{plan.id}</span>
						</CardDescription>
					</div>
					<Badge
						variant={plan.status === 'pending' ? 'secondary' : 'outline'}
						className={cn("uppercase",
							plan.status === 'pending' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
						)}
					>
						{plan.status}
					</Badge>
				</div>
			</CardHeader>

			<CardContent className="space-y-6">
				{/* Rationale Section */}
				<div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
					<h4 className="flex items-center gap-2 text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
						<MessageSquare className="w-4 h-4" />
						Agent Rationale
					</h4>
					<p className="text-sm text-slate-600 dark:text-slate-400 italic">
						"{plan.rationale}"
					</p>
				</div>

				{/* Steps List */}
				<div>
					<h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
						<List className="w-4 h-4" />
						Proposed Steps ({steps.length})
					</h4>
					<div className="space-y-3">
						{steps.map((step: PlanStep, idx: number) => (
							<div
								key={idx}
								className="relative pl-6 pb-2 border-l-2 border-slate-200 dark:border-slate-800 last:border-0"
							>
								<div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-slate-950 border-2 border-blue-400 flex items-center justify-center">
									<span className="text-[8px] font-bold">{step.step_number}</span>
								</div>

								<div className="bg-white dark:bg-slate-900 border rounded p-3 text-sm">
									<div className="flex justify-between items-start mb-1">
										<span className="font-medium">{step.action}</span>
										<Badge variant="outline" className="text-xs font-mono">{step.tool}</Badge>
									</div>

									{step.args && (
										<pre className="mt-2 p-2 bg-slate-100 dark:bg-slate-950 rounded text-[10px] overflow-x-auto font-mono text-slate-600 dark:text-slate-400">
											{JSON.stringify(step.args, null, 2)}
										</pre>
									)}

									<div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
										<CheckCircle2 className="w-3 h-3" /> Expected: {step.expected_output}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</CardContent>

			<CardFooter className="flex flex-col gap-3 border-t bg-slate-50/50 dark:bg-slate-950/50 pt-4">
				{plan.status === 'pending' ? (
					<>
						{!showRejectForm ? (
							<div className="flex w-full gap-3">
								<Button
									className="flex-1 bg-green-600 hover:bg-green-700 text-white"
									onClick={() => onApprove(plan.id)}
									disabled={isProcessing}
								>
									<CheckCircle2 className="w-4 h-4 mr-2" />
									Approve Plan
								</Button>
								<Button
									variant="destructive"
									className="flex-1"
									onClick={() => setShowRejectForm(true)}
									disabled={isProcessing}
								>
									<XCircle className="w-4 h-4 mr-2" />
									Reject
								</Button>
							</div>
						) : (
							<div className="w-full space-y-3">
								<div className="space-y-1">
									<label className="text-xs font-medium">Rejection Reason (Required)</label>
									<Textarea
										placeholder="Explain why this plan is rejected..."
										value={feedback}
										onChange={(e) => setFeedback(e.target.value)}
										className="text-sm"
									/>
								</div>
								<div className="flex gap-2 justify-end">
									<Button variant="ghost" size="sm" onClick={() => setShowRejectForm(false)}>
										Cancel
									</Button>
									<Button
										variant="destructive"
										size="sm"
										onClick={() => onReject(plan.id, feedback)}
										disabled={!feedback.trim() || isProcessing}
									>
										Confirm Rejection
									</Button>
								</div>
							</div>
						)}
					</>
				) : (
					<div className="w-full text-center py-2 text-sm text-muted-foreground bg-slate-100 dark:bg-slate-800 rounded">
						Plan is <strong>{plan.status}</strong> on {new Date(plan.createdAt).toLocaleString()}
					</div>
				)}
			</CardFooter>
		</Card>
	);
}
