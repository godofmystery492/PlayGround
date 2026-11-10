#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
: "${CAPTURE_URL:?Set CAPTURE_URL to the exact preview URL.}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR to an output directory outside the project.}"
RUNTIME_DIR="${RUNTIME_DIR:-/home/runner/work/_temp/omgithub-runtime}"
export RUNTIME_DIR

CAPTURE_DIR="$(/usr/bin/time -p realpath -m -- "$CAPTURE_DIR")"
case "$CAPTURE_DIR/" in
  "$PROJECT_DIR/"*) echo 'CAPTURE_DIR must be outside the project source tree.' >&2; exit 1 ;;
esac
export CAPTURE_DIR
# Treat page errors and failed same-origin assets as rendering defects by default.
CAPTURE_STRICT="${CAPTURE_STRICT:-1}"
export CAPTURE_STRICT

exec /usr/bin/time -p node "$RUNTIME_DIR/scripts/default-capture.mjs"
