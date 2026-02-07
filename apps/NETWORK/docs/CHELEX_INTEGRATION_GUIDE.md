# Chelex Network Graph Layer - Technical Integration Guide

**Version**: 1.0  
**Target Stack**: OPAL + CORE-SE + Chelex Schema  
**Purpose**: Enable autonomous agents to navigate, plan, and execute tasks via graph-based reasoning with human-in-the-loop approvals

---

## Executive Summary

This guide describes how to integrate the **Chelex governance layer** into the existing OPAL + CORE-SE infrastructure. The result is an agent task management platform where:

1. **Agents navigate a weighted network graph** of tasks, requirements, and dependencies
2. **Agents propose plans** that humans review before execution
3. **All actions are logged** with full audit trails for compliance
4. **Evidence links to acceptance criteria** for automated verification
5. **The UI visualizes agent reasoning** as graph traversals

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│         CORE-SE UI (Presentation Layer)                 │
│  • React Flow network visualization                     │
│  • Activity Pulse (audit trail timeline)                │
│  • Plan Review Interface (approve/reject)               │
│  • Agent Activity Monitor                               │
│  • Impact Analysis (existing)                           │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP/WebSocket
                      │ opal-client.ts
┌─────────────────────▼───────────────────────────────────┐
│         OPAL_SE + Chelex Schema (Logic Layer)           │
│  • MCP Tools for Agents                                 │
│  • Graph Query Engine                                   │
│  • Plan Approval Workflow                               │
│  • Verification Engine                                  │
│  • Decision Trace Capture                               │
└─────────────────────┬───────────────────────────────────┘
                      │ MCP (WebSocket/JSON-RPC)
┌─────────────────────▼───────────────────────────────────┐
│         Agent Runtime (OpenClaw)                        │
│  • Polls for assigned tasks                             │
│  • Traverses graph to understand context                │
│  • Proposes plans via MCP tools                         │
│  • Executes after approval                              │
│  • Reports completion with evidence                     │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema Extension (OPAL)

### Location
`apps/OPAL_SE/migrations/`

### New Tables

#### 1. `chelex_tasks`
The core entity that can be assigned to humans or agents.

```sql
CREATE TABLE chelex_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'backlog', 
    -- backlog | in_progress | review | done | cancelled
  
  -- Assignment
  assignee_type TEXT, -- 'human' | 'agent' | null
  assignee_id TEXT,   -- user_id or agent_id
  
  -- Context
  context_node_id UUID, -- Links to se_nodes (optional root for agent)
  acceptance_criteria JSONB, -- [{ id, text, required }]
  
  -- Metadata
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Priority/Tags
  priority INTEGER DEFAULT 3, -- 1=highest, 5=lowest
  tags TEXT[]
);

CREATE INDEX idx_chelex_tasks_assignee ON chelex_tasks(assignee_type, assignee_id);
CREATE INDEX idx_chelex_tasks_status ON chelex_tasks(status);
CREATE INDEX idx_chelex_tasks_project ON chelex_tasks(project_id);
```

#### 2. `chelex_plans`
Agent-proposed execution plans awaiting human approval.

```sql
CREATE TABLE chelex_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES chelex_tasks(id) ON DELETE CASCADE,
  
  -- Proposal
  proposed_by TEXT NOT NULL, -- agent_id
  steps JSONB NOT NULL, 
    -- [{ step_number, action, tool, args, expected_output }]
  rationale TEXT NOT NULL, -- Why this approach?
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending | approved | rejected | superseded | executed
  
  -- Graph Context (optional - what nodes will agent traverse)
  planned_traversal JSONB,
    -- { start_node, visited_nodes[], edge_weights }
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  executed_at TIMESTAMP
);

CREATE INDEX idx_chelex_plans_task ON chelex_plans(task_id);
CREATE INDEX idx_chelex_plans_status ON chelex_plans(status);
```

#### 3. `chelex_approvals`
Human review decisions on plans.

```sql
CREATE TABLE chelex_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES chelex_plans(id) ON DELETE CASCADE,
  
  -- Decision
  approved_by TEXT NOT NULL, -- user_id
  decision TEXT NOT NULL, 
    -- approved | rejected | changes_requested
  rationale TEXT,
  requested_changes TEXT, -- If changes_requested
  
  -- Authority
  authority_level TEXT, -- For compliance (e.g., "engineer", "manager", "chief_engineer")
  
  -- Metadata
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chelex_approvals_plan ON chelex_approvals(plan_id);
```

#### 4. `chelex_runs`
Execution logs linking agent actions to plans.

```sql
CREATE TABLE chelex_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES chelex_tasks(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES chelex_plans(id) ON DELETE CASCADE,
  
  -- Execution
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'running',
    -- running | completed | failed | cancelled
  
  -- Logs (references to OPAL tool_runs)
  tool_run_ids UUID[], -- Array of tool_runs.id from OPAL
  
  -- Graph Traversal (actual path taken)
  actual_traversal JSONB,
    -- { nodes_visited[], edges_followed[], deviations_from_plan }
  
  -- Outputs
  artifacts JSONB,
    -- [{ type, name, url, hash, created_at }]
  
  -- Error handling
  error_message TEXT,
  error_stack TEXT
);

CREATE INDEX idx_chelex_runs_task ON chelex_runs(task_id);
CREATE INDEX idx_chelex_runs_plan ON chelex_runs(plan_id);
```

