"""Stop what a run left running in its workspace.

Pi is killed at the deadline, but a server Mellum started with `&` (uvicorn, `python
app.py`) outlives it and keeps its port; in M.7 later runs hit `Address already in
use`. After every run the runner stops each process whose working directory is the
workspace or under it, and records them. Uses `lsof`, which macOS ships.
"""

from __future__ import annotations

import os
import signal
import subprocess
import time
from pathlib import Path


def parse_lsof_cwds(out: str) -> dict[int, str]:
    """`lsof -d cwd -Fpn` output as {pid: cwd}; a pid without a name line is dropped."""
    cwds: dict[int, str] = {}
    pid: int | None = None
    for line in out.splitlines():
        if line.startswith("p"):
            pid = int(line[1:]) if line[1:].isdigit() else None
        elif line.startswith("n") and pid is not None:
            cwds[pid] = line[1:]
    return cwds


def processes_under(ws: Path, cwds: dict[int, str]) -> list[int]:
    """Pids whose cwd is `ws` or a directory below it, in pid order."""
    base = str(ws.resolve())
    return sorted(
        pid for pid, cwd in cwds.items() if cwd == base or cwd.startswith(base + "/")
    )


def _cwds() -> dict[int, str]:
    proc = subprocess.run(
        ["lsof", "-n", "-d", "cwd", "-Fpn"],
        cwd="/",  # lsof inherits the caller's cwd and would list itself
        capture_output=True,
        text=True,
        check=False,
        timeout=30,
    )
    return parse_lsof_cwds(proc.stdout)


def _command(pid: int) -> str:
    proc = subprocess.run(
        ["ps", "-o", "command=", "-p", str(pid)],
        cwd="/",
        capture_output=True,
        text=True,
        check=False,
    )
    return proc.stdout.strip()


def _alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def stop_leftovers(ws: Path, grace: float = 3.0) -> list[dict]:
    """SIGTERM every process running in `ws`, SIGKILL any still alive after `grace` s.

    Returns one {pid, command, killed} per process found; never this process.
    """
    own = os.getpid()
    pids = [p for p in processes_under(ws, _cwds()) if p != own]
    found = [{"pid": p, "command": _command(p)[:300], "killed": False} for p in pids]
    for p in pids:
        try:
            os.kill(p, signal.SIGTERM)
        except ProcessLookupError:
            pass
    end = time.monotonic() + grace
    while time.monotonic() < end and any(_alive(p) for p in pids):
        time.sleep(0.1)
    for entry in found:
        if _alive(entry["pid"]):
            try:
                os.kill(entry["pid"], signal.SIGKILL)
                entry["killed"] = True
            except ProcessLookupError:
                pass
    return found
