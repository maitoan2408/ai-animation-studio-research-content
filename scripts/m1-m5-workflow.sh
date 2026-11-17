#!/usr/bin/env bash
# Run the already-tested M1-M5 stage executors from a single checked-out revision.
# This is an engineering acceptance gate, not proof of a fully integrated M3/M4 Director backend.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
export SOURCE_HEAD_SHA="${SOURCE_HEAD_SHA:-$(git rev-parse HEAD)}"
export STUDIO_BROWSER="${STUDIO_BROWSER:-/usr/bin/chromium}"
export HYPERFRAMES_NO_TELEMETRY=1

echo "M1-M5_INTEGRATION_START source=${SOURCE_HEAD_SHA}"
npm ci
npm --prefix production ci

# M1/M2 existing app, storyboard, audio and browser exports
npm run verify
npm run build
npm run test:integration
npm run test:ui
npm run test:ui:recovery
npx tsx scripts/render-ir-ab.ts
npx tsx scripts/m2-product-e2e.ts

# Production / native M3 character rigs and M4 physics
npm --prefix production run typecheck
npm --prefix production test
python3 -m unittest discover -s production/tests -p 'test_*.py' -v
npm --prefix production run motion:m3
npm --prefix production run motion:m3:audit
npm --prefix production run test:review-recovery
npm --prefix production run physics:m4
npm --prefix production run physics:m4:audit
production/node_modules/.bin/tsx production/src/qa/audit-m4-negative.ts
M4_PROJECT_FILE=examples/m4-short-project.json M4_OUTPUT_DIR=out/product-first/m4-short npm --prefix production run physics:m4
M4_PROJECT_FILE=examples/m4-short-project.json M4_OUTPUT_DIR=out/product-first/m4-short npm --prefix production run physics:m4:audit

# M5 Director is an additional root Studio planner, not an M4 native router
npx tsc -p tsconfig.m5.json
npx tsx scripts/m5-async-plan-ui.ts
npx tsx scripts/m5-product-e2e.ts
npx tsx scripts/m5-independent-audit.ts
echo "M1-M5_INTEGRATION_TECHNICAL_PASS source=${SOURCE_HEAD_SHA}"
