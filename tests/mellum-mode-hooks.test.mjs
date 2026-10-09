import assert from "node:assert/strict";
import test from "node:test";
import install from "../extensions/mellum-mode.ts";

const MODEL = { provider: "omlx", id: "Mellum2.1-12B-A2.5B-Thinking-6bit" };

function fakePi({ registryHasModel = true } = {}) {
	const handlers = {};
	let commands = {};
	const pi = {
		on: (name, fn) => { handlers[name] = fn; },
		registerCommand: (name, def) => { commands[name] = def; },
		getActiveTools: () => ["read", "subagent"],
		setActiveTools: () => {},
		setModel: async () => true,
		sendMessage: () => {},
		sendUserMessage: () => {},
	};
	const ctx = {
		model: { provider: "anthropic", id: "parent" },
		modelRegistry: { find: (p, id) => (registryHasModel && p === MODEL.provider && id === MODEL.id ? MODEL : undefined) },
		ui: { notify: () => {} },
	};
	install(pi);
	return { handlers, ctx, mellum: (args) => commands.mellum.handler(args, ctx) };
}

const read = { toolName: "read", input: { path: "x" } };
const emptyTurn = { message: { role: "assistant", content: [{ type: "thinking", thinking: "." }] } };

test("guard hooks are inert while mode is off", () => {
	const { handlers } = fakePi();
	for (let i = 0; i < 8; i++) assert.equal(handlers.tool_call(read), undefined);
	handlers.turn_end(emptyTurn);
	assert.equal(handlers.agent_before_settle(), undefined);
});

test("guard hooks are live while mode is on", async () => {
	const { handlers, mellum } = fakePi();
	await mellum("on");
	for (let i = 0; i < 5; i++) assert.equal(handlers.tool_call(read), undefined);
	assert.ok(handlers.tool_call(read)?.block);
	handlers.turn_end(emptyTurn);
	assert.ok(handlers.agent_before_settle()?.continue);
});

test("guard state is fresh for each span", async () => {
	const { handlers, mellum } = fakePi();
	await mellum("on");
	for (let i = 0; i < 5; i++) handlers.tool_call(read);
	await mellum("off");
	await mellum("on");
	assert.equal(handlers.tool_call(read), undefined, "the new span does not remember the old reads");
});

test("activating with the model missing from the registry leaves mode and guards off", async () => {
	const { handlers, mellum } = fakePi({ registryHasModel: false });
	await mellum("on");
	for (let i = 0; i < 8; i++) assert.equal(handlers.tool_call(read), undefined);
	assert.equal(handlers.before_provider_request({ payload: { messages: [] } }), undefined);
});

test("context hook is dormant when no mellum span exists, and collapses when one does", () => {
	const { handlers } = fakePi();
	const plain = [{ role: "user", content: [{ type: "text", text: "hi" }] }];
	assert.equal(handlers.context({ messages: plain }), undefined);
	const t = (text) => ({ role: "user", content: [{ type: "text", text }] });
	const messages = [t("hi"), t("[mellum-mode on]"), t("task"), { role: "assistant", content: [{ type: "text", text: "done" }] }, t("[mellum-mode off]"), t("next")];
	const out = handlers.context({ messages });
	assert.ok(out && Array.isArray(out.messages));
	assert.ok(out.messages.length < messages.length);
});

test("/mellum off notifies a one-line summary of the span", async () => {
	const notes = [];
	const handlers = {};
	let commands = {};
	const pi = {
		on: (name, fn) => { handlers[name] = fn; },
		registerCommand: (name, def) => { commands[name] = def; },
		getActiveTools: () => ["read"],
		setActiveTools: () => {},
		setModel: async () => true,
		sendMessage: () => {},
		sendUserMessage: () => {},
	};
	const ctx = {
		model: { provider: "anthropic", id: "parent" },
		modelRegistry: { find: () => MODEL },
		ui: { notify: (msg, level) => notes.push([msg, level]) },
	};
	install(pi);
	await commands.mellum.handler("on", ctx);
	handlers.before_provider_request({ payload: { messages: [] } }, ctx);
	handlers.before_provider_request({ payload: { messages: [] } }, ctx);
	handlers.tool_call({ toolName: "bash", input: { command: "node --test" } });
	handlers.turn_end({ message: { role: "assistant", usage: { output: 300 }, content: [{ type: "toolCall", id: "1", name: "bash", arguments: { command: "node --test" } }] } });
	handlers.turn_end({ message: { role: "assistant", usage: { output: 100 }, content: [{ type: "text", text: "done" }] } });
	await commands.mellum.handler("off", ctx);
	const line = notes.map(([m]) => m).find((m) => m.startsWith("mellum-mode off:"));
	assert.ok(line, `no summary notify; got ${JSON.stringify(notes)}`);
	assert.match(line, /2 requests, 1 tool call, 400 output tokens, \d+ s/);
});

