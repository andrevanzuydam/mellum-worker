import assert from "node:assert/strict";
import { appendFileSync, mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

// Nothing in this file may write ~/.pi/agent or reach a server: recording is off unless a test turns it on.
process.env.MELLUM_WORKER_RUNS = "0";
const noServer = () => Promise.reject(new Error("no server in tests"));

import { createLoopBreaker, createStepBudget, newFileOnlyWrite } from "../extensions/mellum-guards.ts";

test("write to an existing path is blocked with the fact", () => {
	const guard = newFileOnlyWrite((p) => p === "a.py");
	assert.equal(guard({ toolName: "write", input: { path: "b.py" } }), undefined);
	const decision = guard({ toolName: "write", input: { path: "a.py" } });
	assert.ok(decision.block);
	assert.match(decision.reason, /replaces the entire file/);
});

test("loop breaker trips on the sixth identical call, success or not", () => {
	const guard = createLoopBreaker(20, 5);
	const call = { toolName: "read", input: { path: "x" } };
	for (let i = 0; i < 5; i++) assert.equal(guard(call), undefined);
	assert.ok(guard(call).block);
});

test("loop breaker ignores differing calls", () => {
	const guard = createLoopBreaker(20, 5);
	for (let i = 0; i < 10; i++) assert.equal(guard({ toolName: "read", input: { path: `f${i}` } }), undefined);
});

test("step budget blocks after N calls", () => {
	const guard = createStepBudget(2);
	const call = { toolName: "ls", input: {} };
	assert.equal(guard(call), undefined);
	assert.equal(guard(call), undefined);
	assert.ok(guard(call).block);
});

test("empty-final nudge fires only on an assistant turn with no text and no tool call, up to the cap", async () => {
	const { createEmptyFinalNudge } = await import("../extensions/mellum-guards.ts");
	const nudge = createEmptyFinalNudge(2);
	const empty = { role: "assistant", content: [{ type: "thinking", thinking: "..." }] };
	const withText = { role: "assistant", content: [{ type: "text", text: "Done." }] };
	const withCall = { role: "assistant", content: [{ type: "toolCall", name: "read" }] };
	assert.equal(nudge(withText), undefined);
	assert.equal(nudge(withCall), undefined);
	assert.equal(nudge({ role: "user", content: "hi" }), undefined);
	const first = nudge(empty);
	assert.ok(first.continue);
	assert.equal(first.entries[0].type, "custom_message");
	assert.match(first.entries[0].content, /exits 0/);
	assert.ok(nudge(empty).continue);
	assert.equal(nudge(empty), undefined);
});

test("MELLUM_GUARDS env overrides ENABLED for live smokes", async () => {
	const { resolveEnabled } = await import("../extensions/mellum-guards.ts");
	assert.deepEqual(resolveEnabled({ emptyFinalNudge: 2 }, '{"stepBudget":1}'), { stepBudget: 1 });
	assert.deepEqual(resolveEnabled({ emptyFinalNudge: 2 }, undefined), { emptyFinalNudge: 2 });
	assert.deepEqual(resolveEnabled({ emptyFinalNudge: 2 }, "not json"), { emptyFinalNudge: 2 });
});

test("adapter nudges from agent_before_settle when the last assistant turn was empty", async () => {
	const { default: install } = await import("../extensions/mellum-guards.ts");
	const handlers = {};
	install({ on: (name, fn) => { handlers[name] = fn; } }, { fetch: noServer });
	const empty = { role: "assistant", content: [{ type: "thinking", thinking: "..." }, { type: "text", text: "\n\n" }] };
	const done = { role: "assistant", content: [{ type: "text", text: "Done." }] };
	handlers.turn_end({ message: empty, context: { canContinue: false }, outcome: "completed" });
	const first = handlers.agent_before_settle({ context: { canContinue: false }, outcome: "completed" });
	assert.ok(first?.continue, "empty last turn must trigger a continuation");
	handlers.turn_end({ message: done, context: { canContinue: false }, outcome: "completed" });
	assert.equal(handlers.agent_before_settle({ context: { canContinue: false }, outcome: "completed" }), undefined);
});

test("loop breaker forgets repeats once an edit, write, or bash call may have changed the result", () => {
	const guard = createLoopBreaker(20, 5);
	const read = { toolName: "read", input: { path: "x" } };
	for (let i = 0; i < 5; i++) assert.equal(guard(read), undefined);
	assert.equal(guard({ toolName: "edit", input: { path: "x", edits: [] } }), undefined);
	assert.equal(guard(read), undefined, "a re-read after an edit is not a repeat");
	for (let i = 0; i < 4; i++) assert.equal(guard(read), undefined);
	assert.ok(guard(read).block, "five unbroken repeats after the edit still trip it");
});

test("an edit/test loop never trips the loop breaker", () => {
	const guard = createLoopBreaker(20, 5);
	for (let i = 0; i < 12; i++) {
		assert.equal(guard({ toolName: "edit", input: { path: "a.py", edits: [{ oldText: String(i) }] } }), undefined);
		assert.equal(guard({ toolName: "bash", input: { command: "uv run --offline pytest -q" } }), undefined);
	}
});

test("empty-final nudge leaves aborted or errored turns alone", async () => {
	const { createEmptyFinalNudge } = await import("../extensions/mellum-guards.ts");
	const nudge = createEmptyFinalNudge(3);
	const content = [{ type: "thinking", thinking: "..." }];
	assert.equal(nudge({ role: "assistant", stopReason: "aborted", content }), undefined);
	assert.equal(nudge({ role: "assistant", stopReason: "error", content }), undefined);
	assert.ok(nudge({ role: "assistant", stopReason: "stop", content }).continue);
});

test("createGuardSet bundles tool_call, turn_end and settle decisions with fresh state", async () => {
	const { createGuardSet } = await import("../extensions/mellum-guards.ts");
	const set = createGuardSet({ loopBreaker: true, emptyFinalNudge: 1 });
	const read = { toolName: "read", input: { path: "x" } };
	for (let i = 0; i < 5; i++) assert.equal(set.toolCall(read), undefined);
	assert.ok(set.toolCall(read).block, "sixth identical call is blocked");
	set.turnEnd({ message: { role: "assistant", content: [{ type: "thinking", thinking: "." }] } });
	assert.ok(set.beforeSettle()?.continue, "empty final turn is nudged");
	assert.equal(set.beforeSettle(), undefined, "nudge is consumed");
	const fresh = createGuardSet({ loopBreaker: true });
	assert.equal(fresh.toolCall(read), undefined, "a new set has no memory of the old one");
});

// ---- the Worker run recorder -------------------------------------------------------------

const BRIEF = "Add a greeting to app.py. Test command: uv run pytest -q";
const SYSTEM = "<!-- mellum-worker prompt v7 -->\nYou are a bounded coding worker.";
const ctx = { mode: "json", model: { provider: "omlx", id: "mellum" } };
const textBlock = (text) => ({ type: "text", text });
const call = (id, name, args) => ({ type: "toolCall", id, name, arguments: args });
const assistant = (content, extra = {}) => ({ role: "assistant", content, stopReason: "stop", timestamp: 1000, usage: { input: 10, cacheRead: 0, output: 5 }, ...extra });
const result = (id, text, isError = false) => ({ role: "toolResult", toolCallId: id, isError, content: [textBlock(text)] });
const tmpFile = () => join(mkdtempSync(join(tmpdir(), "mellum-guards-")), "runs.jsonl");
const lines = (file) => readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

function recorderFor(file, overrides = {}) {
	return {
		env: { MELLUM_WORKER_RUNS: file },
		home: "/nonexistent-home",
		cwd: () => process.cwd(),
		now: () => Date.parse("2026-10-11T12:00:00Z"),
		append: (f, line) => appendFileSync(f, line),
		check: async () => ({ match: true, diffs: [] }),
		warn: () => {},
		...overrides,
	};
}

/** Feeds a recorder what Pi would: context with the history, then turn_end for each turn. */
function drive(recorder, turns, { system = SYSTEM, brief = BRIEF, withContext = true } = {}) {
	const history = [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: brief }];
	for (const { message, toolResults = [] } of turns) {
		if (withContext) recorder.context({ type: "context", messages: [...history] });
		history.push(message, ...toolResults);
		recorder.turnEnd({ message, toolResults });
	}
	return history;
}

