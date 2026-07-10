# RDLeader License Decision Packet

> Decision-ready checklist for choosing RDLeader's public reuse posture. This packet does not grant a license and does not add a root `LICENSE` file.

## Current decision

No final license has been chosen.

Until a root `LICENSE` file is published and README wording is updated, RDLeader should be treated as public source for review, architecture, packaging, QA evidence, and sponsorware visibility — not as unrestricted open-source reuse.

## Why this matters now

RDLeader now has a public proof ladder, fake demo state, browser walkthrough, captioned video, landing copy, distribution kit, submission tracker, and external/community PRs. That makes the license posture more important because reviewers and potential sponsors can now plausibly ask:

- Can I reuse this code?
- Can I fork it commercially?
- Can I package it internally?
- Can I contribute back?
- Are private DevPlan artifacts included in the license?

The answer should be explicit before broader promotion.

## Decision paths

### Path A — permissive open source

Choose this if the intent is to make the public repository reusable by outside developers.

Recommended default: **Apache-2.0**.

Why:

- permissive enough for broad adoption;
- includes explicit patent grant language;
- common for infrastructure / platform code;
- clearer for companies evaluating reuse than an unlicensed public repo.

Implementation steps:

1. Add a root `LICENSE` file using Apache-2.0 text.
2. Update README `License / reuse status` to say Apache-2.0 applies to the public repository.
3. Keep a caveat that private DevPlan artifacts, credentials, logs, and non-published material are not included.
4. Confirm GitHub recognizes the license in repository metadata.
5. Close [RDLeader#3](https://github.com/happysnaker/RDLeader/issues/3) with evidence.

Verification commands:

```bash
gh repo view happysnaker/RDLeader --json licenseInfo --jq .licenseInfo
pnpm docs:check
pnpm test
```

### Path B — source-available for now

Choose this if the DevPlan-derived bundle should stay conservative while public-safe slices continue to be separated.

Recommended action: keep no root `LICENSE` file for now, but make the restriction explicit.

Implementation steps:

1. Do not add a root `LICENSE` file yet.
2. Keep README wording that says unrestricted reuse is not granted.
3. Keep [license-decision.md](license-decision.md) and this packet linked from README.
4. Add a dated re-evaluation trigger, for example after `RDLeader#1` public sanitization is complete.
5. Keep external promotion copy focused on review/demo/proof surfaces, not reuse claims.

Verification commands:

```bash
gh repo view happysnaker/RDLeader --json licenseInfo --jq .licenseInfo
pnpm docs:check
pnpm test
```

Expected GitHub metadata for this path: no recognized license.

## Decision matrix

| Question | Apache-2.0 | Source-available for now |
|---|---|---|
| Want external reuse? | yes | no / not yet |
| Want company-friendly permissive terms? | yes | no |
| Want explicit patent grant? | yes | no |
| Still worried about DevPlan-derived code boundaries? | manageable with caveats | safer default |
| Want easier public submissions / awesome-list acceptance? | yes | weaker |
| Need more sanitization first? | maybe | yes |

## What license does not cover

Whichever path is chosen, do **not** imply that the public license grants access to:

- private DevPlan logs;
- private workspace paths;
- app IDs, open IDs, chat IDs, message IDs;
- QR onboarding artifacts;
- internal document links;
- raw live integration output;
- credentials or secret references;
- unpublished local operator workflows.

## Sponsor / promotion implications

| Scenario | Recommended wording |
|---|---|
| Apache-2.0 chosen | “RDLeader is Apache-2.0 licensed; private DevPlan artifacts are not included.” |
| Source-available for now | “RDLeader is public for review and packaging visibility; reuse terms are not finalized yet.” |
| Asked by a sponsor | “Sponsorship funds public packaging, documentation, QA evidence, and demo polish, not access to private artifacts.” |
| Asked by a contributor | “Please wait for the license decision before assuming redistribution or commercial reuse.” |

## Minimum closure checklist for RDLeader#3

- [ ] Choose Path A or Path B explicitly.
- [ ] Update README wording to match the chosen path.
- [ ] If Path A, add root `LICENSE` and verify GitHub metadata.
- [ ] If Path B, keep no root `LICENSE` and record the re-evaluation trigger.
- [ ] Run `pnpm docs:check`.
- [ ] Run `pnpm test`.
- [ ] Comment on [RDLeader#3](https://github.com/happysnaker/RDLeader/issues/3) with the decision and evidence.

## Current non-binding recommendation

If the owner wants broad outside reuse, choose **Apache-2.0**.

If the owner wants to keep the DevPlan-derived bundle conservative until more sanitization is complete, choose **source-available for now** and re-evaluate after [RDLeader#1](https://github.com/happysnaker/RDLeader/issues/1).
