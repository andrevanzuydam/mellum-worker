import assert from "node:assert/strict";
import test from "node:test";
import { PACKAGE_VERSION, promptVersionOf, runRecord, spanStats } from "../extensions/mellum-record.ts";
import * as mode from "../extensions/mellum-mode.ts";

const span = [
	{ role: "user", content: [{ type: "text", text: "fix the cart" }] },
	{ role: "assistant", content: [{ type: "text", text: "done" }], stopReason: "stop", timestamp: 1000 },
];
const meta = { endedAt: Date.parse("2026-10-11T10:00:00Z"), cwd: "/p", model: "omlx/Mellum" };

test("runRecord with no kind writes kind mode and leaves facts out", () => {
	const rec = runRecord("fix the cart", span, meta);
	assert.equal(rec.kind, "mode");
	assert.equal(rec.schema, 2);
	assert.equal(rec.activation, "unknown");
	assert.equal("facts" in rec, false);
});

test("runRecord for the Worker writes kind worker, activation worker and facts null", () => {
	const rec = runRecord("fix the cart", span, { ...meta, kind: "worker", activation: "worker", facts: null });
	assert.equal(rec.kind, "worker");
	assert.equal(rec.activation, "worker");
	assert.equal(rec.facts, null);
	assert.equal(rec.version, PACKAGE_VERSION);
});

test("Mode re-exports the moved names, the same objects", () => {
	assert.equal(mode.runRecord, runRecord);
	assert.equal(mode.spanStats, spanStats);
	assert.equal(mode.promptVersionOf, promptVersionOf);
	assert.equal(mode.PACKAGE_VERSION, PACKAGE_VERSION);
	assert.equal(promptVersionOf("<!-- mellum-worker prompt v7 -->\nx"), "v7");
});
