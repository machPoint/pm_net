import { v4 as uuid } from 'uuid';
import db from '../config/database';
import * as graphService from './graphService';
import * as hierarchyService from './hierarchyService';
import { eventBus } from './eventBus';
import logger from '../logger';

export type ScheduledJobStatus = 'scheduled' | 'running' | 'completed' | 'failed' | 'canceled';

export interface ScheduleProfile {
	project_id: string;
	timezone: string;
	work_start_hour: number;
	work_end_hour: number;
	daily_job_limit: number;
	metadata?: Record<string, any>;
	created_at: string;
	updated_at: string;
}

export interface ScheduledJob {
	id: string;
	project_id: string;
	task_id: string;
	step_order: number;
	title: string;
	payload: Record<string, any>;
	run_at: string;
	timezone: string;
	status: ScheduledJobStatus;
	recurrence_cron?: string | null;
	depends_on?: string[];
	attempt_count: number;
	last_error?: string | null;
	created_by: string;
	created_at: string;
	updated_at: string;
	executed_at?: string | null;
	canceled_at?: string | null;
}

export interface GenerateScheduleInput {
	project_id: string;
	start_at?: string;
	created_by?: string;
	replace_existing?: boolean;
}

let initialized = false;
let schedulerTimer: NodeJS.Timeout | null = null;

function parseJSON<T>(value: any, fallback: T): T {
	if (!value) return fallback;
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}

function toISO(date: Date): string {
	return date.toISOString();
}

function floorToHour(date: Date): Date {
	const d = new Date(date);
	d.setMinutes(0, 0, 0);
	return d;
}

function shiftToWorkWindow(date: Date, startHour: number, endHour: number): Date {
	const out = new Date(date);
	const hour = out.getHours();
	if (hour < startHour) {
		out.setHours(startHour, 0, 0, 0);
		return out;
	}
	if (hour >= endHour) {
		out.setDate(out.getDate() + 1);
		out.setHours(startHour, 0, 0, 0);
	}
	return out;
}

function nextSlot(current: Date, profile: ScheduleProfile, jobsForDay: number): Date {
	const startHour = profile.work_start_hour;
	const endHour = profile.work_end_hour;
	let cursor = shiftToWorkWindow(new Date(current), startHour, endHour);

	if (jobsForDay >= profile.daily_job_limit) {
		cursor.setDate(cursor.getDate() + 1);
		cursor.setHours(startHour, 0, 0, 0);
	}

	return cursor;
}

async function ensureTables() {
	if (initialized) return;

	const hasProfiles = await db.schema.hasTable('schedule_profiles');
	if (!hasProfiles) {
		await db.schema.createTable('schedule_profiles', (table) => {
			table.string('project_id', 36).primary();
			table.string('timezone').notNullable().defaultTo('UTC');
			table.integer('work_start_hour').notNullable().defaultTo(9);
			table.integer('work_end_hour').notNullable().defaultTo(17);
			table.integer('daily_job_limit').notNullable().defaultTo(6);
			table.text('metadata');
			table.string('created_at').notNullable();
			table.string('updated_at').notNullable();
		});
	}

	const hasJobs = await db.schema.hasTable('scheduled_jobs');
	if (!hasJobs) {
		await db.schema.createTable('scheduled_jobs', (table) => {
			table.string('id', 36).primary();
			table.string('project_id', 36).notNullable().index();
			table.string('task_id', 36).notNullable().index();
			table.integer('step_order').notNullable();
			table.string('title').notNullable();
			table.text('payload').notNullable();
			table.string('run_at').notNullable().index();
			table.string('timezone').notNullable().defaultTo('UTC');
			table.string('status').notNullable().defaultTo('scheduled').index();
			table.string('recurrence_cron');
			table.text('depends_on');
			table.integer('attempt_count').notNullable().defaultTo(0);
			table.text('last_error');
			table.string('created_by', 64).notNullable();
			table.string('created_at').notNullable();
			table.string('updated_at').notNullable();
			table.string('executed_at');
			table.string('canceled_at');
		});
	}

	const hasRuns = await db.schema.hasTable('schedule_generation_runs');
	if (!hasRuns) {
		await db.schema.createTable('schedule_generation_runs', (table) => {
			table.string('id', 36).primary();
			table.string('project_id', 36).notNullable().index();
			table.string('created_by', 64).notNullable();
			table.string('created_at').notNullable();
			table.text('summary');
		});
	}

	initialized = true;
}

export async function getProfile(projectId: string): Promise<ScheduleProfile> {
	await ensureTables();
	const existing = await db('schedule_profiles').where({ project_id: projectId }).first();
	if (existing) {
		return {
			...existing,
			metadata: parseJSON(existing.metadata, {}),
		};
	}

	const now = new Date().toISOString();
	const profile: ScheduleProfile = {
		project_id: projectId,
		timezone: 'UTC',
		work_start_hour: 9,
		work_end_hour: 17,
		daily_job_limit: 6,
		metadata: {},
		created_at: now,
		updated_at: now,
	};
	await db('schedule_profiles').insert({
		...profile,
		metadata: JSON.stringify(profile.metadata || {}),
	});
	return profile;
}

