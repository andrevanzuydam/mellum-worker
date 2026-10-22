/**
 * mellum-plan: plan before you implement.
 *
 * The recorded pathology is "declares done without doing the work": on a
 * multi-phase build the worker reads the phase spec and edits straight away,
 * satisfying the visible page while dropping a data-model rule no visible test
 * checks (the phase-4 id/status miss). A developer plans first — lists the
 * files and the whole contract — so a later requirement is not forgotten.
 *
 * The FIRST edit/write is blocked until the worker has stated a plan (a
 * substantive assistant text turn). Reads, greps and shell commands are never
 * gated — exploration before a plan is fine. Once a plan exists the gate never
 * fires again, and the block reason carries the cumulative-contract lesson.
 *
 * It is a BOUNDED nudge, not a hard gate: it blocks at most `max` edits (default
 * 2) then fails open. A model that works in thinking+tool-call may never emit a
 * plain-text plan turn, and a gate that could block every edit forever would
 * deadlock the build (measured). So planning is encouraged, never enforced to
 * the point of producing no code.
 */

export interface ToolCall {
	toolName: string;
	input: unknown;
}

export interface Block {
	block: true;
	reason: string;
}

interface MessageLike {
	role?: string;
	content?: unknown;
}

export const PLAN_REASON =
	"[mellum-plan] Plan before you edit. First, in a message (not a tool call), write your plan: " +
	"(1) the files you will change, and (2) a checklist of EVERY requirement from the whole spec — " +
	"including data-model rules that no visible test checks, such as a unique, automatically-assigned " +
	"id, or a status that defaults to a specific value. Then make your edits. Keeping the whole " +
	"contract in view is what stops a later requirement from being dropped.";

const EDIT_TOOLS = new Set(["edit", "write"]);

/** A plan is a substantive assistant text turn — not thinking-only, not a tool call, not whitespace. */
export function isPlanTurn(message: MessageLike | undefined): boolean {
	if (!message || message.role !== "assistant") return false;
	const blocks = Array.isArray(message.content) ? (message.content as Record<string, unknown>[]) : [];
	return blocks.some((b) => b && b.type === "text" && typeof b.text === "string" && b.text.trim() !== "");
}

export interface PlanGate {
	toolCall(call: ToolCall): Block | undefined;
	turnEnd(event: { message?: MessageLike }): void;
}

const DEFAULT_MAX = 2;

/** MELLUM_PLAN (JSON) overrides the block cap, e.g. {"max":1}; 0 disables the gate. */
export function resolvePlanMax(env: string | undefined): number {
	if (!env) return DEFAULT_MAX;
	try {
		const parsed = JSON.parse(env);
		if (parsed && typeof parsed === "object" && Number.isInteger(parsed.max) && parsed.max >= 0) {
			return parsed.max;
		}
	} catch {
		// fall through to default
	}
	return DEFAULT_MAX;
}

/**
 * Blocks the first edit/write until a plan turn, then stays out of the way — but
 * FAILS OPEN after `max` blocks. A model that works in thinking+tool-call may
 * never emit a plain-text plan turn; without the cap the gate blocks every edit
 * forever and the worker builds nothing (measured: wired hard, 0 of 34, 157
 * requests, 3790 blocks). A gate must never be able to deadlock the build, so it
 * degrades to a bounded nudge.
 */
export function createPlanGate(max: number = DEFAULT_MAX): PlanGate {
	let planned = false;
	let blocks = 0;
	return {
		toolCall(call) {
			if (!EDIT_TOOLS.has(call.toolName) || planned) return undefined;
			if (blocks >= max) return undefined; // fail open: never deadlock the build
			blocks += 1;
			return { block: true, reason: PLAN_REASON };
		},
		turnEnd(event) {
			if (isPlanTurn(event?.message)) planned = true;
		},
	};
}

export default function (pi: { on: (event: string, handler: (event: any) => unknown) => void }): void {
	const gate = createPlanGate(resolvePlanMax(process.env.MELLUM_PLAN));
	pi.on("tool_call", (event) => gate.toolCall(event));
	pi.on("turn_end", (event) => gate.turnEnd(event));
}
