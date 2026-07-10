#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSET_DIR="$ROOT/docs/public/assets"
OUT="${OUT:-$ASSET_DIR/rdleader-public-walkthrough.mp4}"
TMP="${TMPDIR:-/tmp}/rdleader-public-walkthrough.$$"

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

cat > "$TMP/title.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
  <title id="title">RDLeader public-safe walkthrough title card</title>
  <desc id="desc">Title card for a public-safe RDLeader walkthrough generated from synthetic demo assets.</desc>
  <rect width="1280" height="720" fill="#0b1020"/>
  <rect x="70" y="72" width="1140" height="576" rx="32" fill="#111827" stroke="#334155"/>
  <text x="120" y="190" fill="#f8fafc" font-family="Inter,Arial,sans-serif" font-size="56" font-weight="800">RDLeader</text>
  <text x="120" y="250" fill="#93c5fd" font-family="Inter,Arial,sans-serif" font-size="30" font-weight="700">Public-safe agent-operations walkthrough</text>
  <text x="120" y="345" fill="#cbd5e1" font-family="Inter,Arial,sans-serif" font-size="28">Local-first control plane for AI R&amp;D workers</text>
  <text x="120" y="394" fill="#cbd5e1" font-family="Inter,Arial,sans-serif" font-size="28">Task ownership · runtime evidence · approvals · QA loops</text>
  <text x="120" y="520" fill="#64748b" font-family="Inter,Arial,sans-serif" font-size="22">Synthetic visuals only — no DevPlan screenshots, private paths, IDs, chats, or QR artifacts.</text>
</svg>
SVG

cat > "$TMP/end.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
  <title id="title">RDLeader public-safe walkthrough end card</title>
  <desc id="desc">End card listing public RDLeader proof surfaces and support route.</desc>
  <rect width="1280" height="720" fill="#0b1020"/>
  <rect x="70" y="72" width="1140" height="576" rx="32" fill="#111827" stroke="#334155"/>
  <text x="120" y="185" fill="#f8fafc" font-family="Inter,Arial,sans-serif" font-size="46" font-weight="800">What to review</text>
  <text x="120" y="270" fill="#cbd5e1" font-family="Inter,Arial,sans-serif" font-size="28">1. Runtime boundaries instead of hidden chat sessions</text>
  <text x="120" y="325" fill="#cbd5e1" font-family="Inter,Arial,sans-serif" font-size="28">2. Structured task envelopes and result events</text>
  <text x="120" y="380" fill="#cbd5e1" font-family="Inter,Arial,sans-serif" font-size="28">3. Human approval gates for risky operations</text>
  <text x="120" y="435" fill="#cbd5e1" font-family="Inter,Arial,sans-serif" font-size="28">4. Smoke and endurance evidence before public claims</text>
  <text x="120" y="545" fill="#93c5fd" font-family="Inter,Arial,sans-serif" font-size="26" font-weight="700">Support public packaging: docs, demo assets, redacted QA evidence, runtime deep dives.</text>
</svg>
SVG

render_svg() {
  local src="$1"
  local out="$2"
  rsvg-convert -w 1280 -h 720 "$src" -o "$out"
}

render_svg "$TMP/title.svg" "$TMP/00-title.png"
render_svg "$ASSET_DIR/rdleader-overview-demo.svg" "$TMP/01-overview.png"
render_svg "$ASSET_DIR/rdleader-execution-demo.svg" "$TMP/02-execution.png"
render_svg "$ASSET_DIR/rdleader-qa-demo.svg" "$TMP/03-qa.png"
render_svg "$TMP/end.svg" "$TMP/04-end.png"

cat > "$TMP/concat.txt" <<EOF2
file '$TMP/00-title.png'
duration 4
file '$TMP/01-overview.png'
duration 8
file '$TMP/02-execution.png'
duration 8
file '$TMP/03-qa.png'
duration 8
file '$TMP/04-end.png'
duration 6
file '$TMP/04-end.png'
EOF2

ffmpeg -y -hide_banner -loglevel error \
  -f concat -safe 0 -i "$TMP/concat.txt" \
  -vf "fps=30,format=yuv420p" \
  -c:v libx264 -preset veryslow -crf 28 -movflags +faststart \
  "$OUT"

bytes=$(wc -c < "$OUT" | tr -d ' ')
echo "wrote $OUT ($bytes bytes)"