#### 5. `chelex_verifications`
Links run outputs to acceptance criteria.

```sql
CREATE TABLE chelex_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES chelex_tasks(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES chelex_runs(id) ON DELETE CASCADE,
  
  -- Criterion
  criterion_id TEXT NOT NULL, -- From task.acceptance_criteria[].id
  criterion_text TEXT NOT NULL,
  
  -- Evidence
  evidence_type TEXT, -- 'artifact' | 'graph_state' | 'tool_output'
  evidence_ref JSONB, -- Reference to artifact or tool_run
  
  -- Verification
  verified_by TEXT, -- 'auto' or user_id
  verified_at TIMESTAMP DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending | passed | failed | needs_review
  
  notes TEXT
);

CREATE INDEX idx_chelex_verifications_task ON chelex_verifications(task_id);
```

#### 6. `chelex_decision_traces`
Captures agent reasoning (why not just what).

```sql
CREATE TABLE chelex_decision_traces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID REFERENCES chelex_plans(id) ON DELETE CASCADE,
  run_id UUID REFERENCES chelex_runs(id) ON DELETE CASCADE,
  
  -- Decision Point
  timestamp TIMESTAMP DEFAULT NOW(),
  decision_type TEXT NOT NULL,
    -- 'path_selection' | 'tool_choice' | 'parameter_selection' | 'termination'
  
  -- Context
  context_snapshot JSONB,
    -- { current_node, available_edges, graph_state }
  
  -- Reasoning
  options_considered JSONB,
    -- [{ option, reasoning, score }]
  selected_option TEXT,
  reasoning TEXT NOT NULL,
  
  -- Metadata
  confidence FLOAT, -- 0.0 to 1.0
  model_used TEXT  -- e.g., 'claude-sonnet-4-5'
);

CREATE INDEX idx_chelex_decision_traces_plan ON chelex_decision_traces(plan_id);
CREATE INDEX idx_chelex_decision_traces_run ON chelex_decision_traces(run_id);
```

#### 7. `chelex_precedents`
Stores successful patterns for future reference.

```sql
CREATE TABLE chelex_precedents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- What worked?
  task_pattern TEXT NOT NULL, -- e.g., "Update requirement downstream impact"
  plan_template JSONB NOT NULL, -- Reusable plan structure
  
  -- Success metrics
  success_count INTEGER DEFAULT 1,
  failure_count INTEGER DEFAULT 0,
  avg_completion_time INTERVAL,
  
  -- Context
  applicable_node_types TEXT[], -- Which graph node types this works for
  required_tools TEXT[], -- Tools needed for this pattern
  
  -- Metadata
  created_from_run_id UUID REFERENCES chelex_runs(id),
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  
  -- Learning
  refinements JSONB -- History of how this pattern evolved
);
```

---

## Phase 2: MCP Tool Implementation (OPAL)

### Location
`apps/OPAL_SE/src/services/chelexService.ts` (new file)

### Tools for Agents

#### Tool 1: `checkAssignedTasks`
**Purpose**: Agent polls for work.

```typescript
export const checkAssignedTasks = {
  name: 'checkAssignedTasks',
  title: 'Check Assigned Tasks',
  description: 'Retrieve tasks assigned to this agent that are ready for work',
  inputSchema: {
    type: 'object',
    properties: {
      status_filter: {
        type: 'array',
        items: { enum: ['backlog', 'in_progress', 'review'] },
        default: ['backlog', 'in_progress']
      }
    }
  },
  handler: async (args: any, context: MCPContext) => {
    const agentId = context.agentId; // From session
    
    const tasks = await db('chelex_tasks')
      .where({
        assignee_type: 'agent',
        assignee_id: agentId
      })
      .whereIn('status', args.status_filter || ['backlog', 'in_progress'])
      .orderBy('priority', 'asc')
      .orderBy('created_at', 'asc');
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ tasks }, null, 2)
      }]
    };
  }
};
```

#### Tool 2: `getTaskContext`
**Purpose**: Retrieve full graph context for a task.

```typescript
export const getTaskContext = {
  name: 'getTaskContext',
  title: 'Get Task Context',
  description: 'Retrieve task details and related graph nodes for context',
  inputSchema: {
    type: 'object',
    properties: {
      task_id: { type: 'string', format: 'uuid' }
    },
    required: ['task_id']
  },
  handler: async (args: any) => {
    const task = await db('chelex_tasks')
      .where({ id: args.task_id })
      .first();
    
    if (!task) throw new Error('Task not found');
    
    // Get related graph nodes if context_node_id exists
    let graphContext = null;
    if (task.context_node_id) {
      // Use existing SE graph query tools
      graphContext = await seService.getSystemSlice({
        rootNodeId: task.context_node_id,
        depth: 2
      });
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          task,
          graph_context: graphContext,
          acceptance_criteria: task.acceptance_criteria
        }, null, 2)
      }]
    };
  }
};
```

