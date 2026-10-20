import json
from pathlib import Path

from ladder.pi_profile import REPO_ROOT, mirror_agent_dir, prepare_pi_workspace


def fake_agent_dir(root: Path) -> Path:
    src = root / "agent"
    (src / "git" / "pkg").mkdir(parents=True)
    (src / "npm").mkdir()
    (src / "sessions").mkdir()
    (src / "sessions" / "private.jsonl").write_text("secret")
    (src / "extensions").mkdir()
    for name in ("settings.json", "models.json", "auth.json"):
        (src / name).write_text("{}")
    (src / "AGENTS.md").write_text("notes")
    return src


def test_mirror_skips_sessions_and_writes_nothing_to_source(tmp_path):
    src = fake_agent_dir(tmp_path)
    before = sorted(p.relative_to(src) for p in src.rglob("*"))
    dest = mirror_agent_dir(src, tmp_path / "mirror", [tmp_path / "ws"])
    assert not (dest / "sessions").exists()
    assert (dest / "git").is_symlink() and (dest / "npm").is_symlink()
    assert (dest / "settings.json").read_text() == "{}" and (
        dest / "AGENTS.md"
    ).read_text() == "notes"
    assert json.loads((dest / "trust.json").read_text()) == {str(tmp_path / "ws"): True}
    assert sorted(p.relative_to(src) for p in src.rglob("*")) == before


def test_direct_agent_dir_carries_the_profiles_request_params(tmp_path):
    from ladder.pi_profile import direct_agent_dir

    agent = direct_agent_dir(tmp_path / "agent", "tuned")
    models = json.loads((agent / "models.json").read_text())
    entry = models["providers"]["omlx"]["models"][0]
    assert entry["id"] == "Mellum2.1-12B-A2.5B-Thinking-6bit"
    assert entry["maxTokens"] == 16384
    assert (
        entry["samplingParams"]["presence_penalty"] == 0.5
        and entry["samplingParams"]["temperature"] == 0
    )
    assert "max_tokens" not in entry["samplingParams"]
    settings = json.loads((agent / "settings.json").read_text())
    assert (
        settings["defaultProvider"] == "omlx"
        and settings["compaction"]["enabled"] is False
    )


def test_mirror_agent_dir_can_override_the_pi_subagents_config(tmp_path):
    """pi-subagents reads only ~/.pi/agent/extensions/subagent/config.json; the mirror gets its own copy
    so a run can switch the intercom bridge off without touching the operator's file."""
    import json

    from ladder.pi_profile import mirror_agent_dir

    src = tmp_path / "src"
    (src / "extensions" / "subagent").mkdir(parents=True)
    (src / "extensions" / "subagent" / "config.json").write_text(
        '{"intercomBridge": {"mode": "always"}}'
    )
    dest = mirror_agent_dir(
        src,
        tmp_path / "dest",
        [tmp_path / "ws"],
        subagents_config={"intercomBridge": {"mode": "off"}},
    )
    written = json.loads((dest / "extensions" / "subagent" / "config.json").read_text())
    assert written == {"intercomBridge": {"mode": "off"}}
    assert (
        json.loads((src / "extensions" / "subagent" / "config.json").read_text())[
            "intercomBridge"
        ]["mode"]
        == "always"
    )


def test_mirror_excludes_matching_packages_in_order(tmp_path):
    src = fake_agent_dir(tmp_path)
    pkgs = [
        "git:github.com/obra/superpowers",
        "git:github.com/pauleveritt/mellum-worker@v0.1.2",
        {"source": "npm:x"},
        {"source": "git:github.com/pauleveritt/mellum-worker"},
    ]
    (src / "settings.json").write_text(json.dumps({"packages": pkgs, "theme": "dark"}))
    dest = mirror_agent_dir(
        src, tmp_path / "m", [], exclude_packages=("mellum-worker",)
    )
    got = json.loads((dest / "settings.json").read_text())
    assert got == {"packages": [pkgs[0], pkgs[2]], "theme": "dark"}
    assert json.loads((src / "settings.json").read_text())["packages"] == pkgs


def test_workspace_agent_file_is_rendered_from_the_template(tmp_path):
    pi = prepare_pi_workspace(tmp_path, Path("/abs/record-pi.js"))
    text = (pi / "agents" / "mellum-worker.md").read_text()
    body = text.split("---", 2)[2].strip()
    assert body == (REPO_ROOT / "prompts" / "mellum-worker.md").read_text().strip()
    assert (
        f"subagentOnlyExtensions: {REPO_ROOT}/extensions/mellum-guards.ts, /abs/record-pi.js\n"
        in text
    )
    assert "{{MELLUM_WORKER_ROOT}}" not in text and not (pi / "mellum").exists()


def test_workspace_without_recorder_keeps_the_template_line(tmp_path):
    text = (
        prepare_pi_workspace(tmp_path, None) / "agents" / "mellum-worker.md"
    ).read_text()
    assert f"subagentOnlyExtensions: {REPO_ROOT}/extensions/mellum-guards.ts\n" in text


def test_direct_agent_dir_takes_a_provider_and_model(tmp_path):
    from ladder.pi_profile import direct_agent_dir

    agent = direct_agent_dir(
        tmp_path / "agent", "baseline", "http://127.0.0.1:8002/v1",
        provider="llamacpp", model_id="Mellum2.1-12B-A2.5B-Thinking",
        context_window=50000,
    )
    models = json.loads((agent / "models.json").read_text())
    assert list(models["providers"]) == ["llamacpp"]
    provider = models["providers"]["llamacpp"]
    assert provider["baseUrl"] == "http://127.0.0.1:8002/v1"
    entry = provider["models"][0]
    assert entry["id"] == "Mellum2.1-12B-A2.5B-Thinking"
    assert entry["contextWindow"] == 50000
    settings = json.loads((agent / "settings.json").read_text())
    assert settings["defaultProvider"] == "llamacpp"
    assert settings["defaultModel"] == "Mellum2.1-12B-A2.5B-Thinking"


def test_direct_agent_dir_defaults_to_omlx(tmp_path):
    from ladder.pi_profile import direct_agent_dir

    agent = direct_agent_dir(tmp_path / "agent", "baseline")
    provider = json.loads((agent / "models.json").read_text())["providers"]["omlx"]
    assert provider["baseUrl"] == "http://127.0.0.1:8001/v1"
    assert provider["models"][0]["contextWindow"] == 56000
    settings = json.loads((agent / "settings.json").read_text())
    assert settings["defaultModel"] == "Mellum2.1-12B-A2.5B-Thinking-6bit"
