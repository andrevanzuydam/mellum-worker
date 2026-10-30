#!/usr/bin/env bash
# Start the local Mellum server and Pi, pointed at this repo.
#
# install.sh hands off here once the tools are in. Next time, just: bash run.sh
# The first run downloads the ~8 GB Q4_K_M model; after that it is quick.
set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"
export PATH="$HOME/.local/bin:$PATH"

# 1. Server. `backend.py start` is idempotent: it returns at once if the server
#    is already healthy, otherwise it starts it and waits. The first start
#    downloads the model.
echo "Starting the Mellum server (the first run downloads the ~8 GB Q4_K_M model)..."
if ! uv run scripts/backend.py start; then
    echo "[ERROR] the server did not start; see learn/getting-started/troubleshoot." >&2
    exit 1
fi
uv run scripts/backend.py status || true

# 2. Pi, pointed at this repo's profile (which targets the local server). The
#    mellum-worker harness (/mellum) comes from the plugin install.sh set up.
export PI_CODING_AGENT_DIR="$REPO_DIR/learn/code/profile"
echo
echo "Starting Pi. Put the worker on a job with:  /mellum <task>"
exec pi
