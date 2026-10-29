/** Remedy unit (opt-in, unmeasured as a remedy): Rewrites a long-running bash command to run in the background and returns its startup output. Re-exports extensions/mellum-nonblock.ts unchanged. */
import ext from "../../extensions/mellum-nonblock.ts";
import type { UnitMeta } from "../install.ts";

export const meta: UnitMeta = {
	pathology: "Runs a server or watcher in the foreground and the session waits forever",
	does: "Rewrites a long-running bash command to run in the background and returns its startup output",
	lesson: "",
	evidence: "unit-tested; not measured on the suites",
};

export default ext;
