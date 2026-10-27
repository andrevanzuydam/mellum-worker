/**
 * mellum-loopguard: the loop-breaker on its own, for the read-only phases.
 *
 * The coder loads the full mellum-guards (write-confinement, server-blocking, the
 * empty-final nudge AND the loop-breaker). The read-only phases — plan, review_plan,
 * examine, review_code — must stay minimal, so they must NOT carry the write-oriented
 * guards. But a tool-using model still loops: it emits a call, reads the result, and
 * on its next turn re-decides to run the SAME read call rather than emit its answer.
 * examine is the sharp case — its reply must BE the acceptance test, so "done" is a
 * stop-and-write decision the model makes alone; on a fresh workspace a thinking model
 * whose reasoning is stripped between turns can re-issue `ls .` without bound (measured:
 * 1000+ events, one phase). The loop-breaker caps exactly that — after an unbroken run
 * of identical no-op calls it blocks with "you already ran this, take the next concrete
 * action", which forces the emit. It keys off repeats alone, so it is agnostic to the
 * model and the task: a no-op on a model that converges, a safety net on one that does
 * not. This is why it is its own tiny extension rather than the whole guard set.
 */

import { createLoopBreaker } from "./mellum-guards.ts";

export default function (pi: { on: (event: string, handler: (event: any, ctx?: any) => unknown) => void }) {
	const breaker = createLoopBreaker();
	pi.on("tool_call", (event) => {
		const decision = breaker({ toolName: event.toolName, input: event.input });
		return decision?.block ? decision : undefined;
	});
}