#### Tool 3: `submitPlan`
**Purpose**: Agent proposes execution plan.

```typescript
export const submitPlan = {
  name: 'submitPlan',
  title: 'Submit Execution Plan',
  description: 'Propose a plan for task execution, awaiting human approval',
  inputSchema: {
    type: 'object',
    properties: {
      task_id: { type: 'string', format: 'uuid' },
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            step_number: { type: 'integer' },
            action: { type: 'string' },
            tool: { type: 'string' },
            args: { type: 'object' },
            expected_output: { type: 'string' }
          },
          required: ['step_number', 'action', 'tool']
        }
      },
      rationale: { type: 'string' },
      planned_traversal: { type: 'object' } // Optional graph path
    },
    required: ['task_id', 'steps', 'rationale']
  },
  handler: async (args: any, context: MCPContext) => {
    const planId = uuid();
    
    await db('chelex_plans').insert({
      id: planId,
      task_id: args.task_id,
      proposed_by: context.agentId,
      steps: args.steps,
      rationale: args.rationale,
      planned_traversal: args.planned_traversal || null,
      status: 'pending',
      created_at: new Date()
    });
    
    // Update task status
    await db('chelex_tasks')
      .where({ id: args.task_id })
      .update({ status: 'review', updated_at: new Date() });
    
    // Trigger notification (optional - could use OPAL notifications)
    await notifyHumans({
      type: 'plan_submitted',
      task_id: args.task_id,
      plan_id: planId,
      agent_id: context.agentId
    });
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          plan_id: planId,
          status: 'pending_approval',
          message: 'Plan submitted successfully, awaiting human review'
        })
      }]
    };
  }
};
```

#### Tool 4: `checkPlanStatus`
**Purpose**: Agent checks if plan was approved.

```typescript
export const checkPlanStatus = {
  name: 'checkPlanStatus',
  title: 'Check Plan Status',
  description: 'Check if a submitted plan has been approved, rejected, or needs changes',
  inputSchema: {
    type: 'object',
    properties: {
      plan_id: { type: 'string', format: 'uuid' }
    },
    required: ['plan_id']
  },
  handler: async (args: any) => {
    const plan = await db('chelex_plans')
      .where({ id: args.plan_id })
      .first();
    
    const approvals = await db('chelex_approvals')
      .where({ plan_id: args.plan_id })
      .orderBy('timestamp', 'desc');
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          plan_status: plan.status,
          approvals: approvals,
          can_execute: plan.status === 'approved'
        })
      }]
    };
  }
};
```

#### Tool 5: `startRun`
**Purpose**: Agent begins execution after approval.

```typescript
export const startRun = {
  name: 'startRun',
  title: 'Start Task Execution',
  description: 'Begin executing an approved plan',
  inputSchema: {
    type: 'object',
    properties: {
      task_id: { type: 'string', format: 'uuid' },
      plan_id: { type: 'string', format: 'uuid' }
    },
    required: ['task_id', 'plan_id']
  },
  handler: async (args: any, context: MCPContext) => {
    // Verify plan is approved
    const plan = await db('chelex_plans')
      .where({ id: args.plan_id })
      .first();
    
    if (plan.status !== 'approved') {
      throw new Error(`Plan status is ${plan.status}, must be approved`);
    }
    
    const runId = uuid();
    
    await db('chelex_runs').insert({
      id: runId,
      task_id: args.task_id,
      plan_id: args.plan_id,
      status: 'running',
      started_at: new Date()
    });
    
    // Update task status
    await db('chelex_tasks')
      .where({ id: args.task_id })
      .update({ status: 'in_progress', updated_at: new Date() });
    
    // Update plan status
    await db('chelex_plans')
      .where({ id: args.plan_id })
      .update({ status: 'executed', executed_at: new Date() });
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          run_id: runId,
          status: 'running',
          message: 'Execution started, log all actions to this run_id'
        })
      }]
    };
  }
};
```

#### Tool 6: `logDecision`
**Purpose**: Capture agent reasoning during execution.

```typescript
export const logDecision = {
  name: 'logDecision',
  title: 'Log Decision Trace',
  description: 'Record why the agent made a specific decision during execution',
  inputSchema: {
    type: 'object',
    properties: {
      run_id: { type: 'string', format: 'uuid' },
      decision_type: { 
        enum: ['path_selection', 'tool_choice', 'parameter_selection', 'termination'] 
      },
      context_snapshot: { type: 'object' },
      options_considered: { type: 'array' },
      selected_option: { type: 'string' },
      reasoning: { type: 'string' },
      confidence: { type: 'number', minimum: 0, maximum: 1 }
    },
    required: ['run_id', 'decision_type', 'reasoning']
  },
  handler: async (args: any) => {
    await db('chelex_decision_traces').insert({
      id: uuid(),
      run_id: args.run_id,
      decision_type: args.decision_type,
      context_snapshot: args.context_snapshot || {},
      options_considered: args.options_considered || [],
      selected_option: args.selected_option,
      reasoning: args.reasoning,
      confidence: args.confidence || 0.8,
      timestamp: new Date()
    });
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ logged: true })
      }]
    };
  }
};
```

