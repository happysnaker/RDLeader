# RDLeader

> Local-first control plane for supervising multiple AI R&D workers from one engineering-lead console.

RDLeader is an experimental **AI R&D management console**. It treats every worker as a runtime-backed actor with its own workspace, memory, tasks, approvals, emotional / performance state, and operating history. The goal is not another chat UI; the goal is a small control plane for dispatching work, tracking execution, and keeping risky actions under human review.

## Why this exists

AI coding agents are useful, but once more than one agent is running, the hard problems become operational:

- Which worker owns which task?
- What context should be loaded for this task type?
- Which actions are safe to run autonomously, and which need approval?
- Where did runtime results, reflections, decisions, and follow-up work land?
- How does a human lead keep enough visibility without reading every transcript?

RDLeader is a local-first answer to those questions.

## Current MVP

This repository currently includes a vertical slice rather than a polished product:

- **Seeded worker profiles** with direction, persona, assignments, risk flags, Feishu profile placeholders, emotion state, and performance state
- **Progressive brain package** that assembles task-specific context layers (`identity`, `seed`, `working`, `episodic`, `knowledge`, `reflection`)
- **Runtime adapter layer** for Trae ACP-style task dispatch and result collection
- **Policy package** for classifying risky actions and requiring manager approval
- **Fastify control plane** backed by SQLite / repository classes
- **React + Vite manager UI** for overview, task execution, collaboration, growth, approvals, runtime dispatches, and project operations history
- **Local integration probes** for `trae-cli`, `codex`, `bytedcli`, and `lark-cli`

## Architecture

```text
React manager UI
      │
      ▼
Fastify control plane
      │
      ├── domain model        employees, performance, emotion, approvals
      ├── brain package       task-type → context-layer assembly
      ├── policy package      risk classification and approval gates
      ├── ingest package      git/doc memory extraction and direction knowledge
      ├── runtime package     ACP task dispatch + result collection
      └── SQLite repositories work items, messages, reflections, runtime events
      │
      ▼
Local worker workspace
  <workspace>/.rdleader/tasks      inbound task envelopes
  <workspace>/.rdleader/results    runtime result events
```

## Monorepo layout

```text
apps/server       Fastify API, SQLite repositories, schedulers, integration probes
apps/web          React/Vite manager interface
packages/domain   shared domain types for workers, state, directions, approvals
packages/brain    progressive context assembly and routing
packages/ingest   git/doc memory extraction helpers
packages/policy   risk policy and approval gates
packages/runtime  ACP runtime adapter and workspace manager
packages/seed     demo worker and direction seed data
```

## Operating model

1. A human lead selects a worker and a work item.
2. RDLeader assembles a task envelope with the right brain/context layers.
3. The runtime adapter writes the task into that worker's isolated local workspace.
4. The worker runtime completes, blocks, or fails, then writes a structured result event.
5. RDLeader collects the result, archives the source event, updates history, and exposes the next step to the manager UI.
6. High-risk operations are represented as approval requests instead of silent execution.

## Local development

```bash
pnpm install
pnpm test
pnpm --filter @rdleader/server dev
pnpm --filter @rdleader/web dev
```

The server listens on `127.0.0.1:3001` in local development. The web app is a Vite app under `apps/web`.

## Important constraints

- This is an MVP / research prototype, not a production HR system.
- Runtime workspaces currently default to `~/GolandProjects/E/<employeeId>`.
- Trae ACP is the primary runtime adapter in this slice.
- The repository intentionally has no Go build/test workflow; it is a TypeScript monorepo.
- External integrations are probed locally and should fail closed when unavailable.

## Status

RDLeader is useful as a public systems-design artifact because it demonstrates:

- agent runtime boundaries
- local-first control-plane thinking
- human-in-the-loop approval flow
- typed domain modeling for agent operations
- a split between manager UI, API, policy, brain/context assembly, ingest, and runtime dispatch

The next useful packaging step is a short demo page or screen recording once the local UI is stable enough to show publicly.

## Support

If this kind of agent-operations work is useful to you, support ongoing maintenance here:

- Support page: <https://happysnaker.github.io/support/>
- Profile: <https://github.com/happysnaker>
