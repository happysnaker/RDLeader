# RDLeader Public Submission and Follow-up Tracker

> Public-safe tracker for RDLeader distribution work. Use this to record where the project has been introduced, which copy variant was used, what asset was linked, and when to follow up.

## Tracker rules

- Track only public-safe surfaces.
- Link to public assets, not private screenshots or raw DevPlan logs.
- Keep status explicit: `planned`, `submitted`, `replied`, or `closed`.
- Record a follow-up date for every submitted item.
- Do not paste private workspace paths, app IDs, open IDs, chat IDs, message IDs, QR artifacts, internal document links, or live integration output.

## Asset short names

| Short name | Public asset |
|---|---|
| `site` | <https://happysnaker.github.io/rdleader/> |
| `landing` | [landing-page.md](landing-page.md) |
| `video` | [narrated-walkthrough-video.md](narrated-walkthrough-video.md) |
| `demo-reset` | [demo-reset.md](demo-reset.md) |
| `browser` | [browser-walkthrough.md](browser-walkthrough.md) |
| `runtime-approval` | [runtime-approval-deep-dive.md](runtime-approval-deep-dive.md) |
| `onboarding` | [employee-agent-onboarding.md](employee-agent-onboarding.md) |
| `qa` | [qa-evidence.md](qa-evidence.md) |
| `distribution` | [distribution-kit.md](distribution-kit.md) |
| `security-proof` | live project-page security proof + latest CI/CodeQL links |

## Submission tracker

| Date | Surface | Status | Public link | Asset(s) | Copy variant | Follow-up |
|---|---|---|---|---|---|---|
| 2026-07-09 | RDLeader public project page | submitted | [project page](https://happysnaker.github.io/rdleader/) | landing, distribution, video, security-proof | external landing page | live page verified with security proof on 2026-07-10; use for future curator follow-up |
| 2026-07-09 | RDLeader public proof-ladder pre-release | submitted | [v0.1.1-public-proof-ladder](https://github.com/happysnaker/RDLeader/releases/tag/v0.1.1-public-proof-ladder) | landing, video, distribution | release proof ladder | check release activity on 2026-07-16 |
| 2026-07-09 | RDLeader Show and Tell discussion | submitted | [discussion #23](https://github.com/happysnaker/RDLeader/discussions/23) | landing, video, demo-reset | GitHub Discussion copy | check comments on 2026-07-16 |
| 2026-07-09 | RDLeader public demo Q&A | submitted | [discussion #25](https://github.com/happysnaker/RDLeader/discussions/25) | demo-reset, browser, video | safe demo Q&A | check answers/comments on 2026-07-16 |
| 2026-07-09 | happysnaker profile proof-hub release | submitted | [RDLeader demo kit](https://github.com/happysnaker/happysnaker/releases/tag/v2026.07-rdleader-demo-kit) | landing, distribution, video | profile proof hub | check release activity on 2026-07-16 |
| 2026-07-09 | RDLeader roadmap / sponsorware discussion | submitted | [discussion #4](https://github.com/happysnaker/RDLeader/discussions/4) | landing, video, distribution | proof ladder updates | check comments on 2026-07-16 |
| 2026-07-09 | happysnaker operations cadence | submitted | [happysnaker#2](https://github.com/happysnaker/happysnaker/issues/2) | landing, video, distribution | operations proof update | check next weekly tick |
| 2026-07-10 | RDLeader project-page security proof | submitted | [project page](https://happysnaker.github.io/rdleader/) / [Pages deploy](https://github.com/happysnaker/happysnaker.github.io/actions/runs/29098623836) | security-proof | security/readiness update | use as follow-up evidence only if reviewers ask or on 2026-07-16 |
| 2026-07-09 | awesome-autonomous-agents PR | submitted | [jbesomi/awesome-autonomous-agents#20](https://github.com/jbesomi/awesome-autonomous-agents/pull/20) | landing, distribution | external/community PR | check review on 2026-07-16 |
| 2026-07-09 | awesome-coding-agents PR | merged | [kailiu42/awesome-coding-agents#13](https://github.com/kailiu42/awesome-coding-agents/pull/13) | landing, distribution | external/community PR | merged 2026-07-09; no further action |
| TBD | X / short-form post | planned | pending | video, landing | X / short-post copy | post after final link check |
| TBD | LinkedIn update | planned | pending | landing, distribution | LinkedIn copy | post after final link check |
| TBD | Weekly / project directory submission | planned | pending | demo-reset, landing | weekly/project-directory copy | choose directory and submit |
| TBD | Sponsor/support update | planned | pending | distribution, roadmap | sponsor CTA | link current sponsor target |

## Copy variants

Use the copy variants from [distribution-kit.md](distribution-kit.md):

- GitHub Discussion copy;
- X / short-post copy;
- LinkedIn copy;
- weekly / project-directory copy;
- sponsor CTA.

## External PR review status

| Date checked | Surface | PR state | Maintainer feedback | Checks | Next action |
|---|---|---|---|---|---|
| 2026-07-10 | [awesome-autonomous-agents#20](https://github.com/jbesomi/awesome-autonomous-agents/pull/20) | open / mergeable | none yet; project page now includes live security proof | no checks reported | wait for maintainer review; if follow-up is needed on 2026-07-16, use the security-proof snippet without repeated bumping |
| 2026-07-10 | [awesome-coding-agents#13](https://github.com/kailiu42/awesome-coding-agents/pull/13) | merged | merged on 2026-07-09; PR body used project page + detailed proof docs | `validate-catalog` success | no action; keep link in proof surfaces |

## Follow-up checklist

For each submitted item:

- [ ] Check whether the link renders without requiring local context.
- [ ] Confirm the linked asset avoids private identifiers.
- [ ] Watch for questions about install, license, demo state, or real-world status.
- [ ] If someone asks about reuse, point to [license-decision.md](license-decision.md) and [RDLeader#3](https://github.com/happysnaker/RDLeader/issues/3).
- [ ] If someone asks how to try it, point to [demo-reset.md](demo-reset.md) and [browser-walkthrough.md](browser-walkthrough.md).
- [ ] If someone asks what sponsorship funds, point to [public-release-roadmap.md](../public-release-roadmap.md) and the current sponsorware issue.

## Current sponsor CTA

The core project remains public. Sponsorship accelerates public packaging work: submission tracking, demo polish, DevPlan bundle sanitization, license/reuse posture clarification, and keeping public security/readiness proof current.

Support page: <https://happysnaker.github.io/support/#from-rdleader>.

Use the current sponsorware issue number from [public-release-roadmap.md](../public-release-roadmap.md) in the payment note. Next execution slice: [RDLeader#27](https://github.com/happysnaker/RDLeader/issues/27).
