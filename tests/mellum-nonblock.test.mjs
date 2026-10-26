import assert from "node:assert/strict";
import test from "node:test";

import { blockingLauncher, wrap, applyNonblock, applyTimeout, DEFAULT_BASH_TIMEOUT_S } from "../extensions/mellum-nonblock.ts";

// Pi's bash enforces a `timeout` (killing the process tree) but defaults to NONE, so a blocking
// command the model runs without one hangs until the global reap — the Qwen phase-2 freeze. We
// default it so Pi's own mechanism bounds the hang; this reuses Pi's bash, it does not replace it.
test("applyTimeout defaults a missing bash timeout and leaves the model's own alone", () => {
	const i1 = { command: "sleep 999" };
	assert.equal(applyTimeout("bash", i1), DEFAULT_BASH_TIMEOUT_S);
	assert.equal(i1.timeout, DEFAULT_BASH_TIMEOUT_S);

	const i2 = { command: "uv run pytest", timeout: 300 }; // model asked for 300s — keep it
	assert.equal(applyTimeout("bash", i2), undefined);
	assert.equal(i2.timeout, 300);

	const i3 = { command: "x", timeout: 0 }; // 0/invalid is treated as unset
	applyTimeout("bash", i3);
	assert.equal(i3.timeout, DEFAULT_BASH_TIMEOUT_S);
});

test("applyTimeout only touches bash/shell calls", () => {
	const w = { path: "app.py", content: "x" };
	assert.equal(applyTimeout("write", w), undefined);
	assert.equal("timeout" in w, false);
	assert.equal(applyTimeout("shell", { command: "ls" }), DEFAULT_BASH_TIMEOUT_S);
});


test("detects server / long-running launchers", () => {
	for (const c of [
		"uvicorn app:app",
		"uv run uvicorn app:app --port 8000",
		"python -m uvicorn app:app",
		"uv run python app.py",
		"python3 main.py",
		"gunicorn app:app",
		"flask run",
		"python manage.py runserver",
		"php -S 0.0.0.0:8000",
		"python -m http.server",
		"npm run dev",
		"python server.py --reload",
	]) {
		assert.ok(blockingLauncher(c), c);
	}
});

test("leaves the short commands the worker needs alone", () => {
	for (const c of [
		"uv run --with pytest pytest -q tests",
		"uv run python -m pytest",
		"uv sync --frozen",
		"ls -la",
		"cat app.py",
		"python -c 'from starlette.testclient import TestClient; print(1)'",
	]) {
		assert.equal(blockingLauncher(c), undefined, c);
	}
});

test("wrap backgrounds the original command and feeds its output back", () => {
	const w = wrap("uv run python app.py");
	assert.match(w, /uv run python app\.py/); // the original command is preserved
	assert.match(w, /&/); // backgrounded (threaded)
	assert.match(w, /sleep/); // gives it a moment to produce output
	assert.match(w, /cat /); // the captured output is printed back to the model
	assert.match(w, /mellum-nonblock/); // carries the sentinel
});

test("applyNonblock rewrites a blocking bash call in place, threading it", () => {
	const ev = { toolName: "bash", input: { command: "uv run python app.py" } };
	const note = applyNonblock(ev.toolName, ev.input);
	assert.ok(note); // it acted
	assert.notEqual(ev.input.command, "uv run python app.py"); // mutated in place
	assert.match(ev.input.command, /uv run python app\.py/); // original still runs
	assert.match(ev.input.command, /&/);
});

test("applyNonblock leaves a non-blocking command untouched", () => {
	const ev = { toolName: "bash", input: { command: "uv run --with pytest pytest -q" } };
	assert.equal(applyNonblock(ev.toolName, ev.input), undefined);
	assert.equal(ev.input.command, "uv run --with pytest pytest -q");
});

test("never double-wraps an already-threaded command", () => {
	const once = wrap("uvicorn app:app");
	const ev = { toolName: "bash", input: { command: once } };
	assert.equal(applyNonblock(ev.toolName, ev.input), undefined);
	assert.equal(ev.input.command, once);
});

test("only touches bash/shell calls", () => {
	assert.equal(applyNonblock("read", { path: "app.py" }), undefined);
	assert.equal(applyNonblock("write", { command: "uvicorn app:app" }), undefined);
});
