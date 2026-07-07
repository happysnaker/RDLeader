#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

pnpm install
mkdir -p data
(
  pnpm --filter @rdleader/server dev &
  SERVER_PID=$!
  pnpm --filter @rdleader/web dev &
  WEB_PID=$!
  trap 'kill ${SERVER_PID} ${WEB_PID}' EXIT
  wait
)