export async function upsertProfile(projectId: string, input: Partial<ScheduleProfile>) {
	await ensureTables();
	const current = await getProfile(projectId);
	const updated: ScheduleProfile = {
		...current,
		timezone: input.timezone || current.timezone,
		work_start_hour: input.work_start_hour ?? current.work_start_hour,
		work_end_hour: input.work_end_hour ?? current.work_end_hour,
		daily_job_limit: input.daily_job_limit ?? current.daily_job_limit,
		metadata: {
			...(current.metadata || {}),
			...(input.metadata || {}),
		},
		updated_at: new Date().toISOString(),
	};

	await db('schedule_profiles').where({ project_id: projectId }).update({
		timezone: updated.timezone,
		work_start_hour: updated.work_start_hour,
		work_end_hour: updated.work_end_hour,
		daily_job_limit: updated.daily_job_limit,
		metadata: JSON.stringify(updated.metadata || {}),
		updated_at: updated.updated_at,
	});

	return updated;
}

async function findPlanForTask(taskId: string) {
	const edges = await graphService.listEdges({ edge_type: 'for_task', target_node_id: taskId, limit: 100 });
	let latest: graphService.Node | null = null;
	for (const edge of edges) {
		const node = await graphService.getNode(edge.source_node_id);
		if (!node || node.node_type !== 'plan') continue;
		if (!latest || node.created_at > latest.created_at) latest = node;
	}
	return latest;
}

async function collectProjectTasks(projectId: string): Promise<graphService.Node[]> {
	const tree = await hierarchyService.getHierarchyTree(projectId, 4);
	const tasks: graphService.Node[] = [];
	const queue: hierarchyService.HierarchyTree[] = [tree];
	while (queue.length) {
		const current = queue.shift()!;
		if (current.node.node_type === 'task') tasks.push(current.node);
		for (const child of current.children) queue.push(child);
	}
	return tasks;
}

export async function generateProjectSchedule(input: GenerateScheduleInput) {
	await ensureTables();
	const project = await graphService.getNode(input.project_id);
	if (!project || project.node_type !== 'project') {
		throw new Error(`Project not found: ${input.project_id}`);
	}

	const profile = await getProfile(input.project_id);
	const actor = input.created_by || 'user';
	const now = new Date().toISOString();

	if (input.replace_existing) {
		await db('scheduled_jobs')
			.where({ project_id: input.project_id })
			.whereIn('status', ['scheduled', 'failed'])
			.update({ status: 'canceled', canceled_at: now, updated_at: now, last_error: 'Replaced by regenerated schedule' });
	}

	const tasks = await collectProjectTasks(input.project_id);
	let cursor = floorToHour(input.start_at ? new Date(input.start_at) : new Date());
	let dayKey = cursor.toISOString().slice(0, 10);
	let jobsForDay = 0;

	const jobsToCreate: ScheduledJob[] = [];

	for (const task of tasks) {
		const plan = await findPlanForTask(task.id);
		const steps = (plan?.metadata?.steps || task.metadata?.plan_steps || []) as Array<Record<string, any>>;
		const taskSteps = Array.isArray(steps) && steps.length > 0
			? steps
			: [{ order: 1, action: `Execute ${task.title}`, tool: null, expected_outcome: task.description || '' }];

		for (const rawStep of taskSteps) {
			cursor = nextSlot(cursor, profile, jobsForDay);
			const slotDay = cursor.toISOString().slice(0, 10);
			if (slotDay !== dayKey) {
				dayKey = slotDay;
				jobsForDay = 0;
			}
			if (jobsForDay >= profile.daily_job_limit) {
				cursor.setDate(cursor.getDate() + 1);
				cursor.setHours(profile.work_start_hour, 0, 0, 0);
				dayKey = cursor.toISOString().slice(0, 10);
				jobsForDay = 0;
			}

			const runAt = toISO(cursor);
			const stepOrder = Number(rawStep.order || rawStep.step_order || jobsToCreate.length + 1);
			jobsToCreate.push({
				id: uuid(),
				project_id: input.project_id,
				task_id: task.id,
				step_order: stepOrder,
				title: `${task.title} — ${String(rawStep.action || `Step ${stepOrder}`)}`,
				payload: {
					task_id: task.id,
					task_title: task.title,
					step: rawStep,
					plan_id: plan?.id || null,
				},
				run_at: runAt,
				timezone: profile.timezone,
				status: 'scheduled',
				recurrence_cron: null,
				depends_on: [],
				attempt_count: 0,
				last_error: null,
				created_by: actor,
				created_at: now,
				updated_at: now,
				executed_at: null,
				canceled_at: null,
			});

			jobsForDay += 1;
			cursor.setHours(cursor.getHours() + 1, 0, 0, 0);
		}
	}

	if (jobsToCreate.length > 0) {
		await db('scheduled_jobs').insert(
			jobsToCreate.map((job) => ({
				...job,
				payload: JSON.stringify(job.payload),
				depends_on: JSON.stringify(job.depends_on || []),
			}))
		);
	}

	const runId = uuid();
	await db('schedule_generation_runs').insert({
		id: runId,
		project_id: input.project_id,
		created_by: actor,
		created_at: now,
		summary: JSON.stringify({ generated_count: jobsToCreate.length, start_at: input.start_at || now }),
	});

	return {
		run_id: runId,
		project_id: input.project_id,
		generated_count: jobsToCreate.length,
		jobs: jobsToCreate,
	};
}

