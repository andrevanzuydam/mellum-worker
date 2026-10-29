import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** A fake Pi that records what a unit installs, so a test can prove a unit installs its own
 * hook and nothing else, then drive that hook. */
function fakePi() {
	const handlers = {};
	const tools = [];
	return {
		handlers,
		tools,
		on(event, handler) { (handlers[event] ??= []).push(handler); },
		registerTool(tool) { tools.push(tool); },
		events() { return Object.keys(handlers).sort(); },
		fire(event, payload) { return handlers[event]?.map((h) => h(payload)).find((r) => r !== undefined); },
	};
}

const GUARDS = [
	"block-foreground-server",
	"break-repeat-loops",
	"stay-in-workspace",
	"refuse-whole-file-rewrite",
	"cap-turns",
];

for (const name of GUARDS) {
	test(`guard/${name} installs one tool_call hook and nothing else`, async () => {
		const unit = await import(`../remedies/guard/${name}.ts`);
		const pi = fakePi();
		unit.default(pi);
		assert.deepEqual(pi.events(), ["tool_call"]);
		assert.equal(pi.handlers.tool_call.length, 1);
		assert.equal(pi.tools.length, 0);
	});
}

test("every unit carries the metadata the remedies list is generated from", async () => {
	for (const path of [...GUARDS.map((n) => `guard/${n}`), "nudge/nudge-empty-turn"]) {
		const { meta } = await import(`../remedies/${path}.ts`);
		for (const key of ["pathology", "does", "lesson", "evidence"]) {
			assert.equal(typeof meta[key], "string", `${path} meta.${key}`);
		}
		for (const key of ["pathology", "does", "evidence"]) {
			assert.ok(meta[key].length > 0, `${path} meta.${key} empty`); // lesson is "" when none teaches it yet
		}
	}
});

test("guard/break-repeat-loops blocks the sixth identical read and forgets after a write", async () => {
	const pi = fakePi();
	(await import("../remedies/guard/break-repeat-loops.ts")).default(pi);
	const ls = { toolName: "ls", input: { path: "." } };
	for (let i = 0; i < 5; i++) assert.equal(pi.fire("tool_call", ls), undefined);
	assert.equal(pi.fire("tool_call", ls)?.block, true);
	pi.fire("tool_call", { toolName: "write", input: { path: "a.py", content: "" } });
	assert.equal(pi.fire("tool_call", ls), undefined);
});

test("guard/block-foreground-server blocks `python app.py` and allows it backgrounded", async () => {
	const pi = fakePi();
	(await import("../remedies/guard/block-foreground-server.ts")).default(pi);
	assert.equal(pi.fire("tool_call", { toolName: "bash", input: { command: "uv run python app.py" } })?.block, true);
	assert.equal(pi.fire("tool_call", { toolName: "bash", input: { command: "nohup uv run python app.py &" } }), undefined);
	assert.equal(pi.fire("tool_call", { toolName: "bash", input: { command: "grep uvicorn app.py" } }), undefined);
});

test("guard/stay-in-workspace blocks a tree walk outside the workspace and allows one inside", async () => {
	const pi = fakePi();
	(await import("../remedies/guard/stay-in-workspace.ts")).default(pi);
	assert.equal(pi.fire("tool_call", { toolName: "bash", input: { command: "grep -rl x /Users /var" } })?.block, true);
	assert.equal(pi.fire("tool_call", { toolName: "bash", input: { command: "grep -rl x ." } }), undefined);
});

test("guard/refuse-whole-file-rewrite blocks write to an existing file, allows a new one", async () => {
	const dir = mkdtempSync(join(tmpdir(), "unit-"));
	writeFileSync(join(dir, "app.py"), "x = 1\n");
	const pi = fakePi();
	(await import("../remedies/guard/refuse-whole-file-rewrite.ts")).install(pi, { cwd: dir });
	assert.equal(pi.fire("tool_call", { toolName: "write", input: { path: "app.py", content: "" } })?.block, true);
	assert.equal(pi.fire("tool_call", { toolName: "write", input: { path: "new.py", content: "" } }), undefined);
});

test("guard/cap-turns allows its budget and blocks the call after it", async () => {
	const pi = fakePi();
	(await import("../remedies/guard/cap-turns.ts")).install(pi, { max: 2 });
	assert.equal(pi.fire("tool_call", { toolName: "ls", input: {} }), undefined);
	assert.equal(pi.fire("tool_call", { toolName: "ls", input: {} }), undefined);
	assert.equal(pi.fire("tool_call", { toolName: "ls", input: {} })?.block, true);
});

test("nudge/nudge-empty-turn installs turn_end and agent_before_settle only, and nudges an empty final", async () => {
	const pi = fakePi();
	(await import("../remedies/nudge/nudge-empty-turn.ts")).default(pi);
	assert.deepEqual(pi.events(), ["agent_before_settle", "turn_end"]);
	pi.fire("turn_end", { message: { role: "assistant", stopReason: "stop", content: [] } });
	assert.equal(pi.fire("agent_before_settle", {})?.continue, true);
	pi.fire("turn_end", { message: { role: "assistant", stopReason: "stop", content: [{ type: "text", text: "done" }] } });
	assert.equal(pi.fire("agent_before_settle", {}), undefined);
});
