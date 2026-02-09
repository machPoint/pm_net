/**
 * Prompts Management Routes
 * 
 * Provides CRUD for all system prompts used throughout the PM app.
 * Prompts are stored in-memory with defaults, and can be overridden at runtime.
 */

import express, { Request, Response } from 'express';
import logger from '../logger';

const router = express.Router();

// ============================================================================
// Prompt Registry — all system prompts used in the app
// ============================================================================

export interface PromptEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  caller: string;
  content: string;
  default_content: string;
  temperature: number;
  max_tokens: number;
  json_mode: boolean;
  updated_at: string;
  variables: string[];
}

const DEFAULT_PROMPTS: Omit<PromptEntry, 'updated_at'>[] = [
  {
    id: 'task-intake-system',
    name: 'Task Intake — System Prompt',
    description: 'The core system prompt for the Task Intake agent. Sets the persona and context for all task intake LLM calls.',
    category: 'Task Intake',
    caller: 'task-intake-*',
    content: `You are a Task Intake Agent for a project management system. Your job is to help users define tasks clearly and create actionable plans.

You operate on a graph-based PM system with two layers:
- PM Layer: task, milestone, deliverable, gate, risk, decision, resource
- Governance Layer: plan, run, verification, decision_trace, precedent

Be concise, structured, and helpful. Ask focused questions to fill in missing details.
Always respond in valid JSON when asked for structured output.`,
    default_content: '',
    temperature: 0.3,
    max_tokens: 1000,
    json_mode: false,
    variables: [],
  },
  {
    id: 'task-intake-clarify-first',
    name: 'Task Intake — Clarify (First Round)',
    description: 'Prompt used when the AI first assesses a new task. Instructs the AI to evaluate clarity, identify gaps, and ask targeted questions.',
    category: 'Task Intake',
    caller: 'task-intake-clarify',
    content: `This is the FIRST interaction. You MUST:
1. Start with a brief assessment: Is this task clear, vague, simple, or complex? (1 sentence)
2. Identify what information is MISSING (scope, constraints, deliverables, timeline, tools needed, etc.)
3. Ask 2-3 specific, targeted questions to fill the gaps
4. If the task is very simple and self-explanatory, say so and set ready_for_plan to true
Be conversational but direct. Don't just say "tell me more" — ask SPECIFIC questions.`,
    default_content: '',
    temperature: 0.3,
    max_tokens: 1000,
    json_mode: true,
    variables: ['task_title', 'task_description', 'priority', 'estimated_hours', 'acceptance_criteria', 'user_message'],
  },
  {
    id: 'task-intake-clarify-followup',
    name: 'Task Intake — Clarify (Follow-up)',
    description: 'Prompt used for subsequent clarification rounds after the first assessment.',
    category: 'Task Intake',
    caller: 'task-intake-clarify',
    content: `Continue the conversation. Ask follow-up questions if needed, or confirm you have enough info.`,
    default_content: '',
    temperature: 0.3,
    max_tokens: 1000,
    json_mode: true,
    variables: ['task_title', 'task_description', 'priority', 'estimated_hours', 'acceptance_criteria', 'user_message'],
  },
  {
    id: 'task-intake-plan',
    name: 'Task Intake — Plan Generation',
    description: 'Prompt that instructs the AI to generate an execution plan with steps, subtasks, rationale, and risks.',
    category: 'Task Intake',
    caller: 'task-intake-plan',
    content: `Generate an execution plan for this task.

Respond with JSON:
{
  "steps": [
    {"order": 1, "action": "description of step", "expected_outcome": "what this produces", "tool": "optional tool name"}
  ],
  "subtasks": [
    {"title": "subtask title", "description": "what this subtask involves", "priority": "high|medium|low", "estimated_hours": number}
  ],
  "rationale": "why this approach",
  "estimated_hours": number,
  "risks": ["potential risk 1", "potential risk 2"]
}

IMPORTANT: If this is a complex or multi-faceted task, break it into 2-5 subtasks (microtasks) that can be tracked independently. Each subtask should be a concrete, actionable unit of work. For simple tasks, subtasks can be an empty array.`,
    default_content: '',
    temperature: 0.4,
    max_tokens: 1000,
    json_mode: true,
    variables: ['task_title', 'task_description', 'priority', 'estimated_hours', 'acceptance_criteria'],
  },
  {
    id: 'task-intake-clarify-response-format',
    name: 'Task Intake — Clarify Response Format',
    description: 'The JSON response schema the AI must follow when clarifying tasks. Defines the structure for replies, task updates, and decisions.',
    category: 'Task Intake',
    caller: 'task-intake-clarify',
    content: `Respond with JSON:
{
  "reply": "your response to the user (conversational, concise, with numbered questions if asking)",
  "task_updates": {
    "description": "updated description if changed, or null",
    "priority": "updated priority if changed, or null",
    "estimated_hours": "updated hours if changed, or null",
    "acceptance_criteria": ["updated criteria array if changed, or null"]
  },
  "ready_for_plan": true/false (true if enough info to generate a plan),
  "decisions": [{"question": "...", "options": ["a","b"], "chosen": "a"}] or []
}`,
    default_content: '',
    temperature: 0.3,
    max_tokens: 1000,
    json_mode: true,
    variables: [],
  },
  {
    id: 'ai-chat-system',
    name: 'AI Chat — System Prompt',
    description: 'System prompt for the general AI chat assistant. Provides context about the OPAL platform and what the AI can help with.',
    category: 'AI Chat',
    caller: 'ai-chat',
    content: `You are an AI assistant for the OPAL task management and coordination platform. You have access to a live system graph with tasks, validations, agents, and their relationships.

You can help with:
- Task analysis and traceability
- Impact analysis of changes
- Validation coverage analysis  
- System graph queries
- Data exploration and insights

Provide specific, actionable responses based on the system context above.`,
    default_content: '',
    temperature: 0.7,
    max_tokens: 1000,
    json_mode: false,
    variables: ['system_context'],
  },
  {
    id: 'ai-analyze-default',
    name: 'AI Analyze — Default System Prompt',
    description: 'Default system prompt for the /api/ai/analyze endpoint used for relationship discovery and custom analysis.',
    category: 'AI Chat',
    caller: 'ai-analyze',
    content: `You are an expert systems analyst. Analyze the provided data and return structured insights. Be precise and actionable.`,
    default_content: '',
    temperature: 0.7,
    max_tokens: 2000,
    json_mode: false,
    variables: [],
  },
];

