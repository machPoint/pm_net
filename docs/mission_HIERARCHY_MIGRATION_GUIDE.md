# Chelex Hierarchical Architecture Migration Guide
## From Task-Centric to Mission/Program/Project Structure

**Version**: 2.0  
**Target**: AI Coder implementing migration  
**Current System**: OpenClaw task execution with plans, gates, and runs (working well!)  
**Goal**: Add strategic hierarchy ABOVE existing execution layer, not replace it

---

## Executive Summary for AI Coder

**What you've built is excellent.** The current task execution system with plans, gates, runs, and detailed execution tracking is exactly what we need at the execution layer. **We're not replacing it—we're adding strategic layers above it.**

**The shift**: Your current "Task" (like "Spam Detection") is actually a **Work Package** in the new hierarchy. We're adding 4 levels above it: Mission → Program → Project → Phase, then keeping everything you've built below that.

**Why**: Users think in strategic terms ("Launch a SaaS company") not tactical terms ("Run spam detection"). By adding the hierarchy, we make the product useful for long-term planning while keeping your excellent execution tracking.

---

## Current System (What Exists)

### Current Hierarchy (2 Levels)
```
Task (e.g., "Spam Detection")
├── Plan (4 steps, approved)
├── Gate (approval checkpoint)
├── Run (execution with logs)
├── Acceptance Criteria (1/1 passed)
└── Deliverables (report file)
```

### What Works Great
✅ **Plan approval workflow** - User approves plan, agent executes  
✅ **Execution tracking** - Detailed step-by-step output with token counts  
✅ **Tool usage visibility** - Shows web_read, browser, gateway calls  
✅ **Gate approvals** - Checkpoint before execution  
✅ **Run logs** - Complete session history  
✅ **Deliverables** - File outputs with location  
✅ **Acceptance criteria** - Pass/fail verification  

**Keep all of this. It's solid.**

---

## New System (Target Architecture)

### New Hierarchy (6 Levels)
```
1.0 Mission (Strategic Intent, 1-3 years)
└── 1.1 Program (Major Initiative, 3-12 months)
    └── 1.1.1 Project (Bounded Deliverable, 1-4 months)
        └── 1.1.1.1 Phase (Stage with Gate, 2-6 weeks)
            └── 1.1.1.1.1 Work Package (What you call "Task" today)
                ├── Plan (keep existing)
                ├── Gate (keep existing)
                ├── Run (keep existing)
                └── 1.1.1.1.1.1 Task (individual steps, mostly hidden)
```

### What Changes
- **Add 4 new levels above** your current "Task"
- **Rename** current "Task" to "Work Package"
- **Reframe** current "Plan Steps" as "Tasks" (atomic actions)
- **Keep** all existing execution logic (plans, gates, runs, criteria)

---

## Migration Strategy

### Phase 1: Database Schema Extension
**Add new tables, don't modify existing ones yet.**

#### New Tables

