import assert from "node:assert/strict";
import test from "node:test";
import { filterForMellum, MARK_ON, MARK_OFF, BOOTSTRAP_MARKER } from "../extensions/mellum-mode.ts";

const text = (role, t) => ({ role, content: [{ type: "text", text: t }] });

test("after the on-marker: system replaced, earlier history and the bootstrap dropped, reasoning kept", () => {
	const payload = {
		model: "x",
		messages: [
			{ role: "system", content: "pi base prompt + skills catalog" },
			text("user", `${BOOTSTRAP_MARKER} ... superpowers`),
			text("user", "parent task"),
			{ role: "assistant", content: "parent answer", reasoning_content: "parent thoughts" },
			text("user", MARK_ON),
			text("user", "fix the cart total"),
			{ role: "assistant", content: "", reasoning_content: "mine", tool_calls: [{ id: "1" }] },
			{ role: "tool", tool_call_id: "1", content: "r" },
		],
	};
	const out = filterForMellum(payload, "v5 prompt");
	assert.equal(out.messages[0].role, "system");
	assert.equal(out.messages[0].content, "v5 prompt");
	assert.deepEqual(out.messages.slice(1).map(m => m.role), ["user", "assistant", "tool"]);
	assert.equal(out.messages[1].content[0].text, "fix the cart total");
	assert.equal(out.messages[2].reasoning_content, "mine", "own thinking stays (A12)");
	assert.equal(payload.messages.length, 8, "input not mutated");
});

test("without an on-marker (headless activation) only the bootstrap is dropped", () => {
	const payload = { messages: [{ role: "system", content: "base" }, text("user", `${BOOTSTRAP_MARKER} x`), text("user", "task")] };
	const out = filterForMellum(payload, "v5");
	assert.deepEqual(out.messages.map(m => m.role), ["system", "user"]);
	assert.equal(out.messages[1].content[0].text, "task");
});

test("a prompt queued just before the on-marker is kept, and marker messages never reach the model", () => {
	const payload = {
		messages: [
			{ role: "system", content: "base" },
			text("user", "fix the cart total"),
			text("user", MARK_ON),
		],
		tools: [{ type: "function", function: { name: "read" } }, { type: "function", function: { name: "subagent" } }],
	};
	const out = filterForMellum(payload, "v5");
	assert.deepEqual(out.messages.map(m => m.role), ["system", "user"]);
	assert.equal(out.messages[1].content[0].text, "fix the cart total");
	assert.ok(!JSON.stringify(out.messages).includes(MARK_ON));
	assert.deepEqual(out.tools.map(t => t.function.name), ["read"], "pi-subagents' re-added tools are filtered out");
});

test("a developer-role instruction message is replaced too, and tool_choice naming a removed tool is dropped", () => {
	const payload = {
		messages: [{ role: "developer", content: "pi base" }, text("user", "task")],
		tools: [{ type: "function", function: { name: "subagent" } }],
		tool_choice: { type: "function", function: { name: "subagent" } },
	};
	const out = filterForMellum(payload, "v5");
	assert.deepEqual(out.messages.map(m => m.role), ["system", "user"]);
	assert.ok(!("tools" in out), "an empty tool list is removed, not sent");
	assert.ok(!("tool_choice" in out));
});

test("markers between the prompt and the on-marker are skipped: [prompt, OFF, ON] keeps the prompt", () => {
	const payload = { messages: [{ role: "system", content: "base" }, text("user", "task"), text("user", MARK_OFF), text("user", MARK_ON)] };
	const out = filterForMellum(payload, "v5");
	assert.deepEqual(out.messages.map(m => m.role), ["system", "user"]);
	assert.equal(out.messages[1].content[0].text, "task");
});

test("a missing marker while interactively active is reported, not silently widened", () => {
	const payload = { messages: [{ role: "system", content: "base" }, text("user", "old parent turn"), text("user", "task")] };
	const out = filterForMellum(payload, "v5", { expectMarker: true });
	assert.equal(out.messages.length, 2, "only the system prompt and the last user message survive");
	assert.equal(out.messages[1].content[0].text, "task");
	assert.equal(out.mellumModeMarkerMissing, true);
});

