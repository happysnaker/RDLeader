# RDLeader Public QA Evidence Summary

> This is a sanitized public summary. Raw local QA logs are intentionally not published because they can include private workspace paths, live chat identifiers, organization-specific command output, or integration evidence.

RDLeader is operated with an evidence-first loop: tests and local smoke checks prove the control plane can load workers, dispatch work, collect runtime results, recover stale tasks, and reset demo state. The public repository should expose the verification model without leaking the live DevPlan environment.

## What the local QA loop covers

| Area | Public-safe verification claim | Evidence shape kept local |
|---|---|---|
| Server API | Employee list/detail, work items, runtime sessions, project operations, approvals, HR lifecycle, autonomy, and reset flows are covered by integration-style API tests | test output and local database state |
| Web UI | The manager UI renders overview, execution, collaboration, growth, management, QA, and ops surfaces with component/app tests | test output and browser traces |
| Runtime dispatch | Runtime start/stop, task envelope creation, stale processing recovery, result collection, and result archiving are covered | task/result file paths and worker logs |
| Project operations | Project group binding, route repair, dry-run commands, and external-blocker surfacing are covered | live integration command output |
| Autonomy loop | Autonomous learning, auto-created work items, recovery dispatches, and peer-sync messages are covered | local control-plane records |
| Demo reset | Clean demo-state reset is covered so the product can be shown from a stable baseline | local DB reset output |

## Latest sanitized DevPlan baseline

The current local evidence bundle records these public-safe outcomes:

- local unit / integration suite: **passing**
- local smoke checks: **47 / 47 passing**
- runtime endurance loop: **10 / 10 cycles passing**
- project group route repair: **passing**
- clean demo-state reset: **passing**
- browser validation: overview, execution, collaboration, growth, and management surfaces render in the local DevPlan UI

These numbers are deliberately summarized rather than linked to raw logs. The raw logs can contain private local paths and live integration identifiers.

## Redaction policy

Before any QA artifact becomes public, it must remove or replace:

- real app IDs, open IDs, chat IDs, and message IDs
- live QR / onboarding images
- private workspace paths
- organization-specific document URLs
- raw command output from local enterprise tooling
- payment screenshots or personal account identifiers
- screenshots showing private names, groups, documents, or messages

Use fake/demo identities and synthetic identifiers in public docs.

## Public evidence still needed

The next useful public artifacts are:

1. A fake-data browser screenshot set for the main RDLeader tabs.
2. A redacted QA table generated from synthetic/demo data.
3. A short demo video showing the runtime loop without private workspace paths.
4. A GitHub Actions workflow for the public subset once the DevPlan feature bundle is sanitized into public commits.

## Sponsorware hook

The **Sanitized QA evidence bundle** is a sponsor-friendly package: it converts local proof into public, reusable documentation and demo assets without exposing private infrastructure.

Suggested target: **¥99**.

Support page: <https://happysnaker.github.io/support/>
