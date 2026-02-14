# AI Coding Context (Canonical)

_Last updated: 2026-02-14_

This is the **primary coding context** for AI agents working in PM_OC.

## 1) Start Here (Current Product Reality)

- Product focus: **Projects + Tasks + AI-assisted intake/execution**
- Active architecture overview: `docs/CURRENT_ARCHITECTURE.md`
- Intake/execution contract: `docs/CURRENT_INTAKE_EXECUTION_FLOW.md`
- Latest approval-gate execution updates: `docs/approval-gates-progress.md`

If a legacy document conflicts with the files above, treat the files above as source of truth.

## 2) Canonical Backend Contracts

- Graph vocabulary/types and constraints:
  - `apps/OPAL_SE/src/types/graph-vocabulary.ts`
- Intake routes:
  - `apps/OPAL_SE/src/routes/task-intake.ts`
- Intake orchestration:
  - `apps/OPAL_SE/src/services/taskIntakeService.ts`

## 3) Canonical Frontend Contracts

- Main shell + section routing:
  - `apps/CORE_UI/frontend/src/app/page.tsx`
- Project Intake UI:
  - `apps/CORE_UI/frontend/src/components/ProjectIntakeSection.tsx`
- Intake state hook:
  - `apps/CORE_UI/frontend/src/hooks/useTaskIntake.ts`

## 4) Doc Usage Rules for AI Coding

1. Prefer **code files** over prose when there is any mismatch.
2. Prefer docs marked current (`CURRENT_*`) over legacy specs.
3. Treat historical/speculative architecture docs as non-authoritative unless explicitly linked from current docs.
4. Do not infer API contracts from old examples; verify against active route files.

## 5) What Was Removed

Obsolete/speculative/duplicative docs were removed to reduce context pollution for coding agents. These mainly covered:

- superseded v1 graph specs
- speculative multi-provider orchestration interfaces
- early architecture drafts no longer matching current runtime paths
- vertical/extension specs not used by active coding workflows

## 6) Keep These Supporting Docs

- `docs/CHELEX_GRAPH_SCHEMA_REVISED.md` (reference background for graph vocabulary evolution)
- `docs/ARCHITECTURE_PRINCIPLES.md` (high-level product intent)
- `docs/Theming_System_Documentation.md` (frontend theming implementation details)
- `docs/LINUX_SETUP.md` (developer environment setup)
