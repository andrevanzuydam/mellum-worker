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
import sys
import tomllib
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROFILE = ROOT / "learn" / "code" / "profile" / "models.json"
HOST = "127.0.0.1"
PORT = 8002
ALIAS = "Mellum2.1-12B-A2.5B-Thinking"
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

    profile = sub.add_parser("profile", help="write the private Pi profile")
    profile.add_argument("--dry-run", action="store_true")

    one = sub.add_parser("chat", help="one prompt against the running server")
    one.add_argument("prompt")
    one.add_argument("--dry-run", action="store_true")
    one.add_argument("--host", default=HOST)
    one.add_argument("--port", type=int, default=PORT)

    args = parser.parse_args(argv)
    settings = load_settings()

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
