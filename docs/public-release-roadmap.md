# RDLeader Public Release Roadmap

> Goal: turn the richer local DevPlan build into a public, sponsor-friendly project without leaking private workspace evidence, organization identifiers, or live integration artifacts.

RDLeader is being developed local-first. The DevPlan build can move faster than the public repository because it uses real local workspaces, real QA reports, and live integration checks. The public repository should publish the product shape and reusable engineering patterns, not private operational traces.

## Release principles

1. **Public-safe by default** — no app secrets, QR images, chat IDs, open IDs, private workspace paths, raw live-integration logs, or organization-specific evidence.
2. **Evidence without leakage** — public docs should summarize verification scope and results, while raw reports stay local unless redacted.
3. **Small reviewable slices** — publish the DevPlan feature bundle as themed commits / PRs instead of one large dump.
4. **Operator honesty** — describe what is implemented, what is simulated, what is blocked by external permissions, and what remains prototype-grade.
5. **Sponsor clarity** — make it obvious which work is free core infrastructure and which work can be accelerated by sponsorship.

## Public release slices

| Slice | Public value | Publishable artifacts | Do not publish |
|---|---|---|---|
| Runtime endurance | Shows the control plane can recover stale work and collect structured results | sanitized runtime design notes, fake-result examples, endurance summary | local worker paths, raw result JSON from live workspaces |
| QA ops panel | Shows the project is operated with evidence, not vibes | screenshots with fake/demo identities, checklist summaries, script names | raw browser dumps, real chat IDs, open IDs, private screenshots |
| Employee-agent model | Explains one-worker/one-bot isolation and routing | architecture docs, redacted config templates, secret-reference patterns | app IDs, app secrets, QR onboarding artifacts, real bot identities |
| Project group routing | Shows how manager proxy / bot direct routes are represented | sanitized state diagrams, demo chat IDs, external-blocker taxonomy | live group names/IDs, message IDs, org-specific permission output |
| Local demo | Lets outsiders understand the product quickly | fake seed data, reset script, demo video / GIF | company-specific docs, internal work item IDs, raw bytedcli/lark-cli output |

## Sponsorware candidates

These are concrete, sponsor-friendly work packages that improve the public project without requiring private infrastructure access.

| Package | Outcome | Suggested funding target |
|---|---|---:|
| Public demo video | **Shipped first slice:** fake-data SVG assets plus a 40-second walkthrough MP4 | completed |
| Sanitized QA evidence bundle | **Shipped first slice:** public QA evidence summary with test scope, smoke coverage, endurance summary, and redaction policy | completed |
| Runtime and approval deep dive | **Shipped:** task envelopes, result events, approval boundaries, failure modes, and QA evidence mapping | completed |
| Employee-agent onboarding guide | **Shipped:** public guide for isolated employee bot homes, secret refs, setup/status commands, and failure modes | [RDLeader#16](https://github.com/happysnaker/RDLeader/issues/16) |
| One-command public demo reset path | **Shipped first slice:** `pnpm demo:reset` creates deterministic fake worker/runtime/approval/QA state | [RDLeader#15](https://github.com/happysnaker/RDLeader/issues/15) |
| Browser walkthrough over public demo state | **Shipped:** fake demo reset state connected to browser setup, API smoke checks, UI shot list, and screenshot safety rules | [RDLeader#17](https://github.com/happysnaker/RDLeader/issues/17) |
| Public landing-page section | Turn the proof assets into a reviewer/sponsor-friendly narrative and CTA | [RDLeader#18](https://github.com/happysnaker/RDLeader/issues/18) |

Support page: <https://happysnaker.github.io/support/>

## Suggested public issue flow

Use GitHub issues as the public roadmap surface:

- `public-packaging` — safe docs, demo assets, redaction policy
- `roadmap` — planned product work
- `sponsorship` — work that can be accelerated by funding
- `good first issue` — small docs, fake demo data, or UI copy improvements

## Redaction checklist before any public commit

Before publishing DevPlan-derived content, scan for:

- `cli_...` app IDs
- `ou_...` open IDs
- `oc_...` chat IDs
- `om_...` message IDs
- live QR / upload screenshots
- raw local upload artifacts
- private workspace paths such as `/Users/...`
- internal document URLs
- raw command output from organization-specific tools
- payment screenshots or personal account identifiers

If a file contains these, either redact it, replace it with fake/demo values, or keep it local.

## Current public status

As of the current public baseline:

- README explains the control-plane architecture and DevPlan-safe positioning.
- `.gitignore` blocks local upload artifacts, raw QA notes, raw QA reports, and local UI captures.
- Issue #1 tracks the public release checklist for sanitizing the DevPlan feature bundle.

Current public milestone: sanitized QA evidence, runtime endurance notes, a public-safe demo walkthrough script, fake-data SVG demo assets, a rendered short walkthrough video, a runtime/approval deep dive, a one-command demo reset path, an employee-agent onboarding guide, a browser walkthrough, and a promo kit are published under `docs/public/`; next milestone is the public landing-page section in [RDLeader#18](https://github.com/happysnaker/RDLeader/issues/18), plus license posture and broader DevPlan bundle sanitization.