#### Tool 7: `completeTask`
**Purpose**: Agent reports completion with evidence.

```typescript
export const completeTask = {
  name: 'completeTask',
  title: 'Complete Task',
  description: 'Mark task as complete and provide evidence for verification',
  inputSchema: {
    type: 'object',
    properties: {
      task_id: { type: 'string', format: 'uuid' },
      run_id: { type: 'string', format: 'uuid' },
      artifacts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            name: { type: 'string' },
            url: { type: 'string' },
            hash: { type: 'string' }
          }
        }
      },
      actual_traversal: { type: 'object' }
    },
    required: ['task_id', 'run_id', 'artifacts']
  },
  handler: async (args: any) => {
    // Update run
    await db('chelex_runs')
      .where({ id: args.run_id })
      .update({
        status: 'completed',
        completed_at: new Date(),
        artifacts: args.artifacts,
        actual_traversal: args.actual_traversal || null
      });
    
    // Auto-verify acceptance criteria
    const task = await db('chelex_tasks')
      .where({ id: args.task_id })
      .first();
    
    const criteria = task.acceptance_criteria || [];
    
    for (const criterion of criteria) {
      // Simple auto-verification (can be made more sophisticated)
      await db('chelex_verifications').insert({
        id: uuid(),
        task_id: args.task_id,
        run_id: args.run_id,
        criterion_id: criterion.id,
        criterion_text: criterion.text,
        evidence_type: 'artifact',
        evidence_ref: { artifacts: args.artifacts },
        verified_by: 'auto',
        verified_at: new Date(),
        status: 'pending' // Human can review
      });
    }
    
    // Update task status
    await db('chelex_tasks')
      .where({ id: args.task_id })
      .update({ status: 'done', updated_at: new Date() });
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          task_status: 'done',
          verifications_created: criteria.length,
          message: 'Task marked complete, verifications pending review'
        })
      }]
    };
  }
};
```

#### Tool 8: `queryPrecedents`
**Purpose**: Search for similar past tasks and patterns.

```typescript
export const queryPrecedents = {
  name: 'queryPrecedents',
  title: 'Query Precedents',
  description: 'Find similar past tasks and successful patterns',
  inputSchema: {
    type: 'object',
    properties: {
      task_pattern: { type: 'string' },
      node_types: { type: 'array', items: { type: 'string' } }
    },
    required: ['task_pattern']
  },
  handler: async (args: any) => {
    // Simple text search (could use vector similarity)
    const precedents = await db('chelex_precedents')
      .where('task_pattern', 'ilike', `%${args.task_pattern}%`)
      .orderBy('success_count', 'desc')
      .limit(5);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          precedents,
          message: `Found ${precedents.length} similar patterns`
        })
      }]
    };
  }
};
```

---

## Phase 3: Backend API Routes (OPAL)

### Location
`apps/OPAL_SE/src/routes/chelex-admin.ts` (new file)

These routes support the frontend UI for human interaction.

