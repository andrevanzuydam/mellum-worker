import assert from "node:assert/strict";
import test from "node:test";

import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PHASES, finalText, bestPytest, asTodo, asCode, looksLikePytest, freezeName, gateTestName, GATE_DIR, materializeGate, flowBlock, PHASE_CALL_CAP, BASE_GUIDE } from "../extensions/mellum-flow.ts";

const asstText = (t) => ({ type: "message_end", message: { role: "assistant", content: [{ type: "text", text: t }] } });

test("bestPytest salvages a test written mid-transcript when the examiner ends on chatter", () => {
	// hard phases 4 & 5: the examiner (a tool-using agent) wrote the test, then made a verifying
	// tool call and ended with a short non-test message, so finalText (the LAST text) missed the
	// test and the gate never froze — a whole round wasted. bestPytest scans every assistant block.
	const events = [
		asstText("Let me read the spec first."),
		asstText("```python\nfrom app import app\ndef test_archive():\n    assert 1\n```"),
		asstText("I've written the acceptance test above; it covers archive and audit."),
	];
	const code = bestPytest(events);
	assert.ok(looksLikePytest(code), "must recover the real test");
	assert.match(code, /def test_archive/);
	assert.doesNotMatch(code, /written the acceptance test above/);
});

test("bestPytest prefers the longest complete test over a partial earlier block", () => {
	const events = [
		asstText("def test_a():\n    assert 1"),
		asstText("from app import app\ndef test_a():\n    assert 1\ndef test_b():\n    assert 2\ndef test_c():\n    assert 3"),
	];
	assert.match(bestPytest(events), /test_c/); // the fuller block wins
});

test("bestPytest falls back to finalText when no block is a pytest file", () => {
	assert.equal(bestPytest([asstText("no tests here"), asstText("still nothing")]), "still nothing");
});

test("BASE_GUIDE restores structure generically without contradicting any role", () => {
	assert.match(BASE_GUIDE, /single-purpose|ONE job/i);
	assert.match(BASE_GUIDE, /decisive and brief|do not deliberate/i); // the anti-ramble line
	assert.match(BASE_GUIDE, /authoritative/i); // the role prompt wins on specifics
	// it governs HOW to operate, not WHAT to produce — must not name a role's output (code/test/plan)
	assert.ok(!/write (the )?(code|tests?|implementation)/i.test(BASE_GUIDE), "guide must not prescribe a role's output");
});

test("per-phase max_tokens: planner/reviewers below examine, but not truncating", () => {
	// The examiner is a thinking model that can't be capped; on a complex phase it needs >16384
	// tokens just to FINISH thinking, so 16384 emitted an EMPTY test (all budget spent thinking) and
	// no gate froze — hard phase 5 died on this. Measured: 32000 lets it finish and emit. The
	// examiner must have the most room of any role.
	assert.equal(PHASES.examine.maxTokens, 32000);
	assert.ok(PHASES.code.maxTokens >= 16384);
	for (const r of ["plan", "review_plan", "review_code"]) {
		assert.ok(PHASES[r].maxTokens < PHASES.examine.maxTokens, `${r} capped below examine`);
		// not so tight it truncates a thinking model before it writes its output: 2048 left the
		// planner with an EMPTY TODO (all budget spent thinking). The cap is a runaway backstop;
		// the BASE_GUIDE is the real brevity lever.
		assert.ok(PHASES[r].maxTokens >= 8192, `${r} must fit think + output`);
	}
});

test("flowBlock always allows test (the only exit) and read", () => {
	assert.equal(flowBlock("test", 9999, false), undefined);
	assert.equal(flowBlock("read", 9999, false), undefined);
});

test("flowBlock makes examine run once per phase (blocked once the gate is frozen)", () => {
	assert.equal(flowBlock("examine", 1, false), undefined); // first call: no gate yet
	assert.match(flowBlock("examine", 1, true), /already written|Do NOT examine again/i); // gate frozen → blocked
});

test("flowBlock caps the phase so the orchestrator can't loop to the deadline", () => {
	assert.equal(flowBlock("code", PHASE_CALL_CAP - 1, false), undefined); // under budget
	assert.match(flowBlock("code", PHASE_CALL_CAP, false), /budget reached/i); // at the cap
	assert.match(flowBlock("review_code", PHASE_CALL_CAP + 3, false), /budget reached/i);
	// but test can still be called past the cap, so the phase can finish
	assert.equal(flowBlock("test", PHASE_CALL_CAP + 3, false), undefined);
});

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

test("thinking budget maps to the role: reasoning roles think hard, the coder acts", () => {
	for (const r of ["plan", "review_plan", "examine", "review_code"]) {
		assert.equal(PHASES[r].thinking, "high", r); // reasoning roles
	}
	assert.equal(PHASES.code.thinking, "low"); // the coder executes against a decided gate
});

test("the examiner asserts exact strings only where the spec is verbatim, requirements otherwise", () => {
	// medium phase 1 failed because the examiner invented `initial-scale=1.0` and exact nav markup
	// the spec never gave — brittle strings a correct implementation can't match.
	assert.match(PHASES.examine.prompt, /ONLY where the spec gives them VERBATIM/i);
	assert.match(PHASES.examine.prompt, /NOT an invented string|made-up exact/i);
	assert.match(PHASES.examine.prompt, /brittleness/i);
});

