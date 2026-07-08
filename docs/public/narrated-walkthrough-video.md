# RDLeader Narrated Browser Walkthrough Video

> Captioned, public-safe video asset for people who want the RDLeader control-plane story without cloning the repo first.

## Rendered asset

- Video: [assets/rdleader-browser-walkthrough-narrated.mp4](assets/rdleader-browser-walkthrough-narrated.mp4)
- Duration: 59 seconds
- Resolution: 1280×720
- Format: H.264 MP4
- Audio: none; narration is represented as on-screen caption text so the asset can also be watched muted or converted to GIF.

## Rebuild command

From the repository root:

```bash
./scripts/build-browser-walkthrough-video.sh
```

The script uses `rsvg-convert` and `ffmpeg`, combines synthetic browser-walkthrough cards with existing public demo SVG assets, and writes the MP4 to `docs/public/assets/rdleader-browser-walkthrough-narrated.mp4`.

## Narration / shot list

| Time | Scene | Captioned narration |
|---:|---|---|
| 0:00 | Title | Start from deterministic public state, not private DevPlan logs. |
| 0:05 | Setup | `pnpm demo:reset` and `pnpm demo:server` produce fake workers only. |
| 0:12 | Overview | The manager sees `Alex Runtime` and `Maya Systems`, current work, runtime state, and next step. |
| 0:19 | Runtime | RDLeader dispatches a task envelope and collects a structured result event. |
| 0:26 | Approval | External mutations remain pending until the lead approves them. |
| 0:33 | QA | Public QA evidence is summarized without publishing raw private logs. |
| 0:40 | Onboarding | Worker homes, runtime inboxes, manager-only communication, and secret refs are separate surfaces. |
| 0:47 | End card | Review the proof ladder, then sponsor public packaging work if it is useful. |

## Public-safety checks

This video uses only synthetic visual assets and captions. It intentionally excludes:

- real employee names;
- private workspace paths;
- app IDs, open IDs, chat IDs, message IDs;
- QR onboarding artifacts;
- internal document links;
- raw terminal output from live integrations;
- payment screenshots or personal account identifiers.

## Verification

Recommended local verification:

```bash
pnpm docs:check
./scripts/build-browser-walkthrough-video.sh
ffprobe -v error -select_streams v:0 \
  -show_entries stream=codec_name,width,height,avg_frame_rate,duration \
  -show_entries format=size,duration \
  -of json docs/public/assets/rdleader-browser-walkthrough-narrated.mp4
pnpm test
```

## Source proof surfaces

- [Public demo reset](demo-reset.md)
- [Browser walkthrough](browser-walkthrough.md)
- [Runtime and approval deep dive](runtime-approval-deep-dive.md)
- [Employee-agent onboarding](employee-agent-onboarding.md)
- [Public landing-page section](landing-page.md)