const sequence = () => [
	{ message: assistant([call("c1", "bash", { command: "uv run pytest -q" })], { stopReason: "toolUse" }), toolResults: [result("c1", "1 failed", true)] },
	{ message: assistant([call("c2", "edit", { path: "app.py", edits: [] })], { stopReason: "toolUse" }), toolResults: [result("c2", "ok")] },
	{ message: assistant([call("c3", "write", { path: "new.py", content: "x" })], { stopReason: "toolUse" }), toolResults: [result("c3", "ok")] },
	{ message: assistant([call("c4", "bash", { command: "uv run pytest -q" })], { stopReason: "toolUse" }), toolResults: [result("c4", "1 passed")] },
	{ message: assistant([{ type: "thinking", thinking: "..." }]) },
	{ message: assistant([textBlock("Done: app.py, new.py. 1 passed.")]) },
];

test("recorder writes one worker record for a full run, once settled", async () => {
	const { createRecorder } = await import("../extensions/mellum-guards.ts");
	const file = tmpFile();
	const recorder = createRecorder(recorderFor(file));
	drive(recorder, sequence());
	recorder.nudged();
	assert.equal(existsSync(file), false, "nothing is written before agent_settled");
	await recorder.settled(ctx);
	const [rec, ...rest] = lines(file);
	assert.equal(rest.length, 0);
	assert.equal(rec.schema, 2);
	assert.equal(rec.kind, "worker");
	assert.equal(rec.activation, "worker");
	assert.equal(rec.host, "json");
	assert.equal(rec.model, "omlx/mellum");
	assert.equal(rec.task, BRIEF);
	assert.equal(rec.requests, 6);
	assert.deepEqual(rec.files, ["app.py", "new.py"]);
	assert.equal(rec.edits, 2);
	assert.deepEqual(rec.commands.map((c) => [c.command, c.failed, typeof c.mutates]), [["uv run pytest -q", true, "boolean"], ["uv run pytest -q", false, "boolean"]]);
	assert.equal(rec.commands[0].mutates, false);
	assert.equal(rec.lastCommand, "ok");
	assert.deepEqual(rec.finalTurn, { stopReason: "stop", hadText: true, hadToolCall: false });
	assert.equal(rec.nudges, 1);
	assert.equal(rec.guardBlocks, 0);
	assert.equal(rec.facts, null);
	assert.equal(rec.promptVersion, "v7");
	assert.deepEqual(rec.server, { match: true, diffs: [] });
	assert.equal(rec.cwd, process.cwd());
	assert.equal(rec.endedAt, "2026-10-11T12:00:00.000Z");
	assert.deepEqual(rec.filesMissingAtEnd, ["app.py", "new.py"].filter((f) => !existsSync(f)));
});

