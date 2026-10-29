/** Remedy unit: offer the model only the seven worker tools, whatever else is installed. */
import { narrowTools } from "../../extensions/mellum-worker.ts";
import type { PiLike, UnitMeta } from "../install.ts";

export const meta: UnitMeta = {
	pathology: "Reaches for tools it uses badly (subagents, todo lists) instead of reading and editing",
	does: "Keeps read, grep, find, ls, bash, edit and write; drops every other tool from the request",
	lesson: "",
	evidence: "part of the Baseline Worker; not measured on its own",
};

export function install(pi: PiLike): void {
	pi.on("before_provider_request", (event) => {
		const payload = event?.payload;
		if (!payload || !Array.isArray(payload.tools)) return undefined;
		const out: any = { ...payload };
		narrowTools(payload, out);
		return out;
	});
}

export default install;
