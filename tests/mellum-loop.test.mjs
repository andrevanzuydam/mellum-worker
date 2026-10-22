import assert from "node:assert/strict";
import test from "node:test";

import { WORKFLOWS, nextStep, workflowExtensions } from "../extensions/mellum-loop.ts";

test("the loop runs four workflows: planning -> coding -> review -> testing", () => {
	let s = nextStep({ workflow: "start", round: 0 });
	assert.deepEqual(s, { workflow: "planning", round: 0 });
	s = nextStep(s);
	assert.deepEqual(s, { workflow: "coding", round: 0 });
	s = nextStep(s);
	assert.deepEqual(s, { workflow: "review", round: 0 });
	s = nextStep({ workflow: "review", round: 0, passed: true });
	assert.deepEqual(s, { workflow: "testing", round: 0 });
});

test("review gates on the spec contract: unmet requirements go back to planning", () => {
	assert.deepEqual(nextStep({ workflow: "review", round: 0, passed: false }, { maxRounds: 3 }), { workflow: "planning", round: 1 });
});

test("passing testing ends the loop; the first failure re-plans directly", () => {
	assert.deepEqual(nextStep({ workflow: "testing", round: 0, passed: true }, { maxRounds: 5 }), { workflow: "done", round: 0 });
	assert.deepEqual(nextStep({ workflow: "testing", round: 0, passed: false }, { maxRounds: 5 }), { workflow: "planning", round: 1 });
});

test("a REPEATED testing failure triggers the rubber-duck step, which amends TODO.md then codes", () => {
	// second straight failure: reason the problem through, amend TODO.md, then code again
	assert.deepEqual(nextStep({ workflow: "testing", round: 1, passed: false }, { maxRounds: 5 }), { workflow: "rubberduck", round: 2 });
	assert.deepEqual(nextStep({ workflow: "rubberduck", round: 2 }), { workflow: "coding", round: 2 });
	// duckAfter is tunable: raise it and the duck holds off (plain re-plan instead)
	assert.deepEqual(nextStep({ workflow: "testing", round: 1, passed: false }, { maxRounds: 5, duckAfter: 3 }), { workflow: "planning", round: 2 });
});

test("the rubber-duck step loads no guard extensions — it reasons and may amend TODO.md", () => {
	assert.deepEqual(workflowExtensions("rubberduck"), []);
});

test("the loop stops at the round budget even if still red (review or testing)", () => {
	assert.deepEqual(nextStep({ workflow: "review", round: 3, passed: false }, { maxRounds: 3 }), { workflow: "done", round: 3 });
	assert.deepEqual(nextStep({ workflow: "testing", round: 3, passed: false }, { maxRounds: 3 }), { workflow: "done", round: 3 });
});

test("extensions are variable and minimal: only coding carries guards; plan/review/test need none", () => {
	assert.deepEqual(workflowExtensions("planning"), []);
	const coding = workflowExtensions("coding");
	assert.ok(coding.includes("mellum-guards") && coding.includes("mellum-surgical"), coding);
	assert.ok(!coding.includes("mellum-plan") && !coding.includes("mellum-ncm"), coding);
	assert.deepEqual(workflowExtensions("review"), []);
	assert.deepEqual(workflowExtensions("testing"), []);
});

test("WORKFLOWS names the four in order", () => {
	assert.deepEqual(WORKFLOWS, ["planning", "coding", "review", "testing"]);
});
