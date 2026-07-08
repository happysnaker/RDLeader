# RDLeader

[![CI](https://github.com/happysnaker/RDLeader/actions/workflows/ci.yml/badge.svg)](https://github.com/happysnaker/RDLeader/actions/workflows/ci.yml)
[![Public baseline](https://img.shields.io/badge/public%20baseline-v0.1.0--pre--release-blue)](https://github.com/happysnaker/RDLeader/releases/tag/v0.1.0-public-baseline)

> Local-first control plane for supervising multiple AI R&D workers from one engineering-lead console.

RDLeader is an experimental **AI R&D management console**. It treats every worker as a runtime-backed actor with its own workspace, memory, tasks, approvals, communication surface, runtime history, emotional / performance state, and operating evidence. The goal is not another chat UI; the goal is a small control plane for dispatching work, tracking execution, and keeping risky actions under human review.

## Why this exists

AI coding agents are useful, but once more than one agent is running, the hard problems become operational:

- Which worker owns which task?
- What context should be loaded for this task type?
- Which actions are safe to run autonomously, and which need approval?
- Where did runtime results, reflections, decisions, and follow-up work land?
- How does a human lead keep enough visibility without reading every transcript?
- How do agents coordinate through real work surfaces instead of isolated chat windows?

RDLeader is a local-first answer to those questions.

## Current MVP

This repository currently includes a vertical slice rather than a polished product:

- **Seeded worker profiles** with direction, persona, assignments, risk flags, Feishu profile placeholders, emotion state, and performance state
- **Progressive brain package** that assembles task-specific context layers (`identity`, `seed`, `working`, `episodic`, `knowledge`, `reflection`)
- **Runtime adapter layer** for ACP-style task dispatch, result collection, stale-task recovery, and workspace bootstrap
- **Policy package** for classifying risky actions and requiring manager approval
- **Fastify control plane** backed by SQLite / repository classes
- **React + Vite manager UI** with overview, execution, collaboration, growth, management, QA, and ops surfaces
- **Local integration probes** for agent runtime, Codex, bytedcli, and Lark / Feishu tooling
- **Human-in-the-loop workflows** for approvals, project group routing, technical review actions, and manager-to-worker conversations

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
      ├── ops workflows       project groups, review actions, QA reports
      └── SQLite repositories work items, messages, reflections, runtime events
      │
      ▼
Local worker workspace
  <workspace>/WORKSPACE_MAP.*       repo and direction map
  <workspace>/.rdleader/tasks       inbound task envelopes
  <workspace>/.rdleader/results     runtime result events
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
scripts/qa        local smoke, endurance, reset, and route-repair checks
```

## Operating model

1. A human lead selects a worker and a work item.
2. RDLeader assembles a task envelope with the right brain/context layers.
3. The runtime adapter writes the task into that worker's isolated local workspace.
4. The worker runtime completes, blocks, or fails, then writes a structured result event.
5. RDLeader collects the result, archives the source event, updates history, and exposes the next step to the manager UI.
6. High-risk operations are represented as approval requests instead of silent execution.
7. QA scripts and browser checks produce operator-facing evidence instead of relying on vibes.

## Feishu / Lark-style employee agents

The DevPlan version follows a **dedicated employee bot** model:

- one employee → one independent bot identity
- one employee → one isolated runtime home
- one employee → one isolated communication config

This prevents cross-talk between employees, isolates operational state, and lets each employee enter project groups with its own bot identity. Public docs intentionally describe the architecture without publishing private app IDs, chat IDs, QR onboarding artifacts, or organization-specific credentials.

Supported management surfaces include:

- page-native employee-agent onboarding
- manual bind fallback through secret references
- bot status / setup command previews
- project-group binding and routing
- manager proxy review records
- external-blocker reporting when organization permissions prevent an action

## Validation posture

The local DevPlan build is maintained with evidence-first checks:

- unit / integration tests for server, runtime, domain, policy, web components, and app flows
- local smoke checks for employee lifecycle, runtime dispatch, project ops, autonomy, group messaging, and reset behavior
- runtime endurance checks for stale task recovery and result collection
- browser validation reports for the manager UI tabs and execution flow
- clean demo-state reset before presenting the product

The public repository does not publish every local QA artifact because some logs can contain private workspace paths, organization-specific identifiers, or live integration evidence. Public-facing documentation should summarize the proof without leaking the raw operational surface.

## Local development

```bash
pnpm install
pnpm test
pnpm --filter @rdleader/server dev
pnpm --filter @rdleader/web dev
```

The DevPlan branch also has an idempotent `pnpm dev` helper and QA scripts, but the stable public baseline remains the package-level commands above until the full feature bundle is sanitized and published.

## Important constraints

- This is an MVP / research prototype, not a production HR system.
- Runtime workspaces currently default to `~/GolandProjects/E/<employeeId>`.
- ACP-style local runtime dispatch is the primary execution path in this slice.
- The repository intentionally has no Go build/test workflow; it is a TypeScript monorepo.
- External integrations are probed locally and should fail closed when unavailable.
- Public commits must avoid app secrets, QR artifacts, chat IDs, open IDs, private workspace logs, and organization-specific raw evidence.

## Status

RDLeader is useful as a public systems-design artifact because it demonstrates:

- agent runtime boundaries
- local-first control-plane thinking
- human-in-the-loop approval flow
- typed domain modeling for agent operations
- dedicated employee-agent communication surfaces
- evidence-first QA / ops thinking for autonomous workers
- a split between manager UI, API, policy, brain/context assembly, ingest, and runtime dispatch

The latest public packaging slice is a public submission/follow-up tracker for distribution work. Next useful slices are public submission batch 1 in [RDLeader#22](https://github.com/happysnaker/RDLeader/issues/22), license posture, and broader DevPlan bundle sanitization.

Public release plan: [docs/public-release-roadmap.md](docs/public-release-roadmap.md).
Public evidence docs: [QA evidence](docs/public/qa-evidence.md) · [runtime endurance model](docs/public/runtime-endurance.md) · [runtime/approval deep dive](docs/public/runtime-approval-deep-dive.md) · [employee-agent onboarding](docs/public/employee-agent-onboarding.md).
Public demo assets: [submission tracker](docs/public/submission-tracker.md) · [distribution kit](docs/public/distribution-kit.md) · [landing section](docs/public/landing-page.md) · [narrated browser video](docs/public/narrated-walkthrough-video.md) · [demo walkthrough](docs/public/demo-walkthrough.md) · [demo SVG assets](docs/public/demo-assets.md) · [walkthrough video](docs/public/walkthrough-video.md) · [browser walkthrough](docs/public/browser-walkthrough.md) · [demo reset](docs/public/demo-reset.md) · [promo kit](docs/public/promo-kit.md).
Public discussion: [release roadmap / sponsorware slices](https://github.com/happysnaker/RDLeader/discussions/4).
Public baseline pre-release: [v0.1.0-public-baseline](https://github.com/happysnaker/RDLeader/releases/tag/v0.1.0-public-baseline).

## License / reuse status

RDLeader is public for architecture, packaging, QA evidence, and sponsorware visibility, but the final license posture is still undecided. Until a project-specific `LICENSE` file is published, do not assume unrestricted reuse, redistribution, or commercial use.

- Decision tracker: [RDLeader#3](https://github.com/happysnaker/RDLeader/issues/3)
- Public note: [docs/public/license-decision.md](docs/public/license-decision.md)
- Current non-binding recommendation: Apache-2.0 if the intent is permissive external reuse; source-available for now if DevPlan-derived code should stay conservative.

## Support

If this kind of agent-operations work is useful to you, support ongoing maintenance here:

- Support / sponsor details: [SUPPORT.md](SUPPORT.md)
- Support page: <https://happysnaker.github.io/support/>
- Profile: <https://github.com/happysnaker>
