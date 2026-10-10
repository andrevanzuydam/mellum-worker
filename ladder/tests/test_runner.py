import json
from pathlib import Path

import pytest

from ladder.pi_profile import REPO_ROOT
from ladder.run_ladder import (
    GUARDS_EXT,
    MODE_EXT,
    PROMPT_FILE,
    RECORD_EXT,
    build_pi_direct_args,
    build_pi_mode_args,
)


def test_direct_args_are_the_clean_profile():
    args = build_pi_direct_args(Path("/tmp/trace.jsonl"), "fix it")
    for flag in (
        "-p",
        "--no-extensions",
        "--no-skills",
        "--no-context-files",
        "--no-session",
    ):
        assert flag in args
    assert args[args.index("--tools") + 1] == "read,grep,find,ls,bash,edit,write"
    assert args[args.index("--append-system-prompt") + 1] == str(PROMPT_FILE)
    assert args[-1] == "fix it"


def test_parse_pi_json_extracts_final_stop_and_text():
    from ladder.run_ladder import parse_pi_json

    lines = [
        '{"type":"message_end","message":{"role":"user","content":"hi"}}',
        '{"type":"message_end","message":{"role":"assistant","stopReason":"toolUse","content":[{"type":"toolCall","name":"read"}]}}',
        '{"type":"message_end","message":{"role":"assistant","stopReason":"length","content":[{"type":"thinking","thinking":"..."}]}}',
        '{"type":"agent_end"}',
    ]
    stop, text = parse_pi_json("\n".join(lines))
    assert stop == "length" and text == ""
    stop, text = parse_pi_json(
        '{"type":"message_end","message":{"role":"assistant","stopReason":"stop","content":[{"type":"text","text":"Done."}]}}'
    )
    assert stop == "stop" and text == "Done."


def test_direct_env_drops_virtual_env():
    from ladder.run_ladder import child_env

    env = child_env({"VIRTUAL_ENV": "/x", "PATH": "/bin"}, "/tmp/t.jsonl")
    assert "VIRTUAL_ENV" not in env and env["MELLUM_TRACE_FILE"] == "/tmp/t.jsonl"


def test_parse_pi_json_counts_thinking_reentries():
    from ladder.run_ladder import parse_pi_json

    two_blocks = (
        '{"type":"message_end","message":{"role":"assistant","stopReason":"toolUse","content":'
        '[{"type":"thinking","thinking":"a"},{"type":"text","text":"b"},{"type":"thinking","thinking":"c"}]}}'
    )
    one_block = (
        '{"type":"message_end","message":{"role":"assistant","stopReason":"stop","content":'
        '[{"type":"thinking","thinking":"a"},{"type":"text","text":"Done."}]}}'
    )
    stop, text, reentries = parse_pi_json(
        f"{two_blocks}\n{one_block}", with_reentries=True
    )
    assert stop == "stop" and text == "Done." and reentries == 1


def test_run_once_never_inherits_stdin(monkeypatch, tmp_path):
    """Pi blocks forever on a non-TTY stdin that never reaches EOF; the worker must get DEVNULL."""
    import subprocess as sp

    from ladder import run_ladder
    from ladder.rungs import CheckResult, Rung

    seen = {}

    def fake_run(args, **kwargs):
        seen.update(kwargs)
        return sp.CompletedProcess(args, 0, stdout="", stderr="")

    monkeypatch.setattr(run_ladder.subprocess, "run", fake_run)
    monkeypatch.setattr(
        run_ladder, "prepare_workspace", lambda rung, scratch, **kw: scratch
    )
    monkeypatch.setattr(run_ladder, "baseline_index", lambda ws: (set(), {}))
    rung = Rung(
        1, "calculator", "fix it", ["true"], lambda ws, base: CheckResult(False, True)
    )
    run_ladder.run_once(rung, "direct", "baseline", 1, tmp_path / "out", 5, {}, False)
    assert seen.get("stdin") is sp.DEVNULL