```sql
-- Level 0: Mission
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wbs_number TEXT UNIQUE, -- '1.0', '2.0', '3.0'
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planning', -- 'planning' | 'active' | 'on_hold' | 'complete' | 'cancelled'
  
  -- Success criteria
  success_criteria JSONB, -- [{ metric, target, current }]
  
  -- Ownership
  created_by TEXT NOT NULL,
  owner_id TEXT,
  
  -- Timeline
  start_date DATE,
  target_completion DATE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Level 1: Program
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  wbs_number TEXT UNIQUE, -- '1.1', '1.2', '2.1'
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planning',
  
  -- Planning
  objectives TEXT,
  budget_allocated DECIMAL(12,2),
  budget_spent DECIMAL(12,2) DEFAULT 0,
  
  -- Timeline
  start_date DATE,
  end_date DATE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Level 2: Project
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  wbs_number TEXT UNIQUE, -- '1.1.1', '1.1.2', '2.1.1'
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planning',
  
  -- Project plan (phases breakdown)
  project_plan JSONB, -- { phases: [...], timeline, resources, risks }
  
  -- Deliverables expected
  deliverables JSONB, -- [{ name, description, acceptance_criteria }]
  
  -- Timeline
  start_date DATE,
  end_date DATE,
  
  -- Resources
  assigned_team JSONB, -- [{ user_id, role }]
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Level 3: Phase (with Gates)
CREATE TABLE phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  wbs_number TEXT UNIQUE, -- '1.1.1.1', '1.1.1.2'
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'not_started', -- 'not_started' | 'in_progress' | 'at_gate' | 'complete' | 'cancelled'
  
  -- Gate review
  gate_criteria JSONB, -- [{ criterion, weight, status }]
  gate_review JSONB, -- { deliverables_verified, issues, decision, reviewed_by, reviewed_at }
  
  -- Timeline
  start_date DATE,
  end_date DATE,
  estimated_duration_days INTEGER,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Level 4: Work Package (your current "Task")
CREATE TABLE work_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_id UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  wbs_number TEXT UNIQUE, -- '1.1.1.1.1', '1.1.1.1.2'
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'not_started',
  
  -- Assignment
  assignee_type TEXT, -- 'human' | 'agent'
  assignee_id TEXT,
  
  -- Estimation
  estimated_hours DECIMAL(6,2),
  actual_hours DECIMAL(6,2),
  
  -- Links to existing execution system
  legacy_task_id UUID, -- Reference to your current "tasks" table during migration
  
  -- Acceptance criteria (keep your existing pattern)
  acceptance_criteria JSONB,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Level 5: Task (your current "Plan Steps")
-- NOTE: You likely already have this in your plans JSONB
-- But we can formalize it as a table if needed
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_package_id UUID NOT NULL REFERENCES work_packages(id) ON DELETE CASCADE,
  wbs_number TEXT UNIQUE, -- '1.1.1.1.1.1', '1.1.1.1.1.2'
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'not_started',
  
  -- Execution detail
  tool_name TEXT, -- 'web_read', 'text_generation', etc.
  tool_args JSONB,
  tokens_used INTEGER,
  
  -- Results
  output JSONB,
  error TEXT,
  
  -- Links to existing run system
  run_id UUID, -- Reference to your existing runs
  
  -- Metadata
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);
```

#### WBS Numbering Function
```sql
-- Helper function to generate next WBS number
CREATE OR REPLACE FUNCTION generate_wbs_number(
  parent_wbs TEXT,
  level_type TEXT
) RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  new_wbs TEXT;
BEGIN
  IF parent_wbs IS NULL THEN
    -- Top level (Mission)
    SELECT COALESCE(MAX(CAST(SUBSTRING(wbs_number FROM '^[0-9]+') AS INTEGER)), 0) + 1
    INTO next_number
    FROM missions;
    RETURN next_number || '.0';
  ELSE
    -- Child level
    -- Find max child number at this level
    -- e.g., for parent '1.1', find max of '1.1.1', '1.1.2', etc.
    CASE level_type
      WHEN 'program' THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(wbs_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
        INTO next_number
        FROM programs
        WHERE wbs_number LIKE parent_wbs || '.%'
          AND wbs_number NOT LIKE parent_wbs || '.%.%';
      WHEN 'project' THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(wbs_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
        INTO next_number
        FROM projects
        WHERE wbs_number LIKE parent_wbs || '.%'
          AND wbs_number NOT LIKE parent_wbs || '.%.%';
      -- Add other levels as needed
    END CASE;
    
    RETURN parent_wbs || '.' || next_number;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

---

### Phase 2: Data Migration

#### Step 1: Create Default Mission/Program/Project for Existing Tasks

**Context**: Your existing tasks (like "Spam Detection") need to live somewhere in the hierarchy.

**Strategy**: Create a default structure and migrate tasks into it.

```sql
-- Create default mission
INSERT INTO missions (id, wbs_number, title, description, status, created_by)
VALUES (
  gen_random_uuid(),
  '1.0',
  'Operational Tasks',
  'Default mission for existing tasks during migration',
  'active',
  'system'
) RETURNING id INTO @default_mission_id;

-- Create default program
INSERT INTO programs (id, mission_id, wbs_number, title, description, status)
VALUES (
  gen_random_uuid(),
  @default_mission_id,
  '1.1',
  'General Operations',
  'Default program for existing tasks',
  'active'
) RETURNING id INTO @default_program_id;

