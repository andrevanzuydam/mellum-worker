/**
 * `learn`: reads Mellum Mode's JSONL run records and names what went wrong, with a
 * suggested `## Mellum` section for AGENTS.md. Pure: front ends read the records files
 * and write AGENTS.md (spec section 3). Loads without Pi: the import of mellum-mode.ts is
 * type-only, and mellum-facts.ts uses only node:path.
 */
import { join } from "node:path";
import { bulletOf, findMellumSection } from "./mellum-facts.ts";
import type { RunRecord } from "./mellum-mode.ts";

/** One parsed schema-2 line. Every field but `schema` and `kind` may be missing in a hand-edited or partial record. */
export type RunLine = Partial<Omit<RunRecord, "schema">> & { schema: number; kind: "mode" | "worker" };

export interface Pattern {
	id: "test-thrash" | "bent-project" | "false-success" | "long-run" | "servers" | "drift" | "announce-stop";
	count: number;
	message: string;
	bullets: string[];
}

export interface Report {
	runs: number;
	window: { from: string; to: string } | null;
	skipped: { old: number; bad: number };
	patterns: Pattern[];
	suggestion: string[];
}

/** Non-JSON lines count as bad, lines without `schema` (or below 2) as old; blank lines are ignored. */
export function readRecords(text: string): { records: RunLine[]; bad: number; old: number } {
	const records: RunLine[] = [];
	let bad = 0;
	let old = 0;
	for (const line of text.split(/\r?\n/)) {
		if (line.trim() === "") continue;
		let value: unknown;
		try {
			value = JSON.parse(line);
		} catch {
			bad++;
			continue;
		}
		if (typeof value !== "object" || value === null || Array.isArray(value)) {
			bad++;
			continue;
		}
		const rec = value as Record<string, unknown>;
		if (typeof rec.schema !== "number" || rec.schema < 2) {
			old++;
			continue;
		}
		records.push({ ...rec, schema: rec.schema, kind: rec.kind === "worker" ? "worker" : "mode" } as RunLine);
	}
	return { records, bad, old };
}

const TEST_LIKE = /pytest|node --test|npm test|uv run .*test|make test/;
const SUCCESS_CLAIM = /\b(pass(es|ed)?|success(ful(ly)?)?|complete[d]?|done)\b/i;
const SERVER = [/&\s*$/, /\buvicorn\b/, /\bserve\b/, /runserver/];
const INSTALL = [/pip install/, /uv add/, /uv pip/];
const BENT_ANYWHERE = new Set(["__init__.py", "pytest.ini", "setup.cfg", "pyproject.toml", "uv.lock"]);
const LONG_RUN = 30;

type Cmd = { command: string; failed: boolean; mutates?: boolean };
const commandsOf = (r: RunLine): Cmd[] => (Array.isArray(r.commands) ? r.commands : []);
const filesOf = (r: RunLine): string[] => (Array.isArray(r.files) ? r.files : []);
const trimSlashes = (p: string) => p.replace(/\/+$/, "");

function isUnder(cwd: string, dir: string): boolean {
	const base = trimSlashes(dir);
	return cwd === base || cwd.startsWith(`${base}/`);
}