def test_run_record_carries_the_guards_override(monkeypatch, tmp_path):
    """A run under MELLUM_GUARDS must say so in run.json, or the record lies about which guards ran."""
    import json
    import subprocess as sp

    from ladder import run_ladder
    from ladder.rungs import CheckResult, Rung

    monkeypatch.setattr(
        run_ladder.subprocess,
        "run",
        lambda args, **kw: sp.CompletedProcess(args, 0, stdout="", stderr=""),
    )
    monkeypatch.setattr(
        run_ladder, "prepare_workspace", lambda rung, scratch, **kw: scratch
    )
    monkeypatch.setattr(run_ladder, "baseline_index", lambda ws: (set(), {}))
    monkeypatch.setenv("MELLUM_GUARDS", '{"emptyFinalNudge":3,"loopBreaker":true}')
    rung = Rung(
        1, "calculator", "fix it", ["true"], lambda ws, base: CheckResult(False, True)
    )
    run_ladder.run_once(rung, "direct", "baseline", 1, tmp_path / "out", 5, {}, True)
    record = json.loads(
        (tmp_path / "out" / "rung1-baseline-direct-guards-r1" / "run.json").read_text()
    )
    assert record["guards_env"] == {"emptyFinalNudge": 3, "loopBreaker": True}


def test_signal_handlers_raise_system_exit_so_finally_blocks_run():
    import signal

    from ladder.run_ladder import install_signal_handlers

    install_signal_handlers()
    for sig in (signal.SIGTERM, signal.SIGHUP):
        handler = signal.getsignal(sig)
        import pytest

        with pytest.raises(SystemExit):
            handler(sig, None)


def test_parse_parent_json_extracts_the_brief():
    from ladder.run_ladder import parse_parent_json

    lines = [
        '{"type":"message_end","message":{"role":"assistant","stopReason":"toolUse","content":[{"type":"toolCall","name":"subagent","arguments":{"agent":"mellum-worker","task":"Fix totalCents in calculator.js; run node --test"}}]}}',
        '{"type":"message_end","message":{"role":"assistant","stopReason":"stop","content":[{"type":"text","text":"Done: 3/3 tests pass."}]}}',
    ]
    parent = parse_parent_json("\n".join(lines))
    assert parent["delegated"] is True
    assert parent["brief"] == "Fix totalCents in calculator.js; run node --test"
    assert parent["parent_final_chars"] == len("Done: 3/3 tests pass.")
    assert parent["subagent_calls"] == 1


def test_parse_parent_json_reports_no_delegation():
    from ladder.run_ladder import parse_parent_json

    line = (
        '{"type":"message_end","message":{"role":"assistant","stopReason":"stop","content":'
        '[{"type":"toolCall","name":"edit","arguments":{}},{"type":"text","text":"I fixed it myself."}]}}'
    )
    parent = parse_parent_json(line)
    assert (
        parent["delegated"] is False
        and parent["brief"] == ""
        and parent["subagent_calls"] == 0
    )


def test_delegated_args_address_the_worker_by_name():
    from ladder.run_ladder import build_pi_delegated_args

    args = build_pi_delegated_args("fix it")
    assert (
        args[:2] == ["pi", "-p"]
        and "--no-session" in args
        and "--no-extensions" not in args
    )
    assert args[-1] == "Use mellum-worker to do this: fix it"


def test_direct_env_is_offline_and_uses_the_profile_agent_dir():
    from ladder.run_ladder import child_env

    env = child_env(
        {"PATH": "/bin"},
        "/tmp/t.jsonl",
        agent_dir=__import__("pathlib").Path("/tmp/agent"),
        offline=True,
    )
    assert env["PI_OFFLINE"] == "1" and env["PI_CODING_AGENT_DIR"] == "/tmp/agent"


def test_primary_args_run_mellum_as_the_parent_with_the_recorder():
    from ladder.run_ladder import MODEL, RECORD_EXT, build_pi_primary_args

    args = build_pi_primary_args("fix it")
    assert (
        args[:2] == ["pi", "-p"]
        and "--no-session" in args
        and "--no-extensions" not in args
    )
    assert args[args.index("--model") + 1] == MODEL
    assert args[args.index("-e") + 1] == str(RECORD_EXT)
    assert args[-1] == "fix it"


def test_primary_plain_args_strip_extensions_skills_and_context_but_keep_the_recorder():
    from ladder.run_ladder import MODEL, RECORD_EXT, build_pi_primary_args

    args = build_pi_primary_args("fix it", plain=True)
    for flag in (
        "--no-extensions",
        "--no-skills",
        "--no-context-files",
        "--no-session",
    ):
        assert flag in args
    assert args[args.index("--model") + 1] == MODEL
    assert args[args.index("-e") + 1] == str(RECORD_EXT)
    assert args[-1] == "fix it"