-- Create default project
INSERT INTO projects (id, program_id, wbs_number, title, description, status)
VALUES (
  gen_random_uuid(),
  @default_program_id,
  '1.1.1',
  'Ongoing Tasks',
  'Default project for existing tasks',
  'active'
) RETURNING id INTO @default_project_id;

-- Create default phase
INSERT INTO phases (id, project_id, wbs_number, title, description, status)
VALUES (
  gen_random_uuid(),
  @default_project_id,
  '1.1.1.1',
  'Execution Phase',
  'Default phase for existing tasks',
  'in_progress'
) RETURNING id INTO @default_phase_id;
```

#### Step 2: Migrate Existing Tasks to Work Packages

**Assumption**: You have a `tasks` table currently. If it's named differently, adjust accordingly.

```sql
-- Migrate existing tasks to work_packages
INSERT INTO work_packages (
  phase_id,
  wbs_number,
  title,
  description,
  status,
  assignee_type,
  assignee_id,
  estimated_hours,
  acceptance_criteria,
  legacy_task_id,
  created_at,
  metadata
)
SELECT
  @default_phase_id,
  '1.1.1.1.' || ROW_NUMBER() OVER (ORDER BY created_at), -- Generate WBS
  title,
  description,
  status,
  assignee_type,
  assignee_id,
  estimated_hours,
  acceptance_criteria,
  id, -- Keep reference to original task
  created_at,
  metadata
FROM tasks; -- Your current tasks table
```

#### Step 3: Verify Migration

```sql
-- Check migration results
SELECT 
  COUNT(*) as total_work_packages,
  COUNT(DISTINCT legacy_task_id) as migrated_tasks
FROM work_packages;

-- Verify WBS hierarchy
SELECT 
  m.wbs_number as mission,
  m.title as mission_title,
  pr.wbs_number as program,
  pr.title as program_title,
  pj.wbs_number as project,
  pj.title as project_title,
  ph.wbs_number as phase,
  ph.title as phase_title,
  COUNT(wp.id) as work_packages
FROM missions m
JOIN programs pr ON pr.mission_id = m.id
JOIN projects pj ON pj.program_id = pr.id
JOIN phases ph ON ph.project_id = pj.id
LEFT JOIN work_packages wp ON wp.phase_id = ph.id
GROUP BY m.id, pr.id, pj.id, ph.id;
```

---

### Phase 3: Update Existing Logic

#### A. Keep Your Current Task Execution (Critical!)

**Your current system** handles:
- Plan creation and approval
- Gate checkpoints
- Run execution with detailed logs
- Deliverable tracking
- Acceptance criteria verification

**Don't touch this.** It works. Just connect it to work_packages.

#### B. Add Context to Existing Queries

**Before (current)**:
```sql
-- Get tasks for agent
SELECT * FROM tasks 
WHERE assignee_type = 'agent' 
  AND assignee_id = $1 
  AND status = 'backlog';
```

**After (with hierarchy context)**:
```sql
-- Get work packages for agent (with phase context)
SELECT 
  wp.*,
  ph.title as phase_title,
  ph.wbs_number as phase_wbs,
  pj.title as project_title,
  pj.wbs_number as project_wbs
FROM work_packages wp
JOIN phases ph ON ph.id = wp.phase_id
JOIN projects pj ON pj.id = ph.project_id
WHERE wp.assignee_type = 'agent' 
  AND wp.assignee_id = $1 
  AND wp.status = 'not_started'
  AND ph.status = 'in_progress'; -- Only work on active phases
