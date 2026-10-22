#!/usr/bin/env python3
"""Mellum's local backend on llama.cpp, and one-shot chat against it.

Settings come from [tool.mellum] in the repo's pyproject.toml, so the
learner can read every value the server and the request receive. Stdlib only.
"""

from __future__ import annotations

import argparse
import json
import os
import shlex
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import tomllib
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROFILE = ROOT / "learn" / "code" / "profile" / "models.json"
HOST = "127.0.0.1"
PORT = 8002
ALIAS = "Mellum2.1-12B-A2.5B-Thinking"
PIDFILE = Path(tempfile.gettempdir()) / "llamacpp-mellum.pid"
LOGFILE = Path(tempfile.gettempdir()) / "llamacpp-mellum.log"
MISSING = "llama-server not found on PATH; install it: docs/backends/llamacpp.md"


def load_settings(root: Path = ROOT) -> dict:
    data = tomllib.loads((root / "pyproject.toml").read_text())
    return data["tool"]["mellum"]


def serve_argv(
    settings: dict,
    host: str = HOST,
    port: int = PORT,
    binary: str = "llama-server",
) -> list[str]:
    return [
        binary, "-hf", settings["model"], "-a", ALIAS,
        "--host", host, "--port", str(port),
        "-c", str(settings["context"]), "-np", "1", "-ngl", "99",
        "--jinja", "-fa", "auto", "-b", "512", "-ub", "512",
        "-ctk", "q8_0", "-ctv", "q8_0",
    ]


def chat_body(settings: dict, prompt: str) -> dict:
    return {
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": settings["max_tokens"],
        "temperature": settings["temperature"],
        "top_p": settings["top_p"],
        "top_k": settings["top_k"],
    }


def _get_json(url: str, timeout: float = 2) -> dict | None:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return json.load(response)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return None


def health(host: str = HOST, port: int = PORT) -> dict | None:
    return _get_json(f"http://{host}:{port}/health")


def _read_pid(path: Path) -> int | None:
    try:
        return int(path.read_text().strip())
    except (FileNotFoundError, ValueError):
        return None


def status(host: str, port: int) -> int:
    if health(host, port) is None:
        print(f"down on {host}:{port}")
        return 0
    print(f"up on {host}:{port}")
    props = _get_json(f"http://{host}:{port}/props") or {}
    n_ctx = (props.get("default_generation_settings") or {}).get("n_ctx")
    if n_ctx is not None:
        print(f"  n_ctx {n_ctx}")
    return 0


def start(settings: dict, host: str, port: int, pidfile: Path, logfile: Path,
          binary: str, wait: int = 900) -> int:
    pid = _read_pid(pidfile)
    if health(host, port) is not None:
        suffix = f" (pid {pid})" if pid else ""
        print(f"already up on {host}:{port}{suffix}")
        return 0
    if shutil.which(binary) is None:
        print(MISSING, file=sys.stderr)
        return 2
    logfile.parent.mkdir(parents=True, exist_ok=True)
    with logfile.open("ab") as log:
        process = subprocess.Popen(
            serve_argv(settings, host, port, binary),
            stdout=log, stderr=subprocess.STDOUT, start_new_session=True,
        )
    pidfile.write_text(str(process.pid))
    for _ in range(wait):
        if health(host, port) is not None:
            print(f"up on {host}:{port} (pid {process.pid})")
            print(f"log {logfile}", file=sys.stderr)
            return 0
        if process.poll() is not None:
            pidfile.unlink(missing_ok=True)
            print(f"llama-server exited; see {logfile}", file=sys.stderr)
            return 1
        time.sleep(1)
    print(f"no health response after {wait}s; see {logfile}; "
          "stop with: uv run scripts/backend.py stop", file=sys.stderr)
    return 1


def stop(pidfile: Path) -> int:
    pid = _read_pid(pidfile)
    if pid is None:
        print("not running")
        return 0
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        pidfile.unlink(missing_ok=True)
        print("not running")
        return 0
    os.kill(pid, signal.SIGTERM)
    pidfile.unlink(missing_ok=True)
    print(f"stopped pid {pid}")
    return 0


