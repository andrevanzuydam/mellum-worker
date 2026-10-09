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
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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

function handoffMessage(task: string, span: Msg[], opts: HandoffOptions = {}): Msg {
	const files = new Set<string>();
	const results = new Map<string, { error: boolean; text: string }>();
	for (const m of span) {
		if (m.role === "toolResult") {
			const id = (m as any).toolCallId;
			if (typeof id === "string") results.set(id, { error: Boolean((m as any).isError), text: textOf(m).trim() });
		}
	}
	const commands: { command: string; error: boolean }[] = [];
	let lastTest = "";
	let lastCommandFailed: boolean | undefined;
	let finalText = "";
	let requests = 0;
	let outputTokens = 0;
	let first: number | undefined;
	let last: number | undefined;
	for (const m of span) {
		if (m.role !== "assistant") continue;
		requests += 1;
		const usage = (m as any).usage;
		if (usage && typeof usage.output === "number") outputTokens += usage.output;
		const t = toMillis((m as any).timestamp);
		if (t !== undefined) {
			first ??= t;
			last = t;
		}
		if (!Array.isArray(m.content)) continue;
		for (const b of m.content as any[]) {
			if (b.type === "toolCall" && (b.name === "edit" || b.name === "write")) {
				const p = b.arguments?.path;
				if (typeof p === "string") files.add(p);
			}
			if (b.type === "toolCall" && b.name === "bash" && typeof b.arguments?.command === "string") {
				const r = results.get(b.id);
				commands.push({ command: b.arguments.command, error: Boolean(r?.error) });
				if (r?.text) lastTest = r.text;
				lastCommandFailed = Boolean(r?.error);
			}
			if (b.type === "text" && typeof b.text === "string" && b.text.trim()) finalText = b.text.trim();
		}
	}
	const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "\n…" : s);
	const fileList = [...files].map((f) => (opts.exists && !opts.exists(f) ? `${f} (missing at handoff)` : f));
	const wall = first !== undefined && last !== undefined ? `${Math.round((last - first) / 1000)} s` : "wall unknown";
	const lastCommand = lastCommandFailed === undefined ? "no commands" : lastCommandFailed ? "last command failed" : "last command ok";
	const summary = `Mellum: ${requests} requests, ${outputTokens.toLocaleString("en-US")} output tokens, ${wall}, ${lastCommand}`;
	const body = [
		"[mellum-mode handoff] Mellum ran a task in this session; its tool calls are in the transcript but not repeated here.",
		summary,
		`Task: ${clip(task.trim(), 400)}`,
		`Files edited or written: ${fileList.length ? fileList.join(", ") : "none"}`,
		commands.length
			? `Commands run:\n${commands.map((c) => `- ${clip(c.command, 200)}${c.error ? " (failed)" : ""}`).join("\n")}`
			: "Commands run: none",
		lastTest ? `Last command output:\n${clip(lastTest, 600)}` : "Last command output: none",
		finalText ? `Mellum's final reply:\n${clip(finalText, 1500)}` : "Mellum's final reply: (empty)",
	].join("\n");
	return { role: "user", content: [{ type: "text", text: body }], timestamp: Date.now() };
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
		active = false;
		guards = undefined;
		pi.sendMessage({ customType: "mellum-mode", content: MARK_OFF, display: true }, { deliverAs: "nextTurn" });
		const secs = Math.round((Date.now() - span.startedAt) / 1000);
		ctx.ui?.notify?.(`mellum-mode off: ${span.requests} requests, ${span.toolCalls} tool call${span.toolCalls === 1 ? "" : "s"}, ${span.outputTokens.toLocaleString("en-US")} output tokens, ${secs} s`, "info");
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
		if (active) return undefined;
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
			if (event?.message?.role === "assistant" && typeof out === "number") span.outputTokens += out;
		}
		return undefined;
	});
	pi.on("agent_before_settle", () => (active && guards ? guards.beforeSettle() : undefined));
}