test("/mellum off appends one run record line to the file named by MELLUM_MODE_RUNS, and 0 disables it", async () => {
	const { mkdtempSync, readFileSync, existsSync } = await import("node:fs");
	const { tmpdir } = await import("node:os");
	const { join } = await import("node:path");
	const dir = mkdtempSync(join(tmpdir(), "mellum-runs-"));
	const file = join(dir, "nested", "runs.jsonl");
	const makePi = () => {
		const handlers = {};
		let commands = {};
		const pi = {
			on: (name, fn) => { handlers[name] = fn; },
			registerCommand: (name, def) => { commands[name] = def; },
			getActiveTools: () => ["read"], setActiveTools: () => {}, setModel: async () => true, sendMessage: () => {}, sendUserMessage: () => {},
		};
		const ctx = { model: { provider: "anthropic", id: "parent" }, modelRegistry: { find: () => MODEL }, ui: { notify: () => {} } };
		install(pi);
		return { handlers, ctx, mellum: (a) => commands.mellum.handler(a, ctx) };
	};
	const span = [
		{ role: "user", content: [{ type: "text", text: "fix the cart" }] },
		{ role: "user", content: [{ type: "text", text: "[mellum-mode on]" }] },
		{ role: "assistant", timestamp: Date.now(), usage: { output: 12 }, content: [{ type: "toolCall", id: "1", name: "bash", arguments: { command: "node --test" } }] },
		{ role: "toolResult", toolCallId: "1", toolName: "bash", content: [{ type: "text", text: "pass" }] },
		{ role: "assistant", timestamp: Date.now(), usage: { output: 5 }, content: [{ type: "text", text: "ok" }] },
	];
	process.env.MELLUM_MODE_RUNS = file;
	try {
		const a = makePi();
		await a.mellum("on");
		a.handlers.context({ messages: span });
		await a.mellum("off");
		const lines = readFileSync(file, "utf8").trim().split("\n");
		assert.equal(lines.length, 1);
		const rec = JSON.parse(lines[0]);
		assert.equal(rec.task, "fix the cart");
		assert.equal(rec.requests, 2);
		assert.deepEqual(rec.commands, [{ command: "node --test", failed: false, mutates: false }]);
		assert.equal(rec.model, `${MODEL.provider}/${MODEL.id}`);
		process.env.MELLUM_MODE_RUNS = "0";
		const b = makePi();
		await b.mellum("on");
		b.handlers.context({ messages: span });
		await b.mellum("off");
		assert.equal(readFileSync(file, "utf8").trim().split("\n").length, 1, "disabled: nothing appended");
	} finally {
		delete process.env.MELLUM_MODE_RUNS;
	}
});

function recordingPi({ mode, hasUI } = {}) {
	const handlers = {};
	let commands = {};
	const calls = { setModel: [], sendMessage: [], notify: [] };
	const pi = {
		on: (name, fn) => { handlers[name] = fn; },
		registerCommand: (name, def) => { commands[name] = def; },
		getActiveTools: () => ["read"], setActiveTools: () => {},
		setModel: async (m) => { calls.setModel.push(m); return true; },
		sendMessage: (m) => calls.sendMessage.push(m), sendUserMessage: () => {},
	};
	const ctx = { model: { provider: "anthropic", id: "parent" }, modelRegistry: { find: () => MODEL }, ui: { notify: (m, l) => calls.notify.push([m, l]) } };
	if (mode !== undefined) ctx.mode = mode;
	if (hasUI !== undefined) ctx.hasUI = hasUI;
	install(pi);
	return { handlers, ctx, calls, mellum: (a) => commands.mellum.handler(a, ctx) };
}

