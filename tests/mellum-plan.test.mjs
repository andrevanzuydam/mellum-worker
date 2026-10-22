import assert from "node:assert/strict";
import test from "node:test";

import { PLAN_REASON, createPlanGate, isPlanTurn, resolvePlanMax } from "../extensions/mellum-plan.ts";

const planText = { role: "assistant", content: [{ type: "text", text: "Plan: change app.py and models.py; checklist: id field, status default, resolve route." }] };
const thinkingOnly = { role: "assistant", content: [{ type: "thinking", thinking: "hmm" }] };
const callOnly = { role: "assistant", content: [{ type: "toolCall", name: "edit" }] };

test("isPlanTurn: a substantive assistant text turn is a plan; thinking- or call-only is not", () => {
	assert.equal(isPlanTurn(planText), true);
	assert.equal(isPlanTurn(thinkingOnly), false);
	assert.equal(isPlanTurn(callOnly), false);
	assert.equal(isPlanTurn({ role: "user", content: "hi" }), false);
	assert.equal(isPlanTurn({ role: "assistant", content: [{ type: "text", text: "  " }] }), false);
});

test("read/grep/ls/bash/find are never gated — exploration before a plan is fine", () => {
	const gate = createPlanGate();
	for (const toolName of ["read", "grep", "ls", "find", "bash"]) {
		assert.equal(gate.toolCall({ toolName, input: {} }), undefined, toolName);
	}
});

test("the first edit/write is blocked until a plan turn has happened", () => {
	const gate = createPlanGate();
	const decision = gate.toolCall({ toolName: "edit", input: { path: "app.py" } });
	assert.ok(decision?.block, "first edit with no plan is blocked");
	assert.match(decision.reason, /plan/i);
	assert.match(decision.reason, /checklist|every requirement/i);
});

test("after a plan turn, edit and write are allowed and stay allowed", () => {
	const gate = createPlanGate();
	gate.turnEnd({ message: planText });
	assert.equal(gate.toolCall({ toolName: "edit", input: { path: "app.py" } }), undefined);
	assert.equal(gate.toolCall({ toolName: "write", input: { path: "models.py" } }), undefined);
	// still allowed later, no re-gating
	gate.turnEnd({ message: callOnly });
	assert.equal(gate.toolCall({ toolName: "write", input: { path: "x.py" } }), undefined);
});

test("thinking-only / tool-call-only turns do not satisfy the gate", () => {
	const gate = createPlanGate();
	gate.turnEnd({ message: thinkingOnly });
	gate.turnEnd({ message: callOnly });
	assert.ok(gate.toolCall({ toolName: "write", input: { path: "app.py" } })?.block, "still blocked without a real plan");
});

test("the gate fails open after max blocks — it never deadlocks", () => {
	// A model that works in thinking+tool-call never emits a plain-text plan turn;
	// the gate must still let it build, or it blocks every edit forever (measured).
	const gate = createPlanGate(2);
	assert.ok(gate.toolCall({ toolName: "edit", input: { path: "a.py" } })?.block, "1st blocked");
	assert.ok(gate.toolCall({ toolName: "write", input: { path: "b.py" } })?.block, "2nd blocked");
	assert.equal(gate.toolCall({ toolName: "write", input: { path: "c.py" } }), undefined, "3rd allowed — fail open, no deadlock");
});

test("resolvePlanMax reads MELLUM_PLAN, defaults, tolerates junk", () => {
	assert.equal(resolvePlanMax(undefined), 2);
	assert.equal(resolvePlanMax('{"max":1}'), 1);
	assert.equal(resolvePlanMax("nope"), 2);
});

test("PLAN_REASON names the cumulative-contract trap (fields no visible test checks)", () => {
	assert.match(PLAN_REASON, /data-model|id\b/i);
	assert.match(PLAN_REASON, /no visible test|not checked by/i);
});

test("the default export wires tool_call and turn_end", async () => {
	const { default: install } = await import("../extensions/mellum-plan.ts");
	const handlers = {};
	install({ on: (name, fn) => { handlers[name] = fn; } });
	assert.ok(handlers.tool_call, "registers tool_call");
	assert.ok(handlers.turn_end, "registers turn_end");
	// edit before plan -> blocked; after a plan turn -> allowed
	assert.ok(handlers.tool_call({ toolName: "edit", input: { path: "a.py" } })?.block);
	handlers.turn_end({ message: planText });
	assert.equal(handlers.tool_call({ toolName: "edit", input: { path: "a.py" } }), undefined);
});
