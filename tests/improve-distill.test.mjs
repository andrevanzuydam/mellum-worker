import assert from "node:assert/strict";
import test from "node:test";

import { distill } from "../learn/code/improve_distill.mjs";

// A schema-2 worker record line, as mellum-record writes and mellum-learn reads.
const REC = (o) =>
	JSON.stringify({
		schema: 2,
		kind: "mode",
		endedAt: "2026-10-31T08:00:00Z",
		cwd: "/loop/iter1/ws",
		...o,
	});

test("distill learns 'Do not: start servers' from a run that started one, and merges it into AGENTS.md", () => {
	const recordsText = REC({ commands: [{ command: "uvicorn app:app", failed: false, mutates: false }] });
	const r = distill({
		recordsText,
		agentsMd: "# Project\n\n## Mellum\n\n- Test command: uv run pytest\n",
		cwd: "/loop",
		n: 10,
	});
	assert.ok(r.added.some((b) => /do not/i.test(b) && /server/i.test(b)), JSON.stringify(r.added));
	assert.match(r.text, /start servers/);
	assert.match(r.text, /Test command: uv run pytest/, "keeps the existing bullet");
});

test("distill is additive and idempotent: re-running with the already-carried AGENTS.md adds nothing", () => {
	const recordsText = REC({ commands: [{ command: "uvicorn app:app", failed: false }] });
	const r = distill({
		recordsText,
		agentsMd: "# Project\n\n## Mellum\n\n- Do not: start servers\n",
		cwd: "/loop",
		n: 10,
	});
	assert.deepEqual(r.added, [], "nothing new to add when the carried file already has it");
	assert.match(r.text, /start servers/);
});

test("distill filters records to those under cwd, so an unrelated workspace's record is ignored", () => {
	const recordsText = REC({ cwd: "/somewhere/else/ws", commands: [{ command: "uvicorn app:app", failed: false }] });
	const r = distill({ recordsText, agentsMd: "# Project\n\n## Mellum\n\n", cwd: "/loop", n: 10 });
	assert.deepEqual(r.added, [], "a record outside cwd does not teach anything");
});
