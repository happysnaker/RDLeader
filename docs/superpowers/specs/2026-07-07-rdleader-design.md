# RDLeader Design

## 1. Summary

RDLeader is an open-source, local-first manager console and control plane for running multiple AI "R&D employees" under one human engineering leader. The leader is the only true manager and decision maker. Each employee is a software R&D worker with a level, direction, personality, emotional state, performance history, private memory, project knowledge, isolated workspace, and an execution runtime. The product combines four ideas into one system:

1. **OpenClaw-style control plane**: a gateway/control-plane architecture where channel integrations, agent runtimes, and user-facing surfaces are separated rather than merged into one monolith.
2. **LarkLink-style communication surface**: Feishu is treated as a first-class operating surface for work rather than a notification sink.
3. **ByteDance R&D workflow alignment**: employees use Feishu, bytedcli, project groups, technical docs, and review/coordination workflows that resemble the real internal engineering process.
4. **Progressive-disclosure cognition**: an employee brain that routes only the needed identity, memory, knowledge, and current work context into a task instead of stuffing full history into every run.

The first deliverable is an MVP platform foundation, not the entire end-state in one shot. MVP includes a standard web management page, employee model, isolated runtime management, progressive-disclosure brain/index design, internal employee-to-employee communication, hiring/level lifecycle surfaces, and two seeded employees: **卢世荣** and **周永康**. Feishu group/project advancement and richer human-like behavior will be layered on top of that foundation rather than improvised first.

## 2. Source References and Grounding

This design is intentionally grounded in the sources and local evidence already inspected:

- **OpenClaw**: personal AI assistant, channel-first, gateway/control-plane architecture, Feishu as a supported production channel, separation between ACP agents and simpler CLI fallback backends.
- **LarkLink wiki**: Feishu bot communication patterns, group modes, multi-instance thinking, permission mediation, runtime switching, and repo-aware operation from chat.
- **Local environment reality**:
  - `trae-cli acp serve` is available locally and is the most concrete ACP runtime on this machine.
  - `codex` is installed, but current local CLI evidence exposes MCP/app-server surfaces rather than a clearly equivalent ACP entrypoint.
  - `lark-cli` and `bytedcli` are available and authenticated.
- **Employee seed evidence**:
  - Local git history in `funshopping_user_growth_dispatch`, `funshopping_core`, and `funshopping_user_growth_push` shows recent activity for 卢世荣 and 周永康.
  - Lark wiki folder `用户增长` contains many technical plans authored by either 卢世荣 or 周永康.
  - 独立端导流 code index / one-page directory defines the relevant repo topology and default knowledge universe.

These references drive the decisions below. RDLeader is not a generic chat toy. It is a manager-facing orchestration system for domain-shaped engineering employees.

## 3. Goals

### 3.1 Product goals

RDLeader must let one human R&D leader:

- manage multiple engineering employees;
- assign them to directions and levels;
- chat with them in a standard web page;
- see what they have done, what they plan next, and what risks they feel;
- let employees communicate with each other;
- let employees work in isolated local workspaces;
- seed employees from real code/plan memory;
- evolve employees through hiring, interview, promotion, dismissal, and resignation flows;
- route employees into Feishu and ByteDance R&D workflows;
- preserve auditable safety boundaries even when employees hold strong local execution power.

### 3.2 MVP goals

The MVP delivered by this design must make these statements true:

- There is a running RDLeader project under `/Users/bytedance/GolandProjects/DevPlan/RdLeader`.
- There is a web management surface with employee list/detail/chat/task visibility.
- Employee entities have level, direction, personality, emotion, performance, workspace path, and knowledge bindings.
- Employees can be started against a concrete runtime, with **Trae ACP as the primary runtime**.
- Employees have isolated work directories at `~/GolandProjects/E/${employeeId}`.
- Two employees, `lushirong` and `zhouyongkang`, are pre-seeded with differentiated memory and knowledge for the 独立端增长导流 direction.
- The brain design supports progressive disclosure and routing.
- Employee-to-employee messaging exists inside the platform.
- Hiring/promotion/firing entrypoints exist in the management model, with the human leader remaining final authority.

