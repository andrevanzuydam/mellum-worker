import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import install, { createMistakeDetector } from "../learn/finetune/r1d/takeover.ts";

const result = (toolName, input, { isError = false, text = "" } = {}) => ({ toolName, input, isError, text });

test("a read of a missing file is a mistake point", () => {
	const d = createMistakeDetector();
	assert.equal(d.see(result("read", { path: "specs/roadmap.md" }, { text: "# roadmap" })), null);
	const hit = d.see(result("read", { path: "app.py" }, { isError: true, text: "ENOENT: no such file or directory, access '/w/app.py'" }));
	assert.equal(hit, "missing-file");
});

test("a read error that is not a missing file is not one", () => {
	const d = createMistakeDetector();
	assert.equal(d.see(result("read", { path: "specs" }, { isError: true, text: "EISDIR: illegal operation on a directory" })), null);
});

test("a shell syntax error is a mistake point", () => {
	const d = createMistakeDetector();
	const text = "/bin/bash: -c: line 0: syntax error near unexpected token `sys.path'\nCommand exited with code 2";
	assert.equal(d.see(result("bash", { command: "import sys; print(sys.path)" }, { isError: true, text })), "shell-syntax");
});

test("a failing test run is normal work, not a mistake", () => {
	const d = createMistakeDetector();
	assert.equal(d.see(result("bash", { command: "uv run python -m pytest tests" }, { isError: true, text: "1 failed\nCommand exited with code 1" })), null);
});

test("the same failing call twice is a mistake point", () => {
	const d = createMistakeDetector();
	const fail = () => result("bash", { command: "uv run --version" }, { isError: true, text: "Command exited with code 1" });
	assert.equal(d.see(fail()), null);
	assert.equal(d.see(fail()), "repeated-failure");
});

test("the same failing test run after an edit is work, not a repeat", () => {
	const d = createMistakeDetector();
	const tests = () => result("bash", { command: "uv run python -m pytest tests" }, { isError: true, text: "1 failed" });
	assert.equal(d.see(tests()), null);
	assert.equal(d.see(result("edit", { path: "app.py", oldText: "a", newText: "b" })), null);
	assert.equal(d.see(tests()), null);
});

test("too many looks before the first change is a mistake point; a write resets nothing after", () => {
	const d = createMistakeDetector({ looksBeforeChange: 3 });
	assert.equal(d.see(result("bash", { command: "ls -la" })), null);
	assert.equal(d.see(result("read", { path: "a.md" })), null);
	assert.equal(d.see(result("bash", { command: "cat b.md" })), "no-change-yet");
	const later = createMistakeDetector({ looksBeforeChange: 3 });
	later.see(result("write", { path: "x.py", content: "" }));
	for (let i = 0; i < 5; i++) assert.equal(later.see(result("read", { path: "x.py" })), null);
});

test("a bash command that writes a file counts as a change", () => {
	const d = createMistakeDetector({ looksBeforeChange: 2 });
	assert.equal(d.see(result("bash", { command: "ls" })), null);
	assert.equal(d.see(result("bash", { command: "cat > app.py <<'EOF'\nx = 1\nEOF" })), null);
	assert.equal(d.see(result("read", { path: "app.py" })), null);
});

function fakePi() {
	const handlers = {};
	const pi = {
		chosen: [],
		on: (name, fn) => { handlers[name] = fn; },
		setModel: async (m) => { pi.chosen.push(m); return true; },
	};
	return { pi, fire: (name, event, ctx) => handlers[name](event, ctx) };
}

test("the extension switches to the teacher once, at the first mistake, and logs where", async () => {
	const log = join(mkdtempSync(join(tmpdir(), "takeover-")), "takeover.jsonl");
	process.env.TAKEOVER_LOG = log;
	process.env.TAKEOVER_TEACHER = "lab/mellum";
	const teacher = { provider: "lab", id: "mellum" };
	const ctx = { modelRegistry: { find: (p, id) => (p === "lab" && id === "mellum" ? teacher : undefined) } };
	const { pi, fire } = fakePi();
	install(pi);
	const ev = (toolName, input, isError, text) => ({ toolName, input, isError, content: [{ type: "text", text }] });
	await fire("tool_result", ev("bash", { command: "ls" }, false, "a"), ctx);
	assert.deepEqual(pi.chosen, []);
	await fire("tool_result", ev("read", { path: "app.py" }, true, "ENOENT: no such file"), ctx);
	await fire("tool_result", ev("read", { path: "b.py" }, true, "ENOENT: no such file"), ctx);
	assert.deepEqual(pi.chosen, [teacher]);
	const lines = readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l));
	assert.equal(lines.length, 1);
	assert.equal(lines[0].reason, "missing-file");
	assert.equal(lines[0].afterToolResults, 2);
	assert.equal(lines[0].teacher, "lab/mellum");
	assert.equal(lines[0].switched, true);
});