```typescript
import express from 'express';
import { db } from '../db';

const router = express.Router();

// GET /api/chelex/tasks - List tasks with filters
router.get('/tasks', async (req, res) => {
  const { assignee_type, status, project_id } = req.query;
  
  let query = db('chelex_tasks');
  
  if (assignee_type) query = query.where({ assignee_type });
  if (status) query = query.where({ status });
  if (project_id) query = query.where({ project_id });
  
  const tasks = await query.orderBy('created_at', 'desc');
  
  res.json({ tasks });
});

// GET /api/chelex/plans/pending - Plans awaiting approval
router.get('/plans/pending', async (req, res) => {
  const plans = await db('chelex_plans')
    .where({ status: 'pending' })
    .join('chelex_tasks', 'chelex_plans.task_id', 'chelex_tasks.id')
    .select('chelex_plans.*', 'chelex_tasks.title as task_title')
    .orderBy('chelex_plans.created_at', 'asc');
  
  res.json({ plans });
});

// POST /api/chelex/approvals - Approve/reject a plan
router.post('/approvals', async (req, res) => {
  const { plan_id, decision, rationale, approved_by, authority_level } = req.body;
  
  // Validate decision
  if (!['approved', 'rejected', 'changes_requested'].includes(decision)) {
    return res.status(400).json({ error: 'Invalid decision' });
  }
  
  // Create approval record
  await db('chelex_approvals').insert({
    id: uuid(),
    plan_id,
    approved_by,
    decision,
    rationale,
    authority_level: authority_level || 'engineer',
    timestamp: new Date()
  });
  
  // Update plan status
  await db('chelex_plans')
    .where({ id: plan_id })
    .update({
      status: decision === 'approved' ? 'approved' : 'rejected',
      approved_at: decision === 'approved' ? new Date() : null
    });
  
  // If approved, update task status back to in_progress
  if (decision === 'approved') {
    const plan = await db('chelex_plans').where({ id: plan_id }).first();
    await db('chelex_tasks')
      .where({ id: plan.task_id })
      .update({ status: 'in_progress', updated_at: new Date() });
  }
  
  res.json({ success: true, decision });
});

// GET /api/chelex/runs/:task_id - Get execution history
router.get('/runs/:task_id', async (req, res) => {
  const runs = await db('chelex_runs')
    .where({ task_id: req.params.task_id })
    .orderBy('started_at', 'desc');
  
  // Enrich with decision traces
  for (const run of runs) {
    run.decision_traces = await db('chelex_decision_traces')
      .where({ run_id: run.id })
      .orderBy('timestamp', 'asc');
  }
  
  res.json({ runs });
});

// GET /api/chelex/activity - Activity feed for audit
router.get('/activity', async (req, res) => {
  // Aggregate events from tasks, plans, approvals, runs
  const taskEvents = await db('chelex_tasks')
    .select('id', 'title', 'status', 'created_at as timestamp', 
            db.raw('? as event_type', ['task_created']))
    .orderBy('created_at', 'desc')
    .limit(50);
  
  const planEvents = await db('chelex_plans')
    .select('id', 'task_id', 'status', 'created_at as timestamp',
            db.raw('? as event_type', ['plan_submitted']))
    .orderBy('created_at', 'desc')
    .limit(50);
  
  const approvalEvents = await db('chelex_approvals')
    .select('id', 'plan_id', 'decision', 'timestamp',
            db.raw('? as event_type', ['plan_decision']))
    .orderBy('timestamp', 'desc')
    .limit(50);
  
  // Merge and sort
  const allEvents = [...taskEvents, ...planEvents, ...approvalEvents]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100);
  
  res.json({ events: allEvents });
});

export default router;
```

---

## Phase 4: Frontend Integration (CORE-SE)

### A. Update `opal-client.ts`

Location: `apps/CORE_UI/frontend/src/lib/opal-client.ts`

Add Chelex-specific API methods:

```typescript
// Chelex Task Management
export async function getChelexTasks(filters?: {
  assignee_type?: string;
  status?: string;
  project_id?: string;
}) {
  const params = new URLSearchParams(filters as any);
  const response = await fetch(`${OPAL_BASE_URL}/api/chelex/tasks?${params}`);
  return response.json();
}

export async function getPendingPlans() {
  const response = await fetch(`${OPAL_BASE_URL}/api/chelex/plans/pending`);
  return response.json();
}

export async function approvePlan(approval: {
  plan_id: string;
  decision: 'approved' | 'rejected' | 'changes_requested';
  rationale?: string;
  approved_by: string;
  authority_level?: string;
}) {
  const response = await fetch(`${OPAL_BASE_URL}/api/chelex/approvals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(approval)
  });
  return response.json();
}

export async function getTaskRuns(taskId: string) {
  const response = await fetch(`${OPAL_BASE_URL}/api/chelex/runs/${taskId}`);
  return response.json();
}

export async function getChelexActivity() {
  const response = await fetch(`${OPAL_BASE_URL}/api/chelex/activity`);
  return response.json();
}
```

### B. Create `AgentActivityGraph.tsx`

Location: `apps/CORE_UI/frontend/src/components/AgentActivityGraph.tsx`

This visualizes agent task execution as a network graph.

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { getChelexTasks, getTaskRuns } from '@/lib/opal-client';

const nodeTypes = {
  task: TaskNode,
  decision: DecisionNode,
  verification: VerificationNode,
};

function TaskNode({ data }: any) {
  const statusColors = {
    backlog: 'bg-gray-200',
    in_progress: 'bg-blue-500 text-white',
    review: 'bg-yellow-500 text-white',
    done: 'bg-green-500 text-white',
  };
  
  return (
    <div className={`px-4 py-2 rounded-lg border-2 ${statusColors[data.status]}`}>
      <div className="font-bold">{data.title}</div>
      <div className="text-xs">Assigned: {data.assignee_id}</div>
    </div>
  );
}

function DecisionNode({ data }: any) {
  return (
    <div className="px-3 py-2 rounded bg-purple-100 border border-purple-400">
      <div className="text-xs font-mono">{data.decision_type}</div>
      <div className="text-xs text-gray-600">{data.reasoning}</div>
    </div>
  );
}

function VerificationNode({ data }: any) {
  const statusColors = {
    pending: 'border-gray-400',
    passed: 'border-green-500 bg-green-50',
    failed: 'border-red-500 bg-red-50',
  };
  
  return (
    <div className={`px-3 py-2 rounded border-2 ${statusColors[data.status]}`}>
      <div className="text-xs">{data.criterion_text}</div>
    </div>
  );
}

export default function AgentActivityGraph({ projectId }: { projectId: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadGraphData();
  }, [projectId]);
  
  async function loadGraphData() {
    setLoading(true);
    
    const { tasks } = await getChelexTasks({ project_id: projectId });
    
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    
    // Layout tasks vertically
    tasks.forEach((task: any, idx: number) => {
      newNodes.push({
        id: task.id,
        type: 'task',
        position: { x: 100, y: idx * 150 },
        data: task,
      });
      
      // If task has runs, fetch decision traces
      if (task.status !== 'backlog') {
        fetchTaskRunsAndDecisions(task.id, idx);
      }
    });
    
    setNodes(newNodes);
    setLoading(false);
  }
  
  async function fetchTaskRunsAndDecisions(taskId: string, taskIdx: number) {
    const { runs } = await getTaskRuns(taskId);
    
    runs.forEach((run: any, runIdx: number) => {
      run.decision_traces?.forEach((trace: any, traceIdx: number) => {
        const decisionNodeId = `decision-${run.id}-${traceIdx}`;
        
        setNodes((nds) => [
          ...nds,
          {
            id: decisionNodeId,
            type: 'decision',
            position: { x: 400 + (runIdx * 200), y: taskIdx * 150 + (traceIdx * 60) },
            data: trace,
          }
        ]);
        
        setEdges((eds) => [
          ...eds,
          {
            id: `${taskId}-${decisionNodeId}`,
            source: taskId,
            target: decisionNodeId,
            animated: true,
            style: { stroke: '#9333ea' },
          }
        ]);
      });
    });
  }
  
  if (loading) return <div>Loading agent activity...</div>;
  
  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
```

