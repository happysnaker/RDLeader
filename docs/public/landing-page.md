# RDLeader Public Landing Page Section

> Copy-ready landing section for reviewers, sponsors, and people arriving from GitHub Discussions or social posts. It uses only public-safe proof surfaces.

## One-sentence positioning

RDLeader is a local-first control plane for supervising AI R&D workers: task ownership, progressive context, runtime dispatch, result collection, approval gates, and evidence-first QA.

## Short landing section

**RDLeader is not another agent chat UI.** It is a small control plane for what happens after more than one AI worker is running:

- who owns which task;
- what context was loaded;
- which runtime received the task;
- what result came back;
- what is blocked;
- which external actions require human approval;
- what evidence proves the system is healthy.

The public repo is released in safe slices. Raw DevPlan logs stay local because they can contain private paths, identifiers, and live integration traces. Public docs expose the product shape, contracts, fake-data demos, and verification model.

## Proof ladder

Open these in order if you only have a few minutes:

| Step | Proof surface | What it proves |
|---|---|---|
| 1 | [Public demo reset](demo-reset.md) | `pnpm demo:reset` creates deterministic fake worker, work item, runtime, approval, and QA state |
| 2 | [Browser walkthrough](browser-walkthrough.md) | the fake state can be inspected through the manager UI without default/private seed workers |
| 3 | [Runtime and approval deep dive](runtime-approval-deep-dive.md) | task envelopes, result events, fail-closed external actions, and recovery modes are explicit |
| 4 | [Employee-agent onboarding](employee-agent-onboarding.md) | worker homes, runtime homes, manager-only communication, and secret refs are documented safely |
| 5 | [QA evidence](qa-evidence.md) | tests, smoke checks, endurance loops, and public redaction rules are summarized without raw logs |
| 6 | [Public-safe walkthrough video](walkthrough-video.md) | synthetic visuals show the control-plane shape without DevPlan screenshots |

## Reviewer quick path

```bash
pnpm install --no-frozen-lockfile
pnpm docs:check
pnpm demo:reset
pnpm test
```

Then run the browser walkthrough:

```bash
pnpm demo:server
pnpm dev:web
```

Open `http://127.0.0.1:5173` and confirm the demo workers are `Alex Runtime` and `Maya Systems`.

## Sponsor CTA

The core project remains public. Sponsorship accelerates packaging work that takes time to do well:

- safe demo assets;
- redacted QA evidence;
- browser walkthrough polish;
- narrated videos / GIFs;
- landing-page copy;
- DevPlan bundle sanitization;
- license/reuse posture clarification.

Current support route: <https://happysnaker.github.io/support/>.

Best payment note format: `RDLeader #issue`, for example the current sponsorware issue listed in the roadmap.

## README snippet

```markdown
RDLeader is a local-first control plane for supervising AI R&D workers: task ownership, progressive context, runtime dispatch, result collection, approval gates, and evidence-first QA.

Start here:

1. `pnpm demo:reset` — deterministic fake demo state
2. browser walkthrough — fake workers only, no DevPlan screenshots
3. runtime/approval deep dive — task envelopes, result events, fail-closed external actions
4. employee-agent onboarding — worker homes, runtime homes, manager-only boundaries, secret refs
5. QA evidence — what is tested and what stays private
```

## GitHub Discussion update snippet

```markdown
RDLeader now has a public proof ladder:

- `pnpm demo:reset` for deterministic fake state
- browser walkthrough over that fake state
- runtime/approval deep dive
- employee-agent onboarding guide
- QA evidence summary
- public-safe walkthrough video

This keeps the public repo useful without dumping DevPlan logs, private paths, app IDs, chat IDs, QR artifacts, or live integration output.
```

## X / short-post draft

RDLeader is my local-first control plane for AI R&D workers.

Not another chat UI. The public proof ladder now includes:

- fake demo reset: `pnpm demo:reset`
- browser walkthrough
- runtime + approval deep dive
- employee-agent onboarding
- QA evidence

The point: task ownership, runtime evidence, approvals, and recovery loops.

## LinkedIn draft

I’m publishing RDLeader in public-safe slices.

The project is a local-first control plane for AI R&D workers. The problem is not “can an agent answer a prompt?” It is what happens once multiple workers are running:

- Who owns the task?
- What context was loaded?
- Which runtime received it?
- What result came back?
- What is blocked?
- Which external actions need approval?
- What evidence proves the system is healthy?

The public repo now has a deterministic fake-data reset path, a browser walkthrough, runtime/approval docs, an employee-agent onboarding guide, QA evidence, and a public-safe video. Raw DevPlan logs stay local because they can contain private paths and live integration identifiers.

## Public-safety checklist

Do not publish a landing screenshot, post, or recording unless it avoids:

- real employee names;
- private workspace paths;
- app IDs, open IDs, chat IDs, message IDs;
- QR onboarding artifacts;
- internal document links;
- raw terminal output from live integrations;
- payment screenshots or personal account identifiers.
