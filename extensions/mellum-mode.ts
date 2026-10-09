/**
 * Mellum mode: run the small model inside the main session with the worker's prompt
 * and tools, and show it nothing from before the mode began.
 *
 *   /mellum <task>  – one shot: switch to Mellum, run the task, switch back when settled
 *   /mellum on      – stay on for several turns (switch model, tools, mark the start)
 *   /mellum off     – restore the previous model and tools
 *
 * While on, before_provider_request rewrites the outgoing payload: the system message
 * becomes the worker prompt (prompts/mellum-worker.md, or $MELLUM_MODE_PROMPT), and the
 * messages are only those after the on-marker, minus Superpowers' bootstrap message.
 * Earlier turns' reasoning_content is left in place: removing it made runs 60% slower
 * (ladder A12). The session keeps everything; after /mellum off the parent is sent one
 * handoff block per finished span (task, files touched, last command output, final reply)
 * in place of Mellum's tool calls (the `context` hook).
 *
 * Headless: MELLUM_MODE=1 activates at session start (the ladder's "mode" runner).
 * Installed as a Pi package extension it loads in every parent session and stays dormant until /mellum. While on, it runs the child guards (createGuardSet) itself, so no second extension is needed.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { commandMutatesFiles } from "./mellum-commands.ts";
import { createGuardSet, type GuardSet } from "./mellum-guards.ts";

export const MARK_ON = "[mellum-mode on]";
export const MARK_OFF = "[mellum-mode off]";
export const BOOTSTRAP_MARKER = "superpowers:using-superpowers bootstrap for pi";
export const WORKER_TOOLS = ["read", "grep", "find", "ls", "bash", "edit", "write"];
const DEFAULT_MODEL = { provider: "omlx", id: "Mellum2.1-12B-A2.5B-Thinking-6bit" };

type Msg = { role?: string; content?: unknown; [k: string]: unknown };

function textOf(m: Msg): string {
	if (typeof m.content === "string") return m.content;
	if (!Array.isArray(m.content)) return "";
	return m.content.map((p: any) => (p && p.type === "text" && typeof p.text === "string" ? p.text : "")).join("\n");
}

const INSTRUCTION_ROLES = new Set(["system", "developer"]);

export function filterForMellum(payload: any, systemPrompt: string, opts: { expectMarker?: boolean } = {}) {
	if (!payload || !Array.isArray(payload.messages)) return payload;
	const msgs: Msg[] = payload.messages;
	const isMarker = (m: Msg) => m.role === "user" && (textOf(m).includes(MARK_ON) || textOf(m).includes(MARK_OFF));
	const isBootstrap = (m: Msg) => textOf(m).includes(BOOTSTRAP_MARKER);
	let start = 0;
	let markerAt = -1;
	for (let i = msgs.length - 1; i >= 0; i--) {
		if (msgs[i].role === "user" && textOf(msgs[i]).includes(MARK_ON)) {
			markerAt = i;
			break;
		}
	}
	let markerMissing = false;
	if (markerAt >= 0) {
		start = markerAt + 1;
		// Pi delivers a queued marker after the user message it was queued for, so the
		// prompt that started the mode sits just before the marker (possibly behind an
		// off-marker). Keep it unless a later user message already carries the task.
		const laterUser = msgs.slice(start).some((m) => m.role === "user" && !isMarker(m));
		if (!laterUser) {
			let j = markerAt - 1;
			while (j >= 0 && isMarker(msgs[j])) j--;
			if (j >= 0 && msgs[j].role === "user" && !isBootstrap(msgs[j])) start = j;
		}
	} else if (opts.expectMarker) {
		// The marker was compacted away or never arrived: send only the last user
		// message rather than the whole parent history, and say so.
		markerMissing = true;
		for (let i = msgs.length - 1; i >= 0; i--) {
			if (msgs[i].role === "user" && !isMarker(msgs[i]) && !isBootstrap(msgs[i])) {
				start = i;
				break;
			}
		}
	}
	const kept = msgs
		.slice(start)
		.filter((m) => !INSTRUCTION_ROLES.has(m.role ?? "") && !isMarker(m) && !isBootstrap(m));
	const out: any = { ...payload, messages: [{ role: "system", content: systemPrompt }, ...kept] };
	if (Array.isArray(payload.tools)) {
		// pi-subagents re-adds its own tools after setActiveTools; the worker gets only its seven.
		const tools = payload.tools.filter((t: any) => WORKER_TOOLS.includes(t?.function?.name ?? t?.name));
		if (tools.length) out.tools = tools;
		else delete out.tools;
		const chosen = payload.tool_choice?.function?.name ?? payload.tool_choice?.name;
		if (chosen && !WORKER_TOOLS.includes(chosen)) delete out.tool_choice;
	}
	if (markerMissing) out.mellumModeMarkerMissing = true;
	return out;
}

/**
 * What the parent sees of a finished Mellum span: one block instead of every
 * read, edit and test run. Built from the span's own messages (Pi's internal
 * message format, as seen by the `context` event). Open spans are untouched.
 */
