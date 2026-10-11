// Replays an archived Worker (Pi child) run through the guards extension's listeners, with no
// model and no server: the recorder sees what Pi would have sent it, and writes its one record.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const FIXTURES = resolve(import.meta.dirname, "../fixtures/worker");
export const RUNS = ["a10-rung1-r1", "a10-rung3-r1", "a10-rung5-r1"];

const text = (s) => [{ type: "text", text: s }];

/** One OpenAI-format chat message in Pi's `Msg` shape; `isError` is the matching tool_result line's flag. */
export function toPiMessage(m, isError = false) {
	if (m.role === "tool") return { role: "toolResult", toolCallId: m.tool_call_id, isError, content: text(String(m.content ?? "")) };
	if (m.role === "assistant") {
		const content = [];
		if (typeof m.content === "string" && m.content.trim()) content.push(...text(m.content));
		for (const c of m.tool_calls ?? []) {
			content.push({ type: "toolCall", id: c.id, name: c.function.name, arguments: JSON.parse(c.function.arguments || "{}") });
		}
		return { role: "assistant", content, stopReason: content.some((b) => b.type === "toolCall") ? "toolUse" : "stop" };
	}
	return { role: m.role, content: typeof m.content === "string" ? text(m.content) : m.content };
}

export function loadRun(name) {
	const events = readFileSync(join(FIXTURES, `${name}.trace.jsonl`), "utf8").trim().split("\n").map((l) => JSON.parse(l));
	const requests = events.filter((e) => e.type === "provider_request");
	const calls = events.filter((e) => e.type === "tool_call");
	const results = events.filter((e) => e.type === "tool_result");
	return { events, requests, calls, results, final: readFileSync(join(FIXTURES, `${name}.final.md`), "utf8") };
}

/**
 * Installs the default export with recording to `file` and a fetch that rejects, feeds it the run, and
 * resolves once `agent_settled` has run. Returns the parsed trace parts the assertions compare against.
 */
export async function replay(name, file) {
	const run = loadRun(name);
	const saved = process.env.MELLUM_WORKER_RUNS;
	process.env.MELLUM_WORKER_RUNS = file;
	const handlers = {};
	try {
		const { default: install } = await import("../../extensions/mellum-guards.ts");
		install({ on: (event, fn) => { handlers[event] = fn; } }, { fetch: () => Promise.reject(new Error("no server in tests")) });
	} finally {
		if (saved === undefined) delete process.env.MELLUM_WORKER_RUNS;
		else process.env.MELLUM_WORKER_RUNS = saved;
	}
	const ctx = { mode: "json", model: { provider: "omlx", id: run.requests[0].payload.model } };
	let toolResultIndex = 0;
	let seen = 0;
	for (const { payload } of run.requests) {
		const fresh = payload.messages.slice(seen);
		seen = payload.messages.length;
		if (seen === fresh.length) {
			handlers.context({ type: "context", messages: fresh.map((m) => toPiMessage(m)) }, ctx);
			continue;
		}
		const [assistant, ...tools] = fresh;
		const toolResults = tools.map((m) => toPiMessage(m, Boolean(run.results[toolResultIndex++]?.isError)));
		handlers.turn_end({ type: "turn_end", message: toPiMessage(assistant), toolResults }, ctx);
	}
	// The last request's answer is not in the trace; the run's final.md stands in for it.
	handlers.turn_end({ type: "turn_end", message: { role: "assistant", content: text(run.final), stopReason: "stop" }, toolResults: [] }, ctx);
	handlers.agent_before_settle({ context: { canContinue: false } }, ctx);
	await handlers.agent_settled({ type: "agent_settled" }, ctx);
	return run;
}