test("run record reconstructs the span from the last context snapshot plus the turns after it", async () => {
	const { mkdtempSync, readFileSync } = await import("node:fs");
	const { tmpdir } = await import("node:os");
	const { join } = await import("node:path");
	const file = join(mkdtempSync(join(tmpdir(), "mellum-runs-")), "runs.jsonl");
	process.env.MELLUM_MODE_RUNS = file;
	try {
		const { handlers, mellum } = recordingPi();
		await mellum("on");
		// context fires before each request; the final assistant turn arrives only via turn_end
		const before = [
			{ role: "user", content: [{ type: "text", text: "fix the cart" }] },
			{ role: "custom", customType: "mellum-mode", content: "[mellum-mode on]" },
			{ role: "assistant", timestamp: 1000, usage: { output: 10 }, content: [{ type: "toolCall", id: "1", name: "bash", arguments: { command: "node --test" } }] },
			{ role: "toolResult", toolCallId: "1", toolName: "bash", isError: true, content: [{ type: "text", text: "fail 1" }] },
		];
		handlers.context({ messages: before });
		handlers.turn_end({ message: { role: "assistant", timestamp: 2000, usage: { output: 7 }, content: [{ type: "toolCall", id: "2", name: "edit", arguments: { path: "cart.js" } }] } });
		handlers.context({ messages: [...before, { role: "assistant", timestamp: 2000, usage: { output: 7 }, content: [{ type: "toolCall", id: "2", name: "edit", arguments: { path: "cart.js" } }] }, { role: "toolResult", toolCallId: "2", toolName: "edit", content: [{ type: "text", text: "ok" }] }] });
		handlers.turn_end({ message: { role: "assistant", timestamp: 3000, usage: { output: 5 }, content: [{ type: "text", text: "done" }] } });
		await mellum("off");
		const rec = JSON.parse(readFileSync(file, "utf8").trim());
		assert.equal(rec.task, "fix the cart");
		assert.equal(rec.requests, 3, "the turn after the last context snapshot is counted once");
		assert.equal(rec.usage.output, 22);
		assert.deepEqual(rec.files, ["cart.js"]);
		assert.equal(rec.lastCommand, "failed");
		assert.equal(rec.finalReply, "done");
		assert.equal(rec.wallSeconds, 2);
	} finally {
		delete process.env.MELLUM_MODE_RUNS;
	}
});

test("a failing record write warns but never disturbs deactivation", async () => {
	const { mkdtempSync } = await import("node:fs");
	const { tmpdir } = await import("node:os");
	process.env.MELLUM_MODE_RUNS = mkdtempSync(join_(tmpdir(), "mellum-runs-")); // a directory, so appendFile fails
	try {
		const { handlers, ctx, calls, mellum } = recordingPi();
		await mellum("on");
		handlers.context({ messages: [{ role: "user", content: [{ type: "text", text: "t" }] }, { role: "user", content: [{ type: "text", text: "[mellum-mode on]" }] }, { role: "assistant", content: [{ type: "text", text: "x" }] }] });
		await mellum("off");
		assert.deepEqual(calls.setModel.at(-1), ctx.model, "previous model restored");
		assert.ok(calls.sendMessage.some((m) => m.content === "[mellum-mode off]"), "off marker sent");
		assert.ok(calls.notify.some(([m, l]) => m.includes("could not write the run record") && l === "warning"));
		assert.ok(calls.notify.some(([m]) => m.startsWith("mellum-mode off:")), "off notification still shown");
		for (let i = 0; i < 8; i++) assert.equal(handlers.tool_call({ toolName: "read", input: { path: "x" } }), undefined, "mode is off afterwards");
	} finally {
		delete process.env.MELLUM_MODE_RUNS;
	}
});
function join_(...p) { return p.join("/"); }