### C. Create Plan Review Interface

Location: `apps/CORE_UI/frontend/src/components/PlanReviewPanel.tsx`

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { getPendingPlans, approvePlan } from '@/lib/opal-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export default function PlanReviewPanel() {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [rationale, setRationale] = useState('');
  
  useEffect(() => {
    loadPendingPlans();
    const interval = setInterval(loadPendingPlans, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);
  
  async function loadPendingPlans() {
    const { plans: pendingPlans } = await getPendingPlans();
    setPlans(pendingPlans);
  }
  
  async function handleDecision(decision: 'approved' | 'rejected' | 'changes_requested') {
    if (!selectedPlan) return;
    
    await approvePlan({
      plan_id: selectedPlan.id,
      decision,
      rationale,
      approved_by: 'current_user_id', // TODO: Get from auth context
      authority_level: 'engineer',
    });
    
    // Refresh list
    await loadPendingPlans();
    setSelectedPlan(null);
    setRationale('');
  }
  
  return (
    <div className="flex gap-4">
      {/* Plan List */}
      <div className="w-1/3">
        <h2 className="text-lg font-bold mb-4">Pending Approvals ({plans.length})</h2>
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`p-3 mb-2 cursor-pointer hover:bg-gray-50 ${
              selectedPlan?.id === plan.id ? 'border-blue-500 border-2' : ''
            }`}
            onClick={() => setSelectedPlan(plan)}
          >
            <div className="font-bold">{plan.task_title}</div>
            <div className="text-xs text-gray-600">
              Proposed by: {plan.proposed_by}
            </div>
            <div className="text-xs text-gray-600">
              {new Date(plan.created_at).toLocaleString()}
            </div>
          </Card>
        ))}
      </div>
      
      {/* Plan Details */}
      <div className="w-2/3">
        {selectedPlan ? (
          <>
            <h2 className="text-lg font-bold mb-4">Plan Review</h2>
            
            <Card className="p-4 mb-4">
              <h3 className="font-bold mb-2">Rationale</h3>
              <p className="text-sm text-gray-700">{selectedPlan.rationale}</p>
            </Card>
            
            <Card className="p-4 mb-4">
              <h3 className="font-bold mb-2">Execution Steps</h3>
              <ol className="list-decimal list-inside">
                {selectedPlan.steps.map((step: any, idx: number) => (
                  <li key={idx} className="text-sm mb-2">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                      {step.tool}
                    </span>
                    {' '}{step.action}
                  </li>
                ))}
              </ol>
            </Card>
            
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">
                Approval Rationale (optional)
              </label>
              <Textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="Explain your decision..."
                rows={3}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => handleDecision('approved')}
                className="bg-green-600 hover:bg-green-700"
              >
                ✓ Approve
              </Button>
              <Button
                onClick={() => handleDecision('changes_requested')}
                variant="outline"
              >
                Request Changes
              </Button>
              <Button
                onClick={() => handleDecision('rejected')}
                className="bg-red-600 hover:bg-red-700"
              >
                ✗ Reject
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 mt-8">
            Select a plan to review
          </div>
        )}
      </div>
    </div>
  );
}
```

### D. Create Activity Pulse Page

Location: `apps/CORE_UI/frontend/src/app/chelex/activity/page.tsx`

```typescript
import { getChelexActivity } from '@/lib/opal-client';
import ActivityTimeline from '@/components/ActivityTimeline';