test("a second agent_settled for the same state writes nothing; a settle after new turns writes the new state", async () => {
	const { createRecorder } = await import("../extensions/mellum-guards.ts");
	const file = tmpFile();
	const recorder = createRecorder(recorderFor(file));
	const turns = sequence();
	const history = drive(recorder, turns);
	await recorder.settled(ctx);
	await recorder.settled(ctx);
	assert.equal(lines(file).length, 1, "a nudge continuation that settles twice is one record");
	assert.equal(lines(file)[0].requests, 6, "holding the final state");
	recorder.context({ type: "context", messages: [...history] });
	recorder.turnEnd({ message: assistant([textBlock("One more thing.")]), toolResults: [] });
	await recorder.settled(ctx);
	const all = lines(file);
	assert.equal(all.length, 2);
	assert.equal(all[1].requests, 7);
});

test("a run with no tool calls records commands [] and lastCommand none", async () => {
	const { createRecorder } = await import("../extensions/mellum-guards.ts");
	const file = tmpFile();
	const recorder = createRecorder(recorderFor(file));
	drive(recorder, [{ message: assistant([textBlock("Nothing to run.")]) }]);
	await recorder.settled(ctx);
	const [rec] = lines(file);
	assert.deepEqual(rec.commands, []);
	assert.deepEqual(rec.files, []);
	assert.equal(rec.lastCommand, "none");
	assert.equal(rec.requests, 1);
});

