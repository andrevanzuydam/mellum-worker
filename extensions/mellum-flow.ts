/**
 * mellum-flow: the workflow as TOOLS the agent calls, not an external loop.
 *
 * The earlier harness drove the phases from an external Python loop (one `pi` per
 * phase). That is the wrong handle: a capable model, given well-shaped phase tools
 * and a workflow prompt, orchestrates itself. This extension registers the phases
 * as tools — `plan`, `review_plan`, `code`, `review_code`, `test` — and the top
 * agent calls them in order, iterating on REDO / test failure.
 *
 * Each phase (except `test`) runs as an ISOLATED `pi` sub-agent with its own system
 * prompt, thinking budget and tool allowlist, sharing the workspace (the cwd). Only
 * the coder sub-agent can write or run commands; the reviewers are read-only; the
 * planner writes TODO.md. `test` runs pytest directly (deterministic, no model).
 *
 * Light prerequisite guards (not a cage): `review_plan` and `code` require a TODO.md
 * to exist, so the agent must plan before it codes. Order is otherwise the prompt's.
 */

import { spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The runner sets MELLUM_FLOW_FEED to a file it tails to the terminal. We append each
// sub-agent step there (pi swallows an extension's stderr in -p mode, so a file is the
// reliable channel). No-op when unset.
const FEED = process.env.MELLUM_FLOW_FEED;
function feed(line: string): void {
	if (!FEED) return;
	try {
		appendFileSync(FEED, line + "\n");
	} catch {
		/* feed is best-effort */
	}
}

const HERE = dirname(fileURLToPath(import.meta.url));
const ext = (name: string) => join(HERE, name);

interface Phase {
	thinking: string;
	tools: string;
	ext: string[];
	prompt: string;
}

// The coder is the only executor (write/edit/bash + the safety guards). Reviewers are
// read-only judges. The planner writes TODO.md only. Budgets: reviewers/planner think
// hard, the coder executes.
export const PHASES: Record<string, Phase> = {
	plan: {
		thinking: "off",
		tools: "read,grep,find,ls",
		ext: [],
		prompt:
			"You are the PLANNER. Read specs/ and the task below (specs/roadmap.md may list several " +
			"phases — plan ONLY the phase(s) the task names). Your REPLY must be the TODO.md content " +
			"itself and nothing else — no preamble, no explanation, no code fences. BEGIN your reply " +
			"with the exact line `## North Star` (two hashes) and a one-sentence goal, then a `- [ ]` " +
			"checklist of every requirement, copying exact strings, keys and status codes verbatim from " +
			"the spec. When the spec lists required Tests or acceptance checks, add an EXPLICIT item to " +
			"write the pytest file(s) under `tests/` (e.g. `tests/test_home.py`) asserting exactly those " +
			"checks — the worker provides the tests; the suite ships none. Keep it the SIMPLEST plan " +
			"that meets the task. Output the checklist only; the harness saves your reply as TODO.md.",
	},
	review_plan: {
		thinking: "high",
		tools: "read,grep,find,ls",
		ext: [],
		prompt:
			"You are the PLAN REVIEWER — you only READ and judge; you cannot change files. Read specs/ " +
			"and TODO.md. Check the plan (a) has a North Star near the top stating the task's goal that " +
			"every step serves (judge SUBSTANCE — do NOT REDO over heading level or formatting), " +
			"(b) is complete for the task's phase(s), and (c) is the simplest that meets them. End with " +
			"exactly `REVIEW: REDO` and a plain list of what to fix, or exactly `REVIEW: PASS`.",
	},
	code: {
		thinking: "low",
		tools: "read,grep,find,ls,write,edit,bash,lookup",
		ext: [ext("mellum-nonblock.ts"), ext("mellum-guards.ts"), ext("mellum-surgical.ts"), ext("mellum-knowledge.ts")],
		prompt:
			"You are the CODER. Read TODO.md and specs/. Implement each unchecked `- [ ]` item in order " +
			"and check it off (`- [x]`) once done. The suite ships NO tests, so when the spec requires " +
			"tests you must WRITE them yourself under `tests/` (e.g. `tests/test_home.py`) with the exact " +
			"assertions; `pytest` finding no tests is a FAILURE to fix by writing them. When you are " +
			"unsure of a library's exact API — a signature, a DEFAULT value, behavior — use the `lookup` " +
			"tool (it searches the installed packages) BEFORE guessing; do the same when a failure looks " +
			"API-shaped (e.g. `TooManyRedirects` -> look up the redirect status default). Run the tests " +
			"with `PYTHONPATH=. uv run --with pytest pytest -q` so `from app import ...` resolves; never " +
			"start a server — use starlette.testclient.TestClient. Make every test pass. Address any " +
			"reviewer feedback below.",
	},
	review_code: {
		thinking: "high",
		tools: "read,grep,find,ls",
		ext: [],
		prompt:
			"You are the CODE REVIEWER — you only READ and judge; you cannot change files. Read specs/ " +
			"and the code. Check (1) CONFORMANCE — every requirement of the task's phase(s) is actually " +
			"implemented, including ones no visible test checks (exact keys, status codes, fields, " +
			"migrations); (2) SIMPLICITY — the simplest code that meets the spec. End with exactly " +
			"`REVIEW: REDO` and a plain list of what is unmet or over-complex, or exactly `REVIEW: PASS`.",
	},
};

const PYTEST = ["uv", "run", "--with", "pytest", "pytest", "-q", "tests"];

/** Pull the final assistant text out of a `--mode json` event stream. */
export function finalText(events: any[]): string {
	let text = "";
	for (const ev of events) {
		if (ev?.type === "message_end" && ev.message?.role === "assistant") {
			for (const block of ev.message.content ?? []) {
				if (block?.type === "text" && block.text) text = block.text;
			}
		}
	}
	return text;
}

/** Spawn an isolated `pi` sub-agent for a phase; resolve with its final text. */
function runSubagent(phase: string, task: string, cwd: string, signal?: AbortSignal): Promise<string> {
	const cfg = PHASES[phase];
	const dir = mkdtempSync(join(tmpdir(), "mellum-flow-"));
	const promptFile = join(dir, `${phase}.md`);
	writeFileSync(promptFile, cfg.prompt);
	const args = [
		"--mode", "json", "-p", "--no-session",
		"--no-extensions", "--no-skills", "--no-prompt-templates", "--no-context-files", "--no-approve",
		"--thinking", cfg.thinking, "--tools", cfg.tools,
	];
	for (const e of cfg.ext) args.push("-e", e); // explicit -e still load under --no-extensions
	args.push("--append-system-prompt", promptFile, `Task: ${task}`);

	feed(`  ━ ${phase} starting (think=${cfg.thinking}) ━`);
	return new Promise((resolve) => {
		const child = spawn("pi", args, { cwd, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
		const events: any[] = [];
		const t0 = Date.now();
		// Heartbeat: a phase working silently should still show it is alive. Independent of pi's
		// event schema — event count climbing = progress, flat = genuinely stuck.
		const beat = setInterval(() => {
			feed(`    [${phase}] …working ${Math.round((Date.now() - t0) / 1000)}s (${events.length} events)`);
		}, 5000);
		let buffer = "";
		const onData = (chunk: Buffer) => {
			buffer += chunk.toString();
			let nl: number;
			while ((nl = buffer.indexOf("\n")) >= 0) {
				const line = buffer.slice(0, nl).trim();
				buffer = buffer.slice(nl + 1);
				if (line) {
					try {
						const evt = JSON.parse(line);
						events.push(evt);
						// Stream the sub-agent's steps to the feed so a working phase is visible,
						// not silent. One line per tool call: `[code] -> write templates/home.html`.
						if (evt?.type === "tool_call") {
							const i = evt.input ?? {};
							const where = i.path ?? i.file_path ?? (i.command ? String(i.command).slice(0, 60) : "");
							feed(`    [${phase}] → ${String(evt.toolName ?? "").padEnd(6)} ${String(where).slice(0, 70)}`);
						}
					} catch {
						/* non-JSON line */
					}
				}
			}
		};
		child.stdout.on("data", onData);
		// CRITICAL: drain stderr too. pi writes progress/logs there; if we leave the stderr
		// pipe unread it fills (~16KB) and the sub-agent blocks forever on write — the tool
		// then never returns and the orchestrator hangs. We only need to consume it.
		child.stderr.on("data", () => {});
		const abort = () => child.kill("SIGKILL");
		signal?.addEventListener("abort", abort, { once: true });
		child.on("close", () => {
			clearInterval(beat);
			signal?.removeEventListener("abort", abort);
			feed(`  ━ ${phase} done (${events.length} events) ━`);
			resolve(finalText(events) || "(the sub-agent produced no text output)");
		});
		child.on("error", (e) => {
			clearInterval(beat);
			resolve(`(failed to start the ${phase} sub-agent: ${e.message})`);
		});
	});
}

/** Run pytest in the workspace with the project root on PYTHONPATH (matches the grader). */
function runTests(cwd: string): Promise<{ ok: boolean; tail: string }> {
	return new Promise((resolve) => {
		const child = spawn(PYTEST[0], PYTEST.slice(1), {
			cwd,
			env: { ...process.env, PYTHONPATH: cwd },
			stdio: ["ignore", "pipe", "pipe"],
		});
		let out = "";
		child.stdout.on("data", (c: Buffer) => (out += c.toString()));
		child.stderr.on("data", (c: Buffer) => (out += c.toString()));
		child.on("close", (code) => {
			const tail = out.split("\n").slice(-25).join("\n");
			resolve({ ok: code === 0, tail });
		});
		child.on("error", (e) => resolve({ ok: false, tail: `could not run pytest: ${e.message}` }));
	});
}

const textResult = (text: string, isError = false) => ({ content: [{ type: "text", text }], isError });

/** Read a file, or "" if it does not exist. Content flows through files, NOT tool arguments —
 * oMLX's tool-call parser drops a tool call whose JSON arguments are a large multi-line string,
 * so the orchestrator calls every tool with NO arguments and the tools read TASK.md / REVIEW.md. */
function readOr(path: string): string {
	try {
		return readFileSync(path, "utf8");
	} catch {
		return "";
	}
}

/** Trim a planner reply to the markdown plan: drop any preamble/code-fences before the first heading. */
export function asTodo(reply: string): string {
	let text = reply.replace(/```[a-z]*\n?/gi, "").trim();
	const lines = text.split("\n");
	const start = lines.findIndex((l) => l.trimStart().startsWith("#"));
	if (start > 0) text = lines.slice(start).join("\n");
	return text.trimEnd() + "\n";
}

export default function (pi: any): void {
	const cwd = () => process.cwd();
	const hasTodo = () => existsSync(join(cwd(), "TODO.md"));
	const needTodo = "No TODO.md yet — call `plan` first, then `review_plan`, before coding.";

	pi.registerTool({
		name: "plan",
		label: "Plan",
		description:
			"Write TODO.md for this phase's task (read from TASK.md): a `## North Star` goal and a " +
			"checklist of every requirement. Takes NO arguments. Call this FIRST, and again to revise " +
			"the plan on REDO (it re-reads the reviewer feedback in REVIEW.md).",
		parameters: { type: "object", properties: {}, additionalProperties: false },
		async execute(_id: string, _params: any, signal: AbortSignal) {
			const task = readOr(join(cwd(), "TASK.md"));
			const fb = readOr(join(cwd(), "REVIEW.md"));
			const prompt = task + (fb ? `\n\n=== REVIEWER FEEDBACK — address every point ===\n${fb}` : "");
			const reply = await runSubagent("plan", prompt, cwd(), signal);
			const todo = asTodo(reply);
			// The harness writes TODO.md from the planner's reply, so a plan is ALWAYS persisted.
			writeFileSync(join(cwd(), "TODO.md"), todo);
			return textResult(`TODO.md written (${todo.split("\n").length} lines).`);
		},
	});

	pi.registerTool({
		name: "review_plan",
		label: "Review plan",
		description: "Judge TODO.md for a clear North Star, completeness and simplicity. Returns REVIEW: PASS or REDO + reasons.",
		parameters: { type: "object", properties: {}, additionalProperties: false },
		async execute(_id: string, _params: any, signal: AbortSignal) {
			if (!hasTodo()) return textResult(needTodo, true);
			const verdict = await runSubagent("review_plan", "Review TODO.md against the spec in TASK.md.", cwd(), signal);
			writeFileSync(join(cwd(), "REVIEW.md"), verdict); // the next plan reads this
			return textResult(verdict.includes("REVIEW: PASS") ? "REVIEW: PASS" : "REVIEW: REDO (feedback saved for the next plan).");
		},
	});

	pi.registerTool({
		name: "code",
		label: "Code",
		description:
			"Implement the plan in TODO.md (the coder writes/edits files and runs tests). Takes NO " +
			"arguments — it reads TODO.md, the spec in TASK.md, and any reviewer/test feedback in " +
			"REVIEW.md. Requires a plan to exist.",
		parameters: { type: "object", properties: {}, additionalProperties: false },
		async execute(_id: string, _params: any, signal: AbortSignal) {
			if (!hasTodo()) return textResult(needTodo, true);
			const fb = readOr(join(cwd(), "REVIEW.md"));
			const extra = fb ? `\n\n=== FEEDBACK TO ADDRESS ===\n${fb}` : "";
			return textResult(await runSubagent("code", `Implement TODO.md (the spec is in TASK.md).${extra}`, cwd(), signal));
		},
	});

	pi.registerTool({
		name: "review_code",
		label: "Review code",
		description: "Judge the code for conformance to the spec and simplicity. Returns REVIEW: PASS or REDO + reasons.",
		parameters: { type: "object", properties: {}, additionalProperties: false },
		async execute(_id: string, _params: any, signal: AbortSignal) {
			const verdict = await runSubagent("review_code", "Review the implementation against the spec in TASK.md.", cwd(), signal);
			writeFileSync(join(cwd(), "REVIEW.md"), verdict); // the next code reads this
			return textResult(verdict.includes("REVIEW: PASS") ? "REVIEW: PASS" : "REVIEW: REDO (feedback saved for the next code).");
		},
	});

	pi.registerTool({
		name: "test",
		label: "Test",
		description: "Run the test suite (pytest) and report pass/fail with the output tail. Call after coding.",
		parameters: { type: "object", properties: {}, additionalProperties: false },
		async execute() {
			const { ok, tail } = await runTests(cwd());
			return textResult(`TESTS: ${ok ? "PASS" : "FAIL"}\n${tail}`, false);
		},
	});
}