test("after /mellum off, the parent sees one handoff block in place of the mode's turns", async () => {
	const { collapseHandoffs, MARK_OFF } = await import("../extensions/mellum-mode.ts");
	const msgs = [
		text("user", "earlier parent turn"),
		{ role: "assistant", content: [{ type: "text", text: "parent reply" }] },
		text("user", "fix the cart total"),
		text("user", MARK_ON),
		{ role: "assistant", content: [{ type: "thinking", thinking: "..." }, { type: "toolCall", id: "1", name: "read", arguments: { path: "calculator.js" } }] },
		{ role: "toolResult", toolCallId: "1", toolName: "read", content: [{ type: "text", text: "export function total() {}" }] },
		{ role: "assistant", content: [{ type: "toolCall", id: "2", name: "edit", arguments: { path: "calculator.js", edits: [] } }] },
		{ role: "toolResult", toolCallId: "2", toolName: "edit", content: [{ type: "text", text: "Successfully replaced 1 block(s)" }] },
		{ role: "assistant", content: [{ type: "toolCall", id: "3", name: "bash", arguments: { command: "node --test calculator.test.js" } }] },
		{ role: "toolResult", toolCallId: "3", toolName: "bash", content: [{ type: "text", text: "ℹ pass 3\nℹ fail 0" }] },
		{ role: "assistant", content: [{ type: "text", text: "Files changed: calculator.js. Tests pass." }] },
		text("user", MARK_OFF),
		text("user", "thanks, now the docs"),
	];
	const out = collapseHandoffs(msgs);
	assert.deepEqual(out.map(m => m.role), ["user", "assistant", "user", "user"]);
	const handoff = out[2].content[0].text;
	assert.match(handoff, /\[mellum-mode handoff\]/);
	assert.match(handoff, /fix the cart total/);
	assert.match(handoff, /calculator\.js/);
	assert.match(handoff, /pass 3/);
	assert.match(handoff, /Tests pass\./);
	assert.ok(!handoff.includes("export function total"), "tool results are summarised, not replayed");
	assert.equal(out[3].content[0].text, "thanks, now the docs");
	assert.equal(msgs.length, 13, "input not mutated");
});

test("an open span (mode still on) is left alone by the collapse", async () => {
	const { collapseHandoffs } = await import("../extensions/mellum-mode.ts");
	const msgs = [text("user", "task"), text("user", MARK_ON), { role: "assistant", content: [{ type: "text", text: "working" }] }];
	assert.deepEqual(collapseHandoffs(msgs), msgs);
});

test("a new prompt queued before the off-marker is kept after the handoff", async () => {
	const { collapseHandoffs, MARK_OFF } = await import("../extensions/mellum-mode.ts");
	const msgs = [
		text("user", "fix it"),
		text("user", MARK_ON),
		{ role: "assistant", content: [{ type: "text", text: "done" }] },
		text("user", "now the docs"),
		text("user", MARK_OFF),
	];
	const out = collapseHandoffs(msgs);
	assert.deepEqual(out.map(m => m.role), ["user", "user"]);
	assert.match(out[0].content[0].text, /handoff/);
	assert.equal(out[1].content[0].text, "now the docs");
});

test("markers arrive at the context event as custom messages, not user messages", async () => {
	const { collapseHandoffs, MARK_OFF } = await import("../extensions/mellum-mode.ts");
	const custom = (t) => ({ role: "custom", customType: "mellum-mode", content: [{ type: "text", text: t }] });
	const msgs = [
		text("user", "fix it"),
		custom(MARK_ON),
		{ role: "assistant", content: [{ type: "text", text: "done" }] },
		text("user", "now the docs"),
		custom(MARK_OFF),
	];
	const out = collapseHandoffs(msgs);
	assert.deepEqual(out.map(m => m.role), ["user", "user"]);
	assert.match(out[0].content[0].text, /handoff/);
});

