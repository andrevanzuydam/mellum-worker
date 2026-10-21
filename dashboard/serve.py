#!/usr/bin/env python3
"""Dependency-free data server for the live ladder dashboard.

Serves dashboard/index.html at / and a /data.json the page polls: per-rung
results from a sweep's out dir, plus the newest worker trace's recent turns.

  DASH_OUT   sweep out dir to read run.json from (default: the 6-bit sweep)
  DASH_PORT  port (default 8787)
"""
import glob
import json
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_OUT = "/private/tmp/claude-501/-Users-mac-projects/8aed2d08-ac9d-4f56-9569-c4d3ba627b18/scratchpad/sweep-6bit"
OUT = os.environ.get("DASH_OUT", DEFAULT_OUT)
FEED = os.path.expanduser(os.environ.get("MELLUM_FEED", "~/.pi/agent/mellum-feed.ndjson"))
OVERRIDE = os.path.expanduser(
    os.environ.get("MELLUM_PROMPT_OVERRIDE", "~/.pi/agent/mellum-prompt-override.json")
)
TRACE_GLOBS = [
    "/private/var/folders/*/*/T/ladder-*/trace.jsonl",
    "/tmp/ladder-*/trace.jsonl",
]


def feed_events(limit=12):
    """Recent events from the agnostic mellum-feed (what mellum-feed.ts writes)."""
    try:
        lines = open(FEED).read().splitlines()
    except Exception:
        return []
    out = []
    for line in lines[-200:]:
        try:
            e = json.loads(line)
        except Exception:
            continue
        if e.get("kind") == "turn":
            out.append({"think": (e.get("think") or "")[:180], "call": e.get("call") or ""})
    return out[-limit:]


def sweep_rows():
    rungs = {}
    for f in glob.glob(os.path.join(OUT, "rung*", "*", "run.json")):
        try:
            r = json.load(open(f))
        except Exception:
            continue
        n = r.get("rung")
        if n is None:
            continue
        rungs.setdefault(n, []).append(
            {
                "passed": bool(r.get("check", {}).get("passed")),
                "wall": round(r.get("wall_seconds_untrusted") or 0),
            }
        )
    rows = []
    for n in sorted(rungs):
        runs = rungs[n]
        rows.append(
            {
                "rung": n,
                "pass": sum(1 for x in runs if x["passed"]),
                "n": len(runs),
                "wall": round(sum(x["wall"] for x in runs) / len(runs)),
            }
        )
    return rows


def _find_assistant(o):
    if isinstance(o, dict):
        if o.get("role") == "assistant" and "content" in o:
            return o
        for v in o.values():
            r = _find_assistant(v)
            if r:
                return r
    elif isinstance(o, list):
        for v in o:
            r = _find_assistant(v)
            if r:
                return r
    return None


def active_trace(limit=10):
    files = [f for g in TRACE_GLOBS for f in glob.glob(g) if os.path.exists(f)]
    if not files:
        return {"trace": None, "turns": []}
    newest = max(files, key=os.path.getmtime)
    turns = []
    try:
        lines = open(newest).read().splitlines()
    except Exception:
        return {"trace": os.path.basename(os.path.dirname(newest)), "turns": []}
    for line in lines[-500:]:
        try:
            o = json.loads(line)
        except Exception:
            continue
        msg = _find_assistant(o)
        if not msg:
            continue
        think, call = "", ""
        content = msg.get("content")
        if isinstance(content, list):
            for b in content:
                if not isinstance(b, dict):
                    continue
                if b.get("type") == "text" and b.get("text"):
                    think = b["text"]
                if b.get("type") == "toolCall":
                    args = json.dumps(b.get("arguments", {}))
                    call = f"{b.get('name', '')}({args[:90]})"
        if think or call:
            turns.append({"think": think[:180], "call": call})
    return {"trace": os.path.basename(os.path.dirname(newest)), "turns": turns[-limit:]}


def latest_prompt():
    """The most recent prompt the worker was sent (system + task/injected)."""
    try:
        lines = open(FEED).read().splitlines()
    except Exception:
        return None
    for line in reversed(lines[-300:]):
        try:
            e = json.loads(line)
        except Exception:
            continue
        if e.get("kind") == "prompt":
            return {"system": e.get("system", ""), "task": e.get("task", "")}
    return None


