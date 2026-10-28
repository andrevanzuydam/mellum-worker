"""Run the vLLM baseline: vLLM on a rented GPU, vanilla Pi and the harness here.

Everything that defines the baseline is in pins.env beside this file; Pi's
provider and sampling are in pi-profile/. This script only reads them. It runs
the same way on macOS, Linux and Windows (standard library, the OpenSSH client,
and uv). The ladder and the eval suites need POSIX process groups, so on
Windows `run` happens inside WSL2.

    uv run scripts/baseline/baseline.py <command>

    client   install the pinned Node and Pi under .baseline/ (checksummed)
    offers   list on-demand vast.ai offers for the pinned GPU (free)
    up       rent the cheapest offer under VAST_MAX_DPH; wait for SSH
    serve    copy the box scripts over, start vLLM, wait for the model
    tunnel   forward the box's vLLM to localhost:LOCAL_PORT (background)
    run      check the GPU, then the ladder and the suites, here
             (--screen: screen 1's rungs and the easy suite, n = 1)
    fetch    copy the box's vLLM log into the newest baseline run
    ssh      open a shell on the box
    down     close the tunnel and destroy the instance
    all      client, up, serve, tunnel, run, fetch, down — destroys on any exit
             (--screen as for run; --keep leaves the box up for more runs)

Configuration: scripts/baseline/vast.env (copy vast.env.example), or the file
named by VAST_CONFIG.
"""

from __future__ import annotations

import hashlib
import json
import os
import platform
import shutil
import signal
import subprocess
import sys
import tarfile
import time
import urllib.request
import zipfile
from datetime import UTC, datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CLIENT = ROOT / ".baseline"
STATE = CLIENT / "state"
PLACEHOLDER = "<insert vast.ai token>"
BOX_FILES = ("pins.env", "check-host.sh", "serve.sh")
LABEL = "mellum-baseline"


class BaselineError(SystemExit):
    """A refusal with a message, exit status 1."""

    def __init__(self, message: str):
        super().__init__(f"baseline: {message}")


def say(message: str) -> None:
    print(f"baseline: {message}", flush=True)


# --- Configuration ----------------------------------------------------------------


def load_kv(path: Path) -> dict[str, str]:
    """Plain KEY=VALUE lines; quotes stripped, a leading ~ expanded, no shell expansion."""
    values = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        if value.startswith("~"):
            value = os.path.expanduser(value)
        values[key.strip()] = value
    return values


def pins() -> dict[str, str]:
    return load_kv(HERE / "pins.env")


def config() -> dict[str, str]:
    path = Path(os.environ.get("VAST_CONFIG", HERE / "vast.env"))
    if not path.is_file():
        raise BaselineError(f"no {path}; copy vast.env.example and fill it in")
    values = {"VAST_SSH_KEY": os.path.expanduser("~/.ssh/id_ed25519"),
              "VAST_MAX_DPH": "0.55", "VAST_DISK_GB": "80", "LOCAL_PORT": "8000",
              **load_kv(path)}
    if values.get("VAST_API_KEY", "") in ("", PLACEHOLDER):
        raise BaselineError(f"set VAST_API_KEY in {path}")
    if not Path(values["VAST_SSH_KEY"] + ".pub").is_file():
        raise BaselineError(f"no public key at {values['VAST_SSH_KEY']}.pub")
    return values


# --- The GPU check ------------------------------------------------------------------


def parse_gpus(text: str) -> list[dict]:
    """nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader,nounits."""
    gpus = []
    for line in text.splitlines():
        fields = [f.strip() for f in line.split(",")]
        if len(fields) == 3 and fields[1].isdigit():
            gpus.append({"name": fields[0], "memory_mib": int(fields[1]), "driver": fields[2]})
    return gpus


