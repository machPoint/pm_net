# Current Intake + Execution Flow (Projects/Tasks)

_Last updated: 2026-02-13_

This is the operational reference for the current task intake lifecycle.

---

## End-to-End Sequence

1. Create intake session
2. Start task definition
3. Lookup precedents/templates
4. Clarify with user + AI iteration
5. Generate plan
6. Review/edit plan (including approval gate steps)
7. Approve or reject
8. Execute plan steps
9. Verify outcomes
10. Save precedent

---

## API Endpoints (Current)

Base: `/api/opal/proxy/api/task-intake`

### Session + State
- `POST /sessions`
- `GET /sessions/:id`
- `DELETE /sessions/:id`

### Intake Stages
- `POST /sessions/:id/start`
- `POST /sessions/:id/precedents`
- `POST /sessions/:id/select-precedent`
- `POST /sessions/:id/clarify`
- `POST /sessions/:id/plan`
- `POST /sessions/:id/plan-steps` (persist edited plan steps)
- `POST /sessions/:id/approve`
- `POST /sessions/:id/execute`
- `POST /sessions/:id/execute-step`
- `POST /sessions/:id/finalize-execution`
- `GET /sessions/:id/execution-results`
- `POST /sessions/:id/verify`
- `POST /sessions/:id/learn`

---

## Plan Step Semantics

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

### Rules
- `task` step: executes via agent pathway.
- `approval_gate` step: checkpoint step. Backend records checkpoint result and continues execution.
- Gate identification is based on structured fields (`step_type` / `tool`), not action text parsing.

---

## Stage 4 (Approve) Contract

### Persist edits before approval
`POST /sessions/:id/plan-steps`

Request:
```json
{
  "steps": [
    {
      "order": 1,
      "action": "Research top 5 options",
      "expected_outcome": "comparison table",
      "tool": "web_search",
      "step_type": "task"
    }
  ]
}
```

### Approve/reject
`POST /sessions/:id/approve`

Request:
```json
{
  "approved": true,
  "steps": [ /* optional edited steps */ ]
}
```

Behavior:
- `approved=true`: plan status set to approved, session moves to `execute`.
- `approved=false`: plan rejected, session resets to `plan`.

---

## Stage 5 (Execute) Contract

`POST /sessions/:id/execute-step`

Request:
```json
{
  "step_order": 2,
  "action": "Run analysis",
  "tool": "data_analysis",
  "expected_outcome": "summary",
  "step_type": "task"
}
```

Possible `source` values in response:
- `openclaw`
- `llm_fallback`
- `approval_gate`
- `error`

---

## Frontend Ownership

- UI + stage rendering: `apps/CORE_UI/frontend/src/components/ProjectIntakeSection.tsx`
- Intake API state hook: `apps/CORE_UI/frontend/src/hooks/useTaskIntake.ts`

## Backend Ownership

- HTTP routes: `apps/OPAL_SE/src/routes/task-intake.ts`
- Orchestration logic: `apps/OPAL_SE/src/services/taskIntakeService.ts`