/** Path relative to the record's cwd, without a leading `./`. */
function relativeTo(path: string, cwd: string | undefined): string {
	let p = path.replace(/^\.\//, "");
	if (cwd !== undefined && isUnder(p, cwd) && p !== trimSlashes(cwd)) p = p.slice(trimSlashes(cwd).length + 1);
	return p;
}

/** `__init__.py`, `pytest.ini`, `setup.cfg`, `pyproject.toml`, `uv.lock` anywhere; `conftest.py` at the root only. */
function isBent(path: string): boolean {
	const base = path.slice(path.lastIndexOf("/") + 1);
	return BENT_ANYWHERE.has(base) || path === "conftest.py";
}

/** Bent file names a mutating command mentions as a whole argument. */
function bentInCommand(command: string, cwd: string | undefined): string[] {
	return command
		.split(/[\s'"=;&|<>()]+/)
		.filter(Boolean)
		.map((t) => relativeTo(t, cwd))
		.filter(isBent);
}

const unique = <T>(xs: T[]): T[] => [...new Set(xs)];

function median(xs: number[]): number {
	const s = [...xs].sort((a, b) => a - b);
	const mid = s.length >> 1;
	return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const day = (r: RunLine) => (r.endedAt ?? "").slice(0, 10);

function testThrash(runs: RunLine[]): Pattern | undefined {
	const befores: number[] = [];
	const passed: string[] = [];
	for (const r of runs) {
		const cmds = commandsOf(r);
		const first = cmds.find((c) => TEST_LIKE.test(c.command));
		if (!first || !first.failed) continue;
		const at = cmds.findIndex((c) => TEST_LIKE.test(c.command) && !c.failed && c.command !== first.command);
		if (at < 0) continue;
		befores.push(at);
		passed.push(cmds[at].command);
	}
	if (befores.length < 2) return undefined;
	const tally = new Map<string, number>();
	for (const c of passed) tally.set(c, (tally.get(c) ?? 0) + 1);
	let best = passed[0];
	for (const [c, n] of tally) if (n > (tally.get(best) ?? 0)) best = c;
	return {
		id: "test-thrash",
		count: befores.length,
		message: `Test command guessed wrong in ${befores.length} of ${runs.length} runs (median ${fmt(median(befores))} commands before one passed). The command that passed: ${best}`,
		bullets: [`Test command: ${best}`],
	};
}

function bentProject(runs: RunLine[]): Pattern | undefined {
	let count = 0;
	const bentFiles: string[] = [];
	const bentCommands: string[] = [];
	const written: string[] = [];
	for (const r of runs) {
		const recorded = filesOf(r).map((f) => relativeTo(f, r.cwd));
		const bentRecorded = recorded.filter(isBent);
		const viaCommands = commandsOf(r)
			.filter((c) => c.mutates)
			.flatMap((c) => bentInCommand(c.command, r.cwd));
		const installs = commandsOf(r)
			.map((c) => c.command)
			.filter((c) => INSTALL.some((re) => re.test(c)));
		if (bentRecorded.length === 0 && viaCommands.length === 0 && installs.length === 0) continue;
		count++;
		bentFiles.push(...bentRecorded, ...viaCommands);
		bentCommands.push(...installs);
		written.push(...recorded.filter((f) => !isBent(f)));
	}
	if (count === 0) return undefined;
	const files = unique(bentFiles).sort();
	const commands = unique(bentCommands);
	const topLevel = unique(written.map((f) => (f.includes("/") ? `${f.slice(0, f.indexOf("/"))}/` : f))).sort();
	const detail = [files.join(", "), commands.join(", ")].filter(Boolean).join("; ");
	const bullets = [];
	if (topLevel.length > 0) bullets.push(`Write only: ${topLevel.join(", ")}`);
	bullets.push("Do not: install packages or add dependencies");
	return { id: "bent-project", count, message: `Project bent to fit in ${count} runs: ${detail}`, bullets };
}

function falseSuccess(runs: RunLine[]): Pattern | undefined {
	const hit = runs.filter((r) => r.lastCommand !== "ok" && SUCCESS_CLAIM.test(r.finalReply ?? ""));
	if (hit.length === 0) return undefined;
	const dates = unique(hit.map(day).filter(Boolean)).sort();
	return {
		id: "false-success",
		count: hit.length,
		message: `Success claimed after a failed last command in ${hit.length} runs (${dates.join(", ")}). Run the tests yourself before trusting the reply.`,
		bullets: [],
	};
}

function longRun(runs: RunLine[]): Pattern | undefined {
	const hit = runs.filter((r) => (r.requests ?? 0) > LONG_RUN);
	if (hit.length === 0) return undefined;
	const max = Math.max(...hit.map((r) => r.requests ?? 0));
	return {
		id: "long-run",
		count: hit.length,
		message: `${hit.length} runs took more than ${LONG_RUN} requests (max ${max}). Split the task: see README, Right-sizing.`,
		bullets: [],
	};
}

function servers(runs: RunLine[]): Pattern | undefined {
	const hit = runs.filter((r) => commandsOf(r).some((c) => SERVER.some((re) => re.test(c.command))));
	if (hit.length === 0) return undefined;
	return { id: "servers", count: hit.length, message: `Mellum started a server in ${hit.length} runs.`, bullets: ["Do not: start servers"] };
}

function drift(runs: RunLine[]): Pattern | undefined {
	const hit = runs.filter((r) => r.server?.match === false);
	if (hit.length === 0) return undefined;
	const keys = unique(hit.flatMap((r) => (r.server?.diffs ?? []).map((d) => d.key)));
	return {
		id: "drift",
		count: hit.length,
		message: `Server settings differed in ${hit.length} runs: ${keys.join(", ")}. Run /mellum check.`,
		bullets: [],
	};
}

function announceStop(runs: RunLine[]): Pattern | undefined {
	const hit = runs.filter((r) => r.finalTurn?.hadText && !r.finalTurn.hadToolCall && r.lastCommand !== "ok");
	if (hit.length === 0) return undefined;
	return { id: "announce-stop", count: hit.length, message: `${hit.length} runs ended announcing a step without taking it.`, bullets: [] };
}

/** One bullet per label, in order of first appearance; `Do not:` values from several patterns join with `; `. */
function mergeBullets(patterns: Pattern[]): string[] {
	const byLabel = new Map<string, string[]>();
	for (const b of patterns.flatMap((p) => p.bullets)) {
		const colon = b.indexOf(":");
		const label = colon < 0 ? b : b.slice(0, colon);
		const value = colon < 0 ? "" : b.slice(colon + 1).trim();
		const values = byLabel.get(label) ?? [];
		if (!values.includes(value)) values.push(value);
		byLabel.set(label, values);
	}
	return [...byLabel].map(([label, values]) => {
		const kept = label === "Do not" ? values : values.slice(0, 1);
		return `${label}: ${kept.join("; ")}`;
	});
}

export function learn(
	records: RunLine[],
	opts: { cwd: string; n: number; skipped?: { old: number; bad: number } },
): Report {
	const kept = records
		.filter((r) => typeof r.cwd === "string" && isUnder(r.cwd, opts.cwd))
		.sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? ""))
		.slice(0, Math.max(0, opts.n));
	const patterns = [
		testThrash(kept),
		bentProject(kept),
		falseSuccess(kept),
		longRun(kept),
		servers(kept),
		drift(kept),
		announceStop(kept),
	].filter((p): p is Pattern => p !== undefined);
	return {
		runs: kept.length,
		window: kept.length === 0 ? null : { from: kept[kept.length - 1].endedAt ?? "", to: kept[0].endedAt ?? "" },
		skipped: opts.skipped ?? { old: 0, bad: 0 },
		patterns,
		suggestion: mergeBullets(patterns),
	};
}

export function formatReport(r: Report, cwd: string): string {
	const lines: string[] = [];
	const span = r.window ? ` (${r.window.from.slice(0, 10)} to ${r.window.to.slice(0, 10)})` : "";
	lines.push(`mellum learn: ${r.runs} runs in ${cwd}${span}`);
	if (r.skipped.old > 0 || r.skipped.bad > 0) {
		lines.push(`Skipped ${r.skipped.old} old and ${r.skipped.bad} bad lines.`);
	}
	if (r.patterns.length === 0) {
		lines.push("nothing to fix");
		return lines.join("\n");
	}
	lines.push("");
	for (const p of r.patterns) lines.push(`- ${p.message}`);
	if (r.suggestion.length > 0) {
		lines.push("", "Suggested for AGENTS.md:", "", "## Mellum", ...r.suggestion.map((b) => `- ${b}`));
	}
	return lines.join("\n");
}

/** Mode's records file: `MELLUM_MODE_RUNS` (`0` or empty: none; a leading `~` is HOME), else the default. */
export function modeRunsFile(env: Record<string, string | undefined>, home: string): string | undefined {
	const v = env.MELLUM_MODE_RUNS;
	if (v === "0" || v === "") return undefined;
	if (v) return v.replace(/^~(?=$|\/)/, home);
	return join(home, ".pi", "agent", "mellum-mode-runs.jsonl");
}

/** The files `learn` reads by default: Mode's records, then the Worker's (M.7B). */
export function recordFiles(env: Record<string, string | undefined>, home: string): string[] {
	const mode = modeRunsFile(env, home);
	return [...(mode ? [mode] : []), join(home, ".pi", "agent", "mellum-worker-runs.jsonl")];
}

/** `learn` over several files' text (undefined: a missing file, no records), skipped lines summed. */
export function learnFromTexts(texts: Array<string | undefined>, opts: { cwd: string; n: number }): Report {
	const records: RunLine[] = [];
	const skipped = { old: 0, bad: 0 };
	for (const t of texts) {
		if (t === undefined) continue;
		const r = readRecords(t);
		records.push(...r.records);
		skipped.old += r.old;
		skipped.bad += r.bad;
	}
	return learn(records, { ...opts, skipped });
}

const labelOf = (b: string) => (b.includes(":") ? b.slice(0, b.indexOf(":")).trim().toLowerCase() : b.trim().toLowerCase());
const valueOf = (b: string) => (b.includes(":") ? b.slice(b.indexOf(":") + 1).trim() : "");

/**
 * Merges the suggested bullets into AGENTS.md's text (undefined: no file). Only labels the
 * `## Mellum` section lacks are added, after its last bullet and before the next heading; a
 * label it has with another value is a conflict, never rewritten. Every other byte is kept;
 * a missing final newline is added where the new lines join.
 */
export function mergeSuggestion(
	agentsMd: string | undefined,
	bullets: string[],
): { text: string; added: string[]; conflicts: string[] } {
	if (agentsMd === undefined) {
		return bullets.length === 0
			? { text: "", added: [], conflicts: [] }
			: { text: `# Project\n\n## Mellum\n\n${bullets.map((b) => `- ${b}\n`).join("")}`, added: [...bullets], conflicts: [] };
	}
	const eol = agentsMd.includes("\r\n") ? "\r\n" : "\n";
	// Lines with their offsets: `end` is past the line's newline, if it has one.
	const spans: { start: number; end: number; body: string; eol: boolean }[] = [];
	for (let i = 0; i < agentsMd.length; ) {
		const nl = agentsMd.indexOf("\n", i);
		const end = nl < 0 ? agentsMd.length : nl + 1;
		spans.push({ start: i, end, body: agentsMd.slice(i, nl < 0 ? end : nl).replace(/\r$/, ""), eol: nl >= 0 });
		i = end;
	}
	const lines = spans.map((s) => s.body);
	const section = findMellumSection(lines);
	const existing = section
		? lines
				.slice(section.start + 1, section.end)
				.map(bulletOf)
				.filter((b): b is string => b !== undefined)
		: [];
	const added: string[] = [];
	const conflicts: string[] = [];
	for (const b of bullets) {
		const same = existing.find((e) => labelOf(e) === labelOf(b));
		if (same === undefined) added.push(b);
		else if (same !== b && valueOf(same) !== valueOf(b)) conflicts.push(`your ${same}; runs passed with: ${valueOf(b)}`);
	}
	if (added.length === 0) return { text: agentsMd, added, conflicts };
	const block = added.map((b) => `- ${b}${eol}`).join("");
	const insertAt = (at: number, before: string) => agentsMd.slice(0, at) + before + block + agentsMd.slice(at);
	if (!section) {
		const sep = agentsMd === "" ? "" : agentsMd.endsWith("\n") ? (/\n\s*\n$/.test(agentsMd) ? "" : eol) : eol + eol;
		return { text: `${agentsMd}${sep}## Mellum${eol}${eol}${block}`, added, conflicts };
	}
	// After the last bullet and its indented continuation lines; with no bullet, after the
	// section's last non-blank line, one blank line first.
	let last = -1;
	for (let i = section.start + 1; i < section.end; i++) {
		if (bulletOf(lines[i]) !== undefined) last = i;
		else if (last >= 0 && i === last + 1 && /^\s+\S/.test(lines[i])) last = i;
	}
	let lead = "";
	if (last < 0) {
		last = section.start;
		for (let i = section.start + 1; i < section.end; i++) if (lines[i].trim() !== "") last = i;
		lead = eol;
	}
	const at = spans[last];
	return { text: insertAt(at.end, (at.eol ? "" : eol) + lead), added, conflicts };
}

/** The lines front ends print after the report: conflicts, then what is missing or that nothing is. */
export function formatMerge(m: { added: string[]; conflicts: string[] }, suggestion: string[]): string {
	const lines: string[] = [];
	if (m.conflicts.length > 0) lines.push("", "Kept as written in AGENTS.md:", ...m.conflicts.map((c) => `- ${c}`));
	if (suggestion.length > 0 && m.added.length === 0 && m.conflicts.length === 0) lines.push("", "AGENTS.md already has these lines.");
	else if (m.added.length > 0 && m.added.length < suggestion.length) lines.push("", "Missing from AGENTS.md:", ...m.added.map((b) => `- ${b}`));
	return lines.join("\n");
}