def test_direct_args_can_replace_the_system_prompt_and_set_thinking(tmp_path):
    """The shipped worker uses systemPromptMode: replace; the ladder must be able to measure that."""
    from ladder.run_ladder import build_pi_direct_args

    prompt = tmp_path / "v4.md"
    prompt.write_text("facts")
    args = build_pi_direct_args(
        tmp_path / "t",
        "fix it",
        False,
        prompt=prompt,
        prompt_mode="replace",
        thinking="low",
    )
    assert "--append-system-prompt" not in args
    assert args[args.index("--system-prompt") + 1] == "facts"
    assert args[args.index("--thinking") + 1] == "low"


def test_direct_args_default_to_append_mode_with_the_worker_prompt(tmp_path):
    from ladder.run_ladder import PROMPT_FILE, build_pi_direct_args

    args = build_pi_direct_args(tmp_path / "t", "fix it", False)
    assert args[args.index("--append-system-prompt") + 1] == str(PROMPT_FILE)
    assert "--system-prompt" not in args


def test_run_record_leaves_direct_only_fields_empty_in_other_modes(
    monkeypatch, tmp_path
):
    """prompt_file/prompt_mode/thinking only describe direct mode; recording them elsewhere misdescribes the run."""
    import json
    import subprocess as sp

    from ladder import run_ladder
    from ladder.rungs import CheckResult, Rung

    monkeypatch.setattr(
        run_ladder.subprocess,
        "run",
        lambda args, **kw: sp.CompletedProcess(args, 0, stdout="", stderr=""),
    )
    monkeypatch.setattr(
        run_ladder, "prepare_workspace", lambda rung, scratch, **kw: scratch
    )
    monkeypatch.setattr(run_ladder, "baseline_index", lambda ws: (set(), {}))
    monkeypatch.setattr(run_ladder, "prepare_pi_workspace", lambda ws, ext: ws)
    monkeypatch.setattr(run_ladder, "mirror_agent_dir", lambda s, d, t, **kw: d)
    rung = Rung(
        1, "calculator", "fix it", ["true"], lambda ws, base: CheckResult(False, True)
    )
    run_ladder.run_once(rung, "delegated", "baseline", 1, tmp_path / "out", 5, {}, True)
    record = json.loads(
        (
            tmp_path / "out" / "rung1-baseline-delegated-guards-r1" / "run.json"
        ).read_text()
    )
    assert record["prompt_file"] is None and record["prompt_mode"] is None
    assert record["thinking"] is None and record["prompt_version"] is None


def test_direct_args_load_the_thinking_stripper_before_the_recorder(tmp_path):
    """The recorder must see the stripped payload, so the stripper loads first."""
    from ladder.run_ladder import RECORD_EXT, STRIP_EXT, build_pi_direct_args

    args = build_pi_direct_args(tmp_path / "t", "fix it", True, strip_thinking=True)
    exts = [args[i + 1] for i, a in enumerate(args) if a == "-e"]
    assert exts.index(str(STRIP_EXT)) < exts.index(str(RECORD_EXT))
    assert str(STRIP_EXT) not in build_pi_direct_args(tmp_path / "t", "fix it", True)


def test_direct_args_load_the_budget_hook_before_the_recorder(tmp_path):
    from ladder.run_ladder import BUDGET_EXT, RECORD_EXT, build_pi_direct_args

    args = build_pi_direct_args(
        tmp_path / "t", "fix it", True, thinking="medium", budget_hook=True
    )
    exts = [args[i + 1] for i, a in enumerate(args) if a == "-e"]
    assert exts.index(str(BUDGET_EXT)) < exts.index(str(RECORD_EXT))
    assert args[args.index("--thinking") + 1] == "medium"


def test_mode_args_run_mellum_inside_the_operator_profile_with_the_mode_extension():
    """Mellum mode: the operator's full profile (extensions, skills), plus the mode, guards, recorder."""
    from ladder.run_ladder import MODE_EXT, MODEL, RECORD_EXT, build_pi_mode_args

    args = build_pi_mode_args("fix it")
    assert "--no-extensions" not in args and "--no-skills" not in args
    assert args[args.index("--model") + 1] == MODEL
    exts = [args[i + 1] for i, a in enumerate(args) if a == "-e"]
    assert exts.index(str(MODE_EXT)) < exts.index(str(RECORD_EXT))
    assert args[-1] == "fix it"


