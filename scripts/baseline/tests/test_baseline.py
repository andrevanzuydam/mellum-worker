"""baseline.py's own logic, without renting anything: run with
`uv run --with pytest python -m pytest scripts/baseline/tests`."""

import importlib.util
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("baseline", HERE / "baseline.py")
baseline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(baseline)

PINS = baseline.pins()
A6000 = "NVIDIA RTX A6000, 49140, 595.104.02"


def test_pins_parse_without_a_shell():
    assert PINS["BASELINE_GPU_NAME"] == "NVIDIA RTX A6000"
    assert PINS["BASELINE_LADDER_RUNGS"].split() == [str(n) for n in range(1, 13)]
    assert PINS["BASELINE_VLLM_IMAGE"].startswith("vllm/vllm-openai:v0.32.0@sha256:")


def test_load_kv_strips_quotes_expands_home_and_skips_comments(tmp_path):
    f = tmp_path / "x.env"
    f.write_text('# c\nA="one two"\nB=\'q\'\nC=~/k\n\nnot a pair\n')
    assert baseline.load_kv(f) == {"A": "one two", "B": "q", "C": str(Path.home() / "k")}


def test_the_pinned_gpu_passes():
    assert baseline.gpu_problems(baseline.parse_gpus(A6000 + "\n"), PINS) == []


@pytest.mark.parametrize("rows, why", [
    (["NVIDIA GeForce RTX 5090, 32607, 595.91.07"], "pinned to"),
    (["NVIDIA RTX A6000, 46068, 595.104.02"], "pinned to"),
    ([A6000, A6000], "pinned to"),
    ([], "no GPU"),
    (["NVIDIA RTX A6000, 49140, 550.163.01"], "older than 580"),
])
def test_another_gpu_or_an_old_driver_is_refused(rows, why):
    problems = baseline.gpu_problems(baseline.parse_gpus("\n".join(rows)), PINS)
    assert any(why in p for p in problems), problems


@pytest.mark.parametrize("system, machine, key, suffix", [
    ("Darwin", "arm64", "darwin_arm64", "darwin-arm64.tar.gz"),
    ("Linux", "x86_64", "linux_x64", "linux-x64.tar.xz"),
    ("Linux", "aarch64", "linux_arm64", "linux-arm64.tar.xz"),
    ("Windows", "AMD64", "win_x64", "win-x64.zip"),
])
def test_every_platform_has_a_pinned_checksummed_node(system, machine, key, suffix):
    assert baseline.node_platform(system, machine) == (key, suffix)
    assert len(PINS[f"BASELINE_NODE_SHA256_{key}"]) == 64


def test_an_unpinned_platform_is_refused():
    with pytest.raises(SystemExit, match="no pinned Node build"):
        baseline.node_platform("FreeBSD", "x86_64")


def test_the_offer_search_asks_for_the_pinned_gpu_and_driver():
    q = baseline.offer_query(PINS, {"VAST_MAX_DPH": "0.55", "VAST_DISK_GB": "80"})
    assert "gpu_name=RTX_A6000" in q and "num_gpus=1" in q
    assert "dph_total<=0.55" in q and "driver_version>=580.0.0" in q and "verified=true" in q


def test_the_placeholder_token_is_refused_not_sent(tmp_path, monkeypatch):
    f = tmp_path / "vast.env"
    f.write_text(f'VAST_API_KEY="{baseline.PLACEHOLDER}"\n')
    monkeypatch.setenv("VAST_CONFIG", str(f))
    with pytest.raises(SystemExit, match="set VAST_API_KEY"):
        baseline.config()


def test_a_missing_config_says_how_to_make_one(tmp_path, monkeypatch):
    monkeypatch.setenv("VAST_CONFIG", str(tmp_path / "none.env"))
    with pytest.raises(SystemExit, match="copy vast.env.example"):
        baseline.config()


def test_an_unknown_command_prints_the_usage(capsys):
    assert baseline.main(["frobnicate"]) == 2
    assert "destroys on any exit" in capsys.readouterr().out


def test_the_screen_is_a_small_named_subset_of_the_baseline():
    full, screen = baseline.run_plan(PINS, screen=False), baseline.run_plan(PINS, screen=True)
    assert full == {"rungs": PINS["BASELINE_LADDER_RUNGS"].split(), "ladder_repeat": "3",
                    "suites": "all", "suite_repeat": "3", "label": "baseline"}
    assert screen["label"] == "screen"
    assert set(screen["rungs"]) < set(full["rungs"])
    assert screen["ladder_repeat"] == screen["suite_repeat"] == "1"
    assert screen["suites"] == "easy"


def test_run_and_all_take_screen_and_all_takes_keep():
    assert baseline.parse_args(["run", "--screen"]) == ("run", {"screen": True})
    assert baseline.parse_args(["all"]) == ("all", {"screen": False, "keep": False})
    assert baseline.parse_args(["all", "--keep", "--screen"]) == ("all", {"screen": True, "keep": True})
    assert baseline.parse_args(["down"]) == ("down", {})
    assert baseline.parse_args(["up", "--screen"]) is None
    assert baseline.parse_args(["run", "--keep"]) is None
    assert baseline.parse_args(["run", "--fast"]) is None


def test_the_tunnel_avoids_the_ports_the_model_serves_its_apps_on(tmp_path, monkeypatch):
    """Screen 1: an app the model started bound *:8000 beside a tunnel on 8000."""
    key = tmp_path / "id"
    key.write_text("")
    (tmp_path / "id.pub").write_text("ssh-ed25519 AAAA t")
    f = tmp_path / "vast.env"
    f.write_text(f'VAST_API_KEY=k\nVAST_SSH_KEY={key}\n')
    monkeypatch.setenv("VAST_CONFIG", str(f))
    assert baseline.config()["LOCAL_PORT"] not in {"3000", "5000", "8000", "8001", "8080"}
    example = baseline.load_kv(HERE / "vast.env.example")
    assert example["LOCAL_PORT"] == baseline.config()["LOCAL_PORT"]
