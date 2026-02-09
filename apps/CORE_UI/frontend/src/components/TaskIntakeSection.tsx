"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
	Play,
	CheckCircle2,
	XCircle,
	Send,
	Loader2,
	ChevronRight,
	FileText,
	GitBranch,
	Shield,
	Zap,
	BookOpen,
	AlertTriangle,
	Clock,
	Plus,
	RotateCcw,
	Pencil,
	Trash2,
	GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useTaskIntake, IntakeStage, IntakeMessage, PrecedentMatch, PlanPreview, GraphNode } from "@/hooks/useTaskIntake";

// ============================================================================
// Stage metadata
// ============================================================================

const STAGE_META: Record<IntakeStage, { label: string; icon: any; color: string; step: number }> = {
	start:      { label: "Define Task",       icon: Plus,         color: "text-blue-400",    step: 0 },
	precedents: { label: "Find Precedents",   icon: BookOpen,     color: "text-purple-400",  step: 1 },
	clarify:    { label: "Clarify Details",    icon: FileText,     color: "text-cyan-400",    step: 2 },
	plan:       { label: "Generate Plan",      icon: GitBranch,    color: "text-amber-400",   step: 3 },
	approve:    { label: "Review & Approve",   icon: Shield,       color: "text-green-400",   step: 4 },
	execute:    { label: "Execute",            icon: Zap,          color: "text-orange-400",  step: 5 },
	verify:     { label: "Verify",             icon: CheckCircle2, color: "text-emerald-400", step: 6 },
	learn:      { label: "Learn",              icon: BookOpen,     color: "text-violet-400",  step: 7 },
};

const STAGES_ORDER: IntakeStage[] = ["start", "precedents", "clarify", "plan", "approve", "execute", "verify", "learn"];

// ============================================================================
// Main Component
// ============================================================================

