# Net PM Core - Architecture Principles

## Core Concept: Agent Mission Control

This application is an **Agent Mission Control** - a human-in-the-loop oversight system for AI agents.

### User Role (Minimal)
Users only do 3 things:
1. **Create Tasks** - Define objectives/directives for agents to work on
2. **View Agent Feedback** - Monitor what agents are doing and producing
3. **Assess Decisions** - Review and approve/reject agent-proposed decisions

### Agent Role (Everything Else)
Agents handle all execution:
- Move tasks through workflow stages (Backlog → In Progress → Review → Done)
- Generate and update content (notes, outputs, artifacts)
- Propose decisions for human approval
- Create relationships between entities
- Report risks and blockers
- Produce analytics and status updates

### UI Implications
- Most data is **read-only** for users (agent-generated)
- User interactions focus on: task creation, decision approval, chat
- Agent activity should be prominently visible (agent icons, activity feeds)
- The "Agent Messages" tab shows real-time agent communications

### Data Model
- Nodes: tasks, decisions, risks, users, agents, plans
- Edges: assignments, dependencies, approvals, impacts
- Agents update node status and create edges as they work
- Users primarily create task nodes and approve decision nodes