def intel_events(limit=20):
    """Told-vs-truth contradictions the skeptical gate found (mellum-rethink)."""
    try:
        lines = open(FEED).read().splitlines()
    except Exception:
        return []
    out = []
    for line in lines[-400:]:
        try:
            e = json.loads(line)
        except Exception:
            continue
        if e.get("kind") == "rethink":
            out.append({"claim": e.get("claim", ""), "observed": e.get("observed", ""), "t": e.get("t")})
    return out[-limit:]


def rung_detail(n):
    """Every past run of one rung, newest first, with a short summary of each."""
    runs = []
    for f in glob.glob(os.path.join(OUT, f"rung{n}", "*", "run.json")):
        try:
            r = json.load(open(f))
        except Exception:
            continue
        chk = r.get("check", {})
        runs.append(
            {
                "run": os.path.basename(os.path.dirname(f)),
                "passed": bool(chk.get("passed")),
                "wall": round(r.get("wall_seconds_untrusted") or 0),
                "stop": r.get("stop_reason"),
                "deadline": bool(r.get("deadline_hit")),
                "sentence": r.get("sentence", ""),
                "diff": (r.get("diff_stat") or "").strip(),
                "details": chk.get("details", {}),
                "mtime": os.path.getmtime(f),
            }
        )
    runs.sort(key=lambda x: x["mtime"], reverse=True)
    for x in runs:
        del x["mtime"]
    return {"rung": n, "runs": runs}


def read_override():
    try:
        return json.loads(open(OVERRIDE).read())
    except Exception:
        return {"system": "", "append": ""}


def write_override(data):
    os.makedirs(os.path.dirname(OVERRIDE), exist_ok=True)
    clean = {
        "system": str(data.get("system", "") or ""),
        "append": str(data.get("append", "") or ""),
    }
    with open(OVERRIDE, "w") as fh:
        json.dump(clean, fh)
    return clean


def payload():
    # Prefer the agnostic feed (mellum-feed.ts); fall back to scraping the
    # newest trace for runs that don't load the feed extension (e.g. the sweep).
    active = feed_events() or active_trace().get("turns", [])
    return {
        "updatedAt": time.strftime("%H:%M:%S"),
        "sweep": sweep_rows(),
        "active": active,
        "prompt": latest_prompt(),
        "intel": intel_events(),
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, body, ctype):
        self.send_response(200)
        self.send_header("content-type", ctype)
        self.send_header("access-control-allow-origin", "*")
        self.send_header("cache-control", "no-store")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith("/events"):
            # Server-Sent Events: push the whole dashboard state every ~1.5s.
            self.send_response(200)
            self.send_header("content-type", "text/event-stream")
            self.send_header("cache-control", "no-store")
            self.send_header("connection", "keep-alive")
            self.send_header("access-control-allow-origin", "*")
            self.end_headers()
            try:
                while True:
                    self.wfile.write(f"data: {json.dumps(payload())}\n\n".encode())
                    self.wfile.flush()
                    time.sleep(1.5)
            except (BrokenPipeError, ConnectionResetError):
                return
        elif self.path.startswith("/data.json"):
            self._send(json.dumps(payload()).encode(), "application/json")
        elif self.path.startswith("/rung"):
            from urllib.parse import urlparse, parse_qs

            q = parse_qs(urlparse(self.path).query)
            try:
                n = int(q.get("n", ["0"])[0])
            except ValueError:
                n = 0
            self._send(json.dumps(rung_detail(n)).encode(), "application/json")
        elif self.path.startswith("/override"):
            self._send(json.dumps(read_override()).encode(), "application/json")
        else:
            try:
                body = open(os.path.join(HERE, "index.html"), "rb").read()
            except Exception:
                body = b"<h1>index.html missing</h1>"
            self._send(body, "text/html; charset=utf-8")

    def do_POST(self):
        if self.path.startswith("/override"):
            try:
                length = int(self.headers.get("content-length", "0"))
                data = json.loads(self.rfile.read(length) or b"{}")
            except Exception:
                data = {}
            self._send(json.dumps(write_override(data)).encode(), "application/json")
        else:
            self._send(b'{"error":"not found"}', "application/json")


if __name__ == "__main__":
    port = int(os.environ.get("DASH_PORT", "8787"))
    print(f"ladder dashboard: http://127.0.0.1:{port}   (reading {OUT})")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