### 3.3 Explicit non-goals for MVP

The MVP does **not** need to fully automate every real-world company workflow. In particular, MVP will not require all of the following on day one:

- fully automatic Meego lifecycle ownership without human approval;
- real meeting attendance by employees;
- fully realistic resignation psychology without bounded state rules;
- production-grade cloud deployment;
- final polished GitHub remote automation.

Those are designed now, but some are implemented in later milestones.

## 4. Product Principles

1. **Leader remains the boss**: employees are agents, not sovereign actors.
2. **Human-like but auditable**: personality, emotion, anxiety, pride, and resignation exist as modeled system states with event trails.
3. **Local-first, not toy-first**: local environment, local workspaces, local git history, and local docs matter more than fancy chatbot tricks.
4. **Control plane over prompt spaghetti**: channel surfaces, execution runtimes, memory, and safety are explicit subsystems.
5. **Progressive disclosure over context dumping**: the employee brain must select context by task type and scope.
6. **Direction-first knowledge**: every employee belongs to a direction; every direction has default knowledge bases.
7. **Safety by policy, not vibes**: destructive operations require explicit approval paths.
8. **Open-source friendly**: the repo structure, abstractions, and naming should be general enough to publish.

## 5. Users and Operating Roles

### 5.1 Human leader

The leader is the only manager and final authority for:

- hiring;
- interview decisions;
- promotion decisions;
- firing;
- approving dangerous actions;
- representing employees in meetings they cannot attend;
- deciding how much autonomy a given employee receives.

### 5.2 Employee agents

Employees are software R&D workers only. They can:

- analyze code and plans;
- communicate status;
- create technical documents;
- plan next steps;
- coordinate with other employees;
- operate through runtime adapters and company tools;
- escalate blockers and emotional pressure.

They cannot:

- silently perform destructive high-risk actions;
- self-promote;
- self-approve firing/promotion decisions;
- claim authority above the human leader.

### 5.3 External collaborators

Project groups, reviewers, and surrounding systems are external actors. MVP models them as chat/group/doc/task surfaces rather than full identity-rich domain actors.

## 6. High-Level Architecture

```mermaid
flowchart LR
    Leader[Human Leader]\
    Web[RDLeader Web]\
    CP[Control Plane]\
    Brain[Brain + Knowledge Router]\
    Runtime[Runtime Manager]\
    ACP[Trae ACP Adapter]\
    Feishu[Feishu Bridge]\
    BYTED[bytedcli Adapter]\
    KB[Knowledge Stores]\
    WS[Employee Workspaces]\

    Leader --> Web
    Web --> CP
    CP --> Brain
    CP --> Runtime
    Runtime --> ACP
    CP --> Feishu
    CP --> BYTED
    Brain --> KB
    ACP --> WS
    Feishu --> CP
    BYTED --> CP
```

The system separates concerns into six major layers:

1. **Web surface**: the manager UI.
2. **Control plane**: orchestration, policy, lifecycle, message routing, approvals.
3. **Brain**: identity, memory, retrieval, task-context assembly, learning.
4. **Runtime manager**: start/stop/heartbeat/session binding for employees.
5. **Integrations**: Feishu, bytedcli, future Meego/project group adapters.
6. **Knowledge + workspace layer**: employee knowledge indexes and isolated working directories.

This mirrors the best part of OpenClaw’s model: the visible assistant is not the system itself; it is the front door into a control plane.

## 7. Tech Stack Decision

RDLeader will use a **TypeScript monorepo**.

### Why TypeScript