```

**Key change**: Filter by phase status (only work on approved, in-progress phases).

#### C. Update Plan Approval Logic

**Current logic** (keep this):
```typescript
// User approves plan for task
await approvePlan(task_id, decision);
```

**Enhanced logic** (add phase gate awareness):
```typescript
// User approves plan for work package
async function approvePlan(work_package_id: string, decision: string) {
  // Your existing approval logic
  await existingApprovalLogic(work_package_id, decision);
  
  // NEW: If this is the first work package in a phase, start the phase
  const workPackage = await db('work_packages').where({ id: work_package_id }).first();
  const phase = await db('phases').where({ id: workPackage.phase_id }).first();
  
  if (phase.status === 'not_started') {
    await db('phases')
      .where({ id: phase.id })
      .update({ 
        status: 'in_progress', 
        start_date: new Date() 
      });
  }
}
```

#### D. Add Phase Gate Review

**New function** (doesn't replace anything):
```typescript
async function reviewPhaseGate(phase_id: string, decision: 'proceed' | 'hold' | 'revise' | 'cancel', feedback?: string) {
  const phase = await db('phases').where({ id: phase_id }).first();
  
  // Get all work packages in this phase
  const workPackages = await db('work_packages')
    .where({ phase_id })
    .select('*');
  
  // Verify all work packages complete
  const allComplete = workPackages.every(wp => wp.status === 'done');
  
  if (!allComplete && decision === 'proceed') {
    throw new Error('Cannot proceed through gate: not all work packages complete');
  }
  
  // Update gate review
  await db('phases')
    .where({ id: phase_id })
    .update({
      status: decision === 'proceed' ? 'complete' : decision === 'hold' ? 'at_gate' : 'cancelled',
      gate_review: {
        decision,
        reviewed_by: 'user_id', // Get from context
        reviewed_at: new Date(),
        feedback,
        deliverables_verified: allComplete
      },
      updated_at: new Date()
    });
  
  if (decision === 'proceed') {
    // Start next phase if exists
    const project = await db('projects')
      .where({ id: phase.project_id })
      .first();
    
    const nextPhase = await db('phases')
      .where({ project_id: project.id })
      .where('wbs_number', '>', phase.wbs_number)
      .orderBy('wbs_number')
      .first();
    
    if (nextPhase) {
      await db('phases')
        .where({ id: nextPhase.id })
        .update({ 
          status: 'in_progress',
          start_date: new Date()
        });
    } else {
      // No more phases, mark project complete
      await db('projects')
        .where({ id: project.id })
        .update({ status: 'complete' });
    }
  }
}
```

---

### Phase 4: UI Updates

#### A. Navigation Updates

**Current nav** (from screenshot):
```
- Dashboard
- Messages
- Tasks
- Task Library
- Notes
- Network
- Gantt
- Risks
- Decisions
- Analytics
- AI Chat
- Agents
- Agent Admin
```

**Add hierarchical views**:
```diff
- Dashboard
+ Missions (NEW)
+ Programs (NEW)
+ Projects (NEW)
- Messages
- Tasks → rename to "Work Packages"
- Task Library
- Notes
- Network
- Gantt (enhance to show hierarchy)
- Risks
- Decisions
- Analytics
- AI Chat
- Agents
- Agent Admin
```

#### B. Mission Dashboard (New Page)

**Component**: `MissionDashboard.tsx`

```typescript
import React from 'react';
import { useQuery } from '@tanstack/react-query';

export function MissionDashboard() {
  const { data: missions } = useQuery({
    queryKey: ['missions'],
    queryFn: () => fetch('/api/missions').then(r => r.json())
  });
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Missions</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {missions?.map(mission => (
          <MissionCard key={mission.id} mission={mission} />
        ))}
      </div>
      
      <button 
        onClick={() => createMission()}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        + New Mission
      </button>
    </div>
  );
}

function MissionCard({ mission }) {
  return (
    <div className="border rounded-lg p-4 hover:shadow-lg transition">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-sm text-gray-500">{mission.wbs_number}</span>
          <h3 className="text-lg font-semibold">{mission.title}</h3>
        </div>
        <StatusBadge status={mission.status} />
      </div>
      
      <p className="text-sm text-gray-600 mt-2">{mission.description}</p>
      
      <div className="mt-4">
        <ProgressBar 
          completed={mission.progress_percent} 
          total={100} 
        />
      </div>
      
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-gray-500">
          {mission.programs_count} programs • {mission.projects_count} projects
        </span>
        <a href={`/missions/${mission.id}`} className="text-blue-600">
          View Details →
        </a>
      </div>
    </div>
  );
}
```

#### C. Phase Gate Review Modal (New Component)

**Component**: `PhaseGateReview.tsx`

```typescript
import React, { useState } from 'react';

