#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSET_DIR="$ROOT/docs/public/assets"
OUT="${OUT:-$ASSET_DIR/rdleader-browser-walkthrough-narrated.mp4}"
TMP="${TMPDIR:-/tmp}/rdleader-browser-walkthrough.$$"

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

require rsvg-convert
require ffmpeg

cleanup() {
  rm -rf "$TMP"
}
trap cleanup EXIT
mkdir -p "$TMP"

cat > "$TMP/00-title.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
  <title id="title">RDLeader browser walkthrough title</title>
  <desc id="desc">Title card for RDLeader browser walkthrough over public demo state.</desc>
  <rect width="1280" height="720" fill="#0b1020"/>
  <rect x="70" y="72" width="1140" height="576" rx="32" fill="#111827" stroke="#334155"/>
  <text x="120" y="175" fill="#f8fafc" font-family="Inter,Arial,sans-serif" font-size="52" font-weight="800">RDLeader browser walkthrough</text>
  <text x="120" y="238" fill="#93c5fd" font-family="Inter,Arial,sans-serif" font-size="29" font-weight="700">Fake demo state · runtime evidence · approval gates</text>
  <text x="120" y="332" fill="#cbd5e1" font-family="Inter,Arial,sans-serif" font-size="28">Narration: start from deterministic public state, not private DevPlan logs.</text>
  <text x="120" y="386" fill="#cbd5e1" font-family="Inter,Arial,sans-serif" font-size="28">The walkthrough shows what a reviewer should inspect first.</text>
  <text x="120" y="535" fill="#64748b" font-family="Inter,Arial,sans-serif" font-size="22">Public-safe: no real people, app IDs, chat IDs, QR artifacts, private paths, or raw integration output.</text>
</svg>
SVG

cat > "$TMP/01-setup.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
  <title id="title">RDLeader public demo setup</title>
  <desc id="desc">Setup card showing public demo reset and demo server commands.</desc>
  <rect width="1280" height="720" fill="#0b1020"/>
  <text x="72" y="82" fill="#f8fafc" font-family="Inter,Arial,sans-serif" font-size="38" font-weight="800">Step 1 — Reset public demo state</text>
  <text x="72" y="124" fill="#94a3b8" font-family="Inter,Arial,sans-serif" font-size="20">Narration: the demo starts from deterministic fake data.</text>
  <rect x="92" y="178" width="1096" height="310" rx="26" fill="#111827" stroke="#334155"/>
  <text x="132" y="245" fill="#93c5fd" font-family="SFMono-Regular,Consolas,monospace" font-size="28">$ pnpm demo:reset</text>
  <text x="132" y="303" fill="#cbd5e1" font-family="SFMono-Regular,Consolas,monospace" font-size="24">employees: 2  ·  workItems: 4  ·  runtimeResults: 2</text>
  <text x="132" y="360" fill="#93c5fd" font-family="SFMono-Regular,Consolas,monospace" font-size="28">$ pnpm demo:server</text>
  <text x="132" y="416" fill="#cbd5e1" font-family="SFMono-Regular,Consolas,monospace" font-size="24">seedMode=none  ·  database=../../data/public-demo.db</text>
  <rect x="92" y="535" width="1096" height="86" rx="20" fill="#0f172a" stroke="#1d4ed8"/>
  <text x="132" y="588" fill="#f8fafc" font-family="Inter,Arial,sans-serif" font-size="25">Expected workers: Alex Runtime and Maya Systems only.</text>
</svg>
SVG

cat > "$TMP/03-approval.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
  <title id="title">RDLeader approval walkthrough</title>
  <desc id="desc">Approval gate card showing pending external action approval.</desc>
  <rect width="1280" height="720" fill="#0b1020"/>
  <text x="72" y="82" fill="#f8fafc" font-family="Inter,Arial,sans-serif" font-size="38" font-weight="800">Step 4 — Approval gate</text>
  <text x="72" y="124" fill="#94a3b8" font-family="Inter,Arial,sans-serif" font-size="20">Narration: external actions are visible, but they fail closed until approved.</text>
  <rect x="86" y="170" width="1108" height="410" rx="28" fill="#111827" stroke="#334155"/>
  <rect x="126" y="230" width="475" height="230" rx="22" fill="#1e1b4b" stroke="#6366f1"/>
  <text x="158" y="286" fill="#e0e7ff" font-family="Inter,Arial,sans-serif" font-size="28" font-weight="800">Pending approval</text>
  <text x="158" y="340" fill="#cbd5e1" font-family="Inter,Arial,sans-serif" font-size="22">Send runtime recovery summary</text>
  <text x="158" y="384" fill="#cbd5e1" font-family="Inter,Arial,sans-serif" font-size="22">to shared demo project room</text>
  <text x="158" y="430" fill="#fca5a5" font-family="Inter,Arial,sans-serif" font-size="20">riskLevel: high · status: pending</text>
  <rect x="678" y="230" width="415" height="230" rx="22" fill="#052e16" stroke="#16a34a"/>
  <text x="710" y="286" fill="#bbf7d0" font-family="Inter,Arial,sans-serif" font-size="28" font-weight="800">Safe default</text>
  <text x="710" y="340" fill="#cbd5e1" font-family="Inter,Arial,sans-serif" font-size="22">No external mutation happens</text>
  <text x="710" y="384" fill="#cbd5e1" font-family="Inter,Arial,sans-serif" font-size="22">without explicit lead review.</text>
  <text x="710" y="430" fill="#86efac" font-family="Inter,Arial,sans-serif" font-size="20">approval_required</text>
  <text x="108" y="635" fill="#64748b" font-family="Inter,Arial,sans-serif" font-size="21">Public demo uses synthetic approval IDs and project-room names only.</text>