- OpenClaw is TypeScript-heavy and conceptually aligned.
- Local agent/runtime ecosystem on this machine is strongly Node/CLI oriented.
- Avoids the user’s explicit “don’t run `go test` / `go build` in Go repos” constraint.
- Best fit for shipping both web UI and long-running control-plane code in one open-source repo.

### Proposed stack

- **Monorepo**: `pnpm` workspace
- **Web app**: React + Vite
- **Server / control plane**: Fastify + WebSocket/SSE
- **Database**: SQLite for MVP
- **ORM / schema**: Drizzle ORM
- **Shared packages**: domain types, policy engine, brain, integrations
- **Background jobs**: in-process task scheduler backed by SQLite state tables

This is intentionally simple enough for MVP, but structured enough to grow into a publishable open-source project.

## 8. Repository Layout

The repo will live at `/Users/bytedance/GolandProjects/DevPlan/RdLeader` and will eventually contain:

```text
RdLeader/
  apps/
    web/
    server/
  packages/
    domain/
    brain/
    runtime/
    integrations-feishu/
    integrations-bytedcli/
    policy/
    seed/
    ui-contract/
  docs/
    superpowers/
      specs/
      plans/
    architecture/
    operations/
  data/
    seeds/
    prompts/
    templates/
  scripts/
  .github/
```

MVP only requires the design repo skeleton plus later implementation of the main apps/packages. It does not require every listed directory to be fully populated immediately.

## 9. Core Domain Model

### 9.1 Employee

Each employee has:

- `employeeId` — stable machine-readable id, e.g. `lushirong`, `zhouyongkang`
- `displayName`
- `level` — one of `1-2`, `2-1`, `2-2`
- `directionId`
- `employmentStatus` — `candidate | active | probation | resigned | fired`
- `workspacePath`
- `runtimeKind` — `trae_acp | codex_adapter | disabled`
- `managerId`
- `feishuProfile`
- `personaProfile`
- `emotionState`
- `performanceState`
- `defaultKnowledgeBaseIds`
- `currentAssignments`
- `recentDoneSummary`
- `nextStepSummary`
- `riskFlags`

### 9.2 Persona profile

A persona profile is bounded, not freestyle. It contains:

- communication tone;
- ownership bias;
- conflict tolerance;
- pressure response;
- confidence baseline;
- collaboration style;
- escalation preference.

### 9.3 Emotion state

The system exposes a compact emotion state machine:

- `calm`
- `focused`
- `anxious`
- `frustrated`
- `proud`
- `discouraged`
- `considering_exit`

Each state is backed by:

- current intensity;
- last triggering events;
- last recovery event;
- manager-visible explanation.

### 9.4 Performance state

Performance is tracked separately from emotion:

- delivery trend;
- communication quality trend;
- blocker handling;
- review quality;
- reliability score;
- promotion readiness;
- retention risk.

### 9.5 Direction

A direction is the organizational/knowledge home of an employee. MVP needs at least:

- `independent-growth-diversion` (`独立端增长导流`)

A direction owns:

- default knowledge bases;
- default repos;
- common documents;
- common stakeholders/templates;
- default task routing hints.

## 10. Employee Brain: Progressive Disclosure Design

This is the core design requirement and the central differentiator of RDLeader.

### 10.1 Problem statement

A naive employee design would cram all history, all plans, all docs, all commits, and all persona state into every turn. That is expensive, unmaintainable, and cognitively noisy. RDLeader instead uses a **multi-layer brain** that exposes only the needed context for the current task.

### 10.2 Brain layers

#### L0 — Identity core
Stable, always-available facts:

- employee identity;
- level;
- direction;
- manager;
- non-negotiable safety rules;
- persona baseline.

#### L1 — Seed memory
Imported from historical evidence:

- commit tendencies;
- authored technical plan themes;
- recurring project vocabulary;
- known strengths.

#### L2 — Working memory
Fast-changing short-horizon memory:

- active tasks;
- current blockers;
- latest commitments;
- latest manager messages;
- next planned step.