test("no system message gives promptVersion unknown; getSystemPrompt supplies it when there is none", async () => {
	const { createRecorder } = await import("../extensions/mellum-guards.ts");
	const file = tmpFile();
	const bare = createRecorder(recorderFor(file));
	drive(bare, [{ message: assistant([textBlock("ok")]) }], { system: "" });
	await bare.settled(ctx);
	assert.equal(lines(file)[0].promptVersion, "unknown");
	const viaCtx = createRecorder(recorderFor(file));
	drive(viaCtx, [{ message: assistant([textBlock("ok")]) }], { system: "" });
	await viaCtx.settled({ ...ctx, getSystemPrompt: () => "<!-- mellum-worker prompt v9 -->\nrules" });
	assert.equal(lines(file)[1].promptVersion, "v9");
	const messageWins = createRecorder(recorderFor(file));
	drive(messageWins, [{ message: assistant([textBlock("ok")]) }]);
	await messageWins.settled({ ...ctx, getSystemPrompt: () => "<!-- mellum-worker prompt v9 -->" });
	assert.equal(lines(file)[2].promptVersion, "v7");
});

test("without any context event the recorder records from the turns it saw; with no user message it writes nothing", async () => {
	const { createRecorder } = await import("../extensions/mellum-guards.ts");
	const file = tmpFile();
	const recorder = createRecorder(recorderFor(file));
	recorder.turnEnd({ message: { role: "user", content: BRIEF }, toolResults: [] });
	recorder.turnEnd({ message: assistant([call("c1", "bash", { command: "ls" })], { stopReason: "toolUse" }), toolResults: [result("c1", "a")] });
	await recorder.settled(ctx);
	const [rec] = lines(file);
	assert.equal(rec.task, BRIEF);
	assert.equal(rec.requests, 1);
	assert.equal(rec.promptVersion, "unknown");

	const empty = tmpFile();
	const none = createRecorder(recorderFor(empty));
	none.turnEnd({ message: assistant([textBlock("hi")]), toolResults: [] });
	await none.settled(ctx);
	const alone = createRecorder(recorderFor(empty));
	alone.context({ type: "context", messages: [{ role: "system", content: SYSTEM }] });
	await alone.settled(ctx);
	await createRecorder(recorderFor(empty)).settled(ctx);
	assert.equal(existsSync(empty), false);
});

test("MELLUM_WORKER_RUNS=0 writes no file and starts no server check", async () => {
	const { createRecorder } = await import("../extensions/mellum-guards.ts");
	const file = tmpFile();
	let checks = 0;
	const recorder = createRecorder(recorderFor(file, { env: { MELLUM_WORKER_RUNS: "0" }, check: async () => { checks += 1; return { match: true, diffs: [] }; } }));
	drive(recorder, sequence());
	await recorder.settled(ctx);
	assert.equal(existsSync(file), false);
	assert.equal(checks, 0);
});

test("the server check starts once, on the first context, and a failing check gives match null", async () => {
	const { createRecorder } = await import("../extensions/mellum-guards.ts");
	const file = tmpFile();
	let checks = 0;
	const recorder = createRecorder(recorderFor(file, { check: async () => { checks += 1; throw new Error("down"); } }));
	recorder.context({ type: "context", messages: [{ role: "user", content: BRIEF }] });
	assert.equal(checks, 1);
	recorder.turnEnd({ message: assistant([textBlock("ok")]), toolResults: [] });
	recorder.context({ type: "context", messages: [{ role: "user", content: BRIEF }] });
	await recorder.settled(ctx);
	assert.equal(checks, 1);
	assert.deepEqual(lines(file)[0].server, { match: null, diffs: [] });
});

