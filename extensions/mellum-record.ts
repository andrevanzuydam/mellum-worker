/**
 * The run record shared by Mellum Worker and the Worker's guards: span statistics, the
 * schema-2 JSONL line, and the version stamps. Pure apart from reading package.json once.
 * Must not import mellum-worker.ts (Mode imports the guards, the guards import this).
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ServerCheck } from "./mellum-check.ts";
import { commandMutatesFiles } from "./mellum-commands.ts";

export type Msg = { role?: string; content?: unknown; [k: string]: unknown };

export function textOf(m: Msg): string {
	if (typeof m.content === "string") return m.content;
	if (!Array.isArray(m.content)) return "";
	return m.content.map((p: any) => (p && p.type === "text" && typeof p.text === "string" ? p.text : "")).join("\n");
}

export interface SpanCommand {
	command: string;
	failed: boolean;
	finished: boolean;
}

export interface SpanStats {
	requests: number;
	usage: { input: number; cacheRead: number; output: number };
	startedAt?: number;
	lastTurnAt?: number;
	wallSeconds?: number;
	files: string[];
	/** Count of edit and write tool calls (not unique paths). */
	edits: number;
	commands: SpanCommand[];
	lastCommand: "ok" | "failed" | "unfinished" | "none";
	lastCommandOutput: string;
	finalReply: string;
	/** Shape of the span's last assistant message. */
	finalTurn: { stopReason?: string; hadText: boolean; hadToolCall: boolean };
	/** Tool calls per tool name, over every assistant turn. */
	toolCalls: Record<string, number>;
	/** Tool results marked as errors, from any tool. */
	toolErrors: number;
	/** Seconds from the first assistant turn to the first that calls edit or write; absent without one, or without timestamps. */
	firstWriteSeconds?: number;
}

/** Everything the handoff and the run record report, computed once from a span's messages. */
export function spanStats(span: Msg[]): SpanStats {
	const files = new Set<string>();
	const results = new Map<string, { error: boolean; text: string }>();
	let toolErrors = 0;
	for (const m of span) {
		if (m.role === "toolResult") {
			if ((m as any).isError) toolErrors += 1;
			const id = (m as any).toolCallId;
			if (typeof id === "string") results.set(id, { error: Boolean((m as any).isError), text: textOf(m).trim() });
		}
	}
	const stats: SpanStats = {
		requests: 0,
		usage: { input: 0, cacheRead: 0, output: 0 },
		files: [],
		edits: 0,
		commands: [],
		lastCommand: "none",
		lastCommandOutput: "",
		finalReply: "",
		finalTurn: { hadText: false, hadToolCall: false },
		toolCalls: {},
		toolErrors,
	};
	let firstWriteAt: number | undefined;
	let wrote = false;
	for (const m of span) {
		if (m.role !== "assistant") continue;
		stats.requests += 1;
		const sr = (m as any).stopReason;
		const blocks: any[] = Array.isArray(m.content) ? (m.content as any[]) : [];
		stats.finalTurn = {
			...(typeof sr === "string" ? { stopReason: sr } : {}),
			hadText: blocks.some((b) => b.type === "text" && typeof b.text === "string" && b.text.trim() !== ""),
			hadToolCall: blocks.some((b) => b.type === "toolCall"),
		};
		const usage = (m as any).usage;
		if (usage) {
			for (const k of ["input", "cacheRead", "output"] as const) {
				if (typeof usage[k] === "number") stats.usage[k] += usage[k];
			}
		}
		const t = toMillis((m as any).timestamp);
		if (t !== undefined) {
			stats.startedAt ??= t;
			stats.lastTurnAt = t;
		}
		if (!Array.isArray(m.content)) continue;
		if (!wrote && (m.content as any[]).some((b) => b.type === "toolCall" && (b.name === "edit" || b.name === "write"))) {
			wrote = true;
			firstWriteAt = t;
		}
		for (const b of m.content as any[]) {
			if (b.type === "toolCall" && typeof b.name === "string") stats.toolCalls[b.name] = (stats.toolCalls[b.name] ?? 0) + 1;
			if (b.type === "toolCall" && (b.name === "edit" || b.name === "write")) {
				stats.edits += 1;
				const p = b.arguments?.path;
				if (typeof p === "string") files.add(p);
			}
			if (b.type === "toolCall" && b.name === "bash" && typeof b.arguments?.command === "string") {
				const r = results.get(b.id);
				stats.commands.push({ command: b.arguments.command, failed: Boolean(r?.error), finished: Boolean(r) });
				if (r) {
					if (r.text) stats.lastCommandOutput = r.text;
					stats.lastCommand = r.error ? "failed" : "ok";
				} else {
					stats.lastCommand = "unfinished";
				}
			}
			if (b.type === "text" && typeof b.text === "string" && b.text.trim()) stats.finalReply = b.text.trim();
		}
	}
	stats.files = [...files];
	if (stats.startedAt !== undefined && stats.lastTurnAt !== undefined) stats.wallSeconds = Math.round((stats.lastTurnAt - stats.startedAt) / 1000);
	if (stats.startedAt !== undefined && firstWriteAt !== undefined) stats.firstWriteSeconds = Math.round((firstWriteAt - stats.startedAt) / 1000);
	return stats;
}