def test_mode_env_activates_the_mode_headlessly():
    from ladder.run_ladder import child_env

    env = child_env({}, "/t", None, offline=False, mode=True)
    assert env["MELLUM_MODE"] == "1"
    assert "MELLUM_MODE" not in child_env({}, "/t", None, offline=False)


def test_split_brief_yields_one_prompt_per_step_with_the_header_prepended_to_the_first():
    from ladder.run_ladder import split_brief

    brief = "# Task: t\n\nTest command: x\n\n## Step 1\nread\n\n## Step 2\nedit\n"
    steps = split_brief(brief)
    assert len(steps) == 2
    assert steps[0].startswith("# Task: t") and steps[0].rstrip().endswith("read")
    assert steps[1].strip() == "edit"


def test_chunk_args_continue_one_session_and_load_guards_and_recorder(tmp_path):
    from ladder.run_ladder import GUARDS_EXT, RECORD_EXT, build_pi_chunk_args

    args = build_pi_chunk_args(tmp_path / "sessions", "run", "step text", True)
    assert args[args.index("--session-dir") + 1] == str(tmp_path / "sessions")
    assert args[args.index("--session-id") + 1] == "run"
    assert "--no-session" not in args and "--system-prompt" in args
    exts = [args[i + 1] for i, a in enumerate(args) if a == "-e"]
    assert str(GUARDS_EXT) in exts and str(RECORD_EXT) in exts
    assert args[-1] == "step text"


def test_mode_runs_record_guards_on_because_the_mode_always_loads_them(
    monkeypatch, tmp_path
):
    import json
    import subprocess as sp

    from ladder import run_ladder
    from ladder.rungs import CheckResult, Rung

    monkeypatch.setattr(
        run_ladder.subprocess,
        "run",
        lambda args, **kw: sp.CompletedProcess(args, 0, stdout="", stderr=""),
    )
    monkeypatch.setattr(
        run_ladder, "prepare_workspace", lambda rung, scratch, **kw: scratch
    )
    monkeypatch.setattr(run_ladder, "baseline_index", lambda ws: (set(), {}))
    monkeypatch.setattr(run_ladder, "mirror_agent_dir", lambda s, d, t, **kw: d)
    rung = Rung(
        1, "calculator", "fix it", ["true"], lambda ws, base: CheckResult(False, True)
    )
    run_ladder.run_once(rung, "mode", "baseline", 1, tmp_path / "out", 5, {}, False)
    record = json.loads(
        (tmp_path / "out" / "rung1-baseline-mode-guards-r1" / "run.json").read_text()
    )
    assert record["guards"] is True and record["subagents_config"] is None


def test_split_brief_without_step_headings_returns_the_whole_text_and_warns(caplog):
    from ladder.run_ladder import split_brief

    with caplog.at_level("WARNING"):
        steps = split_brief("# Task\n\n## Step 1: Read\nx\n")
    assert steps == ["# Task\n\n## Step 1: Read\nx"]
    assert "no `## Step N` headings" in caplog.text


def test_worker_files_are_this_checkouts():
    for p in (PROMPT_FILE, MODE_EXT, GUARDS_EXT, RECORD_EXT):
        assert p.is_absolute() and p.is_file(), p
    assert MODE_EXT == REPO_ROOT / "extensions" / "mellum-mode.ts"
    assert GUARDS_EXT == REPO_ROOT / "extensions" / "mellum-guards.ts"
    assert PROMPT_FILE == REPO_ROOT / "prompts" / "mellum-worker.md"


def test_mode_args_load_mode_and_recorder_but_no_guards_file():
    args = build_pi_mode_args("fix it")
    exts = [args[i + 1] for i, a in enumerate(args) if a == "-e"]
    assert exts == [str(MODE_EXT), str(RECORD_EXT)]


def test_worker_provenance_names_package_version_and_git():
    from ladder.run_ladder import worker_provenance

    got = worker_provenance()
    assert (
        got["worker_version"]
        == json.loads((REPO_ROOT / "package.json").read_text())["version"]
    )
    assert got["worker_git"]