test("handoff lists the bash commands run and flags written files that no longer exist", async () => {
	const { collapseHandoffs, MARK_OFF } = await import("../extensions/mellum-mode.ts");
	const ts = (s) => Date.parse(`2026-10-09T19:${s}Z`);
	const msgs = [
		text("user", "Write a hello world python file with a unit test"),
		text("user", MARK_ON),
		{ role: "assistant", timestamp: ts("28:52.217"), usage: { input: 547, output: 651 }, content: [{ type: "toolCall", id: "1", name: "write", arguments: { path: "hello.py", content: "x" } }] },
		{ role: "toolResult", toolCallId: "1", toolName: "write", content: [{ type: "text", text: "Successfully wrote to hello.py" }] },
		{ role: "assistant", timestamp: ts("28:58.265"), usage: { input: 994, output: 102 }, content: [{ type: "toolCall", id: "2", name: "write", arguments: { path: "tests/test_hello.py", content: "y" } }] },
		{ role: "toolResult", toolCallId: "2", toolName: "write", content: [{ type: "text", text: "Successfully wrote to tests/test_hello.py" }] },
		{ role: "assistant", timestamp: ts("28:58.930"), usage: { input: 96, output: 77 }, content: [{ type: "toolCall", id: "3", name: "bash", arguments: { command: "uv run --offline pytest -q" } }] },
		{ role: "toolResult", toolCallId: "3", toolName: "bash", isError: true, content: [{ type: "text", text: "E   ModuleNotFoundError: No module named 'hello'\n\nCommand exited with code 2" }] },
		{ role: "assistant", timestamp: ts("29:04.814"), usage: { input: 180, output: 55 }, content: [{ type: "toolCall", id: "4", name: "bash", arguments: { command: "mv hello.py tests/hello.py" } }] },
		{ role: "toolResult", toolCallId: "4", toolName: "bash", content: [{ type: "text", text: "(no output)" }] },
		{ role: "assistant", timestamp: ts("29:09.304"), usage: { input: 839, output: 40 }, content: [{ type: "toolCall", id: "5", name: "bash", arguments: { command: "uv run --offline pytest -q" } }] },
		{ role: "toolResult", toolCallId: "5", toolName: "bash", content: [{ type: "text", text: "1 passed in 0.00s" }] },
		{ role: "assistant", timestamp: ts("29:13.636"), usage: { input: 143, output: 355 }, content: [{ type: "text", text: "Hello world Python file with unit test created and tests passed successfully." }] },
		text("user", MARK_OFF),
	];
	const exists = (p) => p === "tests/test_hello.py"; // hello.py was moved away by bash
	const out = collapseHandoffs(msgs, { exists });
	const h = out[0].content[0].text;
	assert.match(h, /Files edited or written: hello\.py \(missing at handoff\), tests\/test_hello\.py/);
	assert.match(h, /Commands run:\n- uv run --offline pytest -q \(failed\)\n- mv hello\.py tests\/hello\.py\n- uv run --offline pytest -q/);
	assert.match(h, /Mellum: 6 requests, 1,280 output tokens, 21 s, last command ok/);
	assert.ok(h.indexOf("Mellum: 6 requests") < h.indexOf("Task:"), "the summary line comes right after the header");
});

test("handoff summary reports a failed last command and tolerates missing usage and timestamps", async () => {
	const { collapseHandoffs, MARK_OFF } = await import("../extensions/mellum-mode.ts");
	const msgs = [
		text("user", "fix it"),
		text("user", MARK_ON),
		{ role: "assistant", content: [{ type: "toolCall", id: "1", name: "bash", arguments: { command: "node --test" } }] },
		{ role: "toolResult", toolCallId: "1", toolName: "bash", isError: true, content: [{ type: "text", text: "fail 1" }] },
		{ role: "assistant", content: [{ type: "text", text: "could not" }] },
		text("user", MARK_OFF),
	];
	const h = collapseHandoffs(msgs, { exists: () => true })[0].content[0].text;
	assert.match(h, /Mellum: 2 requests, 0 output tokens, wall unknown, last command failed/);
	assert.match(h, /Commands run:\n- node --test \(failed\)/);
});

test("collapseHandoffs without an exists option never flags files", async () => {
	const { collapseHandoffs, MARK_OFF } = await import("../extensions/mellum-mode.ts");
	const msgs = [text("user", "t"), text("user", MARK_ON), { role: "assistant", content: [{ type: "toolCall", id: "1", name: "write", arguments: { path: "nope/zzz.py" } }] }, text("user", MARK_OFF)];
	assert.match(collapseHandoffs(msgs)[0].content[0].text, /Files edited or written: nope\/zzz\.py\n/);
});