def gpu_problems(gpus: list[dict], p: dict[str, str]) -> list[str]:
    """Why these GPUs are not the pinned ones; empty when they are."""
    want = f"{p['BASELINE_GPU_COUNT']}x {p['BASELINE_GPU_NAME']} ({p['BASELINE_GPU_MEMORY_MIB']} MiB)"
    problems = []
    if len(gpus) != int(p["BASELINE_GPU_COUNT"]) or any(
        g["name"] != p["BASELINE_GPU_NAME"] or g["memory_mib"] != int(p["BASELINE_GPU_MEMORY_MIB"])
        for g in gpus
    ):
        problems.append(f"the baseline is pinned to {want}; this box has "
                        + (", ".join(f"{g['name']} ({g['memory_mib']} MiB)" for g in gpus) or "no GPU"))
    for g in gpus:
        major = g["driver"].split(".")[0]
        if not major.isdigit() or int(major) < int(p["BASELINE_MIN_DRIVER_MAJOR"]):
            problems.append(f"driver {g['driver']} is older than {p['BASELINE_MIN_DRIVER_MAJOR']}; "
                            "the pinned image (CUDA 13.0) will not start")
    return problems


# --- The client: pinned Node and Pi under .baseline/ ----------------------------------


def node_platform(system: str | None = None, machine: str | None = None) -> tuple[str, str]:
    """(pin key, archive suffix) for this OS and CPU, e.g. ("darwin_arm64", "darwin-arm64.tar.gz")."""
    system = (system or platform.system()).lower()
    machine = (machine or platform.machine()).lower()
    arch = {"x86_64": "x64", "amd64": "x64", "arm64": "arm64", "aarch64": "arm64"}.get(machine)
    os_name = {"darwin": "darwin", "linux": "linux", "windows": "win"}.get(system)
    if not arch or not os_name:
        raise BaselineError(f"no pinned Node build for {system}/{machine}")
    ext = {"darwin": "tar.gz", "linux": "tar.xz", "win": "zip"}[os_name]
    return f"{os_name}_{arch}", f"{os_name}-{arch}.{ext}"


def node_dir(p: dict[str, str]) -> Path:
    return CLIENT / f"node-v{p['BASELINE_NODE_VERSION']}"


def node_bin(p: dict[str, str]) -> Path:
    """The directory holding node (and npm): bin/ on POSIX, the root on Windows."""
    return node_dir(p) if os.name == "nt" else node_dir(p) / "bin"


def pi_executable(p: dict[str, str]) -> Path:
    prefix = CLIENT / f"pi-{p['BASELINE_PI_VERSION']}"
    return prefix / "pi.cmd" if os.name == "nt" else prefix / "bin" / "pi"


def client_env(p: dict[str, str]) -> dict[str, str]:
    """The environment Pi runs in: the pinned Node first on PATH."""
    return {**os.environ, "PATH": f"{node_bin(p)}{os.pathsep}{os.environ.get('PATH', '')}"}


def install_node(p: dict[str, str]) -> None:
    key, suffix = node_platform()
    if (node_bin(p) / ("node.exe" if os.name == "nt" else "node")).is_file():
        return
    name = f"node-v{p['BASELINE_NODE_VERSION']}-{suffix}"
    url = f"https://nodejs.org/dist/v{p['BASELINE_NODE_VERSION']}/{name}"
    CLIENT.mkdir(parents=True, exist_ok=True)
    archive = CLIENT / name
    say(f"downloading {url}")
    urllib.request.urlretrieve(url, archive)
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    if digest != p[f"BASELINE_NODE_SHA256_{key}"]:
        archive.unlink()
        raise BaselineError(f"{name} checksum {digest} is not the pinned one")
    unpacked = CLIENT / name.removesuffix(f".{suffix.split('.', 1)[1]}")
    if suffix.endswith(".zip"):
        with zipfile.ZipFile(archive) as z:
            z.extractall(CLIENT)
    else:
        with tarfile.open(archive) as t:
            t.extractall(CLIENT, filter="tar")
    archive.unlink()
    unpacked.rename(node_dir(p))