export default async function ChelexActivityPage() {
  const { events } = await getChelexActivity();
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Chelex Activity Pulse</h1>
      <ActivityTimeline events={events} />
    </div>
  );
}
```

---

## Phase 5: Agent Implementation (OpenClaw)

### OpenClaw Chelex Skill

Location: `OpenClaw/skills/openclaw_worker.ts` (conceptual)

```typescript
import { MCPClient } from '@modelcontextprotocol/sdk/client/index.js';

export class ChelexWorkerSkill {
  private mcpClient: MCPClient;
  private agentId: string;
  
  constructor(mcpClient: MCPClient, agentId: string) {
    this.mcpClient = mcpClient;
    this.agentId = agentId;
  }
  
  async pollForWork() {
    // Check for assigned tasks
    const result = await this.mcpClient.callTool({
      name: 'checkAssignedTasks',
      arguments: {
        status_filter: ['backlog', 'in_progress']
      }
    });
    
    const { tasks } = JSON.parse(result.content[0].text);
    
    if (tasks.length === 0) {
      console.log('No tasks assigned, sleeping...');
      return;
    }
    
    // Pick highest priority task
    const task = tasks[0];
    await this.processTask(task);
  }
  
  async processTask(task: any) {
    console.log(`Processing task: ${task.title}`);
    
    // 1. Get full context
    const contextResult = await this.mcpClient.callTool({
      name: 'getTaskContext',
      arguments: { task_id: task.id }
    });
    
    const context = JSON.parse(contextResult.content[0].text);
    
    // 2. Query precedents for similar tasks
    const precedentResult = await this.mcpClient.callTool({
      name: 'queryPrecedents',
      arguments: { task_pattern: task.title }
    });
    
    const { precedents } = JSON.parse(precedentResult.content[0].text);
    
    // 3. Generate plan using Claude
    const plan = await this.generatePlan(task, context, precedents);
    
    // 4. Submit plan for approval
    const planResult = await this.mcpClient.callTool({
      name: 'submitPlan',
      arguments: {
        task_id: task.id,
        steps: plan.steps,
        rationale: plan.rationale
      }
    });
    
    const { plan_id } = JSON.parse(planResult.content[0].text);
    
    console.log(`Plan submitted: ${plan_id}, awaiting approval...`);
    
    // 5. Wait for approval (poll)
    await this.waitForApproval(plan_id, task);
  }
  
  async waitForApproval(planId: string, task: any) {
    const maxWait = 60 * 60 * 1000; // 1 hour
    const pollInterval = 30000; // 30 seconds
    let elapsed = 0;
    
    while (elapsed < maxWait) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      elapsed += pollInterval;
      
      const statusResult = await this.mcpClient.callTool({
        name: 'checkPlanStatus',
        arguments: { plan_id: planId }
      });
      
      const { plan_status, can_execute } = JSON.parse(statusResult.content[0].text);
      
      if (can_execute) {
        console.log('Plan approved! Starting execution...');
        await this.executePlan(planId, task);
        return;
      } else if (plan_status === 'rejected') {
        console.log('Plan rejected, stopping.');
        return;
      }
    }
    
    console.log('Approval timeout, task abandoned.');
  }
  
  async executePlan(planId: string, task: any) {
    // Start run
    const runResult = await this.mcpClient.callTool({
      name: 'startRun',
      arguments: {
        task_id: task.id,
        plan_id: planId
      }
    });
    
    const { run_id } = JSON.parse(runResult.content[0].text);
    
    // Execute steps (simplified - actual implementation would execute each step)
    const artifacts = await this.executeSteps(run_id, task);
    
    // Complete task
    await this.mcpClient.callTool({
      name: 'completeTask',
      arguments: {
        task_id: task.id,
        run_id: run_id,
        artifacts: artifacts
      }
    });
    
    console.log(`Task ${task.title} completed!`);
  }
  
  async executeSteps(runId: string, task: any): Promise<any[]> {
    // This is where the agent would actually do the work
    // For each step, log decisions
    
    await this.mcpClient.callTool({
      name: 'logDecision',
      arguments: {
        run_id: runId,
        decision_type: 'path_selection',
        reasoning: 'Chose to update requirement via querySystemModel first',
        confidence: 0.9
      }
    });
    
    // Execute actual work...
    // Return artifacts
    return [
      {
        type: 'file',
        name: 'updated_requirement.json',
        url: 'https://storage.example.com/...',
        hash: 'sha256:...'
      }
    ];
  }
  
  async generatePlan(task: any, context: any, precedents: any[]): Promise<any> {
    // Use Claude API to generate plan based on task, context, precedents
    // This would call the Anthropic API directly or use a local LLM
    
    return {
      steps: [
        {
          step_number: 1,
          action: 'Query system model for related requirements',
          tool: 'querySystemModel',
          args: { type: 'Requirement' }
        },
        {
          step_number: 2,
          action: 'Update requirement text',
          tool: 'updateNode',
          args: { node_id: '...', updates: {} }
        }
      ],
      rationale: 'Based on precedent #42, updating via direct node modification is fastest approach'
    };
  }
}

