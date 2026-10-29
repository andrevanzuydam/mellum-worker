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

// Context units: each rewrites one concern of the outgoing request, and matches what the worker's
// filterForMellum does for that concern.
const { filterForMellum, WORKER_TOOLS } = await import("../extensions/mellum-worker.ts");
const { factsBlock, readProjectFacts } = await import("../extensions/mellum-facts.ts");
import { readFileSync } from "node:fs";

const PAYLOAD = () => ({
	model: "m",
	messages: [
		{ role: "system", content: "Pi's own system prompt" },
		{ role: "user", content: "Build the home page." },
		{ role: "assistant", content: [{ type: "text", text: "ok" }], reasoning_content: "thinking" },
		{ role: "user", content: [{ type: "text", text: "Now the board." }] },
	],
	tools: ["read", "grep", "find", "ls", "bash", "edit", "write", "subagent", "todo"].map((name) => ({ type: "function", function: { name } })),
	tool_choice: { type: "function", function: { name: "subagent" } },
});

for (const name of ["use-short-prompt", "add-project-facts", "narrow-tools"]) {
	test(`context/${name} installs one before_provider_request hook and nothing else`, async () => {
		const pi = fakePi();
		(await import(`../remedies/context/${name}.ts`)).default(pi);
		assert.deepEqual(pi.events(), ["before_provider_request"]);
		const { meta } = await import(`../remedies/context/${name}.ts`);
		assert.ok(meta.pathology && meta.does && meta.evidence);
	});
}

test("context/use-short-prompt replaces only the system message, as the worker does", async () => {
	const dir = mkdtempSync(join(tmpdir(), "unit-"));
	writeFileSync(join(dir, "p.md"), "Short prompt.\n");
	const pi = fakePi();
	(await import("../remedies/context/use-short-prompt.ts")).install(pi, { promptFile: join(dir, "p.md") });
	const out = pi.fire("before_provider_request", { payload: PAYLOAD() });
	assert.deepEqual(out.messages[0], filterForMellum(PAYLOAD(), "Short prompt.").messages[0]);
	assert.deepEqual(out.messages.slice(1), PAYLOAD().messages.slice(1));
	assert.deepEqual(out.tools, PAYLOAD().tools);
});

test("context/use-short-prompt defaults to the shipped prompt file", async () => {
	const pi = fakePi();
	(await import("../remedies/context/use-short-prompt.ts")).default(pi);
	const out = pi.fire("before_provider_request", { payload: PAYLOAD() });
	assert.equal(out.messages[0].content, readFileSync(new URL("../prompts/mellum-worker.md", import.meta.url), "utf8").trim());
});

test("context/add-project-facts appends the facts to user messages, as the worker does", async () => {
	const dir = mkdtempSync(join(tmpdir(), "unit-"));
	writeFileSync(join(dir, "AGENTS.md"), "# Project\n\n## Mellum\n\n- Test with `uv run pytest`.\n");
	const facts = factsBlock(readProjectFacts(dir, { read: (p) => readFileSync(p, "utf8") }, {}));
	assert.ok(facts.includes("uv run pytest"));
	const pi = fakePi();
	(await import("../remedies/context/add-project-facts.ts")).install(pi, { cwd: dir, env: {} });
	const out = pi.fire("before_provider_request", { payload: PAYLOAD() });
	const worker = filterForMellum(PAYLOAD(), "x", { keepSystem: true, facts });
	assert.deepEqual(out.messages.filter((m) => m.role === "user"), worker.messages.filter((m) => m.role === "user"));
	assert.deepEqual(out.messages[0], PAYLOAD().messages[0]);
});

test("context/add-project-facts leaves the request alone when the project has no facts", async () => {
	const dir = mkdtempSync(join(tmpdir(), "unit-"));
	const pi = fakePi();
	(await import("../remedies/context/add-project-facts.ts")).install(pi, { cwd: dir, env: {} });
	assert.equal(pi.fire("before_provider_request", { payload: PAYLOAD() }), undefined);
});

test("context/narrow-tools keeps the seven worker tools, as the worker does", async () => {
	const pi = fakePi();
	(await import("../remedies/context/narrow-tools.ts")).default(pi);
	const out = pi.fire("before_provider_request", { payload: PAYLOAD() });
	const worker = filterForMellum(PAYLOAD(), "x");
	assert.deepEqual(out.tools, worker.tools);
	assert.equal(out.tool_choice, undefined);
	assert.deepEqual(out.tools.map((t) => t.function.name), WORKER_TOOLS);
	assert.deepEqual(out.messages, PAYLOAD().messages);
});

// Opt-in units: each re-exports an existing extension unchanged, with the list's metadata.
const OPT_IN = {
	"tool/background-long-commands": "mellum-nonblock",
	"tool/lookup-library-docs": "mellum-knowledge",
	"tool/keep-a-plan": "mellum-plan",
	"check/check-code-quality": "mellum-quality",
	"workflow/spec-driven-flow": "mellum-flow",
};

for (const [unit, ext] of Object.entries(OPT_IN)) {
	test(`${unit} installs exactly what ${ext} installs`, async () => {
		const mod = await import(`../remedies/${unit}.ts`);
		assert.ok(mod.meta.pathology && mod.meta.does && mod.meta.evidence);
		const viaUnit = fakePi();
		const direct = fakePi();
		mod.default(viaUnit);
		(await import(`../extensions/${ext}.ts`)).default(direct);
		assert.deepEqual(viaUnit.events(), direct.events());
		assert.deepEqual(viaUnit.tools.map((t) => t.name), direct.tools.map((t) => t.name));
		assert.ok(viaUnit.events().length + viaUnit.tools.length > 0);
	});
}
