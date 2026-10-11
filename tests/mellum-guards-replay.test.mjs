import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { RUNS, replay } from "./helpers/worker-replay.mjs";

// Real A10 child sessions replayed through the guards extension: no model, no server. Every
// install points MELLUM_WORKER_RUNS at a temp file, so nothing reaches ~/.pi/agent.

for (const name of RUNS) {
	test(`replaying ${name} records one Worker line that matches the trace`, async () => {
		const file = join(mkdtempSync(join(tmpdir(), "mellum-replay-")), "runs.jsonl");
		const run = await replay(name, file);
		const lines = readFileSync(file, "utf8").trimEnd().split("\n");
		assert.equal(lines.length, 1, "one line per run");
		const record = JSON.parse(lines[0]);
		assert.equal(record.kind, "worker");
		assert.equal(record.activation, "worker");
		assert.equal(record.facts, null);
		assert.equal(record.requests, run.requests.length, "one request per provider_request");
		const bash = run.calls.filter((c) => c.toolName === "bash");
		assert.deepEqual(record.commands.map((c) => c.command), bash.map((c) => c.input.command), "one command per bash call");
		const edited = [...new Set(run.calls.filter((c) => c.toolName === "write" || c.toolName === "edit").map((c) => c.input.path))].sort();
		assert.deepEqual([...record.files].sort(), edited, "files are the write and edit paths");
		assert.deepEqual(record.commands.map((c) => c.failed), bash.map((c) => run.results[run.calls.indexOf(c)].isError), "failed follows the tool_result");
		assert.equal(record.edits, run.calls.filter((c) => c.toolName === "write" || c.toolName === "edit").length);
		assert.ok(record.finalReply.startsWith(run.final.split("\n")[0]), "finalReply starts with final.md");
		assert.match(record.task, /^Task: /);
		assert.equal(record.promptVersion, "unknown", "the archived prompt predates the version marker");
	});
}