export default function TaskIntakeSection() {
	const intake = useTaskIntake();
	const [inputValue, setInputValue] = useState("");
	const chatEndRef = useRef<HTMLDivElement>(null);

	// Auto-scroll chat
	useEffect(() => {
		chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [intake.session?.messages]);

	// Start a new session on mount if none exists
	const handleNewSession = useCallback(async () => {
		await intake.createSession();
	}, [intake]);

	if (!intake.session) {
		return (
			<div className="h-full flex items-center justify-center">
				<div className="text-center space-y-4">
					<div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto">
						<Plus className="w-8 h-8 text-blue-400" />
					</div>
					<h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Guided Task Creation</h2>
					<p className="text-sm text-[var(--color-text-secondary)] max-w-md">
						Walk through a structured process to define, plan, execute, and verify tasks with AI assistance.
					</p>
					<Button onClick={handleNewSession} disabled={intake.loading} className="gap-2">
						{intake.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
						Start New Task Intake
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col">
			{/* Stage Progress Bar */}
			<StageProgressBar currentStage={intake.session.stage} onNew={intake.createSession} onDelete={intake.deleteSession} />

			{/* Main split view */}
			<div className="flex-1 flex overflow-hidden">
				{/* Left: Chat / Wizard */}
				<div className="flex-1 flex flex-col border-r border-border min-w-0">
					{/* Messages */}
					<ScrollArea className="flex-1 p-4">
						<div className="space-y-3 max-w-2xl">
							{intake.session.messages.map((msg, i) => (
								<ChatBubble key={i} message={msg} />
							))}

							{/* Stage-specific interactive content */}
							<StageContent
								intake={intake}
								inputValue={inputValue}
								setInputValue={setInputValue}
							/>

							<div ref={chatEndRef} />
						</div>
					</ScrollArea>

					{/* Input bar (for clarify stage) */}
					{intake.session.stage === "clarify" && (
						<ChatInput
							value={inputValue}
							onChange={setInputValue}
							onSend={async () => {
								if (!inputValue.trim()) return;
								const msg = inputValue.trim();
								setInputValue("");
								await intake.clarify(msg);
							}}
							loading={intake.loading}
							placeholder="Answer the question or provide more details..."
						/>
					)}
				</div>

				{/* Right: Preview Panel */}
				<div className="w-[380px] flex-shrink-0 flex flex-col bg-[var(--color-background)] overflow-hidden">
					<PreviewPanel
						task={intake.task}
						plan={intake.plan}
						gate={intake.gate}
						run={intake.run}
						precedent={intake.precedent}
						planPreview={intake.planPreview}
						precedents={intake.precedents}
						stage={intake.session.stage}
					/>
				</div>
			</div>

			{/* Error banner */}
			{intake.error && (
				<div className="px-4 py-2 bg-red-500/10 border-t border-red-500/30 flex items-center gap-2">
					<AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
					<span className="text-sm text-red-400 flex-1">{intake.error}</span>
					<Button variant="ghost" size="sm" onClick={intake.clearError}>Dismiss</Button>
				</div>
			)}
		</div>
	);
}

// ============================================================================
// Stage Progress Bar
// ============================================================================

function StageProgressBar({ currentStage, onNew, onDelete }: { currentStage: IntakeStage; onNew: () => void; onDelete?: () => void }) {
	const currentStep = STAGE_META[currentStage].step;

	return (
		<div className="px-4 py-3 border-b border-border bg-[var(--color-background)] flex items-center gap-1 overflow-x-auto">
			{STAGES_ORDER.map((stage, i) => {
				const meta = STAGE_META[stage];
				const Icon = meta.icon;
				const isActive = stage === currentStage;
				const isDone = meta.step < currentStep;

				return (
					<div key={stage} className="flex items-center">
						{i > 0 && (
							<ChevronRight className={cn("w-3 h-3 mx-1 flex-shrink-0", isDone ? "text-green-400" : "text-[var(--color-text-secondary)]/30")} />
						)}
						<div className={cn(
							"flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
							isActive && "bg-[var(--color-text-primary)]/10 text-[var(--color-text-primary)]",
							isDone && "text-green-400",
							!isActive && !isDone && "text-[var(--color-text-secondary)]/50"
						)}>
							{isDone ? (
								<CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
							) : (
								<Icon className={cn("w-3.5 h-3.5", isActive ? meta.color : "")} />
							)}
							{meta.label}
						</div>
					</div>
				);
			})}

			<div className="ml-auto flex-shrink-0 flex items-center gap-1">
				{onDelete && (
					<Button variant="ghost" size="sm" onClick={onDelete} className="text-xs gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10">
						<Trash2 className="w-3 h-3" />
						Delete
					</Button>
				)}
				<Button variant="ghost" size="sm" onClick={onNew} className="text-xs gap-1 text-[var(--color-text-secondary)]">
					<RotateCcw className="w-3 h-3" />
					New
				</Button>
			</div>
		</div>
	);
}

// ============================================================================
// Chat Bubble
// ============================================================================

function ChatBubble({ message }: { message: IntakeMessage }) {
	const isUser = message.role === "user";
	const isSystem = message.role === "system";

	return (
		<div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
			<div className={cn(
				"max-w-[85%] rounded-lg px-3 py-2 text-sm",
				isUser && "bg-blue-600 text-white",
				!isUser && !isSystem && "bg-[var(--color-text-primary)]/5 text-[var(--color-text-primary)]",
				isSystem && "bg-transparent text-[var(--color-text-secondary)] text-xs italic"
			)}>
				{typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
			</div>
		</div>
	);
}

// ============================================================================
// Chat Input
// ============================================================================

function ChatInput({ value, onChange, onSend, loading, placeholder }: {
	value: string;
	onChange: (v: string) => void;
	onSend: () => void;
	loading: boolean;
	placeholder: string;
}) {
	return (
		<div className="p-3 border-t border-border flex gap-2">
			<Input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
				placeholder={placeholder}
				disabled={loading}
				className="flex-1"
			/>
			<Button onClick={onSend} disabled={loading || !value.trim()} size="icon">
				{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
			</Button>
		</div>
	);
}

// ============================================================================
// Stage Content — renders the interactive UI for the current stage
// ============================================================================

function StageContent({ intake, inputValue, setInputValue }: {
	intake: ReturnType<typeof useTaskIntake>;
	inputValue: string;
	setInputValue: (v: string) => void;
}) {
	const stage = intake.session?.stage;
	if (!stage) return null;

	switch (stage) {
		case "start":
			return <StartStage intake={intake} />;
		case "precedents":
			return <PrecedentsStage intake={intake} />;
		case "clarify":
			return <ClarifyStage intake={intake} />;
		case "plan":
			return <PlanStage intake={intake} />;
		case "approve":
			return <ApproveStage intake={intake} />;
		case "execute":
			return <ExecuteStage intake={intake} />;
		case "verify":
			return <VerifyStage intake={intake} />;
		case "learn":
			return <LearnStage intake={intake} />;
		default:
			return null;
	}
}

// ── Stage 0: Start ──────────────────────────────────────────────────────────

function StartStage({ intake }: { intake: ReturnType<typeof useTaskIntake> }) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState("medium");
	const [criteria, setCriteria] = useState("");

	const handleSubmit = async () => {
		if (!title.trim()) return;
		await intake.startTask({
			title: title.trim(),
			description: description.trim() || undefined,
			priority,
			acceptance_criteria: criteria.trim()
				? criteria.split("\n").map((c) => c.trim()).filter(Boolean)
				: undefined,
		});
	};

	return (
		<div className="space-y-4 p-4 rounded-lg bg-[var(--color-text-primary)]/5">
			<h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
				<Plus className="w-4 h-4 text-blue-400" />
				Define Your Task
			</h3>

			<div className="space-y-3">
				<div>
					<label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Title *</label>
					<Input
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="What needs to be done?"
						onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
					/>
				</div>

				<div>
					<label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Description</label>
					<textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Provide context, goals, constraints..."
						className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
					/>
				</div>

				<div className="flex gap-3">
					<div className="flex-1">
						<label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Priority</label>
						<select
							value={priority}
							onChange={(e) => setPriority(e.target.value)}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="low">Low</option>
							<option value="medium">Medium</option>
							<option value="high">High</option>
							<option value="critical">Critical</option>
						</select>
					</div>
				</div>

				<div>
					<label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Acceptance Criteria (one per line)</label>
					<textarea
						value={criteria}
						onChange={(e) => setCriteria(e.target.value)}
						placeholder="The output should include...&#10;Must handle edge case X...&#10;Performance within Y seconds..."
						className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-y"
					/>
				</div>
			</div>

			<Button onClick={handleSubmit} disabled={intake.loading || !title.trim()} className="w-full gap-2">
				{intake.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
				Create Task & Find Precedents
			</Button>
		</div>
	);
}

// ── Stage 1: Precedents ─────────────────────────────────────────────────────

function PrecedentsStage({ intake }: { intake: ReturnType<typeof useTaskIntake> }) {
	const [autoSkipping, setAutoSkipping] = useState(false);

	const handleSkip = async () => {
		// Session is already at 'clarify' stage — kick off the first LLM question
		await intake.clarify("No similar past workflows found. Please assess this task — is it clear enough to plan, or do you need more details? Give me your initial take and any questions.");
	};

	// Auto-advance when no precedents found
	useEffect(() => {
		if (intake.precedents.length === 0 && !intake.loading && !autoSkipping) {
			setAutoSkipping(true);
			const timer = setTimeout(() => {
				handleSkip();
			}, 1500);
			return () => clearTimeout(timer);
		}
	}, [intake.precedents.length, intake.loading]);

	return (
		<div className="space-y-3 p-4 rounded-lg bg-[var(--color-text-primary)]/5">
			<h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
				<BookOpen className="w-4 h-4 text-purple-400" />
				Similar Past Workflows
			</h3>

			{intake.precedents.length === 0 ? (
				<div className="space-y-2">
					<p className="text-sm text-[var(--color-text-secondary)]">
						Found 0 precedent(s). {autoSkipping ? "Advancing to clarification..." : "User can select one or start fresh."}
					</p>
					{autoSkipping && (
						<div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
							<Loader2 className="w-3 h-3 animate-spin" />
							Moving to next step...
						</div>
					)}
				</div>
			) : (
				<div className="space-y-2">
					{intake.precedents.map((p) => (
						<div
							key={p.id}
							className="p-3 rounded-md border border-border hover:border-purple-400/50 cursor-pointer transition-colors"
							onClick={() => intake.selectPrecedent(p.id)}
						>
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-[var(--color-text-primary)]">{p.title}</span>
								<Badge variant="outline" className="text-xs">
									{p.success_count} success{p.success_count !== 1 ? "es" : ""}
								</Badge>
							</div>
							{p.avg_completion_hours > 0 && (
								<div className="flex items-center gap-1 mt-1 text-xs text-[var(--color-text-secondary)]">
									<Clock className="w-3 h-3" />
									~{p.avg_completion_hours}h avg
								</div>
							)}
						</div>
					))}
				</div>
			)}

			{!autoSkipping && (
				<Button
					variant="outline"
					onClick={handleSkip}
					disabled={intake.loading}
					className="w-full text-sm"
				>
					{intake.loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
					Start Fresh (Skip Precedents)
				</Button>
			)}
		</div>
	);
}

// ── Stage 2: Clarify ────────────────────────────────────────────────────────

function ClarifyStage({ intake }: { intake: ReturnType<typeof useTaskIntake> }) {
	const readyForPlan = intake.session?.stage === "clarify" &&
		(intake.session?.clarify_count || 0) > 0;

	return (
		<div className="space-y-3">
			{intake.session?.messages.length === 0 && (
				<div className="p-3 rounded-lg bg-cyan-500/10 text-sm text-cyan-300">
					The AI agent will ask clarifying questions to refine your task. Answer below, or skip to plan generation.
				</div>
			)}

			{readyForPlan && (
				<div className="flex gap-2">
					<Button
						onClick={() => intake.generatePlan(true)}
						disabled={intake.loading}
						className="flex-1 gap-2"
					>
						{intake.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
						Generate Plan
					</Button>
				</div>
			)}
		</div>
	);
}

// ── Stage 3: Plan ───────────────────────────────────────────────────────────

function PlanStage({ intake }: { intake: ReturnType<typeof useTaskIntake> }) {
	return (
		<div className="space-y-3 p-4 rounded-lg bg-[var(--color-text-primary)]/5">
			<h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
				<GitBranch className="w-4 h-4 text-amber-400" />
				Generating Plan...
			</h3>
			<Button
				onClick={() => intake.generatePlan(true)}
				disabled={intake.loading}
				className="w-full gap-2"
			>
				{intake.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
				Generate Execution Plan
			</Button>
		</div>
	);
}

// ── Stage 4: Approve ────────────────────────────────────────────────────────

function ApproveStage({ intake }: { intake: ReturnType<typeof useTaskIntake> }) {
	const [editing, setEditing] = useState(false);
	const [editSteps, setEditSteps] = useState<Array<{ order: number; action: string; expected_outcome: string; tool?: string }>>([]);
	const [newStepAction, setNewStepAction] = useState("");

	// Initialize edit steps from plan preview
	useEffect(() => {
		if (intake.planPreview?.steps) {
			setEditSteps(intake.planPreview.steps.map(s => ({ ...s })));
		}
	}, [intake.planPreview]);

	const updateStep = (idx: number, field: string, value: string) => {
		const next = [...editSteps];
		(next[idx] as any)[field] = value;
		setEditSteps(next);
	};

	const removeStep = (idx: number) => {
		const next = editSteps.filter((_, i) => i !== idx);
		next.forEach((s, i) => { s.order = i + 1; });
		setEditSteps(next);
	};

	const addStep = () => {
		if (!newStepAction.trim()) return;
		setEditSteps([...editSteps, { order: editSteps.length + 1, action: newStepAction.trim(), expected_outcome: '' }]);
		setNewStepAction("");
	};

	const moveStep = (idx: number, dir: -1 | 1) => {
		const newIdx = idx + dir;
		if (newIdx < 0 || newIdx >= editSteps.length) return;
		const next = [...editSteps];
		[next[idx], next[newIdx]] = [next[newIdx], next[idx]];
		next.forEach((s, i) => { s.order = i + 1; });
		setEditSteps(next);
	};

	const steps = editing ? editSteps : (intake.planPreview?.steps || []);

	return (
		<div className="space-y-3 p-4 rounded-lg bg-[var(--color-text-primary)]/5">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
					<Shield className="w-4 h-4 text-green-400" />
					Review & Edit Plan
				</h3>
				<Button size="sm" variant="ghost" onClick={() => setEditing(!editing)} className="text-xs gap-1">
					<Pencil className="w-3 h-3" />
					{editing ? 'Done Editing' : 'Edit Steps'}
				</Button>
			</div>

			{/* Plan steps */}
			<div className="space-y-2">
				{steps.map((step, i) => (
					<div key={i} className={cn(
						"flex items-start gap-2 p-2 rounded border text-sm",
						editing ? "border-border bg-background" : "border-transparent bg-[var(--color-text-primary)]/5"
					)}>
						<span className="text-xs font-mono text-muted-foreground w-5 pt-1 text-right flex-shrink-0">{step.order}.</span>
						{editing ? (
							<div className="flex-1 space-y-1">
								<Input
									value={step.action}
									onChange={(e) => updateStep(i, 'action', e.target.value)}
									className="h-7 text-xs"
									placeholder="Step action..."
								/>
								<Input
									value={step.expected_outcome}
									onChange={(e) => updateStep(i, 'expected_outcome', e.target.value)}
									className="h-7 text-xs"
									placeholder="Expected outcome..."
								/>
							</div>
						) : (
							<div className="flex-1">
								<span className="text-[var(--color-text-primary)]">{step.action}</span>
								{step.tool && <Badge variant="outline" className="ml-1 text-[10px]">{step.tool}</Badge>}
								{step.expected_outcome && (
									<div className="text-xs text-[var(--color-text-secondary)] mt-0.5">{step.expected_outcome}</div>
								)}
							</div>
						)}
						{editing && (
							<div className="flex flex-col gap-0.5">
								<Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => moveStep(i, -1)} disabled={i === 0}>▲</Button>
								<Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1}>▼</Button>
								<Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-red-400" onClick={() => removeStep(i)}>×</Button>
							</div>
						)}
					</div>
				))}
			</div>

			{/* Add step (edit mode) */}
			{editing && (
				<div className="flex gap-2">
					<Input
						value={newStepAction}
						onChange={(e) => setNewStepAction(e.target.value)}
						placeholder="Add a new step..."
						className="flex-1 h-8 text-xs"
						onKeyDown={(e) => { if (e.key === 'Enter') addStep(); }}
					/>
					<Button size="sm" variant="outline" onClick={addStep} className="h-8">
						<Plus className="w-3 h-3 mr-1" /> Add
					</Button>
				</div>
			)}

			{intake.planPreview && (
				<div className="text-xs text-[var(--color-text-secondary)] italic border-t border-border pt-2">
					{intake.planPreview.rationale}
					{intake.planPreview.estimated_hours > 0 && ` · Est. ${intake.planPreview.estimated_hours}h`}
				</div>
			)}

			{/* Subtasks (microtasks) */}
			{intake.planPreview?.subtasks && intake.planPreview.subtasks.length > 0 && (
				<div className="space-y-1.5 border-t border-border pt-2">
					<h4 className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
						<GitBranch className="w-3 h-3 text-purple-400" />
						Subtasks ({intake.planPreview.subtasks.length})
					</h4>
					{intake.planPreview.subtasks.map((st, i) => (
						<div key={st.id || i} className="flex items-start gap-2 px-2 py-1.5 rounded bg-purple-500/5 border border-purple-500/10 text-xs">
							<div className="w-3.5 h-3.5 rounded-full border border-purple-400/50 flex-shrink-0 mt-0.5" />
							<div className="flex-1 min-w-0">
								<span className="text-[var(--color-text-primary)] font-medium">{st.title}</span>
								{st.description && (
									<div className="text-[var(--color-text-secondary)] mt-0.5 line-clamp-1">{st.description}</div>
								)}
							</div>
							<div className="flex items-center gap-1 flex-shrink-0">
								<Badge variant="outline" className="text-[10px]">{st.priority}</Badge>
								{st.estimated_hours > 0 && <span className="text-[var(--color-text-secondary)]">{st.estimated_hours}h</span>}
							</div>
						</div>
					))}
				</div>
			)}

			<div className="flex gap-2">
				<Button
					onClick={() => intake.approvePlan(true)}
					disabled={intake.loading}
					className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
				>
					{intake.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
					Approve & Execute
				</Button>
				<Button
					variant="outline"
					onClick={() => intake.approvePlan(false)}
					disabled={intake.loading}
					className="flex-1 gap-2 border-red-500/50 text-red-400 hover:bg-red-500/10"
				>
					<XCircle className="w-4 h-4" />
					Reject & Revise
				</Button>
			</div>
		</div>
	);
}

// ── Stage 5: Execute ────────────────────────────────────────────────────────

function ExecuteStage({ intake }: { intake: ReturnType<typeof useTaskIntake> }) {
	const [executing, setExecuting] = useState(false);
	const [completedSteps, setCompletedSteps] = useState<number[]>([]);
	const steps = intake.planPreview?.steps || intake.plan?.metadata?.steps || [];

	const handleExecute = async () => {
		setExecuting(true);
		setCompletedSteps([]);

		// Simulate step-by-step progress
		for (let i = 0; i < steps.length; i++) {
			await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 600));
			setCompletedSteps(prev => [...prev, i]);
		}

		// Actually start execution on the backend
		await intake.startExecution();
		setExecuting(false);
	};

	return (
		<div className="space-y-3 p-4 rounded-lg bg-[var(--color-text-primary)]/5">
			<h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
				<Zap className="w-4 h-4 text-orange-400" />
				{executing ? 'Executing...' : 'Ready to Execute'}
			</h3>

			{/* Plan steps as progress checklist */}
			{steps.length > 0 && (
				<div className="space-y-1.5">
					{steps.map((step: any, i: number) => {
						const isDone = completedSteps.includes(i);
						const isActive = executing && !isDone && completedSteps.length === i;
						return (
							<div key={i} className={cn(
								"flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all",
								isDone && "bg-green-500/10 text-green-400",
								isActive && "bg-blue-500/10 text-blue-400",
								!isDone && !isActive && "text-[var(--color-text-secondary)]"
							)}>
								{isDone ? (
									<CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
								) : isActive ? (
									<Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400 flex-shrink-0" />
								) : (
									<div className="w-3.5 h-3.5 rounded-full border border-current flex-shrink-0" />
								)}
								<span className={cn("flex-1", isDone && "line-through opacity-70")}>
									{step.order}. {step.action}
								</span>
								{step.tool && <Badge variant="outline" className="text-[10px]">{step.tool}</Badge>}
							</div>
						);
					})}
				</div>
			)}

			{/* Progress bar */}
			{executing && steps.length > 0 && (
				<div className="w-full bg-[var(--color-text-primary)]/10 rounded-full h-1.5">
					<div
						className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
						style={{ width: `${(completedSteps.length / steps.length) * 100}%` }}
					/>
				</div>
			)}

			{!executing && (
				<Button
					onClick={handleExecute}
					disabled={intake.loading}
					className="w-full gap-2"
				>
					{intake.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
					Start Execution
				</Button>
			)}
		</div>
	);
}

// ── Stage 6: Verify ─────────────────────────────────────────────────────────

function safeCriterionText(c: any): string {
	if (typeof c === 'string') return c;
	if (c && typeof c === 'object') return c.text || c.title || c.description || c.id || JSON.stringify(c);
	return String(c);
}

function VerifyStage({ intake }: { intake: ReturnType<typeof useTaskIntake> }) {
	const [delivTitle, setDelivTitle] = useState("");
	const [deliverables, setDeliverables] = useState<Array<{ title: string }>>([]);
	const criteria = intake.task?.metadata?.acceptance_criteria || [];

	const [verifications, setVerifications] = useState<Array<{
		criterion_text: string;
		status: "passed" | "failed" | "needs_review";
	}>>([]);

	// Re-sync verifications when criteria change (useState initializer only runs once)
	useEffect(() => {
		if (criteria.length > 0 && verifications.length === 0) {
			setVerifications(criteria.map((c: any) => ({
				criterion_text: safeCriterionText(c),
				status: "passed" as const,
			})));
		}
	}, [criteria]);

	const addDeliverable = () => {
		if (!delivTitle.trim()) return;
		setDeliverables([...deliverables, { title: delivTitle.trim() }]);
		setDelivTitle("");
	};

	const toggleVerification = (idx: number) => {
		const next = [...verifications];
		const cycle: Array<"passed" | "failed" | "needs_review"> = ["passed", "failed", "needs_review"];
		const current = cycle.indexOf(next[idx].status);
		next[idx].status = cycle[(current + 1) % cycle.length];
		setVerifications(next);
	};

	return (
		<div className="space-y-4 p-4 rounded-lg bg-[var(--color-text-primary)]/5">
			<h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
				<CheckCircle2 className="w-4 h-4 text-emerald-400" />
				Verification & Deliverables
			</h3>

			{/* Deliverables */}
			<div className="space-y-2">
				<label className="text-xs text-[var(--color-text-secondary)]">Deliverables</label>
				{deliverables.map((d, i) => (
					<div key={i} className="text-sm text-[var(--color-text-primary)] px-2 py-1 bg-background rounded border border-border">
						{d.title}
					</div>
				))}
				<div className="flex gap-2">
					<Input
						value={delivTitle}
						onChange={(e) => setDelivTitle(e.target.value)}
						placeholder="Add deliverable..."
						onKeyDown={(e) => { if (e.key === "Enter") addDeliverable(); }}
						className="flex-1"
					/>
					<Button size="sm" variant="outline" onClick={addDeliverable}>Add</Button>
				</div>
			</div>

			{/* Acceptance criteria verification */}
			<div className="space-y-2">
				<label className="text-xs text-[var(--color-text-secondary)]">Acceptance Criteria</label>
				{verifications.map((v, i) => (
					<div
						key={i}
						className="flex items-center gap-2 px-2 py-1.5 rounded border border-border cursor-pointer hover:bg-background/50"
						onClick={() => toggleVerification(i)}
					>
						{v.status === "passed" && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />}
						{v.status === "failed" && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
						{v.status === "needs_review" && <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />}
						<span className="text-sm text-[var(--color-text-primary)] flex-1">{v.criterion_text}</span>
						<Badge variant="outline" className={cn("text-xs",
							v.status === "passed" && "text-green-400 border-green-400/30",
							v.status === "failed" && "text-red-400 border-red-400/30",
							v.status === "needs_review" && "text-amber-400 border-amber-400/30",
						)}>{v.status}</Badge>
					</div>
				))}
				{verifications.length === 0 && (
					<p className="text-xs text-[var(--color-text-secondary)] italic">No acceptance criteria defined.</p>
				)}
			</div>

			<Button
				onClick={() => intake.completeVerification({ deliverables, verifications })}
				disabled={intake.loading}
				className="w-full gap-2"
			>
				{intake.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
				Complete Verification
			</Button>
		</div>
	);
}

// ── Stage 7: Learn ──────────────────────────────────────────────────────────

function LearnStage({ intake }: { intake: ReturnType<typeof useTaskIntake> }) {
	return (
		<div className="space-y-3 p-4 rounded-lg bg-[var(--color-text-primary)]/5">
			<h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
				<BookOpen className="w-4 h-4 text-violet-400" />
				Task Complete — Save as Precedent?
			</h3>
			<p className="text-sm text-[var(--color-text-secondary)]">
				This workflow was successful. Save it as a precedent so similar future tasks can reuse this approach.
			</p>
			<div className="flex gap-2">
				<Button
					onClick={intake.createPrecedentFromRun}
					disabled={intake.loading}
					className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700"
				>
					{intake.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
					Save Precedent
				</Button>
				<Button variant="outline" className="flex-1">
					Skip
				</Button>
			</div>
		</div>
	);
}

// ============================================================================
// Preview Panel (right side)
// ============================================================================

function PreviewPanel({ task, plan, gate, run, precedent, planPreview, precedents, stage }: {
	task: GraphNode | null;
	plan: GraphNode | null;
	gate: GraphNode | null;
	run: GraphNode | null;
	precedent: GraphNode | null;
	planPreview: PlanPreview | null;
	precedents: PrecedentMatch[];
	stage: IntakeStage;
}) {
	return (
		<ScrollArea className="h-full">
			<div className="p-4 space-y-4">
				<h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Live Preview</h3>

				{/* Task card */}
				{task && (
					<NodeCard
						label="Task"
						node={task}
						color="blue"
						fields={[
							{ key: "Priority", value: task.metadata?.priority },
							{ key: "Est. Hours", value: task.metadata?.estimated_hours },
							{ key: "Criteria", value: task.metadata?.acceptance_criteria?.length || 0 },
						]}
					/>
				)}

				{/* Plan card */}
				{plan && (
					<NodeCard
						label="Plan"
						node={plan}
						color="amber"
						fields={[
							{ key: "Steps", value: plan.metadata?.steps?.length || 0 },
							{ key: "Est. Hours", value: plan.metadata?.estimated_hours },
						]}
					/>
				)}

				{/* Plan steps detail */}
				{planPreview && planPreview.steps.length > 0 && (
					<div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
						<h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Plan Steps</h4>
						{planPreview.steps.map((step, i) => (
							<div key={i} className="flex gap-2 text-xs">
								<span className="text-amber-400 font-mono w-5 text-right flex-shrink-0">{step.order}.</span>
								<div>
									<span className="text-[var(--color-text-primary)]">{step.action}</span>
									{step.tool && (
										<Badge variant="outline" className="ml-1 text-[10px]">{step.tool}</Badge>
									)}
									<div className="text-[var(--color-text-secondary)] mt-0.5">{step.expected_outcome}</div>
								</div>
							</div>
						))}
						{planPreview.rationale && (
							<div className="mt-2 pt-2 border-t border-amber-500/20 text-xs text-[var(--color-text-secondary)] italic">
								{planPreview.rationale}
							</div>
						)}
					</div>
				)}

				{/* Gate card */}
				{gate && (
					<NodeCard label="Gate" node={gate} color="green" fields={[
						{ key: "Type", value: gate.metadata?.gate_type },
					]} />
				)}

				{/* Run card */}
				{run && (
					<NodeCard label="Run" node={run} color="orange" fields={[
						{ key: "Started", value: run.metadata?.started_at ? new Date(run.metadata.started_at).toLocaleTimeString() : "—" },
					]} />
				)}

				{/* Precedent card */}
				{precedent && (
					<NodeCard label="Precedent" node={precedent} color="violet" fields={[
						{ key: "Successes", value: precedent.metadata?.success_count },
					]} />
				)}

				{/* Empty state */}
				{!task && !plan && !run && (
					<div className="text-center py-8 text-sm text-[var(--color-text-secondary)]">
						Define a task to see the live preview here.
					</div>
				)}
			</div>
		</ScrollArea>
	);
}

// ============================================================================
// Node Card
// ============================================================================

const NODE_COLORS: Record<string, { border: string; bg: string; text: string }> = {
	blue:   { border: "border-blue-500/30",   bg: "bg-blue-500/5",   text: "text-blue-400" },
	amber:  { border: "border-amber-500/30",  bg: "bg-amber-500/5",  text: "text-amber-400" },
	green:  { border: "border-green-500/30",  bg: "bg-green-500/5",  text: "text-green-400" },
	orange: { border: "border-orange-500/30", bg: "bg-orange-500/5", text: "text-orange-400" },
	violet: { border: "border-violet-500/30", bg: "bg-violet-500/5", text: "text-violet-400" },
};

function NodeCard({ label, node, color, fields }: {
	label: string;
	node: GraphNode;
	color: string;
	fields: Array<{ key: string; value: any }>;
}) {
	const c = NODE_COLORS[color] || NODE_COLORS.blue;

	return (
		<div className={cn("rounded-lg border p-3 space-y-2", c.border, c.bg)}>
			<div className="flex items-center justify-between">
				<h4 className={cn("text-xs font-semibold uppercase tracking-wider", c.text)}>{label}</h4>
				<Badge variant="outline" className="text-[10px]">{node.status}</Badge>
			</div>
			<p className="text-sm font-medium text-[var(--color-text-primary)]">{node.title}</p>
			{node.description && (
				<p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">{node.description}</p>
			)}
			{fields.filter(f => f.value != null).length > 0 && (
				<div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
					{fields.filter(f => f.value != null).map((f) => (
						<div key={f.key} className="text-xs">
							<span className="text-[var(--color-text-secondary)]">{f.key}: </span>
							<span className="text-[var(--color-text-primary)]">{String(f.value)}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
