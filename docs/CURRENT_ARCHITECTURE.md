# PM_OC Current Architecture (Trimmed)

_Last updated: 2026-02-13_

This document describes the **current, active architecture** after the Projects+Tasks trim.

---

## Product Scope

PM_OC is now centered on:

1. **Projects**
2. **Tasks**
3. **AI-assisted Task Intake + Execution**

Legacy hierarchy concepts (Mission/Program/Phase/Work Package) are not part of the active UX path.

---

## Runtime Topology

### Frontend (CORE_UI)
- Path: `apps/CORE_UI/frontend`
- Stack: Next.js + React + TypeScript + Tailwind + shadcn/ui
- Main shell: `src/app/page.tsx`
- Core sections in active use include Dashboard, Projects, Tasks, Project Intake, and supporting admin/agent panels.

### Backend Service Layer (OPAL_SE)
- Path: `apps/OPAL_SE`
- Stack: Node.js + TypeScript + Express
- Core data model: graph nodes/edges via `src/services/graphService.ts`
- Intake workflow routes: `src/routes/task-intake.ts`
- Intake orchestration service: `src/services/taskIntakeService.ts`

### Proxy Contract
- Frontend calls intake via: `/api/opal/proxy/api/task-intake/*`

---

## Project Intake Workflow (Current)

UI file: `apps/CORE_UI/frontend/src/components/ProjectIntakeSection.tsx`  
Hook: `apps/CORE_UI/frontend/src/hooks/useTaskIntake.ts`  
Service: `apps/OPAL_SE/src/services/taskIntakeService.ts`

Stages:
1. `start`
2. `precedents`
3. `clarify`
4. `plan`
5. `approve`
6. `execute`
7. `verify`
8. `learn`

### Important current behavior
- Clarify stage supports iterative user input with a multiline response box.
- Approval stage supports plan step editing.
- Approval stage supports inserting **approval gate** steps into plan steps.
- Edited steps are persisted through `POST /sessions/:id/plan-steps` and can also be submitted with approval payload.
- Execution supports typed step semantics:
  - `step_type: "task"`
  - `step_type: "approval_gate"`

---

## Plan Step Model (Canonical)

Used on both FE and BE:

```ts
export type PlanStepType = "task" | "approval_gate";

export interface PlanStep {
  order: number;
  action: string;
  expected_outcome: string;
  tool?: string | null;
  step_type?: PlanStepType;
}
```

Rules:
- `approval_gate` steps are represented structurally with `step_type` and `tool: "approval_gate"`.
- Gate detection must use structured fields, not text heuristics.

---

## Approval + Execution Semantics

### Approve
- Endpoint: `POST /sessions/:id/approve`
- Payload:
  - `approved: boolean`
  - optional `steps: PlanStep[]`

### Save edited steps prior to approve
- Endpoint: `POST /sessions/:id/plan-steps`
- Payload:
  - `steps: PlanStep[]`

### Execute step
- Endpoint: `POST /sessions/:id/execute-step`
- Payload includes `step_type`.
- For `approval_gate` steps, backend records a checkpoint result instead of dispatching agent tool execution.

---

## UI Layout Notes

- Main shell in `page.tsx` uses a constrained center panel and allows sections to manage their own scrolling.
- `ProjectIntakeSection` internally uses `ScrollArea` and stage-local layout.

---

## Source of Truth Docs

This file is now the high-level architecture source for the trimmed implementation.

Companion docs:
- `docs/CURRENT_INTAKE_EXECUTION_FLOW.md`
- API route code comments in `apps/OPAL_SE/src/routes/task-intake.ts`
