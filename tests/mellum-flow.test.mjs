import assert from "node:assert/strict";
import test from "node:test";

import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PHASES, finalText, asTodo, asCode, looksLikePytest, freezeName, gateTestName, GATE_DIR, materializeGate } from "../extensions/mellum-flow.ts";

test("the examiner is read-only but has lookup, and writes the acceptance gate from the spec", () => {
	assert.ok(!PHASES.examine.tools.includes("write"));
	assert.ok(!PHASES.examine.tools.includes("bash"));
	assert.ok(PHASES.examine.tools.includes("lookup"));
	assert.ok(PHASES.examine.ext.some((e) => e.includes("mellum-knowledge")));
	assert.match(PHASES.examine.prompt, /acceptance test|definition of DONE/i);
});

test("the examiner is told to be exhaustive and to cover negative/edge cases, not just the happy path", () => {
	assert.match(PHASES.examine.prompt, /exhaustive/i);
	assert.match(PHASES.examine.prompt, /negative|edge/i);
	assert.match(PHASES.examine.prompt, /not just the happy path|only its happy path/i);
	// It must know earlier phases are already frozen so it covers only this phase without contradicting them.
	assert.match(PHASES.examine.prompt, /earlier phase|already frozen/i);
});

test("the coder is pointed at the cumulative gate and told earlier phases must keep passing", () => {
	assert.match(PHASES.code.prompt, /test_gate_phase/);
	assert.match(PHASES.code.prompt, /earlier phase/i);
	assert.match(PHASES.code.prompt, /ALL|all pass|keep passing/i);
});

test("freezeName/gateTestName derive stable per-phase names so the gate accumulates", () => {
	assert.equal(freezeName(1), "phase_1.py");
	assert.equal(freezeName("2"), "phase_2.py");
	assert.equal(freezeName(undefined ?? "1"), "phase_1.py");
	assert.equal(gateTestName("phase_3"), "test_gate_phase_3.py");
});

test("materializeGate restores EVERY frozen phase into tests/ and clears stale gate files", () => {
	const ws = mkdtempSync(join(tmpdir(), "mellum-gate-"));
	mkdirSync(join(ws, GATE_DIR), { recursive: true });
	mkdirSync(join(ws, "tests"), { recursive: true });
	writeFileSync(join(ws, GATE_DIR, "phase_1.py"), "def test_p1():\n    assert 1\n");
	writeFileSync(join(ws, GATE_DIR, "phase_2.py"), "def test_p2():\n    assert 2\n");
	// a stale restored file from a dropped phase, and a coder's own test, must be handled correctly
	writeFileSync(join(ws, "tests", "test_gate_phase_9.py"), "def test_stale():\n    assert 0\n");
	writeFileSync(join(ws, "tests", "test_coder.py"), "def test_keep():\n    assert 1\n");

	const n = materializeGate(ws);
	const got = readdirSync(join(ws, "tests")).sort();

	assert.equal(n, 2);
	assert.deepEqual(got, ["test_coder.py", "test_gate_phase_1.py", "test_gate_phase_2.py"]);
	assert.match(readFileSync(join(ws, "tests", "test_gate_phase_1.py"), "utf8"), /test_p1/);
	rmSync(ws, { recursive: true, force: true });
});

test("asCode extracts a fenced python block, else returns the raw text", () => {
	assert.equal(asCode("```python\nimport x\nassert 1\n```"), "import x\nassert 1\n");
	assert.equal(asCode("def test():\n    assert True"), "def test():\n    assert True\n");
});

test("asCode prefers a python block over an HTML block that appears first", () => {
	const reply = "```html\n<div>complaints</div>\n```\nand the test:\n```python\ndef test_x():\n    assert 1\n```";
	assert.equal(asCode(reply), "def test_x():\n    assert 1\n");
});

test("looksLikePytest accepts a real test file and rejects HTML/template or testless leakage", () => {
	assert.ok(looksLikePytest("from app import app\ndef test_home():\n    assert 1\n"));
	assert.ok(looksLikePytest("class TestThing:\n    def test_a(self):\n        assert 1\n"));
	// the exact failure seen in flow20: an HTML/template blob written as the "test"
	assert.ok(!looksLikePytest("templates/complaints.html\n{% extends 'base.html' %}\n<div>hi</div>\n"));
	assert.ok(!looksLikePytest("import pytest\nX = 1\n")); // compiles but defines no test
});

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