export interface HandoffOptions {
	/** Reports whether a written path still exists at handoff time; omitted means never flag. */
	exists?: (path: string) => boolean;
}

export function collapseHandoffs(messages: Msg[], opts: HandoffOptions = {}): Msg[] {
	// At the `context` event a sent marker is a `custom` message; in the provider
	// payload it has become a user message. Accept both.
	const hasMark = (m: Msg, mark: string) => (m.role === "user" || m.role === "custom") && textOf(m).includes(mark);
	const out: Msg[] = [];
	let i = 0;
	while (i < messages.length) {
		const m = messages[i];
		if (hasMark(m, MARK_ON)) {
			let j = i + 1;
			while (j < messages.length && !hasMark(messages[j], MARK_OFF)) j++;
			if (j >= messages.length) {
				out.push(...messages.slice(i));
				break;
			}
			// The task is the user message just before the on-marker (Pi queues the
			// marker after the prompt it was queued with), else the first after it.
			const last = out[out.length - 1];
			const prev = last && last.role === "user" && !hasMark(last, MARK_OFF) ? out.pop() : undefined;
			let span = messages.slice(i + 1, j);
			// The off-marker is queued "next turn", so it lands after the prompt the user
			// typed next; trailing user messages after the span's last reply are that
			// prompt, not part of the task.
			let tail = span.length;
			while (tail > 0 && span[tail - 1].role === "user") tail--;
			const trailing = span.slice(tail);
			span = span.slice(0, tail);
			const task = prev ? textOf(prev) : textOf(span.find((x) => x.role === "user") ?? {});
			out.push(handoffMessage(task, span, opts), ...trailing);
			i = j + 1;
			continue;
		}
		out.push(m);
		i++;
	}
	return out;
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
}