test("a throwing append warns once with the prefix and never throws", async () => {
	const { createRecorder } = await import("../extensions/mellum-guards.ts");
	const warnings = [];
	const recorder = createRecorder(recorderFor(tmpFile(), { append: () => { throw new Error("disk full"); }, warn: (m) => warnings.push(m) }));
	drive(recorder, sequence());
	await assert.doesNotReject(recorder.settled(ctx));
	assert.deepEqual(warnings, ["mellum-guards: run record not written: disk full"]);
});

test("two recorders settling into one file leave two parsable lines", async () => {
	const { createRecorder } = await import("../extensions/mellum-guards.ts");
	const file = tmpFile();
	const a = createRecorder(recorderFor(file));
	const b = createRecorder(recorderFor(file));
	drive(a, sequence());
	drive(b, [{ message: assistant([textBlock("other task")]) }], { brief: "Other task" });
	await Promise.all([a.settled(ctx), b.settled(ctx)]);
	const all = lines(file);
	assert.equal(all.length, 2);
	assert.deepEqual(all.map((r) => r.task).sort(), [BRIEF, "Other task"].sort());
});

async function installDefault(env, fetchImpl = noServer) {
	const saved = process.env.MELLUM_WORKER_RUNS;
	process.env.MELLUM_WORKER_RUNS = env;
	try {
		const { default: install } = await import("../extensions/mellum-guards.ts");
		const handlers = {};
		install({ on: (name, fn) => { handlers[name] = fn; } }, { fetch: fetchImpl });
		return handlers;
	} finally {
		process.env.MELLUM_WORKER_RUNS = saved;
	}
}

/** Runs the full child sequence through the installed listeners; returns every listener's return value. */
async function runThroughPi(handlers) {
	const returns = [];
	const history = [{ role: "system", content: SYSTEM }, { role: "user", content: BRIEF }];
	const out = (name, value) => returns.push([name, JSON.stringify(value) ?? "undefined"]);
	const read = { toolName: "read", input: { path: "x" } };
	for (let i = 0; i < 6; i++) out("tool_call", handlers.tool_call(read, ctx));
	for (const { message, toolResults = [] } of sequence()) {
		out("context", handlers.context({ type: "context", messages: [...history] }, ctx));
		history.push(message, ...toolResults);
		out("turn_end", handlers.turn_end({ message, toolResults }, ctx));
		out("agent_before_settle", handlers.agent_before_settle({ context: { canContinue: false } }, ctx));
		if (message.content[0]?.type === "thinking") history.push({ role: "custom", customType: "mellum-guard", content: "nudge" });
	}
	out("agent_settled", await handlers.agent_settled({ type: "agent_settled" }, ctx));
	return returns;
}

test("the default export records through Pi's listeners without changing any listener's return value", async () => {
	const file = tmpFile();
	const on = await runThroughPi(await installDefault(file));
	const off = await runThroughPi(await installDefault("0"));
	assert.deepEqual(on, off, "identical return values with recording on and off");
	assert.ok(on.some(([name, v]) => name === "tool_call" && v.includes('"block":true')), "the loop breaker did block");
	assert.ok(on.some(([name, v]) => name === "agent_before_settle" && v.includes('"continue":true')), "the nudge did fire");
	const all = lines(file);
	assert.equal(all.length, 1);
	assert.equal(all[0].kind, "worker");
	assert.equal(all[0].nudges, 1);
	assert.equal(all[0].guardBlocks, 1);
	assert.equal(all[0].promptVersion, "v7");
	assert.deepEqual(all[0].server, { match: null, diffs: [] });
});