def install_pi(p: dict[str, str]) -> None:
    pi = pi_executable(p)
    if not pi.is_file():
        npm = node_bin(p) / ("npm.cmd" if os.name == "nt" else "npm")
        subprocess.run(
            [str(npm), "install", "--global", "--no-fund", "--no-audit",
             "--prefix", str(pi.parent if os.name == "nt" else pi.parent.parent),
             f"@earendil-works/pi-coding-agent@{p['BASELINE_PI_VERSION']}"],
            env=client_env(p), check=True)
    version = subprocess.run([str(pi), "--version"], env=client_env(p),
                             capture_output=True, text=True, check=False).stdout.strip()
    if version != p["BASELINE_PI_VERSION"]:
        raise BaselineError(f"{pi} reports {version!r}, not the pinned {p['BASELINE_PI_VERSION']}")


def cmd_client() -> None:
    p = pins()
    install_node(p)
    install_pi(p)
    say(f"client ready: Node {p['BASELINE_NODE_VERSION']}, Pi {p['BASELINE_PI_VERSION']} at {pi_executable(p)}")


# --- vast.ai --------------------------------------------------------------------------


def offer_query(p: dict[str, str], c: dict[str, str]) -> str:
    return (f"gpu_name={p['BASELINE_GPU_VAST_NAME']} num_gpus={p['BASELINE_GPU_COUNT']} "
            f"verified=true rentable=true dph_total<={c['VAST_MAX_DPH']} "
            f"disk_space>={c['VAST_DISK_GB']} driver_version>={p['BASELINE_MIN_DRIVER_MAJOR']}.0.0")


def vastai(c: dict[str, str], *args: str, raw: bool = True):
    argv = ["uvx", "--quiet", f"vastai@{pins()['BASELINE_VASTAI_VERSION']}", *args]
    env = {**os.environ, "VAST_API_KEY": c["VAST_API_KEY"]}
    if not raw:
        subprocess.run(argv, env=env, check=True)
        return None
    out = subprocess.run([*argv, "--raw"], env=env, capture_output=True, text=True, check=False)
    if out.returncode:
        raise BaselineError(f"vastai {args[0]} {args[1] if len(args) > 1 else ''} failed: {out.stderr.strip()[-400:]}")
    return json.loads(out.stdout)


def instance_id() -> str:
    path = STATE / "instance"
    if not path.is_file():
        raise BaselineError("no instance; run up first")
    return path.read_text().strip()


def ssh_address(c: dict[str, str]) -> tuple[str, str]:
    inst = vastai(c, "show", "instance", instance_id())
    ports = (inst.get("ports") or {}).get("22/tcp") or []
    if inst.get("public_ipaddr") and ports:
        return f"root@{inst['public_ipaddr'].strip()}", str(ports[0]["HostPort"])
    return f"root@{inst['ssh_host']}", str(inst["ssh_port"])


def ssh_base(c: dict[str, str]) -> list[str]:
    host, port = ssh_address(c)
    return ["ssh", "-i", c["VAST_SSH_KEY"], "-p", port, "-o", "StrictHostKeyChecking=accept-new",
            "-o", "ServerAliveInterval=30", host]


