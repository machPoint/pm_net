# Approval Gates & Post-Execution Integration — Progress Summary

**Last updated:** 2026-02-14

---

## Completed

### 1. Post-Execution Finalization
- **File:** `apps/OPAL_SE/src/services/taskIntakeService.ts`
- `finalizeExecution` now:
  - Updates the task node status to `done`
  - Links orphan tasks into the default hierarchy (Mission → Program → Project → Phase)
  - Clones the completed task as a template in the Task Library (`is_template: true`)
  - Emits rich completion events
  - Appends a completion message to the OC agent chat history file (`~/.openclaw/agents/{agentId}/pmnet-chat-history.json`)

### 2. Retroactive Data Fix
- Existing "AI Research" task data propagated correctly after finalization logic was added.

### 3. Projects Page — Show Default Project
- **File:** `apps/CORE_UI/frontend/src/components/ProjectsSection.tsx`
- Removed the `is_default !== true` filter so the default "Ongoing Tasks" project shows when it has real tasks.

### 4. Tasks Page — Filter Templates
- **File:** `apps/CORE_UI/frontend/src/components/TasksSection.tsx`
- Filters out template nodes (`is_template: true` or `status: 'template'`) so only real tasks display.

### 5. Project Intake Scrollbar Fix
- **File:** `apps/CORE_UI/frontend/src/components/ProjectIntakeSection.tsx`
- Replaced Radix `ScrollArea` with a native `overflow-y-auto` div using the `.themed-scrollbar` class.
- **File:** `apps/CORE_UI/frontend/src/app/globals.css`
- Added `.themed-scrollbar` CSS class with automatic light/dark mode scrollbar colors.

### 6. Backend: Approval Gate Node Creation
- **File:** `apps/OPAL_SE/src/services/taskIntakeService.ts` (in `executeStep`)
- When a step has `step_type === 'approval_gate'` or `tool === 'approval_gate'`:
  - Creates a `gate` node in the graph DB with `status: 'pending_approval'`
  - Links the gate node to the current run via a `contains` edge
  - Appends an approval-needed message to the OC agent chat history
  - Returns `{ source: 'approval_gate', oc_session_id: gateNode.id }` to signal the SSE route

### 7. Backend: SSE Route Gate Polling
- **File:** `apps/OPAL_SE/src/routes/task-intake.ts` (in `/sessions/:id/execute-stream`)
- When `executeStep` returns an approval gate result:
  - Sends a `gate_waiting` SSE event with the gate node ID
  - Polls the gate node status every 3 seconds (max 30 minutes)
  - When the gate node status changes from `pending_approval`:
    - Sends a `gate_resolved` SSE event
    - If approved → continues execution
    - If rejected/timeout → sends a failed step event and breaks the loop

### 8. Backend: Gate Resolve API
- **File:** `apps/OPAL_SE/src/routes/task-intake.ts`
- `POST /api/task-intake/gates/:gateId/resolve` — accepts `{ approved: boolean, reason?: string }`, updates the gate node status to `approved` or `rejected`
- `GET /api/task-intake/gates/pending` — lists all gate nodes with `status: 'pending_approval'`

### 9. Frontend: Execution Console Gate UI
- **File:** `apps/CORE_UI/frontend/src/components/ExecutionConsoleSection.tsx`
- Added `pendingGate` and `gateResolving` state
- Handles `gate_waiting` SSE event → shows amber approval banner with Approve/Reject buttons
- Handles `gate_resolved` SSE event → clears banner, updates step status
- `resolveGate(approved)` calls `POST /api/task-intake/gates/:gateId/resolve`

### 10. Frontend: Approvals Page — Gate Nodes
- **File:** `apps/CORE_UI/frontend/src/components/ApprovalsSection.tsx`
- `fetchApprovals` now fetches both:
  1. `node_type=gate` nodes from the graph DB (approval gates from execution)
  2. `node_type=task` nodes with `status: review/pending_approval`
- `handleDecision` detects gate-type items (`metadata._node_type === 'gate'`) and calls the gate resolve endpoint instead of patching the task node

---

## Remaining / Needs Verification

### A. End-to-End Verification
- [ ] Start OPAL_SE, run a project with an approval gate step, confirm:
  - Execution pauses at the gate step
  - `gate_waiting` SSE event fires and the Execution Console shows the approval banner
  - Clicking Approve sends the resolve request and execution resumes
  - Clicking Reject stops execution
  - The gate node appears on the Approvals page as "Pending"
  - Approving/rejecting from the Approvals page also resolves the gate
  - An approval-needed message appears in the Messages inbox

### B. Edge Cases to Test
- [ ] Multiple approval gates in a single plan
- [ ] Gate timeout behavior (30-min max)
- [ ] Rejecting a gate mid-execution — verify remaining steps are skipped
- [ ] Browser refresh during gate wait — verify the Approvals page still shows the pending gate

### C. Dashboard Integration
- The Dashboard's "Pending Approvals" section (`DashboardSection.tsx`) currently only looks at task nodes with `status: review/pending_approval`. It should also fetch `node_type=gate` nodes to show pending gates. This is a nice-to-have.

---

## Key Files Modified

| File | What Changed |
|------|-------------|
| `apps/OPAL_SE/src/services/taskIntakeService.ts` | Gate node creation, finalization, chat messages |
| `apps/OPAL_SE/src/routes/task-intake.ts` | SSE gate polling, gate resolve API, pending gates API |
| `apps/CORE_UI/frontend/src/components/ExecutionConsoleSection.tsx` | Gate waiting UI, approve/reject buttons |
| `apps/CORE_UI/frontend/src/components/ApprovalsSection.tsx` | Fetch gate nodes, resolve gates |
| `apps/CORE_UI/frontend/src/components/ProjectIntakeSection.tsx` | Scrollbar fix |
| `apps/CORE_UI/frontend/src/components/ProjectsSection.tsx` | Show default project |
| `apps/CORE_UI/frontend/src/components/TasksSection.tsx` | Filter templates |
| `apps/CORE_UI/frontend/src/app/globals.css` | `.themed-scrollbar` class |

---

## Architecture: Approval Gate Flow

```
Plan Step (step_type: approval_gate)
  │
  ▼
executeStep() → creates gate node (status: pending_approval)
  │               sends chat message to agent
  │
  ▼
execute-stream SSE route
  │── sends gate_waiting event to frontend
  │── polls gate node every 3s
  │
  ▼
Human resolves gate via:
  ├─ Execution Console (approve/reject buttons)
  └─ Approvals Page (review dialog)
       │
       ▼
  POST /gates/:id/resolve → updates gate node status
       │
       ▼
  Poll detects status change
  ├─ approved → gate_resolved event, continue execution
  └─ rejected → gate_resolved event, stop execution
```
