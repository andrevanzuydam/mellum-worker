/**
 * improve_distill — the writable carry-forward step for the improvement loop.
 *
 * `scripts/mellum.mjs learn` reports what the runs would add to AGENTS.md but never writes.
 * The improvement loop needs the write: after a rep, fold what the run records teach into the
 * carried `## Mellum` section so the next rep starts knowing it. This is pure
 * `learnFromTexts` + `mergeSuggestion` (both from mellum-learn, both tested there) plus a thin
 * file writer. It is independent of the measurement path — it only reads records and writes a
 * carried AGENTS.md the loop owns, never the frozen suite.
 *
 * CLI:
 *   node improve_distill.mjs --records <jsonl> --agents <AGENTS.md> --cwd <ancestor> [--n 20]
 * reads the records, merges the lesson bullets into the AGENTS.md at --agents, writes it back.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { learnFromTexts, mergeSuggestion } from "../../extensions/mellum-learn.ts";

/** Distil the records' lessons and merge them into the carried AGENTS.md text. Pure. */
export function distill({ recordsText, agentsMd, cwd, n = 20 }) {
	const report = learnFromTexts([recordsText], { cwd, n });
	const merged = mergeSuggestion(agentsMd, report.suggestion);
	return {
		text: merged.text || agentsMd || "",
		added: merged.added,
		conflicts: merged.conflicts,
		suggestion: report.suggestion,
	};
}

function parseArgs(argv) {
	const o = { n: 20 };
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--records") o.records = argv[++i];
		else if (argv[i] === "--agents") o.agents = argv[++i];
		else if (argv[i] === "--cwd") o.cwd = argv[++i];
		else if (argv[i] === "--n") o.n = Number.parseInt(argv[++i] ?? "20", 10) || 20;
	}
	return o;
}

const read = (p) => {
	try {
		return readFileSync(p, "utf8");
	} catch {
		return undefined;
	}
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const o = parseArgs(process.argv.slice(2));
	if (!o.records || !o.agents || !o.cwd) {
		console.error("usage: improve_distill.mjs --records <jsonl> --agents <AGENTS.md> --cwd <ancestor> [--n N]");
		process.exit(2);
	}
	const r = distill({ recordsText: read(o.records) ?? "", agentsMd: read(o.agents), cwd: o.cwd, n: o.n });
	writeFileSync(o.agents, r.text);
	if (r.added.length) console.log(`carried forward ${r.added.length} lesson(s):\n${r.added.map((b) => `  - ${b}`).join("\n")}`);
	else console.log("nothing new to carry forward");
}
