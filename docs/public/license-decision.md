# RDLeader License Decision Note

> RDLeader is public, but its final license posture is not decided yet. This note explains the decision space so the repository does not accidentally imply unrestricted reuse before a license is published.

## Current posture

- The repository is public for architecture, packaging, QA evidence, and sponsorware visibility.
- No project-specific `LICENSE` file is published yet.
- Until a license is chosen, do not assume unrestricted reuse, redistribution, or commercial use.
- The decision is tracked in [RDLeader#3](https://github.com/happysnaker/RDLeader/issues/3).

## Options under consideration

| Option | Fit | Tradeoff |
|---|---|---|
| MIT | Simple permissive reuse | weakest explicit patent language |
| Apache-2.0 | Permissive reuse plus patent grant | slightly longer / heavier than MIT |
| AGPL-style copyleft | keeps hosted/network derivatives open | can reduce adoption for infra users |
| Source-available for now | safer while DevPlan bundle is being sanitized | limits external reuse and contributions |

## Criteria

The license should match these constraints:

- RDLeader is an agent-operations / local control-plane project, not only a UI demo.
- The public repo is being released from a richer local DevPlan build in safe slices.
- Some local artifacts are intentionally not public because they may contain private operational evidence.
- The chosen license should not imply access to private DevPlan artifacts, credentials, or live integration evidence.
- The chosen license should make it clear how outside users can reuse public code and docs.


## Current recommendation

Non-legal operational recommendation:

- If the intent is to make RDLeader a normal permissive open-source project for outside reuse, **Apache-2.0** is the best default because it is permissive and includes an explicit patent grant.
- If the DevPlan-derived feature bundle still feels too sensitive to open for reuse, keep the repository source-available for now and revisit the license after more public-safe slices are separated.
- Avoid implying broad commercial reuse until a root `LICENSE` file exists.

This recommendation does not choose the license automatically; it narrows the decision for [RDLeader#3](https://github.com/happysnaker/RDLeader/issues/3). For an executable decision checklist, see [license-decision-packet.md](license-decision-packet.md).

## Before wider promotion

Before broad external promotion, finish this checklist:

- choose a license posture;
- add a root `LICENSE` file if open-source licensing is intended;
- update README language to match the decision;
- confirm GitHub recognizes the license;
- keep private DevPlan artifacts excluded from the public repository.

## What this note is not

This is not legal advice and not a final license grant. It is a public readiness note to avoid ambiguity while RDLeader is being packaged.
