import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

// The caps in docs/sdd.md, enforced. Over cap means a research doc is owed.
const ROOT = resolve(import.meta.dirname, "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const lines = (s) => s.split("\n").length;

test("ROADMAP.md is at most 400 lines", () => {
	assert.ok(lines(read("ROADMAP.md")) <= 400);
});

test("roadmap cells: Ships and Excludes at most 900 chars, Status at most 1000", () => {
	const rows = read("ROADMAP.md").split("\n").filter((l) => /^\| \*\*/.test(l));
	assert.ok(rows.length > 0, "no phase rows found");
	for (const row of rows) {
		const [, phase, ships, excludes, status] = row.split("|").map((c) => c.trim());
		assert.ok(ships.length <= 900, `${phase} Ships cell is ${ships.length} chars`);
		assert.ok(excludes.length <= 900, `${phase} Excludes cell is ${excludes.length} chars`);
		assert.ok(status.length <= 1000, `${phase} Status cell is ${status.length} chars`);
	}
});

test("backlog entries are at most 1,200 chars and each states a reopen condition", () => {
	const body = read("BACKLOG.md").split("Reopen conditions, not promises.")[1] ?? "";
	const entries = body.split(/\n\n(?=\*\*)/).map((e) => e.trim()).filter(Boolean);
	assert.ok(entries.length > 0, "no backlog entries found");
	for (const e of entries) {
		const title = e.match(/^\*\*(.+?)\*\*/)?.[1] ?? e.slice(0, 40);
		assert.ok(e.length <= 1200, `backlog entry "${title}" is ${e.length} chars`);
		assert.match(e, /\*Reopens when\*/, `backlog entry "${title}" has no reopen condition`);
	}
});

test("plans are at most 400 lines and at most 25% fenced; specs at most 400 lines", () => {
	const dir = (p) => (existsSync(resolve(ROOT, p)) ? readdirSync(resolve(ROOT, p)).filter((f) => f.endsWith(".md")) : []);
	for (const f of dir("docs/superpowers/plans")) {
		const text = read(`docs/superpowers/plans/${f}`);
		const n = lines(text);
		assert.ok(n <= 400, `plan ${f} is ${n} lines`);
		let fenced = 0, inFence = false;
		for (const l of text.split("\n")) {
			if (l.startsWith("```")) { inFence = !inFence; continue; }
			if (inFence) fenced += 1;
		}
		assert.ok(fenced / n <= 0.25, `plan ${f} is ${Math.round((100 * fenced) / n)}% fenced`);
	}
	for (const f of dir("docs/superpowers/specs")) {
		const n = lines(read(`docs/superpowers/specs/${f}`));
		assert.ok(n <= 400, `spec ${f} is ${n} lines`);
	}
});
