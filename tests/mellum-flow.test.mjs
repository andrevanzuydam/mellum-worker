import assert from "node:assert/strict";
import test from "node:test";

import { PHASES, finalText, asTodo } from "../extensions/mellum-flow.ts";

test("finalText returns the LAST assistant text block from a json event stream", () => {
	const events = [
		{ type: "message_end", message: { role: "assistant", content: [{ type: "text", text: "first" }] } },
		{ type: "tool_call", toolName: "read" },
		{ type: "message_end", message: { role: "user", content: [{ type: "text", text: "ignored" }] } },
		{ type: "message_end", message: { role: "assistant", content: [{ type: "text", text: "REVIEW: PASS" }] } },
	];
	assert.equal(finalText(events), "REVIEW: PASS");
});

test("finalText is empty when there is no assistant text", () => {
	assert.equal(finalText([{ type: "tool_call", toolName: "bash" }]), "");
	assert.equal(finalText([]), "");
});

test("only the coder phase has write/edit/bash; plan and reviewers are read-only", () => {
	assert.ok(PHASES.code.tools.includes("bash") && PHASES.code.tools.includes("write"));
	// plan outputs text (the harness saves it as TODO.md); reviewers only read. None of them write.
	for (const r of ["plan", "review_plan", "review_code"]) {
		assert.ok(!PHASES[r].tools.includes("bash"), r);
		assert.ok(!PHASES[r].tools.includes("write"), r);
		assert.ok(!PHASES[r].tools.includes("edit"), r);
	}
});

test("only the coder loads the safety guards (nonblock/guards/surgical)", () => {
	assert.ok(PHASES.code.ext.some((e) => e.includes("mellum-nonblock")));
	assert.ok(PHASES.code.ext.some((e) => e.includes("mellum-surgical")));
	for (const r of ["plan", "review_plan", "review_code"]) {
		assert.deepEqual(PHASES[r].ext, [], r);
	}
});

test("asTodo strips preamble and code fences, keeping from the first heading", () => {
	assert.equal(asTodo("Here is the plan:\n\n## North Star\nDo it\n- [ ] a"), "## North Star\nDo it\n- [ ] a\n");
	assert.equal(asTodo("```markdown\n## North Star\ng\n```"), "## North Star\ng\n");
	assert.equal(asTodo("## North Star\nx"), "## North Star\nx\n");
});

test("every phase has a system prompt and a thinking budget", () => {
	for (const [name, p] of Object.entries(PHASES)) {
		assert.ok(p.prompt.length > 40, name);
		assert.ok(["off", "minimal", "low", "medium", "high", "xhigh", "max"].includes(p.thinking), name);
	}
});