/** The package version, read once at load; "unknown" if package.json cannot be read. */
export const PACKAGE_VERSION: string = (() => {
	try {
		const here = dirname(fileURLToPath(import.meta.url));
		const v = JSON.parse(readFileSync(resolve(here, "..", "package.json"), "utf8")).version;
		return typeof v === "string" ? v : "unknown";
	} catch {
		return "unknown";
	}
})();

/**
 * `vN` from the prompt's marker `<!-- mellum-worker prompt vN -->`, else "unknown". The marker is
 * the first match at the start of any line: the Mode prompt starts with it, a Worker child's system
 * message carries it after the pi-subagents preamble.
 */
export function promptVersionOf(prompt: string): string {
	return /^<!--\s*mellum-worker prompt (v\d+)\s*-->/m.exec(prompt)?.[1] ?? "unknown";
}

export type Activation = "one-shot" | "on" | "headless";

export interface RecordMeta {
	endedAt: number;
	cwd: string;
	model: string;
	exists?: (path: string) => boolean;
	host?: string;
	activation?: Activation;
	promptVersion?: string;
	nudges?: number;
	guardBlocks?: number;
	facts?: { source: string; testCommand: string | null; chars: number } | null;
	server?: ServerCheck;
	/** Who wrote the record; Mode when omitted. */
	kind?: "mode";
}

export interface RunRecord {
	schema: 2;
	kind: "mode";
	version: string;
	promptVersion: string;
	host: string;
	activation: Activation | "unknown";
	startedAt?: string;
	endedAt: string;
	wallSeconds?: number;
	cwd: string;
	model: string;
	task: string;
	taskNamesTestCommand: boolean;
	requests: number;
	usage: { input: number; cacheRead: number; output: number };
	files: string[];
	edits: number;
	filesMissingAtEnd: string[];
	commands: { command: string; failed: boolean; mutates: boolean }[];
	lastCommand: SpanStats["lastCommand"];
	finalReply: string;
	finalTurn: SpanStats["finalTurn"];
	toolCalls: Record<string, number>;
	toolErrors: number;
	firstWriteSeconds?: number;
	nudges: number;
	guardBlocks: number;
	facts?: { source: string; testCommand: string | null; chars: number } | null;
	server?: ServerCheck;
}

/** One JSONL line per span, for analysis outside the session. Same fields as the handoff, plus schema 2 additions. */
export function runRecord(task: string, span: Msg[], meta: RecordMeta): RunRecord {
	const stats = spanStats(span);
	const exists = meta.exists;
	return {
		schema: 2,
		kind: meta.kind ?? "mode",
		version: PACKAGE_VERSION,
		promptVersion: meta.promptVersion ?? "unknown",
		host: meta.host ?? "unknown",
		activation: meta.activation ?? "unknown",
		startedAt: stats.startedAt === undefined ? undefined : new Date(stats.startedAt).toISOString(),
		endedAt: new Date(meta.endedAt).toISOString(),
		wallSeconds: stats.wallSeconds,
		cwd: meta.cwd,
		model: meta.model,
		task: task.trim().slice(0, 2000),
		taskNamesTestCommand: /test command/i.test(task),
		requests: stats.requests,
		usage: stats.usage,
		files: stats.files,
		edits: stats.edits,
		filesMissingAtEnd: exists ? stats.files.filter((f) => !exists(f)) : [],
		commands: stats.commands.map((c) => ({ command: c.command.slice(0, 2000), failed: c.failed, mutates: commandMutatesFiles(c.command) })),
		lastCommand: stats.lastCommand,
		finalReply: stats.finalReply.slice(0, 4000),
		finalTurn: stats.finalTurn,
		toolCalls: stats.toolCalls,
		toolErrors: stats.toolErrors,
		...(stats.firstWriteSeconds !== undefined ? { firstWriteSeconds: stats.firstWriteSeconds } : {}),
		nudges: meta.nudges ?? 0,
		guardBlocks: meta.guardBlocks ?? 0,
		...(meta.facts !== undefined ? { facts: meta.facts } : {}),
		...(meta.server ? { server: meta.server } : {}),
	};
}

function toMillis(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const t = Date.parse(value);
		return Number.isNaN(t) ? undefined : t;
	}
	return undefined;
}
