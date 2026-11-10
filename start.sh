#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
PORT="${PORT:-3000}"
export PORT

# This project is served directly from its static app directory; no compilation is needed.
/usr/bin/time -p test -f "$PROJECT_DIR/index.html"
/usr/bin/time -p test -f "$PROJECT_DIR/server.js"
/usr/bin/time -p npm install --no-audit --no-fund

RUNNER_TEMP="${RUNNER_TEMP:-/home/runner/work/_temp}"
DEPLOY_DIR="$RUNNER_TEMP/omgithub-web"
DEPLOYMENT_OUTPUT="$DEPLOY_DIR/deployment-output.json"
/usr/bin/time -p mkdir -p "$DEPLOY_DIR"
/usr/bin/time -p node -e 'const fs=require("fs"); const [project,dest]=process.argv.slice(1); fs.writeFileSync(dest, JSON.stringify({project,directory:project}, null, 2)+"\n")' "$PROJECT_DIR" "$DEPLOYMENT_OUTPUT"

/usr/bin/time -p npm start