def profile_models(settings: dict) -> dict:
    return {
        "providers": {
            "llamacpp": {
                "name": "llama.cpp",
                "baseUrl": f"http://{HOST}:{PORT}/v1",
                "api": "openai-completions",
                "apiKey": "not-needed",
                "models": [
                    {
                        "id": ALIAS,
                        "name": "Mellum 2.1 12B-A2.5B Thinking (Q4_K_M, llama.cpp)",
                        "reasoning": True,
                        "input": ["text"],
                        "contextWindow": settings["context"],
                        "maxTokens": settings["max_tokens"],
                        "cost": {"input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0},
                        "samplingParams": {
                            "temperature": settings["temperature"],
                            "top_p": settings["top_p"],
                            "top_k": settings["top_k"],
                            "min_p": 0,
                            "presence_penalty": 0,
                            "repetition_penalty": 1,
                        },
                        "compat": {
                            "supportsDeveloperRole": False,
                            "supportsReasoningEffort": False,
                            "maxTokensField": "max_tokens",
                            "thinkingFormat": "qwen-chat-template",
                        },
                    }
                ],
            }
        }
    }


def render_profile(settings: dict) -> str:
    return json.dumps(profile_models(settings), indent=2) + "\n"


def chat(settings: dict, prompt: str, host: str = HOST, port: int = PORT) -> None:
    request = urllib.request.Request(
        f"http://{host}:{port}/v1/chat/completions",
        data=json.dumps(chat_body(settings, prompt)).encode(),
        headers={"content-type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=900) as response:
            data = json.load(response)
    except urllib.error.URLError as error:
        raise SystemExit(
            f"no server on {host}:{port} ({error.reason}); "
            "run: uv run scripts/backend.py start"
        )
    message = data["choices"][0]["message"]
    if message.get("reasoning_content"):
        print("[thinking] " + message["reasoning_content"][:400], file=sys.stderr)
    print(message.get("content", ""))
    usage = data.get("usage") or {}
    if "completion_tokens" in usage:
        print(f"({usage['completion_tokens']} tokens)", file=sys.stderr)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)

    serve = sub.add_parser("serve", help="run llama-server in the foreground")
    serve.add_argument("--dry-run", action="store_true")
    serve.add_argument("--host", default=HOST)
    serve.add_argument("--port", type=int, default=PORT)
    serve.add_argument("--server-binary", default="llama-server")

    for name, help_text in (
        ("start", "run llama-server in the background and wait for health"),
        ("stop", "stop the background server"),
        ("status", "report whether the server answers"),
    ):
        cmd = sub.add_parser(name, help=help_text)
        cmd.add_argument("--host", default=HOST)
        cmd.add_argument("--port", type=int, default=PORT)
        cmd.add_argument("--pidfile", type=Path, default=PIDFILE)
        cmd.add_argument("--logfile", type=Path, default=LOGFILE)
        if name == "start":
            cmd.add_argument("--server-binary", default="llama-server")
            cmd.add_argument("--wait-seconds", type=int, default=900)

    profile = sub.add_parser("profile", help="write the private Pi profile")
    profile.add_argument("--dry-run", action="store_true")

    one = sub.add_parser("chat", help="one prompt against the running server")
    one.add_argument("prompt")
    one.add_argument("--dry-run", action="store_true")
    one.add_argument("--host", default=HOST)
    one.add_argument("--port", type=int, default=PORT)

    args = parser.parse_args(argv)
    settings = load_settings()

    if args.command == "status":
        return status(args.host, args.port)
    if args.command == "stop":
        return stop(args.pidfile)
    if args.command == "start":
        return start(settings, args.host, args.port, args.pidfile, args.logfile,
                     args.server_binary, args.wait_seconds)

    if args.command == "profile":
        rendered = render_profile(settings)
        if args.dry_run:
            print(rendered, end="")
            return 0
        PROFILE.parent.mkdir(parents=True, exist_ok=True)
        PROFILE.write_text(rendered)
        print(f"wrote {PROFILE.relative_to(ROOT)}")
        return 0

    if args.command == "serve":
        cmd = serve_argv(settings, args.host, args.port, args.server_binary)
        if args.dry_run:
            print(shlex.join(cmd))
            return 0
        try:
            os.execvp(cmd[0], cmd)
        except FileNotFoundError:
            raise SystemExit(MISSING)
    else:
        if args.dry_run:
            print(json.dumps(chat_body(settings, args.prompt)))
            return 0
        chat(settings, args.prompt, args.host, args.port)
    return 0


if __name__ == "__main__":
    sys.exit(main())