test("a bash call with no result is reported as unfinished, not ok, and does not steal the last output", async () => {
	const { collapseHandoffs, MARK_OFF } = await import("../extensions/mellum-mode.ts");
	const msgs = [
		text("user", "t"),
		text("user", MARK_ON),
		{ role: "assistant", content: [{ type: "toolCall", id: "1", name: "bash", arguments: { command: "node --test" } }] },
		{ role: "toolResult", toolCallId: "1", toolName: "bash", content: [{ type: "text", text: "pass 3" }] },
		{ role: "assistant", content: [{ type: "toolCall", id: "2", name: "bash", arguments: { command: "sleep 999" } }] },
		text("user", MARK_OFF),
	];
	const h = collapseHandoffs(msgs)[0].content[0].text;
	assert.match(h, /1 request|2 requests/);
	assert.match(h, /last command did not finish/);
	assert.match(h, /- sleep 999 \(no result\)/);
	assert.match(h, /Last command output:\npass 3/);
});

test("the commands list is capped and multi-line commands are collapsed to one line", async () => {
	const { collapseHandoffs, MARK_OFF } = await import("../extensions/mellum-mode.ts");
	const calls = [];
	for (let i = 1; i <= 18; i++) {
		calls.push({ role: "assistant", content: [{ type: "toolCall", id: String(i), name: "bash", arguments: { command: i === 18 ? "cat <<'X'\nline one\nline two\nX" : `echo ${i}` } }] });
		calls.push({ role: "toolResult", toolCallId: String(i), toolName: "bash", content: [{ type: "text", text: "ok" }] });
	}
	const h = collapseHandoffs([text("user", "t"), text("user", MARK_ON), ...calls, text("user", MARK_OFF)])[0].content[0].text;
	assert.match(h, /Commands run \(3 earlier not shown\):\n- echo 4\n/);
	assert.ok(!h.includes("- echo 1\n"), "the earliest commands are dropped");
	assert.match(h, /- cat <<'X' line one line two X\n/);
	assert.match(h, /Mellum: 18 requests/);
});

test("summary uses the singular for one request", async () => {
	const { collapseHandoffs, MARK_OFF } = await import("../extensions/mellum-mode.ts");
	const h = collapseHandoffs([text("user", "t"), text("user", MARK_ON), { role: "assistant", content: [{ type: "text", text: "hi" }] }, text("user", MARK_OFF)])[0].content[0].text;
	assert.match(h, /Mellum: 1 request, 0 output tokens, wall unknown, no commands/);
});

test("runRecord builds the JSONL line for a span from the same fields as the handoff", async () => {
	const { runRecord, MARK_OFF } = await import("../extensions/mellum-mode.ts");
	const ts = (s) => Date.parse(`2026-10-09T19:${s}Z`);
	const span = [
		{ role: "assistant", timestamp: ts("28:52.217"), usage: { input: 547, cacheRead: 1024, output: 651 }, content: [{ type: "toolCall", id: "1", name: "write", arguments: { path: "hello.py" } }] },
		{ role: "toolResult", toolCallId: "1", toolName: "write", content: [{ type: "text", text: "ok" }] },
		{ role: "assistant", timestamp: ts("28:58.930"), usage: { input: 96, cacheRead: 3072, output: 77 }, content: [{ type: "toolCall", id: "2", name: "bash", arguments: { command: "uv run --offline pytest -q" } }] },
		{ role: "toolResult", toolCallId: "2", toolName: "bash", isError: true, content: [{ type: "text", text: "Command exited with code 2" }] },
		{ role: "assistant", timestamp: ts("29:13.636"), usage: { input: 143, cacheRead: 5120, output: 355 }, content: [{ type: "text", text: "done" }] },
	];
	const rec = runRecord("Write a hello world python file with a unit test", span, { endedAt: ts("29:27.031"), cwd: "/p/ac-demo", model: "omlx/Mellum" });
	assert.equal(rec.task, "Write a hello world python file with a unit test");
	assert.equal(rec.model, "omlx/Mellum");
	assert.equal(rec.cwd, "/p/ac-demo");
	assert.equal(rec.startedAt, "2026-10-09T19:28:52.217Z");
	assert.equal(rec.endedAt, "2026-10-09T19:29:27.031Z");
	assert.equal(rec.requests, 3);
	assert.deepEqual(rec.usage, { input: 786, cacheRead: 9216, output: 1083 });
	assert.deepEqual(rec.files, ["hello.py"]);
	assert.deepEqual(rec.commands, [{ command: "uv run --offline pytest -q", failed: true }]);
	assert.equal(rec.lastCommand, "failed");
	assert.equal(rec.wallSeconds, 21);
	assert.equal(rec.finalReply, "done");
	assert.equal(JSON.stringify(rec).includes("\n"), false);
});
