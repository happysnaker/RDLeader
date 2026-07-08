# RDLeader Public Demo Reset

> One-command fake-data reset path for outside reviewers. This creates a local SQLite database with synthetic workers, work items, runtime events, approval requests, and QA evidence summaries.

## Command

From the repository root:

```bash
pnpm demo:reset
```

Default output:

```text
data/public-demo.db
```

The generated database is intentionally ignored by Git. Re-run the command any time you want to reset the public demo state back to deterministic fake data.

## Custom output path

```bash
pnpm demo:reset -- --database /tmp/rdleader-public-demo.db
```

or:

```bash
RDLEADER_PUBLIC_DEMO_DB=/tmp/rdleader-public-demo.db pnpm demo:reset
```

## Expected summary

The command prints a JSON summary like this:

```json
{
  "ok": true,
  "databasePath": "data/public-demo.db",
  "employees": 2,
  "workItems": 4,
  "runtimeDispatches": 2,
  "runtimeResults": 2,
  "approvalRequests": 2,
  "qaEpisodes": 2
}
```

## What gets seeded

| Surface | Fake-data examples |
|---|---|
| Workers | `Alex Runtime`, `Maya Systems` |
| Work items | stale runtime recovery, approval-boundary copy, QA evidence, demo reset docs |
| Runtime dispatches | task envelopes written to synthetic `demo://workers/...` task refs |
| Runtime results | one `completed` event and one `blocked` event |
| Approval requests | one `pending` external-update request and one `approved` public-QA-note request |
| QA evidence summaries | smoke-suite and runtime-endurance work episodes |

## Public-safety guarantees

The reset path is built for public demos only:

- no real employee names;
- no private workspace paths;
- no app IDs, open IDs, chat IDs, message IDs, or QR artifacts;
- no internal document links;
- no raw terminal output from live integrations;
- no external API calls.

The public demo values use synthetic IDs such as `alex-runtime`, `maya-systems`, `demo-group-control-plane`, and `demo://workers/...`.

## Verification surface

The command is covered by `apps/server/src/demo/public-demo-reset.test.ts`, which checks:

- idempotent reset behavior;
- exact fake-data counts;
- fake worker names and statuses;
- runtime dispatch/result surfaces;
- approval request surfaces;
- QA episode surfaces;
- absence of sensitive-looking patterns in the seeded public tables;
- presence of the root `demo:reset` script.

Local verification:

```bash
pnpm --filter @rdleader/server test
pnpm test
```