test("no context seen while on means nothing is written", async () => {
	const { mkdtempSync, existsSync } = await import("node:fs");
	const { tmpdir } = await import("node:os");
	const file = join_(mkdtempSync(join_(tmpdir(), "mellum-runs-")), "runs.jsonl");
	process.env.MELLUM_MODE_RUNS = file;
	try {
		const { mellum } = recordingPi();
		await mellum("on");
		await mellum("off");
		assert.equal(existsSync(file), false);
	} finally {
		delete process.env.MELLUM_MODE_RUNS;
	}
});

const snapshot = [
	{ role: "user", content: [{ type: "text", text: "fix the cart" }] },
	{ role: "user", content: [{ type: "text", text: "[mellum-mode on]" }] },
	{ role: "assistant", timestamp: 1000, usage: { output: 5 }, content: [{ type: "text", text: "ok" }] },
];

// Runs `body(file)` with MELLUM_MODE_RUNS on a fresh temp file, restoring every env var afterwards.
async function withRunsFile(body, { prompt, headless } = {}) {
	const { mkdtempSync, readFileSync, writeFileSync } = await import("node:fs");
	const { tmpdir } = await import("node:os");
	const dir = mkdtempSync(join_(tmpdir(), "mellum-runs-"));
	const file = join_(dir, "runs.jsonl");
	const saved = { RUNS: process.env.MELLUM_MODE_RUNS, PROMPT: process.env.MELLUM_MODE_PROMPT, MODE: process.env.MELLUM_MODE };
	process.env.MELLUM_MODE_RUNS = file;
	if (prompt !== undefined) {
		const pf = join_(dir, "prompt.md");
		writeFileSync(pf, prompt);
		process.env.MELLUM_MODE_PROMPT = pf;
	}
	if (headless) process.env.MELLUM_MODE = "1";
	try {
		await body();
		return JSON.parse(readFileSync(file, "utf8").trim());
	} finally {
		for (const [k, v] of Object.entries({ MELLUM_MODE_RUNS: saved.RUNS, MELLUM_MODE_PROMPT: saved.PROMPT, MELLUM_MODE: saved.MODE })) {
			if (v === undefined) delete process.env[k];
			else process.env[k] = v;
		}
	}
}

test("run record carries host, activation, prompt version, nudges and guard blocks", async () => {
	const { readFileSync } = await import("node:fs");
	const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
	const rec = await withRunsFile(async () => {
		const { handlers, mellum } = recordingPi({ mode: "tui" });
		await mellum("on");
		handlers.context({ messages: snapshot });
		for (let i = 0; i < 5; i++) assert.equal(handlers.tool_call(read), undefined);
		assert.ok(handlers.tool_call(read)?.block, "the sixth identical read is blocked");
		handlers.turn_end(emptyTurn);
		assert.ok(handlers.agent_before_settle()?.continue, "the empty turn is nudged");
		await mellum("off");
	});
	assert.equal(rec.nudges, 1);
	assert.equal(rec.guardBlocks, 1);
	assert.equal(rec.activation, "on");
	assert.equal(rec.host, "tui");
	assert.equal(rec.promptVersion, "v5");
	assert.equal(rec.version, pkg.version);
});

test("a prompt without a version marker records promptVersion unknown", async () => {
	const rec = await withRunsFile(async () => {
		const { handlers, mellum } = recordingPi({ mode: "tui" });
		await mellum("on");
		handlers.context({ messages: snapshot });
		await mellum("off");
	}, { prompt: "no marker" });
	assert.equal(rec.promptVersion, "unknown");
});

test("MELLUM_MODE=1 at session_start records activation headless and the host mode", async () => {
	const rec = await withRunsFile(async () => {
		const { handlers, ctx, mellum } = recordingPi({ mode: "json" });
		await handlers.session_start({}, ctx);
		handlers.context({ messages: snapshot });
		await mellum("off");
	}, { headless: true });
	assert.equal(rec.activation, "headless");
	assert.equal(rec.host, "json");
});

test("/mellum <task> records activation one-shot", async () => {
	const rec = await withRunsFile(async () => {
		const { handlers, ctx, mellum } = recordingPi({ mode: "tui", hasUI: true });
		await mellum("fix it");
		handlers.context({ messages: snapshot });
		await handlers.agent_settled({}, ctx);
	});
	assert.equal(rec.activation, "one-shot");
});

