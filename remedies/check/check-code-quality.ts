/** Remedy unit (opt-in, unmeasured as a remedy): Runs the quality checks before the model may finish. Re-exports extensions/mellum-quality.ts unchanged. */
import ext from "../../extensions/mellum-quality.ts";
import type { UnitMeta } from "../install.ts";

export const meta: UnitMeta = {
	pathology: "Finishes with lint or type errors the grader counts as a fail",
	does: "Runs the quality checks before the model may finish",
	lesson: "",
	evidence: "unit-tested; not measured on the suites",
};

export default ext;