/** Everything the handoff and the run record report, computed once from a span's messages. */
export function spanStats(span: Msg[]): SpanStats {
	const files = new Set<string>();
	const results = new Map<string, { error: boolean; text: string }>();
	for (const m of span) {
		if (m.role === "toolResult") {
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
	};
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
		for (const b of m.content as any[]) {
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
	return stats;
}

const MAX_HANDOFF_COMMANDS = 15;

function summaryLine(stats: SpanStats): string {
	const n = stats.requests;
	const wall = stats.wallSeconds === undefined ? "wall unknown" : `${stats.wallSeconds} s`;
	const last = { ok: "last command ok", failed: "last command failed", unfinished: "last command did not finish", none: "no commands" }[stats.lastCommand];
	return `Mellum: ${n} request${n === 1 ? "" : "s"}, ${stats.usage.output.toLocaleString("en-US")} output tokens, ${wall}, ${last}`;
}

function handoffMessage(task: string, span: Msg[], opts: HandoffOptions = {}): Msg {
	const stats = spanStats(span);
	const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);
	const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
	const fileList = stats.files.map((f) => (opts.exists && !opts.exists(f) ? `${f} (missing at handoff)` : f));
	const shown = stats.commands.slice(-MAX_HANDOFF_COMMANDS);
	const hidden = stats.commands.length - shown.length;
	const commandLines = shown.map((c) => `- ${clip(oneLine(c.command), 200)}${!c.finished ? " (no result)" : c.failed ? " (failed)" : ""}`);
	const body = [
		"[mellum-mode handoff] Mellum ran a task in this session; its tool calls are in the transcript but not repeated here.",
		summaryLine(stats),
		`Task: ${clip(task.trim(), 400)}`,
		`Files edited or written: ${fileList.length ? fileList.join(", ") : "none"}`,
		commandLines.length
			? `Commands run${hidden ? ` (${hidden} earlier not shown)` : ""}:\n${commandLines.join("\n")}`
			: "Commands run: none",
		stats.lastCommandOutput ? `Last command output:\n${clip(stats.lastCommandOutput, 600)}` : "Last command output: none",
		stats.finalReply ? `Mellum's final reply:\n${clip(stats.finalReply, 1500)}` : "Mellum's final reply: (empty)",
	].join("\n");
	return { role: "user", content: [{ type: "text", text: body }], timestamp: Date.now() };
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

/** `vN` from the prompt's first-line marker `<!-- mellum-worker prompt vN -->`, else "unknown". */
export function promptVersionOf(prompt: string): string {
	const first = prompt.split("\n", 1)[0] ?? "";
	return /^<!--\s*mellum-worker prompt (v\d+)\s*-->/.exec(first)?.[1] ?? "unknown";
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
}

export interface RunRecord {
	schema: 2;
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
	nudges: number;
	guardBlocks: number;
}

/** One JSONL line per span, for analysis outside the session. Same fields as the handoff, plus schema 2 additions. */
export function runRecord(task: string, span: Msg[], meta: RecordMeta): RunRecord {
	const stats = spanStats(span);
	const exists = meta.exists;
	return {
		schema: 2,
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
		nudges: meta.nudges ?? 0,
		guardBlocks: meta.guardBlocks ?? 0,
	};
}

/** The trailing span still open at the end of `messages`: its task text and messages, or undefined. */
export function openSpan(messages: Msg[]): { task: string; span: Msg[] } | undefined {
	const hasMark = (m: Msg, mark: string) => (m.role === "user" || m.role === "custom") && textOf(m).includes(mark);
	let on = -1;
	for (let i = messages.length - 1; i >= 0; i--) {
		if (hasMark(messages[i], MARK_OFF)) return undefined;
		if (hasMark(messages[i], MARK_ON)) {
			on = i;
			break;
		}
	}
	if (on === -1) return undefined;
	const span = messages.slice(on + 1);
	const prev = messages[on - 1];
	const task = prev && prev.role === "user" && !hasMark(prev, MARK_OFF) ? textOf(prev) : textOf(span.find((m) => m.role === "user") ?? {});
	return { task, span };
}

function runsFile(): string | undefined {
	const env = process.env.MELLUM_MODE_RUNS;
	if (env === "0" || env === "") return undefined;
	if (env) return env.replace(/^~(?=$|\/)/, process.env.HOME ?? "~");
	return resolve(process.env.HOME ?? ".", ".pi", "agent", "mellum-mode-runs.jsonl");
}

function toMillis(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const t = Date.parse(value);
		return Number.isNaN(t) ? undefined : t;
	}
	return undefined;
}

function loadPrompt(): string {
	const here = dirname(fileURLToPath(import.meta.url));
	const file = process.env.MELLUM_MODE_PROMPT || resolve(here, "..", "prompts", "mellum-worker.md");
	return readFileSync(file, "utf8").trim();
}

export default function (pi: any) {
	let active = false;
	let interactive = false;
	let saved: { model: any; tools: string[] } | undefined;
	let prompt = "";
	let warnedMissing = false;
	let guards: GuardSet | undefined;
	// Per-span counters for the one-line summary shown at /mellum off.
	let span = { startedAt: 0, requests: 0, toolCalls: 0, outputTokens: 0 };
	let activeModel = "";
	// The parent's context as last seen while on, plus assistant turns since; the run record is built from these.
	let lastContext: Msg[] = [];
	let turnsSinceContext: Msg[] = [];

	async function activate(ctx: any, notify = true) {
		if (active) {
			ctx.ui?.notify?.("mellum-mode is already on", "info");
			return;
		}
		const provider = process.env.MELLUM_MODE_PROVIDER || DEFAULT_MODEL.provider;
		const id = process.env.MELLUM_MODE_MODEL || DEFAULT_MODEL.id;
		const model = ctx.modelRegistry.find(provider, id);
		if (!model) {
			ctx.ui?.notify?.(`mellum-mode: model ${provider}/${id} not found; mode stays off`, "error");
			return;
		}
		const previous = { model: ctx.model, tools: pi.getActiveTools() };
		prompt = loadPrompt();
		const switched = await pi.setModel(model);
		if (!switched) {
			ctx.ui?.notify?.(`mellum-mode: could not select ${provider}/${id} (auth or provider error); mode stays off`, "error");
			return;
		}
		saved = previous;
		pi.setActiveTools(WORKER_TOOLS);
		active = true;
		guards = createGuardSet();
		span = { startedAt: Date.now(), requests: 0, toolCalls: 0, outputTokens: 0 };
		activeModel = `${provider}/${id}`;
		lastContext = [];
		turnsSinceContext = [];
		interactive = notify;
		warnedMissing = false;
		if (notify) pi.sendMessage({ customType: "mellum-mode", content: MARK_ON, display: true }, { deliverAs: "nextTurn" });
		if (notify) ctx.ui?.notify?.(`mellum-mode on: ${provider}/${id}, tools ${WORKER_TOOLS.join(",")}`, "info");
	}

	async function deactivate(ctx: any) {
		if (!active) {
			ctx.ui?.notify?.("mellum-mode is not on", "info");
			return;
		}
		if (!saved?.model) {
			ctx.ui?.notify?.("mellum-mode: no previous model to restore; staying on. Pick a model with /model, then /mellum off.", "warning");
			return;
		}
		const restored = await pi.setModel(saved.model);
		if (!restored) {
			ctx.ui?.notify?.("mellum-mode: could not restore the previous model; staying on", "error");
			return;
		}
		pi.setActiveTools(saved.tools);
		writeRunRecord(ctx);
		active = false;
		guards = undefined;
		pi.sendMessage({ customType: "mellum-mode", content: MARK_OFF, display: true }, { deliverAs: "nextTurn" });
		const secs = Math.round((Date.now() - span.startedAt) / 1000);
		ctx.ui?.notify?.(`mellum-mode off: ${span.requests} request${span.requests === 1 ? "" : "s"}, ${span.toolCalls} tool call${span.toolCalls === 1 ? "" : "s"}, ${span.outputTokens.toLocaleString("en-US")} output tokens, ${secs} s`, "info");
	}

	// Never lets an error escape: deactivation must complete whatever happens here.
	function writeRunRecord(ctx: any) {
		let file: string | undefined;
		try {
			file = runsFile();
			if (!file) return;
			const open = openSpan([...lastContext, ...turnsSinceContext]);
			if (!open) return;
			mkdirSync(dirname(file), { recursive: true });
			appendFileSync(file, JSON.stringify(runRecord(open.task, open.span, { endedAt: Date.now(), cwd: process.cwd(), model: activeModel })) + "\n");
		} catch (error) {
			try {
				ctx?.ui?.notify?.(`mellum-mode: could not write the run record${file ? ` to ${file}` : ""}: ${(error as Error)?.message ?? String(error)}`, "warning");
			} catch {}
		}
	}

	let oneShot = false;

	pi.registerCommand("mellum", {
		description: "mellum <task> | on | off — run Mellum with the worker prompt and tools inside this session",
		handler: async (args: string, ctx: any) => {
			const want = (args || "").trim();
			if (want === "off") return deactivate(ctx);
			if (want === "on" || want === "") return activate(ctx);
			// One shot: the task runs under the mode and the mode ends when the agent settles.
			if (active) {
				ctx.ui?.notify?.("mellum-mode is already on; type the task as a normal prompt, or /mellum off first", "warning");
				return;
			}
			await activate(ctx);
			if (!active) return;
			oneShot = true;
			pi.sendUserMessage(want);
		},
	});

	pi.on("agent_settled", async (_event: any, ctx: any) => {
		if (active && oneShot) {
			oneShot = false;
			await deactivate(ctx);
		}
	});

	pi.on("session_start", async (_event: any, ctx: any) => {
		if (process.env.MELLUM_MODE === "1" && !active) await activate(ctx, false);
	});

	// Pi sizes auto-compaction against the active model's window (Mellum's 56k) over the
	// whole, unfiltered session. Compacting the parent's history with Mellum would be a
	// lossy change to the user's session, and it would erase the on-marker. Refuse while on.
	pi.on("session_before_compact", (event: any, ctx: any) => {
		if (!active || event?.reason === "manual") return undefined;
		ctx.ui?.notify?.("mellum-mode: auto-compaction skipped while the mode is on (/mellum off first, or /compact)", "warning");
		return { cancel: true };
	});

	// Off: the parent gets one handoff block per finished span instead of Mellum's
	// every read, edit and test run. The session itself keeps everything.
	pi.on("context", (event: any) => {
		if (process.env.MELLUM_MODE_DEBUG) {
			const shapes = event.messages.map((m: any) => `${m.role}${m.customType ? ":" + m.customType : ""}${textOf(m).includes(MARK_ON) ? "[ON]" : ""}${textOf(m).includes(MARK_OFF) ? "[OFF]" : ""}`);
			appendFileSync(process.env.MELLUM_MODE_DEBUG, JSON.stringify({ active, shapes }) + "\n");
		}
		if (active) {
			lastContext = event.messages;
			turnsSinceContext = [];
			return undefined;
		}
		if (!event.messages.some((m: any) => textOf(m).includes(MARK_ON))) return undefined;
		const collapsed = collapseHandoffs(event.messages, { exists: (p) => existsSync(isAbsolute(p) ? p : resolve(process.cwd(), p)) });
		return collapsed === event.messages ? undefined : { messages: collapsed };
	});

	pi.on("before_provider_request", (event: any, ctx: any) => {
		if (!active) return undefined;
		span.requests += 1;
		const out = filterForMellum(event.payload, prompt, { expectMarker: interactive });
		if (out?.mellumModeMarkerMissing) {
			delete out.mellumModeMarkerMissing;
			if (!warnedMissing) {
				warnedMissing = true;
				ctx?.ui?.notify?.("mellum-mode: the on-marker is gone from the context; sending only the last message", "warning");
			}
		}
		return out;
	});

	// The child's guards, run in-session while the mode is on. A fresh set per span.
	pi.on("tool_call", (event: any) => {
		if (!active || !guards) return undefined;
		span.toolCalls += 1;
		return guards.toolCall(event);
	});
	pi.on("turn_end", (event: any) => {
		if (active && guards) {
			guards.turnEnd(event);
			const out = event?.message?.usage?.output;
			if (event?.message?.role === "assistant") {
				if (typeof out === "number") span.outputTokens += out;
				turnsSinceContext.push(event.message);
			}
		}
		return undefined;
	});
	pi.on("agent_before_settle", () => (active && guards ? guards.beforeSettle() : undefined));
}
