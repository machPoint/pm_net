"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
	Play,
	CheckCircle2,
	XCircle,
	AlertCircle,
	Send,
	Loader2,
	ChevronRight,
	ChevronLeft,
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
	Sparkles,
	ArrowRight,
	Copy,
	ExternalLink,
	Search,
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

const STAGE_META: Record<IntakeStage, { label: string; subtitle: string; icon: any; color: string; bg: string; step: number }> = {
	start:      { label: "Define Work",        subtitle: "What needs to be done?",                    icon: Plus,         color: "text-primary",         bg: "bg-primary",         step: 0 },
	precedents: { label: "Find Precedents",   subtitle: "Check for similar past workflows",          icon: Search,       color: "text-primary",         bg: "bg-primary",         step: 1 },
	clarify:    { label: "Clarify Details",    subtitle: "Refine scope with AI assistance",           icon: Sparkles,     color: "text-primary",         bg: "bg-primary",         step: 2 },
	plan:       { label: "Generate Plan",      subtitle: "Create an execution plan",                  icon: GitBranch,    color: "text-primary",         bg: "bg-primary",         step: 3 },
	approve:    { label: "Approval Gate",      subtitle: "Awaiting human approval before execution",  icon: Shield,       color: "text-primary",         bg: "bg-primary",         step: 4 },
	execute:    { label: "Execute",            subtitle: "Run the plan step by step",                 icon: Zap,          color: "text-primary",         bg: "bg-primary",         step: 5 },
	verify:     { label: "Verify",             subtitle: "Confirm deliverables meet acceptance criteria", icon: CheckCircle2, color: "text-primary",         bg: "bg-primary",         step: 6 },
	learn:      { label: "Learn",              subtitle: "Save this workflow for future reference",   icon: BookOpen,     color: "text-primary",         bg: "bg-primary",         step: 7 },
};

const STAGES_ORDER: IntakeStage[] = ["start", "precedents", "clarify", "plan", "approve", "execute", "verify", "learn"];

// ============================================================================
// Main Component
// ============================================================================