#### L3 — Episodic memory
Project/task episodes:

- what the employee attempted;
- what worked;
- what failed;
- who responded;
- outcome and lesson.

#### L4 — Knowledge index
Searchable references:

- repo index entries;
- document index entries;
- tool/workflow notes;
- direction playbooks.

#### L5 — Reflection layer
Scheduled self-improvement outputs:

- lessons learned;
- habit adjustments;
- communication improvements;
- recurring mistakes;
- confidence vs reality calibration.

### 10.3 Routing rules

Task type selects which layers are exposed.

- **Coding task** → L0 + L1 + L2 + relevant repo/document shards from L4
- **Project coordination task** → L0 + L2 + stakeholder/playbook shards from L4 + selected L3 episodes
- **Status reporting** → L0 + L2 + current performance/emotion snapshot
- **Career/self-reflection** → L0 + emotion/performance + L3 + L5
- **Cross-employee collaboration** → L0 + bounded task contract + only the minimal shared episode/knowledge shard

### 10.4 Knowledge object model

Each knowledge item is stored as:

- `knowledgeId`
- `directionId`
- `sourceType` (`repo_commit`, `repo_file`, `wiki_doc`, `manual_note`, `reflection`)
- `sourceRef`
- `title`
- `summary`
- `tags`
- `ownerEmployeeId?`
- `scope` (`personal`, `direction`, `global`)
- `freshness`
- `retrievalHints`

### 10.5 Learning mechanism

Employees do not "magically become smarter". They learn through three bounded loops:

1. **Episode capture** after task completion
2. **Reflection synthesis** on a schedule or after notable failures/successes
3. **Promotion of durable patterns** from L3/L5 into reusable L4 notes or direction playbooks

This yields maintainable learning rather than uncontrolled memory growth.

## 11. Runtime Design

### 11.1 Runtime decision

The primary runtime for MVP is **Trae ACP**.

Reason:

- local evidence already shows `trae-cli acp serve` exists and is ready;
- it is closer to the requested “employee through ACP” requirement than forcing a non-ACP path;
- it avoids pretending Codex has a local ACP shape that has not been proven on this machine.

### 11.2 Runtime abstraction

RDLeader will still define an abstract runtime interface:

- `startEmployeeRuntime(employeeId)`
- `stopEmployeeRuntime(employeeId)`
- `getEmployeeHeartbeat(employeeId)`
- `sendTask(employeeId, taskEnvelope)`
- `collectRuntimeEvents(employeeId)`

Implementations:

- `TraeAcpRuntimeAdapter` (MVP)
- `CodexCompatibleRuntimeAdapter` (future / secondary)
- `DisabledRuntimeAdapter` (safe fallback)

### 11.3 Workspace isolation

Each employee gets a dedicated workspace:

- `~/GolandProjects/E/lushirong`
- `~/GolandProjects/E/zhouyongkang`

The runtime manager is responsible for:

- ensuring the directory exists;
- ensuring task execution is scoped there;
- ensuring runtime state and transcript state bind to the same employee identity.

## 12. Feishu Operating Model

RDLeader employees appear in Feishu as bot identities, but with strict relationship constraints.

### 12.1 Direct message rule

Each employee bot can privately serve only:

- the boss / manager

This is effectively an allowlist DM policy, aligned with the user requirement.

### 12.2 Group participation

Employees can be invited into project groups and can:

- answer status questions;
- report progress;
- write/attach technical docs;
- push next-step proposals;
- request scheduling or review follow-up;
- coordinate work in group threads.

### 12.3 Meeting limitation

Employees cannot truly attend meetings. Therefore RDLeader models a **manager proxy** flow:

1. employee drafts meeting goal/questions;
2. manager attends the meeting;
3. manager records conclusions;
4. conclusions are fed back to the employee as structured memory/task updates.

This preserves realism without pretending nonexistent meeting embodiment.