def remote(c: dict[str, str], command: str, capture: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run([*ssh_base(c), command], capture_output=capture, text=True, check=False)


def cmd_offers() -> None:
    p, c = pins(), config()
    vastai(c, "search", "offers", offer_query(p, c), "--on-demand", "-o", "dph_total", raw=False)


def cmd_up() -> None:
    p, c = pins(), config()
    if (STATE / "instance").is_file():
        raise BaselineError(f"instance {instance_id()} is already up; run down first")
    offers = vastai(c, "search", "offers", offer_query(p, c), "--on-demand", "-o", "dph_total")
    if not offers:
        raise BaselineError(f"no on-demand {p['BASELINE_GPU_VAST_NAME']} under ${c['VAST_MAX_DPH']}/h right now")
    offer = offers[0]
    say(f"renting offer {offer['id']} at ${offer['dph_total']:.3f}/h ({offer.get('geolocation')})")
    STATE.mkdir(parents=True, exist_ok=True)
    try:
        made = vastai(c, "create", "instance", str(offer["id"]), "--image", p["BASELINE_VLLM_IMAGE"],
                      "--disk", c["VAST_DISK_GB"], "--ssh", "--direct", "--cancel-unavail",
                      "--label", LABEL)
        ident = str(made["new_contract"])
    except (KeyError, TypeError, BaselineError):
        # Never leave a billing instance untracked: find it by its label.
        ident = next((str(i["id"]) for i in vastai(c, "show", "instances") or []
                      if i.get("label") == LABEL), "")
        if not ident:
            raise
    (STATE / "instance").write_text(ident)
    say(f"instance {ident} created")
    key = Path(c["VAST_SSH_KEY"] + ".pub").read_text().strip()
    vastai(c, "attach", "ssh", instance_id(), key, raw=False)
    while vastai(c, "show", "instance", instance_id()).get("actual_status") != "running":
        time.sleep(15)
    while remote(c, "true", capture=True).returncode:
        time.sleep(10)
    say(f"instance {instance_id()} is up")


def cmd_serve() -> None:
    c = config()
    host, port = ssh_address(c)
    remote(c, "mkdir -p baseline")
    subprocess.run(["scp", "-i", c["VAST_SSH_KEY"], "-P", port, "-o", "StrictHostKeyChecking=accept-new",
                    *(str(HERE / f) for f in BOX_FILES), f"{host}:baseline/"], check=True)
    started = remote(c, "cd baseline && chmod +x *.sh && ./check-host.sh && "
                        "(pgrep -f 'vllm serve' >/dev/null || (nohup ./serve.sh > vllm.log 2>&1 &))")
    if started.returncode:
        raise BaselineError("the box failed its check; see above")
    p = pins()
    for _ in range(120):
        probe = remote(c, f"curl -sf http://127.0.0.1:{p['BASELINE_PORT']}/v1/models >/dev/null && echo up || "
                          "(pgrep -f 'vllm serve' >/dev/null && echo starting || echo dead)", capture=True)
        state = probe.stdout.strip()
        if state == "up":
            say("the model is serving")
            return
        if state == "dead":
            print(remote(c, "tail -40 baseline/vllm.log", capture=True).stdout)
            raise BaselineError("vLLM exited; its log is above")
        time.sleep(15)
    raise BaselineError("vLLM not up after 30 minutes")


def local_url(c: dict[str, str]) -> str:
    return f"http://127.0.0.1:{c['LOCAL_PORT']}/v1"


def serving(url: str) -> bool:
    try:
        with urllib.request.urlopen(f"{url}/models", timeout=5):
            return True
    except OSError:
        return False


def cmd_tunnel() -> None:
    p, c = pins(), config()
    if serving(local_url(c)):
        say(f"already serving at {local_url(c)}")
        return
    base = ssh_base(c)
    tunnel = subprocess.Popen(
        [*base[:-1], "-N", "-o", "ExitOnForwardFailure=yes",
         "-L", f"{c['LOCAL_PORT']}:127.0.0.1:{p['BASELINE_PORT']}", base[-1]],
        stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        start_new_session=os.name != "nt")
    STATE.mkdir(parents=True, exist_ok=True)
    (STATE / "tunnel.pid").write_text(str(tunnel.pid))
    for _ in range(30):
        if serving(local_url(c)):
            say(f"tunnel up: {local_url(c)}")
            return
        if tunnel.poll() is not None:
            raise BaselineError("the SSH tunnel exited; is the port free and the box up?")
        time.sleep(2)
    raise BaselineError("the tunnel is up but the model does not answer")


def close_tunnel() -> None:
    pid_file = STATE / "tunnel.pid"
    if pid_file.is_file():
        try:
            os.kill(int(pid_file.read_text()), signal.SIGTERM)
        except (OSError, ValueError):
            pass
        pid_file.unlink()


# --- The run --------------------------------------------------------------------------


def git(*args: str) -> str:
    return subprocess.run(["git", "-C", str(ROOT), *args], capture_output=True, text=True,
                          check=True).stdout.strip()


def server_identity(url: str) -> dict:
    def get(u: str):
        with urllib.request.urlopen(u, timeout=10) as r:
            return json.load(r)
    models = [{k: m[k] for k in ("id", "root", "max_model_len") if k in m}
              for m in get(f"{url}/models").get("data", [])]
    try:
        version = get(url.rsplit("/v1", 1)[0] + "/version").get("version")
    except OSError:
        version = None
    return {"version": version, "models": models}


def tool_version(argv: list[str], env=None) -> str:
    try:
        out = subprocess.run(argv, capture_output=True, text=True, env=env, check=False)
    except OSError:
        return "missing"
    return (out.stdout or out.stderr).strip().splitlines()[0] if (out.stdout or out.stderr).strip() else ""


def run_plan(p: dict[str, str], screen: bool) -> dict:
    """What a run covers: the pinned baseline, or screen 1's presence check."""
    if screen:
        return {"rungs": p["BASELINE_SCREEN_RUNGS"].split(), "ladder_repeat": "1",
                "suites": p["BASELINE_SCREEN_SUITES"], "suite_repeat": "1", "label": "screen"}
    return {"rungs": p["BASELINE_LADDER_RUNGS"].split(), "ladder_repeat": p["BASELINE_LADDER_REPEAT"],
            "suites": p["BASELINE_SUITES"], "suite_repeat": p["BASELINE_SUITE_REPEAT"], "label": "baseline"}


def cmd_run(screen: bool = False) -> None:
    if os.name == "nt":
        raise BaselineError("the ladder and suites need POSIX process groups; run this step inside WSL2")
    p, c = pins(), config()
    pi = pi_executable(p)
    if not pi.is_file():
        raise BaselineError("no pinned Pi; run client first")
    if git("status", "--porcelain", "--untracked-files=no"):
        raise BaselineError("the checkout has local changes; a baseline runs from a clean, named commit")
    url = local_url(c)
    if not serving(url):
        raise BaselineError(f"no model at {url}; run tunnel first")
    gpus = parse_gpus(remote(c, "nvidia-smi --query-gpu=name,memory.total,driver_version "
                                "--format=csv,noheader,nounits", capture=True).stdout)
    problems = gpu_problems(gpus, p)
    if problems:
        raise BaselineError("; ".join(problems))
    plan = run_plan(p, screen)
    commit = git("rev-parse", "HEAD")
    out = ROOT / "runs" / f"{plan['label']}-{datetime.now(UTC):%Y%m%dT%H%M%SZ}-{commit[:7]}"
    out.mkdir(parents=True)
    env = client_env(p)
    manifest = {
        "commit": commit, "run": plan, "pins": p, "server": server_identity(url), "gpu": gpus,
        "client": {"os": f"{platform.system()} {platform.release()} {platform.machine()}",
                   "node": tool_version([str(node_bin(p) / "node"), "--version"]),
                   "pi": tool_version([str(pi), "--version"], env), "uv": tool_version(["uv", "--version"])},
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    say(f"manifest at {out / 'manifest.json'}")
    # Both parts use one copy of the pinned profile, pointed at the tunnel.
    profile = out / "pi-profile"
    shutil.copytree(HERE / "pi-profile", profile)
    models = json.loads((profile / "models.json").read_text())
    models["providers"]["vllm"]["baseUrl"] = url
    (profile / "models.json").write_text(json.dumps(models, indent=2) + "\n")
    rungs = [arg for n in plan["rungs"] for arg in ("--rung", n)]
    subprocess.run(
        ["uv", "run", "python", "-m", "ladder.run_ladder", "--mode", "primary", "--plain",
         "--profile", "baseline", "--provider", "vllm", "--base-url", url,
         "--model", f"vllm/{p['BASELINE_SERVED_NAME']}", "--pi-executable", str(pi),
         "--pi-agent-dir", str(profile),
         "--repeat", plan["ladder_repeat"], "--deadline", p["BASELINE_LADDER_DEADLINE"],
         *rungs, "--out", str(out / "ladder")],
        cwd=ROOT / "ladder", env=env, check=True)
    with (out / "suites.txt").open("w") as log:
        suites = subprocess.Popen(
            ["uv", "run", "python", "learn/code/harness.py", "run", "--suite", plan["suites"],
             "--arm", "bare", "--grade", "--profile", str(profile), "--pi-binary", str(pi),
             "--repeat", plan["suite_repeat"], "--deadline", p["BASELINE_SUITE_DEADLINE"],
             "--runs-dir", str(out / "suites")],
            cwd=ROOT, env=env, stdout=subprocess.PIPE, text=True)
        for line in suites.stdout:
            print(line, end="")
            log.write(line)
        if suites.wait():
            raise BaselineError("the suites run failed; see suites.txt")
    (STATE / "last-run").write_text(str(out))
    say(f"done — {out}")


def cmd_fetch() -> None:
    c = config()
    last = STATE / "last-run"
    dest = Path(last.read_text()) if last.is_file() else ROOT / "runs"
    host, port = ssh_address(c)
    subprocess.run(["scp", "-i", c["VAST_SSH_KEY"], "-P", port, "-o", "StrictHostKeyChecking=accept-new",
                    f"{host}:baseline/vllm.log", str(dest / "vllm.log")], check=True)
    say(f"vLLM log at {dest / 'vllm.log'}")


def cmd_ssh() -> None:
    subprocess.run(ssh_base(config()), check=False)


def cmd_down() -> None:
    c = config()
    close_tunnel()
    ident = instance_id()
    vastai(c, "destroy", "instance", ident, "-y", raw=False)
    (STATE / "instance").unlink()
    say(f"instance {ident} destroyed")


def cmd_all(screen: bool = False, keep: bool = False) -> None:
    cmd_client()
    try:
        cmd_up()
        cmd_serve()
        cmd_tunnel()
        cmd_run(screen)
    finally:
        if keep and (STATE / "instance").is_file():
            say(f"--keep: instance {instance_id()} stays up and bills until `down`")
        elif (STATE / "instance").is_file():
            try:
                cmd_fetch()
            except (subprocess.CalledProcessError, SystemExit, OSError) as error:
                say(f"could not fetch the vLLM log: {error}")
            cmd_down()


COMMANDS = {"client": cmd_client, "offers": cmd_offers, "up": cmd_up, "serve": cmd_serve,
            "tunnel": cmd_tunnel, "run": cmd_run, "fetch": cmd_fetch, "ssh": cmd_ssh,
            "down": cmd_down, "all": cmd_all}


FLAGS = {"run": ("screen",), "all": ("screen", "keep")}


def parse_args(argv: list[str]) -> tuple[str, dict] | None:
    """(command, options), or None for a usage error; run takes --screen, all --screen and --keep."""
    if not argv or argv[0] not in COMMANDS:
        return None
    allowed = FLAGS.get(argv[0], ())
    options = {name: False for name in allowed}
    for flag in argv[1:]:
        name = flag.removeprefix("--")
        if not flag.startswith("--") or name not in allowed or options[name]:
            return None
        options[name] = True
    return argv[0], options


def main(argv: list[str] | None = None) -> int:
    parsed = parse_args(sys.argv[1:] if argv is None else argv)
    if parsed is None:
        print(__doc__)
        return 2
    command, options = parsed
    COMMANDS[command](**options)
    return 0


if __name__ == "__main__":
    sys.exit(main())