def test_worker_provenance_without_git(tmp_path):
    from ladder.run_ladder import worker_provenance

    (tmp_path / "package.json").write_text('{"version": "9.9.9"}')
    assert worker_provenance(tmp_path) == {
        "worker_version": "9.9.9",
        "worker_git": None,
    }


def test_mode_env_isolates_the_run_log_under_scratch(tmp_path):
    from ladder.run_ladder import mode_env

    env = mode_env(
        {"HOME": "/h"}, tmp_path / "trace.jsonl", tmp_path / "agent", tmp_path
    )
    assert env["MELLUM_MODE"] == "1"
    assert Path(env["MELLUM_MODE_RUNS"]).is_relative_to(tmp_path)
    assert env["PI_CODING_AGENT_DIR"] == str(tmp_path / "agent")
    assert "PI_OFFLINE" not in env


def test_run_record_names_the_brief_file_relative_to_the_repo(monkeypatch, tmp_path):
    import subprocess as sp

    from ladder import run_ladder
    from ladder.rungs import CheckResult, Rung

    monkeypatch.setattr(
        run_ladder.subprocess,
        "run",
        lambda args, **kw: sp.CompletedProcess(args, 0, stdout="", stderr=""),
    )
    monkeypatch.setattr(
        run_ladder, "prepare_workspace", lambda rung, scratch, **kw: scratch
    )
    monkeypatch.setattr(run_ladder, "baseline_index", lambda ws: (set(), {}))
    rung = Rung(
        1, "calculator", "fix it", ["true"], lambda ws, base: CheckResult(False, True)
    )
    run_ladder.run_once(rung, "brief", "baseline", 1, tmp_path / "out", 5, {}, False)
    record = json.loads(
        (tmp_path / "out" / "rung1-baseline-brief-r1" / "run.json").read_text()
    )
    assert record["brief_file"] == "ladder/ladder/briefs/rung1.md"
    assert (REPO_ROOT / record["brief_file"]).is_file()
    # subprocess.run is stubbed above, so git describe yields None here.
    assert record["worker_version"] and "worker_git" in record


def test_mode_env_turns_facts_off_only_when_asked(tmp_path):
    from ladder.run_ladder import mode_env

    args = ({"HOME": "/h"}, tmp_path / "trace.jsonl", tmp_path / "agent", tmp_path)
    assert "MELLUM_MODE_FACTS" not in mode_env(*args)
    assert "MELLUM_MODE_FACTS" not in mode_env(*args, facts=True)
    assert mode_env(*args, facts=False)["MELLUM_MODE_FACTS"] == "0"


def test_strip_mellum_section_drops_the_section_and_keeps_the_rest_exactly():
    from ladder.run_ladder import strip_mellum_section

    text = (
        "# Title\r\n\r\nintro\n\n## Mellum\n\n- Test command: x\n### Sub\n- y\n\n"
        "## Other\n\nkeep  \n\ttabbed\n"
    )
    assert strip_mellum_section(text) == (
        "# Title\r\n\r\nintro\n\n## Other\n\nkeep  \n\ttabbed\n"
    )


def test_strip_mellum_section_runs_to_eof_and_stops_at_a_level_one_heading():
    from ladder.run_ladder import strip_mellum_section

    assert strip_mellum_section("# A\n\n## Mellum\n- x\n- y") == "# A\n\n"
    assert strip_mellum_section("## Mellum\n- x\n# B\nz\n") == "# B\nz\n"


def test_strip_mellum_section_leaves_a_file_without_the_section_unchanged():
    from ladder.run_ladder import strip_mellum_section

    for text in ("", "# A\n\ntext", "# A\n### Mellum\n- x\n", "# A\n## Mellumx\n"):
        assert strip_mellum_section(text) == text


@pytest.mark.slow
def test_prepare_workspace_strips_the_section_before_the_baseline_commit(tmp_path):
    from ladder.run_ladder import git, prepare_workspace
    from ladder.rungs import RUNGS

    ws = prepare_workspace(RUNGS[6], tmp_path, strip_facts_section=True)
    agents = (ws / "AGENTS.md").read_text()
    assert "## Mellum" not in agents and "Test command" not in agents
    assert agents.startswith("# AgentClinic")
    assert git(ws, "status", "--porcelain").strip() == ""
    assert "Test command" not in git(ws, "show", "HEAD:AGENTS.md")


