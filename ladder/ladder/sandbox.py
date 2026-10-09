"""Hand out a disposable, git-initialised copy of a ladder fixture for interactive tries.

    uv run python -m ladder.sandbox 1        # prints the scratch path for rung 1

Never point the worker at ``fixtures/`` itself: it edits files in place and
the ladder's "known-buggy baseline" stops being buggy.
"""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

from .pi_profile import prepare_pi_workspace
from .run_ladder import prepare_workspace
from .rungs import RUNGS


def make_sandbox(rung: int, parent: Path | None = None) -> Path:
    scratch = Path(tempfile.mkdtemp(prefix=f"mellum-try-rung{rung}-", dir=parent))
    ws = prepare_workspace(RUNGS[rung], scratch)
    prepare_pi_workspace(ws, None)
    return ws


if __name__ == "__main__":
    number = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    ws = make_sandbox(number)
    print(ws)
    print(f'try: cd {ws} && pi   # then: "Use mellum-worker: {RUNGS[number].sentence}"')
