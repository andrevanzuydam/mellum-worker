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