// In-memory store (initialized from defaults)
const promptRegistry = new Map<string, PromptEntry>();

function initPrompts() {
  for (const p of DEFAULT_PROMPTS) {
    promptRegistry.set(p.id, {
      ...p,
      default_content: p.content,
      updated_at: new Date().toISOString(),
    });
  }
  logger.info(`[Prompts] Initialized ${promptRegistry.size} system prompts`);
}

initPrompts();

// ============================================================================
// Public API — used by other services to get current prompt content
// ============================================================================

export function getPromptContent(id: string): string | null {
  const entry = promptRegistry.get(id);
  return entry ? entry.content : null;
}

export function getPromptEntry(id: string): PromptEntry | null {
  return promptRegistry.get(id) || null;
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/prompts — List all system prompts
 */
router.get('/', (_req: Request, res: Response) => {
  const prompts = Array.from(promptRegistry.values());
  // Group by category
  const categories: Record<string, PromptEntry[]> = {};
  for (const p of prompts) {
    if (!categories[p.category]) categories[p.category] = [];
    categories[p.category].push(p);
  }
  res.json({ prompts, categories, total: prompts.length });
});

/**
 * GET /api/prompts/:id — Get a single prompt
 */
router.get('/:id', (req: Request, res: Response) => {
  const entry = promptRegistry.get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Prompt not found' });
  res.json(entry);
});

/**
 * PUT /api/prompts/:id — Update a prompt's content and/or settings
 */
router.put('/:id', (req: Request, res: Response) => {
  const entry = promptRegistry.get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Prompt not found' });

  const { content, temperature, max_tokens, json_mode, name, description } = req.body;

  if (content !== undefined) entry.content = content;
  if (temperature !== undefined) entry.temperature = temperature;
  if (max_tokens !== undefined) entry.max_tokens = max_tokens;
  if (json_mode !== undefined) entry.json_mode = json_mode;
  if (name !== undefined) entry.name = name;
  if (description !== undefined) entry.description = description;
  entry.updated_at = new Date().toISOString();

  promptRegistry.set(req.params.id, entry);
  logger.info(`[Prompts] Updated prompt: ${req.params.id}`);

  res.json(entry);
});

/**
 * POST /api/prompts/:id/reset — Reset a prompt to its default content
 */
router.post('/:id/reset', (req: Request, res: Response) => {
  const entry = promptRegistry.get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Prompt not found' });

  entry.content = entry.default_content;
  entry.updated_at = new Date().toISOString();
  promptRegistry.set(req.params.id, entry);
  logger.info(`[Prompts] Reset prompt to default: ${req.params.id}`);

  res.json(entry);
});

/**
 * POST /api/prompts — Create a custom prompt
 */
router.post('/', (req: Request, res: Response) => {
  const { id, name, description, category, caller, content, temperature, max_tokens, json_mode, variables } = req.body;

  if (!id || !name || !content) {
    return res.status(400).json({ error: 'id, name, and content are required' });
  }

  if (promptRegistry.has(id)) {
    return res.status(409).json({ error: 'Prompt with this ID already exists' });
  }

  const entry: PromptEntry = {
    id,
    name,
    description: description || '',
    category: category || 'Custom',
    caller: caller || 'custom',
    content,
    default_content: content,
    temperature: temperature ?? 0.7,
    max_tokens: max_tokens ?? 1000,
    json_mode: json_mode ?? false,
    updated_at: new Date().toISOString(),
    variables: variables || [],
  };

  promptRegistry.set(id, entry);
  logger.info(`[Prompts] Created custom prompt: ${id}`);

  res.status(201).json(entry);
});

/**
 * DELETE /api/prompts/:id — Delete a custom prompt (cannot delete built-in ones)
 */
router.delete('/:id', (req: Request, res: Response) => {
  const entry = promptRegistry.get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Prompt not found' });

  const isBuiltIn = DEFAULT_PROMPTS.some(p => p.id === req.params.id);
  if (isBuiltIn) {
    return res.status(403).json({ error: 'Cannot delete built-in prompts. Use reset instead.' });
  }

  promptRegistry.delete(req.params.id);
  logger.info(`[Prompts] Deleted prompt: ${req.params.id}`);

  res.json({ deleted: true });
});

export default router;