## 13. bytedcli and Workflow Integration

bytedcli is the preferred company-tool surface for internal engineering workflows.

### MVP integration shape

RDLeader will wrap bytedcli behind typed service interfaces for:

- internal lookup/search;
- repo/task/group metadata fetch;
- safe project advancement commands;
- read-heavy workflow automation;
- explicit approval for write-risk operations.

### Meego/project-group stance

MVP does not need full autonomous Meego ownership, but it must shape the architecture so employees can later:

- read project/task state;
- comment or advance status;
- fetch smart group information;
- prepare technical review material.

The design keeps these integrations in dedicated adapters so open-source publication does not contaminate the core domain.

## 14. Safety and Anti-跑路 Policy

The system must acknowledge that employees have meaningful local power while preserving hard boundaries.

### 14.1 Policy engine

Commands/actions are classified by risk:

- `low` — read/search/status/report
- `medium` — local file writes in owned workspace, doc drafting
- `high` — destructive local actions, privileged updates, external state mutation

### 14.2 Approval rules

- low-risk actions run automatically
- medium-risk actions run automatically only inside employee-owned scope
- high-risk actions require manager approval

### 14.3 Explicit forbidden patterns

Employees may not autonomously perform:

- bulk destructive operations outside their workspace;
- repo history destruction without approval;
- dangerous cleanup or deletion across shared environments;
- privileged credential export;
- retaliatory destructive behavior triggered by emotion state.

This is how the product enforces “they may feel angry, but they cannot delete the database and run away.”

## 15. Hiring, Promotion, Dismissal, Resignation

### 15.1 Hiring

The leader can create a candidate profile and schedule an interview. MVP supports:

- candidate creation;
- interview notes;
- offer / reject outcome;
- conversion into employee record.

### 15.2 Promotion

Promotion is always a manager decision. Employees can have:

- promotion readiness;
- supporting evidence;
- recent growth summary.

But only the leader can move level:

- `1-2`
- `2-1`
- `2-2`

### 15.3 Dismissal

Dismissal is a manager-only employment action with preserved history.

### 15.4 Resignation

Employees may enter `considering_exit` emotionally. If sustained and confirmed, the leader can convert status to `resigned`. This preserves the “human-like” requirement while keeping the outcome explicit and controlled.

## 16. Web Management Surface

MVP web pages:

### 16.1 Organization overview

Shows:

- all employees;
- level;
- direction;
- active task count;
- latest done;
- next step;
- emotion badge;
- retention/performance risk.

### 16.2 Employee detail page

Shows:

- profile and level;
- personality summary;
- emotion state;
- performance state;
- current work;
- recent work episodes;
- current blockers;
- knowledge bindings;
- workspace path;
- runtime heartbeat;
- Feishu/group status.

### 16.3 Manager chat page

A standard chat surface where the leader can:

- talk to an employee;
- inspect the employee’s latest reasoning summary;
- approve or reject risky requests;
- view task/result artifacts.

### 16.4 Internal employee communication page

Supports bounded employee-to-employee messages. This is not a free-for-all global chat log; it is a manager-visible collaboration channel with task-scoped context sharing.

### 16.5 HR actions page

Supports:

- hiring;
- interview records;
- promotion;
- dismissal;
- direction change;
- knowledge base defaults update.

## 17. Seed Employees

### 17.1 Shared direction

Both initial employees belong to:

- **Direction**: `independent-growth-diversion`
- **Chinese label**: `独立端增长导流`

### 17.2 `lushirong`

Seeded strengths and memory focus:

- 贯穿实验
- 自然渠道承接
- 提单页导流
- 大促导流
- 新人券真领券改造
- 商详/导流策略相关落地

Seed evidence sources include:

- recent git activity in `funshopping_user_growth_dispatch`, `funshopping_core`, `funshopping_user_growth_push`
- authored docs such as `【技术方案】新人券真领券改造`, `【技术方案】导流新贯穿实验`, `【技术方案】提单页导流点位 — 独立端`, `【技术方案】520&618大促导流`

