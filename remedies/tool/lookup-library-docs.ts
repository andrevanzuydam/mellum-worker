/** Remedy unit (opt-in, unmeasured as a remedy): Adds a lookup tool over the installed packages' signatures and docs. Re-exports extensions/mellum-knowledge.ts unchanged. */
import ext from "../../extensions/mellum-knowledge.ts";
import type { UnitMeta } from "../install.ts";

export const meta: UnitMeta = {
	pathology: "Guesses an API it never saw (a post-cutoff library, a redirect status)",
	does: "Adds a lookup tool over the installed packages' signatures and docs",
	lesson: "",
	evidence: "unit-tested; not measured on the suites",
};

export default ext;