export default function ProjectIntakeSection() {
	const intake = useTaskIntake();
	const [inputValue, setInputValue] = useState("");
	const chatEndRef = useRef<HTMLDivElement>(null);

	// Auto-scroll chat in clarify stage
	useEffect(() => {
		chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [intake.session?.messages]);

	const handleNewSession = useCallback(async () => {
		await intake.createSession();
	}, [intake]);

	// ── Landing screen ──
	if (!intake.session) {
		return (
			<div className="h-full flex items-center justify-center">
				<div className="text-center space-y-6 max-w-lg px-8">
					<div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto border border-primary/20">
						<Sparkles className="w-10 h-10 text-primary" />
					</div>
					<div>
						<h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Project Intake</h2>
						<p className="text-sm text-[var(--color-text-secondary)] mt-2 leading-relaxed">
							Define your project, let the AI generate tasks, then approve, execute, and verify each deliverable with AI assistance.
						</p>
					</div>
					{/* Mini stage preview */}
					<div className="flex flex-wrap justify-center gap-2">
						{STAGES_ORDER.map((s) => {
							const m = STAGE_META[s];
							const Icon = m.icon;
							return (
								<div key={s} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[var(--color-text-primary)]/5 text-xs text-[var(--color-text-secondary)]">
									<Icon className={cn("w-3 h-3", m.color)} />
									{m.label}
								</div>
							);
						})}
					</div>
					<Button onClick={handleNewSession} disabled={intake.loading} size="lg" className="gap-2 px-8">
						{intake.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
						Start New Intake
					</Button>
				</div>
			</div>
		);
	}

	const currentMeta = STAGE_META[intake.session.stage];
	const currentStep = currentMeta.step;
	const Icon = currentMeta.icon;

	return (
		<div className="h-full flex flex-col">
			{/* ── Progress Bar ── */}
			<div className="px-4 py-3 border-b border-border bg-[var(--color-background)]">
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center gap-2">
						<div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", currentMeta.bg + "/20")}>
							<Icon className={cn("w-4 h-4", currentMeta.color)} />
						</div>
						<div>
							<h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{currentMeta.label}</h2>
							<p className="text-[10px] text-[var(--color-text-secondary)]">{currentMeta.subtitle}</p>
						</div>
					</div>
					<div className="flex items-center gap-1">
						{intake.deleteSession && (
							<Button variant="ghost" size="sm" onClick={intake.deleteSession} className="text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 h-7">
								<Trash2 className="w-3 h-3" />
								Delete
							</Button>
						)}
						<Button variant="ghost" size="sm" onClick={intake.createSession} className="text-xs gap-1 text-[var(--color-text-secondary)] h-7">
							<RotateCcw className="w-3 h-3" />
							New
						</Button>
					</div>
				</div>
				{/* Step dots */}
				<div className="flex items-center gap-1">
					{STAGES_ORDER.map((stage, i) => {
						const meta = STAGE_META[stage];
						const isDone = meta.step < currentStep;
						const isActive = stage === intake.session!.stage;
						return (
							<div key={stage} className="flex items-center flex-1">
								<div className={cn(
									"h-1.5 w-full rounded-full transition-all",
									isDone && "bg-primary",
									isActive && "bg-primary/70",
									!isDone && !isActive && "bg-muted"
								)} />
							</div>
						);
					})}
				</div>
				<div className="flex justify-between mt-1">
					<span className="text-[10px] text-[var(--color-text-secondary)]">Step {currentStep + 1} of {STAGES_ORDER.length}</span>
					<span className="text-[10px] text-[var(--color-text-secondary)]">{Math.round(((currentStep) / STAGES_ORDER.length) * 100)}% complete</span>
				</div>
			</div>

			{/* ── Main Content Area ── */}
			<div className="flex-1 flex overflow-hidden">
				{/* Left: Focused Stage Content */}
				<div className="flex-1 flex flex-col min-w-0">
					<ScrollArea className="flex-1">
						<div className="max-w-2xl mx-auto p-6">
							<StageContent intake={intake} inputValue={inputValue} setInputValue={setInputValue} />
							<div ref={chatEndRef} />
						</div>
					</ScrollArea>

					{/* Chat input (clarify stage only) */}
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

				{/* Right: Live Preview */}
				<div className="w-[360px] flex-shrink-0 flex flex-col bg-[var(--color-background)] border-l border-border overflow-hidden">
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
				<div className="px-4 py-2 bg-destructive/10 border-t border-destructive/30 flex items-center gap-2">
					<AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
					<span className="text-sm text-destructive flex-1">{intake.error}</span>
					<Button variant="ghost" size="sm" onClick={intake.clearError}>Dismiss</Button>
				</div>
			)}
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
				isUser && "bg-primary text-primary-foreground",
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

const CATEGORIES = [
	"Marketing", "Development", "Design", "Content", "Operations", "Sales", "Research", "Other",
];

function StartStage({ intake }: { intake: ReturnType<typeof useTaskIntake> }) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [category, setCategory] = useState("Other");
	const [priority, setPriority] = useState("medium");
	const [criteria, setCriteria] = useState("");

	const canSubmit = title.trim().length > 0;

	const handleSubmit = async () => {
		if (!canSubmit) return;
		await intake.startTask({
			title: title.trim(),
			description: description.trim() || undefined,
			priority,
			acceptance_criteria: criteria.trim()
				? criteria.split("\n").map((c) => c.trim()).filter(Boolean)
				: undefined,
			category,
		});
	};

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">Define Your Project</h3>
				<p className="text-sm text-[var(--color-text-secondary)]">
					Describe what you want to accomplish. The AI will generate tasks to get it done.
				</p>
			</div>

			<div className="space-y-4">
				<div>
					<label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block uppercase tracking-wider">Project Title *</label>
					<Input
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="e.g. Launch Q1 Marketing Campaign"
						className="h-11 text-base"
						onKeyDown={(e) => { if (e.key === "Enter" && canSubmit) handleSubmit(); }}
						autoFocus
					/>
				</div>

				<div>
					<label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block uppercase tracking-wider">Description</label>
					<textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Describe the goals, scope, and any constraints. The AI will ask follow-up questions if needed."
						className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
					/>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block uppercase tracking-wider">Category</label>
						<select
							value={category}
							onChange={(e) => setCategory(e.target.value)}
							className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						>
							{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
						</select>
					</div>
					<div>
						<label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block uppercase tracking-wider">Priority</label>
						<select
							value={priority}
							onChange={(e) => setPriority(e.target.value)}
							className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="low">Low</option>
							<option value="medium">Medium</option>
							<option value="high">High</option>
							<option value="critical">Critical</option>
						</select>
					</div>
				</div>

				<div>
					<label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block uppercase tracking-wider">
						Acceptance Criteria <span className="normal-case font-normal">(one per line, optional)</span>
					</label>
					<textarea
						value={criteria}
						onChange={(e) => setCriteria(e.target.value)}
						placeholder={"The output should include...\nMust handle edge case X...\nPerformance within Y seconds..."}
						className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm min-h-[70px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
					/>
				</div>

				<p className="text-[10px] text-[var(--color-text-secondary)]">
					Don&apos;t worry about getting everything perfect — the AI will help refine details in the next steps.
				</p>
			</div>

			<Button onClick={handleSubmit} disabled={intake.loading || !canSubmit} size="lg" className="w-full gap-2">
				{intake.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
				Continue — Find Precedents
			</Button>
		</div>
	);
}

// ── Stage 1: Precedents ─────────────────────────────────────────────────────

function PrecedentsStage({ intake }: { intake: ReturnType<typeof useTaskIntake> }) {
	const [autoSkipping, setAutoSkipping] = useState(false);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [selectedType, setSelectedType] = useState<"precedent" | "template" | null>(null);

	const hasPrecedents = intake.precedents.length > 0;
	const hasTemplates = intake.libraryTemplates.length > 0;
	const hasAnything = hasPrecedents || hasTemplates;

	const handleSkip = async () => {
		await intake.clarify("No similar past workflows found. Please assess this task — is it clear enough to plan, or do you need more details? Give me your initial take and any questions.");
	};

	const handleSelect = (id: string, type: "precedent" | "template") => {
		if (selectedId === id) {
			setSelectedId(null);
			setSelectedType(null);
		} else {
			setSelectedId(id);
			setSelectedType(type);
		}
	};

	// Only auto-advance when ZERO precedents AND ZERO templates found
	useEffect(() => {
		if (!hasAnything && !intake.loading && !autoSkipping) {
			setAutoSkipping(true);
			const timer = setTimeout(() => {
				handleSkip();
			}, 2000);
			return () => clearTimeout(timer);
		}
	}, [hasAnything, intake.loading]);

	// ── Nothing found ──
	if (!hasAnything) {
		return (
			<div className="space-y-4">
				<div className="text-center py-8">
					<div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
						<Search className="w-7 h-7 text-primary" />
					</div>
					<h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">Searching for Precedents</h3>
					<p className="text-sm text-[var(--color-text-secondary)]">
						{intake.loading ? "Looking for similar past workflows and templates..." : "No similar workflows or templates found."}
					</p>
					{autoSkipping && (
						<div className="flex items-center justify-center gap-2 mt-4 text-xs text-[var(--color-text-secondary)]">
							<Loader2 className="w-3 h-3 animate-spin" />
							Moving to AI clarification...
						</div>
					)}
				</div>
				{!autoSkipping && !intake.loading && (
					<Button onClick={handleSkip} className="w-full gap-2">
						<ArrowRight className="w-4 h-4" />
						Continue to Clarification
					</Button>
				)}
			</div>
		);
	}

	// ── Found matches — show precedents and/or library templates ──
	const totalCount = intake.precedents.length + intake.libraryTemplates.length;

	return (
		<div className="space-y-5">
			<div>
				<h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
					Found {totalCount} Match{totalCount !== 1 ? "es" : ""}
				</h3>
				<p className="text-sm text-[var(--color-text-secondary)]">
					Select a past workflow or template to reuse, or start fresh.
				</p>
			</div>

			{/* Precedent matches */}
			{hasPrecedents && (
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
						<BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
						Past Workflows
					</div>
					{intake.precedents.map((p) => {
						const isSelected = selectedId === p.id && selectedType === "precedent";
						return (
							<div
								key={p.id}
								className={cn(
									"rounded-xl border-2 p-4 cursor-pointer transition-all",
									isSelected
										? "border-primary bg-primary/10 shadow-lg shadow-primary/5"
										: "border-border hover:border-primary/40 hover:bg-primary/5"
								)}
								onClick={() => handleSelect(p.id, "precedent")}
							>
								<div className="flex items-start justify-between gap-3">
									<div className="flex-1 min-w-0">
										<h4 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{p.title}</h4>
										{p.task_pattern && (
											<p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mt-0.5">{p.task_pattern}</p>
										)}
									</div>
									<div className={cn(
										"w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all",
										isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
									)}>
										{isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
									</div>
								</div>
								<div className="flex items-center gap-4 mt-2">
									<div className="flex items-center gap-1.5 text-xs">
										<CheckCircle2 className="w-3 h-3 text-muted-foreground" />
										<span className="text-[var(--color-text-secondary)]">
											{p.success_count} run{p.success_count !== 1 ? "s" : ""}
										</span>
									</div>
									{p.avg_completion_hours > 0 && (
										<div className="flex items-center gap-1.5 text-xs">
											<Clock className="w-3 h-3 text-muted-foreground" />
											<span className="text-[var(--color-text-secondary)]">~{p.avg_completion_hours}h</span>
										</div>
									)}
								</div>
								{isSelected && (
									<div className="mt-3 pt-3 border-t border-primary/20">
										<Button
											onClick={(e) => { e.stopPropagation(); intake.selectPrecedent(p.id); }}
											disabled={intake.loading}
											className="w-full gap-2"
										>
											{intake.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
											Use This Workflow
										</Button>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}

			{/* Library templates */}
			{hasTemplates && (
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
						<FileText className="w-3.5 h-3.5 text-muted-foreground" />
						Library Templates
					</div>
					{intake.libraryTemplates.map((t) => {
						const isSelected = selectedId === t.id && selectedType === "template";
						return (
							<div
								key={t.id}
								className={cn(
									"rounded-xl border-2 p-4 cursor-pointer transition-all",
									isSelected
										? "border-primary bg-primary/10 shadow-lg shadow-primary/5"
										: "border-border hover:border-primary/40 hover:bg-primary/5"
								)}
								onClick={() => handleSelect(t.id, "template")}
							>
								<div className="flex items-start justify-between gap-3">
									<div className="flex-1 min-w-0">
										<h4 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{t.title}</h4>
										{t.description && (
											<p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mt-0.5">{t.description}</p>
										)}
									</div>
									<div className={cn(
										"w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all",
										isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
									)}>
										{isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
									</div>
								</div>
								<div className="flex items-center gap-3 mt-2">
									<Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
									{t.estimated_hours > 0 && (
										<div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
											<Clock className="w-3 h-3" />
											~{t.estimated_hours}h
										</div>
									)}
									{t.tags?.length > 0 && (
										<span className="text-[10px] text-[var(--color-text-secondary)]">
											{t.tags.slice(0, 3).join(", ")}
										</span>
									)}
								</div>
								{isSelected && (
									<div className="mt-3 pt-3 border-t border-primary/20">
										<Button
											onClick={(e) => { e.stopPropagation(); intake.selectPrecedent(t.id); }}
											disabled={intake.loading}
											className="w-full gap-2"
										>
											{intake.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
											Use This Template
										</Button>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}

			{/* Start fresh option */}
			<div className="pt-2 border-t border-border">
				<Button
					variant="outline"
					onClick={handleSkip}
					disabled={intake.loading}
					className="w-full gap-2"
				>
					{intake.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
					Skip — Start Fresh
				</Button>
				<p className="text-[10px] text-[var(--color-text-secondary)] text-center mt-1.5">
					The AI will help you build a plan from scratch
				</p>
			</div>
		</div>
	);
}

// ── Stage 2: Clarify ────────────────────────────────────────────────────────

function ClarifyStage({ intake }: { intake: ReturnType<typeof useTaskIntake> }) {
	const readyForPlan = intake.session?.stage === "clarify" &&
		(intake.session?.clarify_count || 0) > 0;
	const messages = intake.session?.messages || [];

	return (
		<div className="space-y-4">
			{/* Conversation */}
			<div className="space-y-3">
				{messages.map((msg, i) => (
					<ChatBubble key={i} message={msg} />
				))}
			</div>

			{/* Loading indicator */}
			{intake.loading && (
				<div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
					<Loader2 className="w-3 h-3 animate-spin" />
					AI is thinking...
				</div>
			)}

			{/* Generate Plan CTA */}
			{readyForPlan && (
				<div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
					<div className="flex items-center gap-2 mb-2">
						<Sparkles className="w-4 h-4 text-primary" />
						<span className="text-sm font-medium text-[var(--color-text-primary)]">Ready to generate a plan?</span>
					</div>
					<p className="text-xs text-[var(--color-text-secondary)] mb-3">
						You can continue refining below, or generate an execution plan now.
					</p>
					<Button
						onClick={() => intake.generatePlan(true)}
						disabled={intake.loading}
						className="w-full gap-2"
					>
						{intake.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
						Generate Execution Plan
					</Button>
				</div>
			)}
		</div>
	);
}

// ── Stage 3: Plan ───────────────────────────────────────────────────────────

function PlanStage({ intake }: { intake: ReturnType<typeof useTaskIntake> }) {
	return (
		<div className="space-y-4">
			<div className="text-center py-6">
				<div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
					<GitBranch className="w-7 h-7 text-primary" />
				</div>
				<h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">Generate Execution Plan</h3>
				<p className="text-sm text-[var(--color-text-secondary)]">
					The AI will create a step-by-step plan based on your task details.
				</p>
			</div>
			<Button
				onClick={() => intake.generatePlan(true)}
				disabled={intake.loading}
				size="lg"
				className="w-full gap-2"
			>
				{intake.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
				{intake.loading ? "Generating..." : "Generate Plan"}
			</Button>
		</div>
	);
}

// ── Stage 4: Approve ────────────────────────────────────────────────────────

function ApproveStage({ intake }: { intake: ReturnType<typeof useTaskIntake> }) {
	const [editing, setEditing] = useState(false);
	const [editSteps, setEditSteps] = useState<Array<{ order: number; action: string; expected_outcome: string; tool?: string }>>([]);
	const [newStepAction, setNewStepAction] = useState("");
	const [confirmed, setConfirmed] = useState(false);

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
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Review Execution Plan</h3>
					<p className="text-sm text-[var(--color-text-secondary)]">
						{steps.length} step{steps.length !== 1 ? "s" : ""} · Review, edit, then approve or reject.
					</p>
				</div>
				<Button size="sm" variant={editing ? "default" : "outline"} onClick={() => setEditing(!editing)} className="gap-1.5">
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
								<Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-destructive" onClick={() => removeStep(i)}>×</Button>
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
						<GitBranch className="w-3 h-3 text-muted-foreground" />
						Subtasks ({intake.planPreview.subtasks.length})
					</h4>
					{intake.planPreview.subtasks.map((st, i) => (
						<div key={st.id || i} className="flex items-start gap-2 px-2 py-1.5 rounded bg-primary/5 border border-primary/10 text-xs">
							<div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/50 flex-shrink-0 mt-0.5" />
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

			{/* Approval Gate */}
			<div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
				<div className="flex items-center gap-2">
					<Shield className="w-5 h-5 text-primary" />
					<span className="text-sm font-semibold text-[var(--color-text-primary)]">Approval Gate</span>
				</div>
				<p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
					Approving this plan will authorize an AI agent to autonomously execute the steps above.
					The agent will use tools like web search, code generation, and file operations.
					<strong className="text-[var(--color-text-primary)]"> No further confirmation will be requested until execution completes.</strong>
				</p>
				<div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-text-primary)]/5 border border-border">
					<input
						type="checkbox"
						id="approve-confirm"
						checked={confirmed}
						onChange={(e) => setConfirmed(e.target.checked)}
						className="rounded border-input"
					/>
					<label htmlFor="approve-confirm" className="text-xs text-[var(--color-text-primary)] cursor-pointer select-none">
						I have reviewed the plan and approve autonomous execution
					</label>
				</div>
			</div>

			<div className="flex gap-2">
				<Button
					onClick={() => intake.approvePlan(true)}
					disabled={!confirmed || intake.loading}
					className="flex-1 gap-2"
				>
					{intake.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
					Approve Plan
				</Button>
				<Button
					variant="outline"
					onClick={() => intake.approvePlan(false)}
					disabled={intake.loading}
					className="flex-1 gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
				>
					<XCircle className="w-4 h-4" />
					Reject & Revise
				</Button>
			</div>
		</div>
	);
}

// ── Stage 5: Execute ────────────────────────────────────────────────────────

interface StepToolCall {
	name: string;
	arguments: Record<string, any>;
	result?: string;
	error?: string;
}

interface StepLog {
	step: number;
	status: "pending" | "running" | "done" | "error";
	output: string;
	tool_calls: StepToolCall[];
	source?: "openclaw" | "llm_fallback" | "error";
	model?: string;
	duration_ms?: number;
	expanded?: boolean;
}

function ToolCallBlock({ tc, index }: { tc: StepToolCall; index: number }) {
	const [open, setOpen] = useState(false);
	return (
		<div className="rounded border border-border bg-muted/50 text-xs">
			<button
				onClick={() => setOpen(!open)}
				className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-accent/50 transition-colors"
			>
				<span className="text-primary font-medium">⚙ {tc.name}</span>
				{tc.error && <span className="text-destructive text-[10px]">error</span>}
				{!tc.error && tc.result && <span className="text-muted-foreground text-[10px]">✓</span>}
				<span className="ml-auto text-muted-foreground text-[10px]">{open ? "▼" : "▶"}</span>
			</button>
			{open && (
				<div className="border-t border-border px-2 py-1.5 space-y-1">
					<div>
						<span className="text-muted-foreground">args: </span>
						<code className="text-[10px] text-[var(--color-text-primary)]">
							{JSON.stringify(tc.arguments, null, 2)}
						</code>
					</div>
					{tc.result && (
						<div>
							<span className="text-muted-foreground">{tc.error ? "error: " : "result: "}</span>
							<pre className={cn(
								"text-[10px] whitespace-pre-wrap mt-0.5 max-h-32 overflow-y-auto",
								tc.error ? "text-destructive" : "text-[var(--color-text-primary)]"
							)}>
								{tc.result}
							</pre>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function ExecuteStage({ intake }: { intake: ReturnType<typeof useTaskIntake> }) {
	const [executing, setExecuting] = useState(false);
	const [stepLogs, setStepLogs] = useState<StepLog[]>([]);
	const steps = intake.planPreview?.steps || intake.plan?.metadata?.steps || [];

	const handleExecute = async () => {
		setExecuting(true);
		setStepLogs(steps.map((_: any, i: number) => ({
			step: i, status: "pending" as const, output: "", tool_calls: [],
		})));

		// 1. Create the run node first (sets session.run_id so decision traces are linked)
		await intake.startExecution();

		for (let i = 0; i < steps.length; i++) {
			const step = steps[i] as any;
			// Mark step as running
			setStepLogs(prev => prev.map((l, idx) =>
				idx === i ? { ...l, status: "running" as const, output: `Agent is working on: ${step.action}...`, expanded: true } : l
			));

			// 2. Call the real execute-step endpoint
			let result: Partial<StepLog> = { output: "", tool_calls: [], source: "error" };
			try {
				const res = await fetch(`/api/opal/proxy/api/task-intake/sessions/${intake.session!.id}/execute-step`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						step_order: step.order || i + 1,
						action: step.action,
						tool: step.tool || null,
						expected_outcome: step.expected_outcome || "",
					}),
				});
				const data = await res.json();
				if (data.ok) {
					result = {
						output: data.output || "Completed",
						tool_calls: data.tool_calls || [],
						source: data.source || "openclaw",
						model: data.model,
						duration_ms: data.duration_ms,
					};
				} else {
					result = { output: `Error: ${data.error || "Unknown error"}`, tool_calls: [], source: "error" };
				}
			} catch (err: any) {
				result = { output: `Network error: ${err.message}`, tool_calls: [], source: "error" };
			}

			const success = result.source !== "error";
			setStepLogs(prev => prev.map((l, idx) =>
				idx === i ? {
					...l,
					status: (success ? "done" : "error") as StepLog["status"],
					output: result.output || "",
					tool_calls: result.tool_calls || [],
					source: result.source,
					model: result.model,
					duration_ms: result.duration_ms,
					expanded: true,
				} : l
			));
		}

		// 3. Finalize — advance to verify stage
		await intake.finalizeExecution();
		setExecuting(false);
	};

	const completedCount = stepLogs.filter(l => l.status === "done").length;
	const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

	return (
		<div className="space-y-5">
			<div>
				<h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
					{executing ? "Executing Plan..." : completedCount === steps.length && completedCount > 0 ? "Execution Complete" : "Ready to Execute"}
				</h3>
				<p className="text-sm text-[var(--color-text-secondary)]">
					{executing
						? `Step ${completedCount + 1} of ${steps.length} — ${progress}% complete`
						: completedCount > 0
							? `All ${steps.length} steps completed. Moving to verification...`
							: `${steps.length} step${steps.length !== 1 ? "s" : ""} ready to run. Each step will be dispatched to an AI agent.`
					}
				</p>
			</div>

			{/* Progress bar */}
			{(executing || completedCount > 0) && steps.length > 0 && (
				<div className="w-full bg-muted rounded-full h-2">
					<div
						className="bg-primary h-2 rounded-full transition-all duration-500"
						style={{ width: `${progress}%` }}
					/>
				</div>
			)}

			{/* Step list with rich output */}
			{steps.length > 0 && (
				<div className="space-y-3 rounded-xl border border-border p-3">
					{steps.map((step: any, i: number) => {
						const log = stepLogs[i];
						const isDone = log?.status === "done";
						const isError = log?.status === "error";
						const isActive = log?.status === "running";
						const isPending = !log || log.status === "pending";
						const isExpanded = log?.expanded ?? false;
						return (
							<div key={i} className={cn(
								"rounded-lg transition-all border",
								isDone && "bg-primary/5 border-primary/20",
								isError && "bg-destructive/5 border-destructive/20",
								isActive && "bg-accent border-primary/30",
								isPending && "border-transparent",
								isPending && !executing && "opacity-70",
								isPending && executing && "opacity-40",
							)}>
								{/* Step header */}
								<button
									className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left"
									onClick={() => log && setStepLogs(prev => prev.map((l, idx) =>
										idx === i ? { ...l, expanded: !l.expanded } : l
									))}
								>
									{isDone ? (
										<CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
									) : isError ? (
										<AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
									) : isActive ? (
										<Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
									) : (
										<div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
									)}
									<span className="flex-1 text-[var(--color-text-primary)] font-medium">
										{step.action}
									</span>
									<div className="flex items-center gap-1.5">
										{step.tool && <Badge variant="outline" className="text-[10px]">{step.tool}</Badge>}
										{log?.source === "openclaw" && <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">OpenClaw</Badge>}
										{log?.source === "llm_fallback" && <Badge variant="outline" className="text-[10px]">LLM</Badge>}
										{log?.duration_ms && (
											<span className="text-[10px] text-muted-foreground">{(log.duration_ms / 1000).toFixed(1)}s</span>
										)}
										{log && !isPending && (
											<span className="text-muted-foreground text-[10px]">{isExpanded ? "▼" : "▶"}</span>
										)}
									</div>
								</button>

								{/* Expanded output */}
								{isExpanded && log && !isPending && (
									<div className="px-3 pb-3 space-y-2">
										{/* Tool calls */}
										{log.tool_calls.length > 0 && (
											<div className="space-y-1">
												<span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Tool Calls</span>
												{log.tool_calls.map((tc, tci) => (
													<ToolCallBlock key={tci} tc={tc} index={tci} />
												))}
											</div>
										)}

										{/* Agent output */}
										{log.output && (
											<div>
												{log.tool_calls.length > 0 && (
													<span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Agent Output</span>
												)}
												<div className={cn(
													"px-3 py-2 rounded text-xs whitespace-pre-wrap border-l-2 max-h-64 overflow-y-auto",
													isActive ? "bg-muted/50 border-primary/30 text-muted-foreground" : "bg-muted border-primary/30 text-[var(--color-text-primary)]",
												)}>
													{log.output}
												</div>
											</div>
										)}

										{/* Model info */}
										{log.model && (
											<div className="text-[10px] text-muted-foreground">
												Model: {log.model}
											</div>
										)}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}

			{/* Note about execution */}
			{!executing && completedCount === 0 && (
				<>
					<div className="rounded-lg border border-border bg-muted/50 p-3">
						<p className="text-xs text-muted-foreground">
							<strong>How it works:</strong> Each step is dispatched to an OpenClaw AI agent which can search the web, generate code, analyze data, and write documents.
							Tool calls and results are shown in real time. Steps run sequentially — this may take a few minutes.
						</p>
					</div>
					<Button
						onClick={handleExecute}
						disabled={intake.loading}
						size="lg"
						className="w-full gap-2"
					>
						{intake.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
						Start Execution
					</Button>
				</>
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
	const [expandedStep, setExpandedStep] = useState<number | null>(null);

	const [verifications, setVerifications] = useState<Array<{
		criterion_text: string;
		status: "passed" | "failed" | "needs_review";
	}>>([]);

	// Fetch execution results when entering verify stage
	useEffect(() => {
		if (!intake.executionResults) {
			intake.fetchExecutionResults();
		}
	}, []);

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

	const passedCount = verifications.filter(v => v.status === "passed").length;
	const results = intake.executionResults;

	return (
		<div className="space-y-5">
			<div>
				<h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">Verify & Deliver</h3>
				<p className="text-sm text-[var(--color-text-secondary)]">
					Review execution outputs, confirm deliverables, and verify acceptance criteria.
				</p>
			</div>

			{/* Execution Results */}
			{results && results.steps.length > 0 && (
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Execution Output</label>
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<span>{results.success_count}/{results.steps.length} steps passed</span>
							<span>•</span>
							<span>{(results.total_duration_ms / 1000).toFixed(1)}s total</span>
						</div>
					</div>
					<div className="rounded-xl border border-border overflow-hidden">
						{results.steps.map((step, i) => (
							<div key={i} className={cn(
								"border-b border-border last:border-b-0",
								step.success ? "bg-primary/5" : "bg-destructive/5",
							)}>
								<button
									className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-accent/30 transition-colors"
									onClick={() => setExpandedStep(expandedStep === i ? null : i)}
								>
									{step.success ? (
										<CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
									) : (
										<AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
									)}
									<span className="flex-1 text-[var(--color-text-primary)] font-medium truncate">
										{step.action}
									</span>
									<div className="flex items-center gap-1.5 flex-shrink-0">
										{step.tool && <Badge variant="outline" className="text-[10px]">{step.tool}</Badge>}
										{step.tool_calls.length > 0 && (
											<Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
												{step.tool_calls.length} tool{step.tool_calls.length !== 1 ? "s" : ""}
											</Badge>
										)}
										<span className="text-[10px] text-muted-foreground">{(step.duration_ms / 1000).toFixed(1)}s</span>
										<span className="text-muted-foreground text-[10px]">{expandedStep === i ? "▼" : "▶"}</span>
									</div>
								</button>
								{expandedStep === i && (
									<div className="px-3 pb-3 space-y-2">
										{step.tool_calls.length > 0 && (
											<div className="flex flex-wrap gap-1">
												<span className="text-[10px] text-muted-foreground">Tools used:</span>
												{step.tool_calls.map((tc, tci) => (
													<Badge key={tci} variant="outline" className="text-[10px]">⚙ {tc}</Badge>
												))}
											</div>
										)}
										<div className="px-3 py-2 rounded bg-muted text-xs whitespace-pre-wrap border-l-2 border-primary/30 max-h-96 overflow-y-auto text-[var(--color-text-primary)]">
											{step.output}
										</div>
										{step.model && (
											<div className="text-[10px] text-muted-foreground">
												Source: {step.source} • Model: {step.model}
											</div>
										)}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{/* Loading state for results */}
			{!results && (
				<div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
					<Loader2 className="w-4 h-4 animate-spin" />
					Loading execution results...
				</div>
			)}

			{/* Deliverables */}
			<div className="space-y-2">
				<label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Deliverables</label>
				{deliverables.map((d, i) => (
					<div key={i} className="flex items-center gap-2 text-sm text-[var(--color-text-primary)] px-3 py-2 bg-primary/5 rounded-lg border border-primary/20">
						<CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
						{d.title}
					</div>
				))}
				<div className="flex gap-2">
					<Input
						value={delivTitle}
						onChange={(e) => setDelivTitle(e.target.value)}
						placeholder="Add a deliverable..."
						onKeyDown={(e) => { if (e.key === "Enter") addDeliverable(); }}
						className="flex-1"
					/>
					<Button size="sm" variant="outline" onClick={addDeliverable} className="gap-1">
						<Plus className="w-3 h-3" />
						Add
					</Button>
				</div>
			</div>

			{/* Acceptance criteria */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Acceptance Criteria</label>
					{verifications.length > 0 && (
						<span className="text-xs text-[var(--color-text-secondary)]">
							{passedCount}/{verifications.length} passed
						</span>
					)}
				</div>
				<div className="rounded-xl border border-border overflow-hidden">
					{verifications.map((v, i) => (
						<div
							key={i}
							className={cn(
								"flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors border-b border-border last:border-b-0",
								v.status === "passed" && "bg-primary/5 hover:bg-primary/10",
								v.status === "failed" && "bg-destructive/5 hover:bg-destructive/10",
								v.status === "needs_review" && "bg-muted hover:bg-accent",
							)}
							onClick={() => toggleVerification(i)}
						>
							{v.status === "passed" && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
							{v.status === "failed" && <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />}
							{v.status === "needs_review" && <AlertTriangle className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
							<span className="text-sm text-[var(--color-text-primary)] flex-1">{v.criterion_text}</span>
							<Badge variant="outline" className={cn("text-[10px]",
								v.status === "passed" && "text-primary border-primary/30",
								v.status === "failed" && "text-destructive border-destructive/30",
								v.status === "needs_review" && "text-muted-foreground border-muted-foreground/30",
							)}>{v.status.replace("_", " ")}</Badge>
						</div>
					))}
				</div>
				{verifications.length === 0 && (
					<p className="text-xs text-[var(--color-text-secondary)] italic text-center py-4">No acceptance criteria defined.</p>
				)}
			</div>

			<Button
				onClick={() => intake.completeVerification({ deliverables, verifications })}
				disabled={intake.loading}
				size="lg"
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
		<div className="space-y-5">
			<div className="text-center py-6">
				<div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
					<CheckCircle2 className="w-8 h-8 text-primary" />
				</div>
				<h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">Task Complete!</h3>
				<p className="text-sm text-[var(--color-text-secondary)] max-w-sm mx-auto">
					Save this workflow as a precedent so similar future work can reuse this approach automatically.
				</p>
			</div>

			<div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
				<div className="flex items-center gap-2">
					<BookOpen className="w-4 h-4 text-primary" />
					<span className="text-sm font-medium text-[var(--color-text-primary)]">Why save as precedent?</span>
				</div>
				<ul className="space-y-1.5 ml-6 text-xs text-[var(--color-text-secondary)]">
					<li className="flex items-center gap-2">
						<ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
						Future similar tasks will auto-suggest this workflow
					</li>
					<li className="flex items-center gap-2">
						<ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
						Reduces planning time for recurring work
					</li>
					<li className="flex items-center gap-2">
						<ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
						Builds organizational knowledge over time
					</li>
				</ul>
			</div>

			<div className="flex gap-3">
				<Button
					onClick={intake.createPrecedentFromRun}
					disabled={intake.loading}
					size="lg"
					className="flex-1 gap-2"
				>
					{intake.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
					Save as Precedent
				</Button>
				<Button variant="outline" size="lg" className="flex-1 gap-2" onClick={intake.createSession}>
					<RotateCcw className="w-4 h-4" />
					Start New Intake
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
					<div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
						<h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Plan Steps</h4>
						{planPreview.steps.map((step, i) => (
							<div key={i} className="flex gap-2 text-xs">
								<span className="text-primary font-mono w-5 text-right flex-shrink-0">{step.order}.</span>
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
							<div className="mt-2 pt-2 border-t border-primary/20 text-xs text-[var(--color-text-secondary)] italic">
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
						Define work to see the live preview here.
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
	blue:   { border: "border-primary/30",   bg: "bg-primary/5",   text: "text-primary" },
	amber:  { border: "border-primary/30",  bg: "bg-primary/5",  text: "text-primary" },
	green:  { border: "border-primary/30",  bg: "bg-primary/5",  text: "text-primary" },
	orange: { border: "border-primary/30", bg: "bg-primary/5", text: "text-primary" },
	violet: { border: "border-primary/30", bg: "bg-primary/5", text: "text-primary" },
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