test("a ctx without a mode records host unknown", async () => {
	const rec = await withRunsFile(async () => {
		const { handlers, mellum } = recordingPi();
		await mellum("on");
		handlers.context({ messages: snapshot });
		await mellum("off");
	});
	assert.equal(rec.host, "unknown");
});

// A fake Pi whose sendUserMessage runs the task a tick later, as Pi's print mode does:
// agent_start, a context snapshot, one assistant turn, then (optionally) agent_settled,
// then the idle wait resolves. `waitForIdle` is a spy returning that idle promise.
function headlessPi({ hasUI = false, withWait = true, startsRun = true, settledFirst = false, startTimeoutMs } = {}) {
	const handlers = {};
	let commands = {};
	const calls = { setModel: [], sendMessage: [], notify: [], waitForIdle: 0 };
	let resolveIdle;
	const idle = new Promise((r) => { resolveIdle = r; });
	if (!startsRun) resolveIdle(); // no run: Pi is idle, so the wait returns at once
	const ctx = { mode: "print", hasUI, model: { provider: "anthropic", id: "parent" }, modelRegistry: { find: () => MODEL }, ui: { notify: (m, l) => calls.notify.push([m, l]) } };
	if (withWait) ctx.waitForIdle = () => { calls.waitForIdle += 1; return idle; };
	const pi = {
		on: (name, fn) => { handlers[name] = fn; },
		registerCommand: (name, def) => { commands[name] = def; },
		getActiveTools: () => ["read"], setActiveTools: () => {},
		setModel: async (m) => { calls.setModel.push(m); return true; },
		sendMessage: (m) => calls.sendMessage.push(m),
		sendUserMessage: (text) => {
			if (!startsRun) return;
			setImmediate(async () => {
				handlers.agent_start?.({}, ctx);
				const reply = { role: "assistant", timestamp: 1000, usage: { output: 5 }, content: [{ type: "text", text: "done" }] };
				handlers.context({ messages: [{ role: "user", content: [{ type: "text", text }] }, { role: "custom", customType: "mellum-mode", content: "[mellum-mode on]" }, reply] });
				handlers.turn_end({ message: reply });
				if (settledFirst) await handlers.agent_settled({}, ctx);
				resolveIdle();
			});
		},
	};
	if (startTimeoutMs === undefined) install(pi);
	else install(pi, { startTimeoutMs });
	return { handlers, ctx, calls, mellum: (a) => commands.mellum.handler(a, ctx) };
}

// Runs `body()` with MELLUM_MODE_RUNS on a fresh temp file; returns the file's lines (none if absent).
async function recordLines(body) {
	const { mkdtempSync, readFileSync, existsSync } = await import("node:fs");
	const { tmpdir } = await import("node:os");
	const file = join_(mkdtempSync(join_(tmpdir(), "mellum-runs-")), "runs.jsonl");
	const saved = process.env.MELLUM_MODE_RUNS;
	process.env.MELLUM_MODE_RUNS = file;
	try {
		await body();
		return existsSync(file) ? readFileSync(file, "utf8").trim().split("\n") : [];
	} finally {
		if (saved === undefined) delete process.env.MELLUM_MODE_RUNS;
		else process.env.MELLUM_MODE_RUNS = saved;
	}
}

const offMarkers = (calls) => calls.sendMessage.filter((m) => m.content === "[mellum-mode off]").length;
const modeIsOff = (handlers) => { for (let i = 0; i < 8; i++) assert.equal(handlers.tool_call(read), undefined, "guard hooks inert: mode is off"); };

test("headless one shot: the handler waits for the run, then restores the model and writes the record", async () => {
	let h;
	const lines = await recordLines(async () => {
		h = headlessPi();
		await h.mellum("fix it");
	});
	assert.equal(h.calls.waitForIdle, 1, "waitForIdle called once");
	assert.deepEqual(h.calls.setModel.at(-1), h.ctx.model, "the parent model is restored");
	assert.equal(offMarkers(h.calls), 1, "one off-marker");
	assert.equal(lines.length, 1, "one record line");
	const rec = JSON.parse(lines[0]);
	assert.equal(rec.activation, "one-shot");
	assert.equal(rec.host, "print");
	assert.equal(rec.task, "fix it");
	modeIsOff(h.handlers);
});