function mapScheduledJobRow(row: any): ScheduledJob {
	return {
		...row,
		payload: parseJSON<Record<string, any>>(row.payload, {}),
		depends_on: parseJSON<string[]>(row.depends_on, []),
	};
}

export async function listProjectJobs(projectId: string, from?: string, to?: string) {
	await ensureTables();
	let query = db('scheduled_jobs').where({ project_id: projectId });
	if (from) query = query.where('run_at', '>=', from);
	if (to) query = query.where('run_at', '<=', to);
	const rows = await query.orderBy('run_at', 'asc').limit(2000);
	return rows.map(mapScheduledJobRow);
}

export async function updateJob(jobId: string, updates: Partial<ScheduledJob>) {
	await ensureTables();
	const existing = await db('scheduled_jobs').where({ id: jobId }).first();
	if (!existing) throw new Error(`Scheduled job not found: ${jobId}`);
	const now = new Date().toISOString();
	await db('scheduled_jobs').where({ id: jobId }).update({
		run_at: updates.run_at || existing.run_at,
		status: updates.status || existing.status,
		title: updates.title || existing.title,
		timezone: updates.timezone || existing.timezone,
		payload: updates.payload ? JSON.stringify(updates.payload) : existing.payload,
		recurrence_cron: updates.recurrence_cron ?? existing.recurrence_cron,
		updated_at: now,
	});
	const row = await db('scheduled_jobs').where({ id: jobId }).first();
	return mapScheduledJobRow(row);
}

export async function cancelJob(jobId: string, reason = 'Canceled by user') {
	await ensureTables();
	const now = new Date().toISOString();
	const count = await db('scheduled_jobs').where({ id: jobId }).update({
		status: 'canceled',
		canceled_at: now,
		updated_at: now,
		last_error: reason,
	});
	if (!count) throw new Error(`Scheduled job not found: ${jobId}`);
	return { id: jobId, status: 'canceled' as ScheduledJobStatus };
}

export async function dispatchDueJobs(limit = 20) {
	await ensureTables();
	const now = new Date().toISOString();
	const dueRows = await db('scheduled_jobs')
		.where('status', 'scheduled')
		.andWhere('run_at', '<=', now)
		.orderBy('run_at', 'asc')
		.limit(limit);

	let completed = 0;
	let failed = 0;

	for (const row of dueRows) {
		try {
			const runningAt = new Date().toISOString();
			await db('scheduled_jobs').where({ id: row.id }).update({ status: 'running', updated_at: runningAt });

			const payload = parseJSON<Record<string, any>>(row.payload, {});
			eventBus.emit({
				id: uuid(),
				event_type: 'updated',
				entity_type: 'ScheduledJob',
				entity_id: row.id,
				summary: `Executing scheduled job: ${row.title}`,
				source: 'scheduler',
				timestamp: runningAt,
				metadata: {
					project_id: row.project_id,
					task_id: row.task_id,
					step_order: row.step_order,
					payload,
				},
			});

			await db('scheduled_jobs').where({ id: row.id }).update({
				status: 'completed',
				executed_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				attempt_count: Number(row.attempt_count || 0) + 1,
				last_error: null,
			});
			completed += 1;
		} catch (err: any) {
			await db('scheduled_jobs').where({ id: row.id }).update({
				status: 'failed',
				updated_at: new Date().toISOString(),
				attempt_count: Number(row.attempt_count || 0) + 1,
				last_error: err?.message || 'Dispatch failed',
			});
			failed += 1;
		}
	}

	if (completed || failed) {
		logger.info(`[scheduler] dispatch cycle: completed=${completed}, failed=${failed}`);
	}
	return { completed, failed, inspected: dueRows.length };
}

export function startScheduler(intervalMs = 60_000) {
	if (schedulerTimer) return;
	schedulerTimer = setInterval(() => {
		dispatchDueJobs().catch((err) => logger.error('[scheduler] dispatch error:', err));
	}, intervalMs);
	logger.info(`[scheduler] started dispatcher (interval=${intervalMs}ms)`);
}

export function stopScheduler() {
	if (!schedulerTimer) return;
	clearInterval(schedulerTimer);
	schedulerTimer = null;
	logger.info('[scheduler] dispatcher stopped');
}