export function PhaseGateReview({ phase, onClose, onDecision }) {
  const [feedback, setFeedback] = useState('');
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">
          🚦 Phase Gate Review: {phase.title}
        </h2>
        
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Work Completed:</h3>
          <ul className="space-y-2">
            {phase.work_packages?.map(wp => (
              <li key={wp.id} className="flex items-center">
                <span className={`mr-2 ${wp.status === 'done' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {wp.status === 'done' ? '✅' : '⏳'}
                </span>
                <span>{wp.wbs_number} {wp.title}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Deliverables:</h3>
          <ul className="space-y-2">
            {phase.deliverables?.map(d => (
              <li key={d.id} className="flex items-center justify-between">
                <span>{d.name}</span>
                <a href={d.url} className="text-blue-600 text-sm">View</a>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Gate Criteria:</h3>
          <ul className="space-y-2">
            {phase.gate_criteria?.map(c => (
              <li key={c.id} className="flex items-center">
                <span className={`mr-2 ${c.status === 'met' ? 'text-green-600' : 'text-red-600'}`}>
                  {c.status === 'met' ? '✅' : '❌'}
                </span>
                <span>{c.criterion}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mb-6">
          <label className="block font-semibold mb-2">Your Feedback (optional):</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full border rounded p-2 h-24"
            placeholder="Any adjustments or concerns?"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => onDecision('proceed', feedback)}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            ✓ Proceed to Next Phase
          </button>
          <button
            onClick={() => onDecision('hold', feedback)}
            className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            ⏸ Hold
          </button>
          <button
            onClick={() => onDecision('revise', feedback)}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            ✎ Revise
          </button>
          <button
            onClick={() => onDecision('cancel', feedback)}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            ✖ Cancel
          </button>
        </div>
        
        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 border rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}
```

#### D. Enhanced Task/Work Package View

**Update your existing task detail view** to show hierarchy context:

```typescript
// In your existing task detail component
function TaskDetail({ task }) {
  // NEW: Fetch hierarchy context
  const { data: context } = useQuery({
    queryKey: ['work-package-context', task.id],
    queryFn: () => fetch(`/api/work-packages/${task.id}/context`).then(r => r.json())
  });
  
  return (
    <div>
      {/* NEW: Breadcrumb showing hierarchy */}
      <nav className="text-sm text-gray-600 mb-4">
        <a href={`/missions/${context.mission.id}`}>{context.mission.wbs_number} {context.mission.title}</a>
        {' > '}
        <a href={`/programs/${context.program.id}`}>{context.program.wbs_number} {context.program.title}</a>
        {' > '}
        <a href={`/projects/${context.project.id}`}>{context.project.wbs_number} {context.project.title}</a>
        {' > '}
        <a href={`/phases/${context.phase.id}`}>{context.phase.wbs_number} {context.phase.title}</a>
        {' > '}
        <span className="font-semibold">{task.wbs_number} {task.title}</span>
      </nav>
      
      {/* Your existing task detail UI below */}
      <h1>TASK</h1>
      <div>{task.title}</div>
      {/* ... rest of your existing UI ... */}
    </div>
  );
}
```

---

### Phase 5: API Endpoints (New)

**Add these endpoints** (don't modify existing task endpoints):

```typescript
// missions.ts
router.get('/api/missions', async (req, res) => {
  const missions = await db('missions')
    .select('*')
    .orderBy('wbs_number');
  
  // Enrich with counts
  for (const mission of missions) {
    mission.programs_count = await db('programs').where({ mission_id: mission.id }).count('id as count').first();
    mission.projects_count = await db('projects')
      .join('programs', 'programs.id', 'projects.program_id')
      .where('programs.mission_id', mission.id)
      .count('projects.id as count')
      .first();
  }
  
  res.json(missions);
});

router.post('/api/missions', async (req, res) => {
  const { title, description, success_criteria, target_completion } = req.body;
  
  const wbs_number = await generateWBSNumber(null, 'mission');
  
  const mission = await db('missions').insert({
    wbs_number,
    title,
    description,
    success_criteria,
    target_completion,
    created_by: req.user.id,
    status: 'planning'
  }).returning('*');
  
  res.json(mission);
});

router.get('/api/missions/:id', async (req, res) => {
  const mission = await db('missions').where({ id: req.params.id }).first();
  
  // Get programs
  mission.programs = await db('programs').where({ mission_id: mission.id });
  
  res.json(mission);
});

// Similar endpoints for programs, projects, phases...
```

---

### Phase 6: Agent Integration

#### A. Update Agent MCP Tools

**Keep your existing tools** (checkAssignedTasks, submitPlan, etc.)

**Add new tool** for phase-aware execution:

```typescript
// New MCP tool
export const getWorkContext = {
  name: 'getWorkContext',
  description: 'Get full hierarchical context for a work package',
  inputSchema: {
    type: 'object',
    properties: {
      work_package_id: { type: 'string', format: 'uuid' }
    },
    required: ['work_package_id']
  },
  handler: async (args: any) => {
    const wp = await db('work_packages').where({ id: args.work_package_id }).first();
    const phase = await db('phases').where({ id: wp.phase_id }).first();
    const project = await db('projects').where({ id: phase.project_id }).first();
    const program = await db('programs').where({ id: project.program_id }).first();
    const mission = await db('missions').where({ id: program.mission_id }).first();
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          mission: { wbs: mission.wbs_number, title: mission.title, success_criteria: mission.success_criteria },
          program: { wbs: program.wbs_number, title: program.title, objectives: program.objectives },
          project: { wbs: project.wbs_number, title: project.title, deliverables: project.deliverables },
          phase: { wbs: phase.wbs_number, title: phase.title, gate_criteria: phase.gate_criteria },
          work_package: wp
        }, null, 2)
      }]
    };
  }
};
```

**Update agent instructions**:
```typescript
// When agent receives a work package assignment
const context = await mcpClient.callTool('getWorkContext', { work_package_id });

// Agent now knows:
// - Mission objective: "Build $10M SaaS"
// - Program goal: "Go-to-Market"
// - Project deliverable: "Marketing Campaign"
// - Phase criteria: "Research complete with competitive analysis"
// - Work package task: "Analyze competitor social media"

// Agent's plan can reference this context:
"Based on the mission to build a $10M SaaS and the marketing campaign 
project's goal of reaching 1,000 users, I propose analyzing competitors 
to identify positioning opportunities..."
```

---

### Phase 7: Migration Timeline

#### Week 1: Database
- [ ] Create new tables (missions, programs, projects, phases, work_packages)
- [ ] Write migration script
- [ ] Test on dev database
- [ ] Create default hierarchy for existing tasks

#### Week 2: Backend
- [ ] Add API endpoints for CRUD on new entities
- [ ] Update existing task queries to use work_packages
- [ ] Add phase gate review logic
- [ ] Test with Postman/curl

#### Week 3: Frontend
- [ ] Create Mission Dashboard page
- [ ] Create Program view
- [ ] Create Project view with phases
- [ ] Add Phase Gate Review modal
- [ ] Update existing task detail with breadcrumbs

#### Week 4: Agent Integration
- [ ] Add getWorkContext MCP tool
- [ ] Update agent logic to request context
- [ ] Test agent execution within phase structure
- [ ] Validate phase gates trigger correctly

#### Week 5: Testing & Polish
- [ ] End-to-end test: Create mission → execute → complete
- [ ] Test phase gate approval workflow
- [ ] Test YOLO scale at different hierarchy levels
- [ ] Fix bugs, polish UI

---

## Concrete Example: Your Spam Detection Task

### Current State
```
Task: "Spam Detection"
├── Plan: 4 steps (approved)
├── Gate: Approval gate (approved)
├── Run: Session 45e5674a-885a-480f-be28-981825da4d5ad
├── Acceptance Criteria: 1/1 passed
└── Deliverable: spam-detection-report.md
```

### New State
```
1.0 Mission: Grow SaaS to 1,000 Users
└── 1.2 Program: Marketing & Engagement
    └── 1.2.3 Project: Social Media Strategy
        └── 1.2.3.1 Phase: Content Analysis
            └── 1.2.3.1.2 Work Package: "Spam Detection on X Account"
                ├── Plan: 4 steps (approved) ← YOUR EXISTING PLAN
                ├── Gate: Approval gate (approved) ← YOUR EXISTING GATE
                ├── Run: Session 45e56... ← YOUR EXISTING RUN
                ├── Acceptance Criteria: 1/1 passed ← YOUR EXISTING CRITERIA
                └── Deliverable: spam-detection-report.md ← YOUR EXISTING DELIVERABLE
```

**What changed**: 5 layers added ABOVE your task. Everything below "Work Package" is identical to what you have now.

---

## Key Principles for AI Coder

### 1. Preserve Existing Excellence
Your task execution system is solid. Don't refactor it. Just add hierarchy above it.

### 2. Backward Compatibility
Existing tasks should work after migration. Create default hierarchy and slot them in.

### 3. Gradual Enhancement
Users can keep using the system task-by-task (like now), OR they can create missions and work hierarchically. Both work.

### 4. UI Flexibility
Show hierarchy breadcrumbs everywhere, but let users collapse levels they don't care about.

### 5. Agent Awareness
Agents should GET hierarchy context (optional) but don't REQUIRE it. An agent can still execute a work package without knowing it's part of a mission.

---

## Testing Checklist

### Database Migration
- [ ] All existing tasks migrated to work_packages
- [ ] Default hierarchy created (1.0 → 1.1 → 1.1.1 → 1.1.1.1)
- [ ] WBS numbering generates correctly
- [ ] Foreign keys prevent orphaned records

### API Endpoints
- [ ] Can create mission via POST /api/missions
- [ ] Can list missions via GET /api/missions
- [ ] Can create program under mission
- [ ] Can create project under program
- [ ] Can create phase under project
- [ ] Can create work package under phase
- [ ] Work package can reference legacy_task_id

### UI Components
- [ ] Mission dashboard displays all missions
- [ ] Can drill down mission → program → project → phase → work package
- [ ] Phase gate review modal appears when phase complete
- [ ] Gate review updates phase status
- [ ] Breadcrumbs show hierarchy on work package detail
- [ ] Existing task execution still works

### Agent Integration
- [ ] Agent can call getWorkContext MCP tool
- [ ] Agent receives full hierarchy in response
- [ ] Agent's plan generation includes mission context
- [ ] Agent execution works same as before (backward compatible)

### End-to-End
- [ ] Create new mission "Launch Blog"
- [ ] Agent proposes programs (Content, Marketing, SEO)
- [ ] User approves program plan
- [ ] Agent breaks into projects and phases
- [ ] User approves project plan
- [ ] Agent executes work packages autonomously
- [ ] Phase gate review triggered
- [ ] User approves gate
- [ ] Next phase starts automatically
- [ ] Mission marked complete when all phases done

---

## FAQ for AI Coder

### Q: Do I need to rewrite the task execution system?
**A**: No. Keep it as-is. Just rename "Task" to "Work Package" in the UI and add hierarchy above it.

### Q: What if I have a different table structure than assumed?
**A**: Adjust the SQL accordingly. The principle remains: add 5 levels above your current "task" entity.

### Q: Can users keep using it the old way (flat task list)?
**A**: Yes. They can ignore missions/programs/projects and just create work packages directly under a default phase. Backward compatible.

### Q: How do I handle the WBS numbering?
**A**: Use the provided `generate_wbs_number()` function. It ensures no duplicates and maintains hierarchy.

### Q: What about existing integrations (OpenClaw, OPAL)?
**A**: They don't need to change. Your MCP tools still work. Just optionally provide hierarchy context via the new `getWorkContext` tool.

### Q: Do I need to migrate all existing tasks immediately?
**A**: No. You can create the new tables and default hierarchy, then migrate tasks gradually. Or migrate all at once. Your choice.

### Q: What if a phase has 100 work packages?
**A**: That's fine. Phases can have many work packages. Agent executes them all autonomously within an approved phase plan.

### Q: How does YOLO scale work with hierarchy?
**A**: Set YOLO at phase level. 0% YOLO = approve every work package plan. 50% YOLO = approve phase plan, auto-approve work packages. 100% YOLO = approve project plan, everything else auto-approved.

---

## Conclusion

You've built an excellent execution system. Now we're adding strategic planning layers above it. The work you've done on plans, gates, runs, and deliverables is the **foundation** of Chelex—keep it intact.

By adding missions, programs, projects, and phases, we're making Chelex useful for long-term strategic work, not just individual tasks. Users will think in terms of "Launch a SaaS" not "Run spam detection."

**Your mission** (pun intended): Add the hierarchy, don't rebuild the execution layer.

Good luck! 🚀

---

**Questions?** Contact the product team. We're here to support the migration.
