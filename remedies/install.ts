/**
 * Shared wiring for remedy units: one unit installs one behaviour on Pi's hooks.
 * A guard unit is a `ToolCall -> Decision` function on `tool_call`; nothing else.
 */
import type { Guard } from "../extensions/mellum-guards.ts";

export interface PiLike {
	on: (event: string, handler: (event: any, ctx?: any) => unknown) => void;
}

/** What the remedies list shows for a unit, read from each unit's `meta` export. */
export interface UnitMeta {
	pathology: string;
	does: string;
	lesson: string;
	evidence: string;
}

export function installGuard(pi: PiLike, guard: Guard): void {
	pi.on("tool_call", (event) => guard({ toolName: event.toolName, input: event.input }));
}
