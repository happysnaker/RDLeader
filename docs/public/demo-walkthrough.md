# RDLeader Public-Safe Demo Walkthrough

> Purpose: provide a 2-4 minute walkthrough script that can be recorded with fake/demo identities only. Do not use live DevPlan screenshots unless they have been fully redacted.

## Demo promise

Show RDLeader as a local-first control plane for multiple AI R&D workers:

- one human lead
- multiple runtime-backed workers
- explicit task ownership
- visible runtime dispatch and result collection
- human-in-the-loop approval boundaries
- evidence-first QA posture

Do **not** present it as a finished enterprise HR product. It is an agent-operations prototype with a working local control-plane model.

## Demo setup requirements

Use synthetic data such as:

- Manager: `Demo Lead`
- Worker A: `Alex Runtime`
- Worker B: `Maya Systems`
- Direction: `Demo Platform Reliability`
- Project group: `Demo Control Plane QA`
- Work item: `Validate stale runtime recovery`

Replace or hide:

- real employee names
- real workspace paths
- live chat identifiers
- app IDs / bot IDs / message IDs
- internal document links
- QR onboarding images
- raw integration output

## 2-4 minute script

### 0:00-0:15 — Open with the problem

Visual: RDLeader overview page with fake workers.

Narration:

> AI coding agents are easy to start and hard to operate. Once you have more than one worker, the question changes from “can it answer?” to “who owns this task, what context did it receive, what did it do, and when do I need to approve something?”

### 0:15-0:45 — Show the control plane

Visual: employee list, worker detail hero, current work, next step.

Narration:

> RDLeader is a local-first manager console for AI R&D workers. Each worker has a direction, memory, current assignments, runtime state, and operating history. The lead can see what each worker is doing without reading every raw transcript.

Proof points to show:

- worker list
- current task count
- runtime status
- recent done / next step
- tabbed detail surface

### 0:45-1:25 — Show execution loop

Visual: execution tab, task board, runtime dispatch, runtime results.

Narration:

> Work is dispatched as a structured task envelope. The runtime writes back a structured result: completed, blocked, or failed, plus summary and next step. That gives the manager an operating record instead of a hidden chat session.

Proof points to show:

- add or select a work item
- dispatch a fake status task
- show result collection panel
- show archived result summary, not raw private paths

### 1:25-2:00 — Show safety boundary

Visual: approval / management surface or policy explanation.

Narration:

> RDLeader treats risky actions as approval events. The goal is not to make workers sovereign. The lead remains the decision maker, and high-risk operations should become explicit review moments.

Proof points to show:

- approval status
- risk wording
- manager action surface
- no secrets or live external identifiers

### 2:00-2:40 — Show QA posture

Visual: QA/evidence panel or sanitized public QA evidence doc.

Narration:

> The project is operated with evidence. Local smoke checks cover worker lifecycle, runtime dispatch, autonomy, group routing, and demo reset. Endurance checks exercise stale task recovery and result collection across repeated cycles.

Proof points to show:

- sanitized QA summary
- `47 / 47` local smoke checks
- `10 / 10` endurance cycles
- reminder that raw logs stay local because they can contain private identifiers

### 2:40-3:15 — Show roadmap and sponsorware

Visual: public release roadmap and GitHub issues.

Narration:

> The public repo is being released in safe slices: runtime endurance, QA evidence, employee-agent architecture, and demo assets. Sponsorship accelerates the public packaging work: demo video, redacted QA bundle, onboarding guide, and runtime deep dive.

Proof points to show:

- public release roadmap
- sponsorware issue
- support page link

### 3:15-3:45 — Close with the positioning

Visual: README / architecture diagram text.

Narration:

> RDLeader is not another chat UI. It is a small local control plane for supervising AI workers: task ownership, runtime evidence, approvals, and recovery loops. The next step is turning the local DevPlan build into public-safe demos and docs.

## Shot checklist

- [ ] Overview with fake workers
- [ ] Execution tab with fake task dispatch
- [ ] Runtime result panel with redacted paths
- [ ] Approval / management surface
- [ ] QA evidence summary
- [ ] Public release roadmap
- [ ] Sponsorware issue and support link

## Recording rules

- Use a clean demo profile or fake seed data.
- Do not show browser address bars containing private paths or internal apps.
- Do not show raw terminal output from live enterprise tooling.
- Do not show raw QR images or onboarding screens.
- Do not show real group names, message IDs, app IDs, or open IDs.
- If a screen has private evidence, replace it with the public docs instead.

## Demo CTA

Use this CTA at the end:

> If this kind of agent-operations work is useful, support the public packaging effort: demo assets, redacted QA evidence, employee-agent onboarding docs, and runtime endurance deep dives.

Support page: <https://happysnaker.github.io/support/>
