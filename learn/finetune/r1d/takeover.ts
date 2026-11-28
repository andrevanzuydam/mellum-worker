/**
 * Take-over for collecting corrections: the student runs until its first mistake, then the teacher takes the
 * rest of the run in the same session, from exactly the state the student's mistake left.
 *
 * A training tool, not a remedy: it changes which model answers, so a run that loads it measures nothing about
 * the student. The steps after the switch are the teacher's answers to the student's own situations; the builder
 * keeps them only when the run then passes its hidden grader.
 *
 * Mistake points (first one wins, then the extension goes quiet):
 *   - missing-file: a read of a file that does not exist (the student hunts instead of writing it);
 *   - shell-syntax: bash reports a syntax error (Python sent to the shell, and the like);
 *   - repeated-failure: the same call failing a second time;
 *   - no-change-yet: `looksBeforeChange` look calls in a row with no file written or edited yet.
 * A failing test run is normal work and is not a mistake.
 *
 *   TAKEOVER_TEACHER=lab/mellum TAKEOVER_LOG=<run>/takeover.jsonl pi ... -e learn/finetune/r1d/takeover.ts
 */
import { appendFileSync } from "node:fs";

type Seen = { toolName: string; input: any; isError: boolean; text: string };

const CHANGE_TOOLS = new Set(["write", "edit"]);
const WRITES_A_FILE = /(^|[;&|]\s*|\s)(cat|tee|printf|echo)\b[^\n]*(>|\btee\b)|\bcat\s*>|>\s*\S+\.\w+/;

export function createMistakeDetector({ looksBeforeChange = 8 }: { looksBeforeChange?: number } = {}) {
	let changed = false;
	let looks = 0;
	const failed = new Set<string>();
	return {
		see(r: Seen): string | null {
			const key = `${r.toolName} ${JSON.stringify(r.input ?? {})}`;
			if (r.isError && failed.has(key)) return "repeated-failure";
			if (r.isError) failed.add(key);
			if (r.toolName === "read" && r.isError && /ENOENT|no such file/i.test(r.text)) return "missing-file";
			if (r.toolName === "bash" && /syntax error near unexpected token|syntax error: unexpected/i.test(r.text)) {
				return "shell-syntax";
			}
			const command = String(r.input?.command ?? "");
			if (CHANGE_TOOLS.has(r.toolName) || (r.toolName === "bash" && WRITES_A_FILE.test(command))) {
				changed = true;
				failed.clear(); // a change makes the next identical call a fresh attempt
				return null;
			}
			if (changed) return null;
			looks += 1;
			return looks >= looksBeforeChange ? "no-change-yet" : null;
		},
	};
}

const textOf = (content: any) =>
	(Array.isArray(content) ? content : []).filter((c) => c?.type === "text").map((c) => c.text ?? "").join("");

export default function install(pi: any) {
	const teacher = process.env.TAKEOVER_TEACHER ?? "lab/mellum";
	const log = process.env.TAKEOVER_LOG;
	const looks = Number(process.env.TAKEOVER_LOOKS ?? 8);
	const detector = createMistakeDetector({ looksBeforeChange: looks });
	let results = 0;
	let done = false;
	pi.on("tool_result", async (event: any, ctx: any) => {
		results += 1;
		if (done) return undefined;
		const reason = detector.see({ toolName: event.toolName, input: event.input, isError: !!event.isError,
			text: textOf(event.content) });
		if (!reason) return undefined;
		done = true;
		const [provider, ...rest] = teacher.split("/");
		const model = ctx?.modelRegistry?.find(provider, rest.join("/"));
		const switched = model ? await pi.setModel(model) : false;
		if (log) {
			appendFileSync(log, JSON.stringify({ reason, afterToolResults: results, toolName: event.toolName,
				input: event.input, teacher, switched, at: new Date().toISOString() }) + "\n");
		}
		return undefined;
	});
}