test("the examiner must not assert a bare substring absent when it is part of a legitimate word", () => {
	// hard phase 4 could never pass: the examiner froze `assert "Resolve" not in html` while the
	// same test required "Resolved" present — but "Resolve" is a substring of "Resolved", so the
	// assertion is self-contradictory and no correct app satisfies it. Absence must target the
	// specific action (its form action= URL / exact control), not a prefix of a word on the page.
	assert.match(PHASES.examine.prompt, /substring of a (longer )?word|prefix of|"Resolve" is inside "Resolved"|part of another word/i);
	assert.match(PHASES.examine.prompt, /not in|absent|absence/i);
	assert.match(PHASES.examine.prompt, /form .*action|action=|specific (control|button|action)/i);
});

test("the examiner is told to set follow_redirects=False on the client, not per request", () => {
	// Per-request follow_redirects=False kept slipping: the examiner applied it to some POSTs and
	// forgot it on others (the add-complaint setup POST), then asserted 3xx on a plain POST that
	// TestClient had followed to 200 — a correct app failed, twice. Setting it ONCE on the client
	// eliminates the whole class. The rule must name the client-level construction.
	assert.match(PHASES.examine.prompt, /TestClient\(\s*app\s*,\s*follow_redirects=False\s*\)/);
	assert.match(PHASES.examine.prompt, /redirect/i);
});

test("the examiner must assert relative deltas, not absolute totals, against shared state", () => {
	// hard phase 5 test_stats asserted open==1, but the gate's own earlier tests had added
	// complaints to the shared in-memory store, so the real count was higher — a correct app failed.
	// Tests run in one process against shared state; assert before/after deltas or filter to this
	// test's own records, never an absolute total that assumes a clean store.
	assert.match(PHASES.examine.prompt, /shared|accumulat|earlier tests|other tests|clean (store|state|database)/i);
	assert.match(PHASES.examine.prompt, /delta|before.*after|relative|count before/i);
});

test("the examiner must disable redirect-following when asserting a redirect status", () => {
	// medium phase 3 looped forever: the examiner asserted `client.post(...).status_code == 303`,
	// but starlette's TestClient follows redirects by default, so the response is the final 200 GET
	// and `assert 200 == 303` fails a CORRECT 303 handler. A redirect assertion needs
	// follow_redirects=False. The app was right; the gate was unpassable.
	assert.match(PHASES.examine.prompt, /follow_redirects=False/);
	assert.match(PHASES.examine.prompt, /follows redirects by default|would follow the redirect/i);
});

test("the examiner must assert stable identity for mutate-a-specific-record phases", () => {
	// medium phase 4 failed the hidden grader because Complaint had no stable `id` field — the
	// examiner tested resolve/reopen behaviour but not that identity is an explicit, stable field.
	assert.match(PHASES.examine.prompt, /IDENTITY|identity field/i);
	assert.match(PHASES.examine.prompt, /stable/i);
	assert.match(PHASES.examine.prompt, /list position|index/i); // must forbid positional ids
	assert.match(PHASES.examine.prompt, /distinct ids|DISTINCT ids/i);
});

test("the examiner must seed inputs and assert exact outputs for computed/report endpoints", () => {
	// hard phases 6-7 passed the visible gate but failed the hidden oracle: /tickets reported wrong
	// sums and /visits returned []. The gates accepted a 200 / empty body. A computed endpoint must
	// be driven with seeded rows and checked against the EXACT expected result, with a row included
	// AND one excluded by each filter/definition the spec gives, so a stub fails. General, spec-led.
	assert.match(PHASES.examine.prompt, /seed|representative rows|given inputs/i);
	assert.match(PHASES.examine.prompt, /exact (expected )?(result|output|value)|compute the expected/i);
	assert.match(PHASES.examine.prompt, /included and (one )?excluded|include.*exclude|distinguishing/i);
	// and migrations/named artifacts are asserted RECORDED/applied, not merely defined
	assert.match(PHASES.examine.prompt, /recorded|applied/i);
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

test("asCode strips a dangling fence with no matching pair (the hard phase-4 gate SyntaxError)", () => {
	// hard phase 4 looped forever: the examiner emitted raw python then a trailing ``` with NO
	// opening fence, so neither block regex matched and asCode returned it verbatim. The frozen
	// gate ended on a lone ``` → SyntaxError → phase_gate_ok rejected a CORRECT gate and the phase
	// could never pass. A lone fence line must never survive into the Python gate.
	assert.equal(asCode("def test_x():\n    assert 1\n```"), "def test_x():\n    assert 1\n");
	assert.equal(asCode("```python\ndef test_y():\n    assert 1"), "def test_y():\n    assert 1\n");
	// and a fence line in the middle of otherwise-raw output is stripped, not left to break compile
	assert.equal(asCode("import os\n```\ndef test_z():\n    assert 1"), "import os\ndef test_z():\n    assert 1\n");
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
