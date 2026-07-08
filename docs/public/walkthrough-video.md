# RDLeader Public Walkthrough Video

> A short public-safe walkthrough generated from synthetic SVG demo assets. It is meant for GitHub issues, release notes, sponsor updates, and short social posts without exposing live DevPlan data.

## Rendered asset

- Video: [assets/rdleader-public-walkthrough.mp4](assets/rdleader-public-walkthrough.mp4)
- Duration: 40 seconds
- Resolution: 1280×720
- Format: H.264 MP4, no audio

## What it shows

1. Title card: RDLeader as a local-first agent-operations control plane.
2. Overview scene: fake workers, current work, runtime state, and next step.
3. Execution scene: manager UI → task envelope → runtime worker → result event.
4. QA scene: public evidence posture for CI, smoke checks, endurance, and release status.
5. End card: review focus and sponsorware packaging CTA.

## Rebuild command

From the repository root:

```bash
./scripts/build-public-walkthrough-video.sh
```

The script requires `rsvg-convert` and `ffmpeg`, renders the existing SVG assets to temporary PNG frames, and writes the MP4 back to `docs/public/assets/rdleader-public-walkthrough.mp4`.

## Safety audit

The video uses only synthetic public assets and intentionally excludes:

- private workspace paths;
- live chat, app, open, message, or document identifiers;
- QR onboarding artifacts;
- raw terminal output from internal tools;
- real employee names or organization-specific project names.