test("headless one shot where agent_settled fires before idle: still one deactivation", async () => {
	let h;
	const lines = await recordLines(async () => {
		h = headlessPi({ settledFirst: true });
		await h.mellum("fix it");
	});
	const restores = h.calls.setModel.filter((m) => m === h.ctx.model).length;
	assert.equal(restores, 1, "one restore setModel");
	assert.equal(offMarkers(h.calls), 1, "one off-marker");
	assert.equal(lines.length, 1, "one record line");
	assert.equal(h.calls.notify.filter(([m]) => m.startsWith("mellum-mode off:")).length, 1, "one off notification");
	modeIsOff(h.handlers);
});

test("one shot with a UI: the handler returns at once and agent_settled turns the mode off", async () => {
	const h = headlessPi({ hasUI: true, startsRun: false, startTimeoutMs: 20 });
	await h.mellum("fix it");
	assert.equal(h.calls.waitForIdle, 0, "waitForIdle never called");
	for (let i = 0; i < 5; i++) assert.equal(h.handlers.tool_call(read), undefined);
	assert.ok(h.handlers.tool_call(read)?.block, "mode still on after return: the sixth identical read is blocked");
	await h.handlers.agent_settled({}, h.ctx);
	modeIsOff(h.handlers);
	assert.equal(offMarkers(h.calls), 1);
});

test("headless ctx without waitForIdle: the handler returns with the mode on and does not throw", async () => {
	const h = headlessPi({ withWait: false, startsRun: false, startTimeoutMs: 20 });
	await h.mellum("fix it");
	for (let i = 0; i < 5; i++) assert.equal(h.handlers.tool_call(read), undefined);
	assert.ok(h.handlers.tool_call(read)?.block, "mode still on after return");
	assert.equal(offMarkers(h.calls), 0);
});

test("headless one shot whose run never starts gives up after the start timeout, warns on stderr and turns the mode off", async () => {
	let h;
	let elapsed;
	let lines;
	const stderr = await captureStderr(async () => {
		lines = await recordLines(async () => {
			h = headlessPi({ startsRun: false, startTimeoutMs: 20 });
			const t0 = Date.now();
			await h.mellum("fix it");
			elapsed = Date.now() - t0;
		});
	});
	assert.ok(elapsed < 1000, `returned within a second (took ${elapsed} ms)`);
	assert.equal(stderr.length, 1, `one stderr line (got ${JSON.stringify(stderr)})`);
	assert.match(stderr[0], /did not start within/);
	assert.deepEqual(h.calls.setModel.at(-1), h.ctx.model, "the parent model is restored");
	assert.equal(offMarkers(h.calls), 1);
	assert.equal(lines.length, 0, "no record line");
	modeIsOff(h.handlers);
});

// Runs `body()` with console.error captured; returns the captured lines. Always restores console.error.
async function captureStderr(body) {
	const lines = [];
	const original = console.error;
	console.error = (...args) => lines.push(args.join(" "));
	try {
		await body();
	} finally {
		console.error = original;
	}
	return lines;
}

test("without a UI, a missing Mellum model is reported on stderr and the mode stays off", async () => {
	const h = recordingPi({ mode: "print", hasUI: false });
	h.ctx.modelRegistry.find = () => undefined;
	const lines = await captureStderr(() => h.mellum("fix it"));
	assert.equal(lines.length, 1, "one stderr line");
	assert.match(lines[0], /omlx\/Mellum2\.1-12B-A2\.5B-Thinking-6bit not found/);
	modeIsOff(h.handlers);
});

test("with a UI, a missing Mellum model is a notify error and nothing goes to stderr", async () => {
	const h = recordingPi({ mode: "tui", hasUI: true });
	h.ctx.modelRegistry.find = () => undefined;
	const lines = await captureStderr(() => h.mellum("fix it"));
	assert.deepEqual(lines, [], "nothing on stderr");
	assert.ok(h.calls.notify.some(([m, l]) => m.includes("not found") && l === "error"), "notify called with level error");
	modeIsOff(h.handlers);
});