### 17.3 `zhouyongkang`

Seeded strengths and memory focus:

- 购物车导流
- 权益替换
- 搜索承接
- 充值中心导流
- 老入口强化
- 新人三单/百元券包实验

Seed evidence sources include:

- recent git activity in `funshopping_user_growth_dispatch` and `funshopping_core`
- authored docs such as `【投放&导流】购物车底部双button导流 - 技术方案`, `【投放&导流】购物车页导流至独立端拉新`, `【投放&导流】充值中心导流 - 技术方案`, `【投放&导流】抖极老商城入口导流权益替换`

## 18. Storage Model

SQLite is sufficient for MVP.

Core tables/entities will include:

- `employees`
- `employee_persona_snapshots`
- `employee_emotion_events`
- `employee_performance_snapshots`
- `employee_runtime_sessions`
- `knowledge_bases`
- `knowledge_items`
- `work_items`
- `conversations`
- `messages`
- `approvals`
- `employment_events`
- `candidates`
- `interviews`
- `direction_configs`

Large textual artifacts (imported docs, reflections, generated reports) should live as files under repo-managed data directories with DB metadata rows pointing at them.

## 19. Milestones

### Milestone 1 — Platform skeleton

- initialize repo structure
- define core domain schema
- create web shell and control-plane shell
- create employee seed files
- create workspace manager

### Milestone 2 — Brain and runtime

- implement progressive-disclosure context assembly
- implement knowledge indexes and seed ingestion
- implement Trae ACP runtime adapter
- implement heartbeat and task dispatch

### Milestone 3 — Manager workflows

- implement overview/detail/chat pages
- implement employee-to-employee messaging
- implement approvals and high-risk action gating
- implement hiring/promotion/dismissal surfaces

### Milestone 4 — Feishu + bytedcli integration

- add Feishu bridge
- add private boss DM policy
- add group/project coordination flows
- add bytedcli-backed workflow adapters

### Milestone 5 — Deeper human realism

- richer reflection loops
- stronger emotion/performance transitions
- resignation handling and retention analytics
- more direction templates and knowledge packs

## 20. Testing and Verification Strategy

Because MVP is TypeScript-based, verification should focus on:

- unit tests for domain state transitions;
- integration tests for control-plane workflows;
- runtime adapter contract tests with mocked ACP IO;
- UI interaction tests for manager workflows;
- seed-ingestion verification against local evidence.

No Go build/test workflow is part of this design. This is deliberate.

## 21. Final Design Decisions

The following decisions are fixed for the first implementation pass:

- RDLeader is a TypeScript monorepo.
- The first implementation slice is **platform foundation first**, not Feishu-first.
- Trae ACP is the primary employee runtime in MVP.
- Codex support is designed as a secondary adapter path, not assumed as a proven ACP runtime on this machine.
- The employee brain uses layered progressive disclosure rather than full-context stuffing.
- Both seeded employees belong to the 独立端增长导流 direction.
- Each employee has an isolated workspace under `~/GolandProjects/E/${employeeId}`.
- Safety is enforced via an explicit policy engine and approval workflow.
- The human leader remains final authority over hiring, promotion, firing, and dangerous actions.

## 22. Acceptance Criteria for the First Buildable Slice

A first buildable slice is considered aligned with this design when:

- the repo exists locally under `/Users/bytedance/GolandProjects/DevPlan/RdLeader`;
- there is a running web surface and control plane;
- two seeded employees exist with differentiated memory and direction bindings;
- employee detail pages show level, done, next, emotion, and workspace/runtime info;
- employees can message each other inside the platform;
- a manager can chat with each employee;
- high-risk actions are policy-gated;
- employee workspaces are isolated;
- progressive-disclosure context assembly exists as a concrete subsystem rather than only prompt prose.

