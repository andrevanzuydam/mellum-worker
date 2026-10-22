/**
 * mellum-loop: the variable-extension workflow loop (orchestration core).
 *
 * The lesson from measurement: an in-session gate that tries to force planning
 * (mellum-plan) is waited out by a weak model, and a verify gate (mellum-ncm)
 * only fires if the worker reaches settle. The fix is to orchestrate three
 * workflows the model cannot skip, each a separate `pi` invocation over one
 * shared workspace with its OWN extension set:
 *
 *   planning  — gather information, write TODO.md.      extensions: none
 *   coding    — follow TODO.md, implement.              extensions: guards + surgical
 *   review    — re-read the spec, check every requirement (incl. ones no test
 *               covers) against the code; gate on the contract.   extensions: none
 *   testing   — run the suite (the orchestrator).       extensions: none
 *
 * The loop: planning -> coding -> review -> testing -> (green? done : re-plan)
 * until green or the round budget. On a REPEATED testing failure a rubber-duck
 * step runs first: reason the problem through aloud, amend TODO.md, then code
 * again. The orchestrator IS the plan/verify control, so the plan gate and the
 * verify gate are not loaded — fewer extensions, order enforced by the runner.
 *
 * Because the orchestrator IS the plan-and-verify control, the plan gate and the
 * verify gate are no longer loaded as extensions — fewer extensions, and the
 * ordering is enforced by the runner, not by a block the model can ignore. Pi
 * supports this directly: each workflow is `pi -p --no-extensions -e <...>
 * --system-prompt <...>` over the same cwd.
 *
 * This module is the pure state core (which workflow is next, and its extension
 * set); the Pi-invoking runner is built on top of it.
 */

export type Workflow = "start" | "planning" | "coding" | "review" | "testing" | "rubberduck" | "done";

export interface LoopState {
	workflow: Workflow;
	round: number;
	passed?: boolean;
}

export interface LoopOptions {
	maxRounds?: number;
	/** Rubber-duck before re-planning once a failure has repeated this many rounds (default 1). */
	duckAfter?: number;
}

/** The four workflows, in order. */
export const WORKFLOWS: Workflow[] = ["planning", "coding", "review", "testing"];

/** The variable, minimal extension set per workflow (bare names, no path). */
export function workflowExtensions(workflow: Workflow): string[] {
	switch (workflow) {
		case "coding":
			return ["mellum-guards", "mellum-surgical"];
		default:
			return []; // planning and testing need no in-session extensions
	}
}

/** The loop's transition: planning -> coding -> testing -> (pass? done : re-plan), bounded by maxRounds. */
export function nextStep(state: LoopState, options: LoopOptions = {}): LoopState {
	const maxRounds = options.maxRounds ?? 3;
	const round = state.round ?? 0;
	switch (state.workflow) {
		case "start":
			return { workflow: "planning", round };
		case "planning":
			return { workflow: "coding", round };
		case "coding":
			return { workflow: "review", round };
		case "review":
			if (state.passed) return { workflow: "testing", round };
			if (round >= maxRounds) return { workflow: "done", round };
			return { workflow: "planning", round: round + 1 };
		case "testing": {
			if (state.passed) return { workflow: "done", round };
			if (round >= maxRounds) return { workflow: "done", round };
			const duckAfter = options.duckAfter ?? 1;
			// On a REPEATED failure, reason the problem through (rubber duck) and let it
			// amend TODO.md, instead of a plain re-plan.
			if (round >= duckAfter) return { workflow: "rubberduck", round: round + 1 };
			return { workflow: "planning", round: round + 1 };
		}
		case "rubberduck":
			// The duck has reasoned and amended TODO.md — go straight back to coding.
			return { workflow: "coding", round };
		default:
			return { workflow: "done", round };
	}
}
