# RDLeader Public Demo Distribution Kit

> Public-safe distribution kit for introducing RDLeader without leaking DevPlan logs, private paths, internal identifiers, QR artifacts, or live integration output.

## Distribution angle

RDLeader is a local-first control plane for supervising AI R&D workers. The strongest public claim is not “another agent UI”; it is the proof ladder around agent operations:

- deterministic fake demo state;
- browser walkthrough over that fake state;
- runtime dispatch and result collection contracts;
- approval gates for external actions;
- employee-agent onboarding boundaries;
- QA evidence and public redaction rules;
- captioned walkthrough video and landing copy.

## Asset index

| Asset | Link | Use it for |
|---|---|---|
| Landing-page section | [landing-page.md](landing-page.md) | first link for reviewers and sponsors |
| Captioned browser video | [narrated-walkthrough-video.md](narrated-walkthrough-video.md) | social posts, project directories, quick context |
| MP4 asset | [rdleader-browser-walkthrough-narrated.mp4](assets/rdleader-browser-walkthrough-narrated.mp4) | direct video attachment / preview |
| Demo reset | [demo-reset.md](demo-reset.md) | reproducibility proof: `pnpm demo:reset` |
| Browser walkthrough | [browser-walkthrough.md](browser-walkthrough.md) | step-by-step reviewer flow |
| Runtime/approval deep dive | [runtime-approval-deep-dive.md](runtime-approval-deep-dive.md) | technical credibility for agent-ops claims |
| Employee-agent onboarding | [employee-agent-onboarding.md](employee-agent-onboarding.md) | worker identity, runtime home, secret refs, manager-only boundary |
| QA evidence | [qa-evidence.md](qa-evidence.md) | verification posture and redaction policy |
| Public roadmap | [../public-release-roadmap.md](../public-release-roadmap.md) | sponsorware history and next targets |

## Target-community checklist

Use this checklist before posting anywhere:

- [ ] Start with the landing-page section, not a wall of links.
- [ ] Include one proof link and one visual link.
- [ ] Mention `pnpm demo:reset` only when the audience cares about reproducibility.
- [ ] Mention runtime/approval only when the audience cares about agent operations.
- [ ] Avoid implying it is a finished enterprise product.
- [ ] Avoid publishing raw terminal output, private paths, app IDs, open IDs, chat IDs, message IDs, QR artifacts, or internal document links.
- [ ] Use a support CTA only after explaining the concrete public packaging work.

Suggested places to adapt this kit:

| Surface | Best angle | Primary link |
|---|---|---|
| GitHub Discussions / Show and Tell | proof ladder + public-safe release slices | [landing-page.md](landing-page.md) |
| X / short posts | not another chat UI; control plane around agents | [narrated-walkthrough-video.md](narrated-walkthrough-video.md) |
| LinkedIn | operational problem after multiple agents are running | [landing-page.md](landing-page.md) |
| weekly/project directories | reproducible fake demo + proof docs | [demo-reset.md](demo-reset.md) |
| sponsor/support thread | current sponsor target + shipped slices | [../public-release-roadmap.md](../public-release-roadmap.md) |

## GitHub Discussion copy

```markdown
I’m publishing RDLeader in public-safe slices.

RDLeader is a local-first control plane for supervising AI R&D workers: task ownership, context routing, runtime dispatch, result collection, approval gates, and QA evidence.

Current proof ladder:

- `pnpm demo:reset` creates deterministic fake worker/runtime/approval/QA state
- browser walkthrough over that fake state
- runtime/approval deep dive
- employee-agent onboarding guide
- QA evidence summary
- captioned browser walkthrough video

The point is to show agent operations without dumping DevPlan logs, private paths, app IDs, chat IDs, QR artifacts, or live integration output.
```

## X / short-post copy

```text
RDLeader is my local-first control plane for AI R&D workers.

Not another chat UI.

The public proof ladder now has:
- pnpm demo:reset
- browser walkthrough
- runtime + approval deep dive
- employee-agent onboarding
- QA evidence
- captioned demo video

Focus: task ownership, runtime evidence, approvals, recovery loops.
```

## LinkedIn copy

```markdown
I’m publishing RDLeader as public-safe slices instead of dumping private local evidence.

RDLeader is a local-first control plane for AI R&D workers. The problem I care about is what happens after multiple workers are running:

- Who owns the task?
- What context was loaded?
- Which runtime received it?
- What result came back?
- What is blocked?
- Which external actions require approval?
- What evidence proves the system is healthy?

The public proof ladder now includes deterministic fake demo state, a browser walkthrough, runtime/approval docs, employee-agent onboarding, QA evidence, and a captioned walkthrough video. Raw DevPlan logs stay local because they can contain private paths and live integration identifiers.
```

## Weekly / project-directory copy

```markdown
RDLeader — local-first control plane for supervising AI R&D workers.

It focuses on the layer around agents: task ownership, context routing, runtime dispatch, result collection, approval gates, and QA evidence.

Public-safe proof surfaces include `pnpm demo:reset`, a browser walkthrough over fake demo state, runtime/approval docs, employee-agent onboarding, QA evidence, and a captioned walkthrough video.
```

## Sponsor CTA

The core project remains public. Sponsorship accelerates packaging work that is useful but time-consuming:

- safe demo assets;
- redacted QA summaries;
- distribution follow-up;
- narrated demos;
- DevPlan bundle sanitization;
- license/reuse posture clarification.

Support page: <https://happysnaker.github.io/support/>.

Use the current sponsorware issue number in the payment note, for example the next current target in [public-release-roadmap.md](../public-release-roadmap.md).

## Submission log template

```markdown
| Date | Surface | Link | Copy variant | Follow-up needed |
|---|---|---|---|---|
| YYYY-MM-DD | GitHub Discussion | pending | proof ladder | check comments in 7 days |
```

Keep the real submission log in a public issue or discussion only if every link and screenshot has been checked for public safety.

Current tracker: [submission-tracker.md](submission-tracker.md). First batch release: [v0.1.1-public-proof-ladder](https://github.com/happysnaker/RDLeader/releases/tag/v0.1.1-public-proof-ladder). Second batch Q&A: [discussion #25](https://github.com/happysnaker/RDLeader/discussions/25).