</svg>
SVG

cat > "$TMP/05-onboarding.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
  <title id="title">RDLeader onboarding walkthrough</title>
  <desc id="desc">Onboarding companion card showing worker homes and secret refs.</desc>
  <rect width="1280" height="720" fill="#0b1020"/>
  <text x="72" y="82" fill="#f8fafc" font-family="Inter,Arial,sans-serif" font-size="38" font-weight="800">Step 6 — Onboarding companion</text>
  <text x="72" y="124" fill="#94a3b8" font-family="Inter,Arial,sans-serif" font-size="20">Narration: the same fake state explains how a new worker should be onboarded.</text>
  <rect x="80" y="170" width="1120" height="420" rx="30" fill="#111827" stroke="#334155"/>
  <text x="126" y="238" fill="#93c5fd" font-family="Inter,Arial,sans-serif" font-size="30" font-weight="800">Alex Runtime</text>
  <text x="126" y="296" fill="#cbd5e1" font-family="Inter,Arial,sans-serif" font-size="24">workspacePath: demo://workers/alex-runtime</text>
  <text x="126" y="344" fill="#cbd5e1" font-family="Inter,Arial,sans-serif" font-size="24">runtime inbox: .rdleader/tasks</text>
  <text x="126" y="392" fill="#cbd5e1" font-family="Inter,Arial,sans-serif" font-size="24">secret refs: secret://rdleader-demo/...</text>
  <text x="126" y="440" fill="#cbd5e1" font-family="Inter,Arial,sans-serif" font-size="24">communication: manager-only</text>
  <text x="126" y="510" fill="#f8fafc" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="700">Takeaway: worker identity, runtime state, and approval boundaries are separate surfaces.</text>
</svg>
SVG

cat > "$TMP/06-end.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
  <title id="title">RDLeader walkthrough end card</title>
  <desc id="desc">End card listing proof ladder and support route.</desc>
  <rect width="1280" height="720" fill="#0b1020"/>
  <rect x="70" y="72" width="1140" height="576" rx="32" fill="#111827" stroke="#334155"/>
  <text x="120" y="170" fill="#f8fafc" font-family="Inter,Arial,sans-serif" font-size="46" font-weight="800">What this video proves</text>
  <text x="120" y="255" fill="#cbd5e1" font-family="Inter,Arial,sans-serif" font-size="27">1. Fake demo reset gives reviewers a safe starting point.</text>
  <text x="120" y="312" fill="#cbd5e1" font-family="Inter,Arial,sans-serif" font-size="27">2. Runtime dispatch, result events, approvals, and QA are visible.</text>
  <text x="120" y="369" fill="#cbd5e1" font-family="Inter,Arial,sans-serif" font-size="27">3. Onboarding uses secret references, not real credentials.</text>
  <text x="120" y="426" fill="#cbd5e1" font-family="Inter,Arial,sans-serif" font-size="27">4. Public docs summarize proof without leaking DevPlan artifacts.</text>
  <text x="120" y="545" fill="#93c5fd" font-family="Inter,Arial,sans-serif" font-size="26" font-weight="800">Support public packaging: demo polish, redacted QA evidence, and release docs.</text>
</svg>
SVG

render_svg() {
  local src="$1"
  local out="$2"
  rsvg-convert -w 1280 -h 720 "$src" -o "$out"
}

render_svg "$TMP/00-title.svg" "$TMP/00-title.png"
render_svg "$TMP/01-setup.svg" "$TMP/01-setup.png"
render_svg "$ASSET_DIR/rdleader-overview-demo.svg" "$TMP/02-overview.png"
render_svg "$ASSET_DIR/rdleader-execution-demo.svg" "$TMP/03-runtime.png"
render_svg "$TMP/03-approval.svg" "$TMP/04-approval.png"
render_svg "$ASSET_DIR/rdleader-qa-demo.svg" "$TMP/05-qa.png"
render_svg "$TMP/05-onboarding.svg" "$TMP/06-onboarding.png"
render_svg "$TMP/06-end.svg" "$TMP/07-end.png"

cat > "$TMP/concat.txt" <<EOF2
file '$TMP/00-title.png'
duration 5
file '$TMP/01-setup.png'
duration 7
file '$TMP/02-overview.png'
duration 7
file '$TMP/03-runtime.png'
duration 7
file '$TMP/04-approval.png'
duration 7
file '$TMP/05-qa.png'
duration 7
file '$TMP/06-onboarding.png'
duration 7
file '$TMP/07-end.png'
duration 6
file '$TMP/07-end.png'
EOF2

ffmpeg -y -hide_banner -loglevel error \
  -f concat -safe 0 -i "$TMP/concat.txt" \
  -vf "fps=30,format=yuv420p" \
  -c:v libx264 -preset veryslow -crf 28 -movflags +faststart \
  "$OUT"

bytes=$(wc -c < "$OUT" | tr -d ' ')
echo "wrote $OUT ($bytes bytes)"