@pytest.mark.slow
def test_prepare_workspace_keeps_the_section_by_default(tmp_path):
    from ladder.run_ladder import prepare_workspace
    from ladder.rungs import RUNGS

    ws = prepare_workspace(RUNGS[6], tmp_path)
    assert "## Mellum" in (ws / "AGENTS.md").read_text()


def test_parser_defaults_to_facts_on_and_no_strip():
    from ladder.run_ladder import build_parser

    base = ["--profile", "baseline", "--rung", "6", "--out", "x"]
    args = build_parser().parse_args(base)
    assert args.mode_facts == "on" and args.strip_facts_section is False
    args = build_parser().parse_args(
        [*base, "--mode-facts", "off", "--strip-facts-section"]
    )
    assert args.mode_facts == "off" and args.strip_facts_section is True


def _real_run_for_git(monkeypatch, run_ladder):
    """Let git run for real while the child (pi) call is faked."""
    import subprocess as sp

    real = sp.run

    def fake(args, **kwargs):
        if args[0] == "git":
            return real(args, **kwargs)
        return sp.CompletedProcess(args, 0, stdout="", stderr="")

    monkeypatch.setattr(run_ladder.subprocess, "run", fake)


def test_run_record_names_the_facts_switches(monkeypatch, tmp_path):
    import json

    from ladder import run_ladder
    from ladder.rungs import CheckResult, Rung

    _real_run_for_git(monkeypatch, run_ladder)
    monkeypatch.setattr(
        run_ladder, "prepare_workspace", lambda rung, scratch, **kw: scratch
    )
    monkeypatch.setattr(run_ladder, "baseline_index", lambda ws: (set(), {}))
    monkeypatch.setattr(
        run_ladder, "mirror_agent_dir", lambda *a, **k: tmp_path / "agent"
    )
    rung = Rung(6, "x", "s", ["true"], lambda ws, base: CheckResult(True, True))
    run_ladder.run_once(
        rung,
        "mode",
        "baseline",
        1,
        tmp_path / "out",
        5,
        {},
        False,
        mode_facts="off",
        strip_facts_section=True,
    )
    record = json.loads(next((tmp_path / "out").glob("*/run.json")).read_text())
    assert record["mode_facts"] == "off"
    assert record["strip_facts_section"] is True


def test_the_check_runs_after_the_diff_is_staged_so_hidden_files_stay_out(
    monkeypatch, tmp_path
):
    """The scorer copies _hidden_p*.py into the workspace; diff.patch and files_created must not show them."""
    import json

    from ladder import run_ladder
    from ladder.rungs import CheckResult, Rung

    ws = tmp_path / "ws"
    ws.mkdir()
    (ws / "app.py").write_text("a\n")

    def prepare(rung, scratch, **kw):
        run_ladder.git(ws, "init", "-q")
        run_ladder.git(ws, "add", "-A")
        run_ladder.git(
            ws, "-c", "user.name=t", "-c", "user.email=t@l", "commit", "-qm", "b"
        )
        (ws / "app.py").write_text("a\nb\n")  # stands in for the run's own edit
        return ws

    def check(ws_, base):
        (ws_ / "_hidden_p1.py").write_text("def test_x():\n    pass\n")
        return CheckResult(True, True)

    _real_run_for_git(monkeypatch, run_ladder)
    monkeypatch.setattr(run_ladder, "prepare_workspace", prepare)
    monkeypatch.setattr(run_ladder, "baseline_index", lambda ws: (set(), {}))
    rung = Rung(6, "x", "s", ["true"], check)
    run_ladder.run_once(rung, "direct", "baseline", 1, tmp_path / "out", 5, {}, False)
    run_dir = next((tmp_path / "out").glob("rung6-*"))
    record = json.loads((run_dir / "run.json").read_text())
    assert "_hidden_p1.py" not in (run_dir / "diff.patch").read_text()
    assert "app.py" in (run_dir / "diff.patch").read_text()
    assert "_hidden_p1.py" not in record["files_created"]
    assert "_hidden_p1.py" not in record["diff_stat"]