// Main loop
async function main() {
  const client = new MCPClient({
    name: 'OpenClaw',
    version: '1.0.0'
  }, {
    capabilities: {}
  });
  
  await client.connect(new WebSocketTransport('ws://localhost:7788'));
  
  const worker = new OpenClawWorkerSkill(client, 'openclaw-001');
  
  // Poll every 30 seconds
  setInterval(() => {
    worker.pollForWork();
  }, 30000);
}
```

---

## Phase 6: Testing & Validation

### Test Scenario 1: End-to-End Task Flow

```
1. Admin assigns task to agent:
   { title: "Update HALO pressure requirement", assignee_type: "agent", assignee_id: "openclaw-001" }

2. OpenClaw polls and finds task
   MCP: checkAssignedTasks() → returns task

3. OpenClaw gets context
   MCP: getTaskContext(task_id) → returns task + graph

4. OpenClaw queries precedents
   MCP: queryPrecedents("Update requirement") → returns past patterns

5. OpenClaw submits plan
   MCP: submitPlan(steps) → status: pending
   
6. Admin reviews plan in UI
   POST /api/chelex/approvals { decision: "approved" }

7. OpenClaw detects approval
   MCP: checkPlanStatus(plan_id) → status: approved

8. OpenClaw executes
   MCP: startRun()
   MCP: logDecision()
   MCP: completeTask() ...
   MCP: logDecision() for each decision point
   MCP: completeTask(task_id, run_id, artifacts)

10. Task appears as DONE in UI
    UI auto-refreshes, shows completed task with verification
```

### Test Scenario 2: Plan Rejection

```
1-5. Same as above
6. Human reviews and rejects
   POST /api/chelex/approvals
   { plan_id, decision: "rejected", rationale: "Wrong approach" }

7. OpenClaw detects rejection
   
8. OpenClaw abandons task (or could retry with new plan)
```

### Validation Checklist

- [ ] Tasks can be created via UI
- [ ] Agents can poll for assigned tasks
- [ ] Agents can retrieve graph context
- [ ] Agents can submit plans
- [ ] Humans can approve/reject plans in UI
- [ ] Agents can detect approval status
- [ ] Agents can execute after approval
- [ ] Decision traces are captured during execution
- [ ] Task completion creates verification records
- [ ] UI shows full audit trail (Activity Pulse)
- [ ] Graph visualization shows task → plan → run flow
- [ ] Precedents are stored and queryable

---

## Phase 7: Advanced Features (Future)

### A. Autonomous Verification
- Agents auto-verify acceptance criteria using tool outputs
- Flag criteria that need human review
- Learn from human verification patterns

### B. Multi-Agent Coordination
- Tasks can be split across multiple agents
- Agents negotiate via MCP messaging
- Coordination graph shows agent interactions

### C. Adaptive Planning
- Agents refine plans based on execution feedback
- If step fails, agent re-plans and re-submits
- Track plan evolution over time

### D. Precedent Learning
- Automatically create precedents from successful runs
- Agents suggest precedent-based plans ("Last time we did X")
- Precedent success/failure tracking

### E. Graph-Native Reasoning
- Agents traverse graph to understand dependencies
- "What nodes are affected by this change?"
- "What's the shortest path to verification?"

---

## Deployment Checklist

### Pre-Deployment
- [ ] All migrations run successfully
- [ ] OPAL MCP tools tested via MCP Inspector
- [ ] Frontend components render correctly
- [ ] API routes return expected data
- [ ] Agent can connect and authenticate

### Production Setup
- [ ] PostgreSQL configured (not SQLite)
- [ ] Backups enabled for Chelex tables
- [ ] OPAL running on persistent server (not localhost)
- [ ] Frontend deployed to Vercel/production
- [ ] Agent credentials secured (not hardcoded)

### Monitoring
- [ ] Log aggregation for agent actions
- [ ] Alert on plan approval timeout
- [ ] Dashboard for task completion rate
- [ ] Graph complexity metrics (nodes, edges, depth)

---

## Conclusion

This integration guide provides the blueprint for connecting OPAL (execution), CORE-SE (visualization), and Chelex (governance) into a unified agent task management platform.

**Key Achievements:**
- Agents work on tasks assigned to them via graph navigation
- Humans approve plans before execution (compliance)
- Full audit trail of decisions and actions
- Evidence-based verification of task completion
- Graph-first UI for understanding system complexity

**Next Steps:**
1. Implement Phase 1 (database schema) in OPAL
2. Implement Phase 2 (MCP tools) in OPAL
3. Implement Phase 3 (API routes) in OPAL
4. Implement Phase 4 (UI components) in CORE-SE
5. Implement Phase 5 (agent worker) in OpenClaw
6. Test end-to-end with real task

---

**Questions?** Consult:
- OPAL docs: `docs/connect/`
- CORE-SE network integration report (attached)
- MCP spec: https://modelcontextprotocol.io/
