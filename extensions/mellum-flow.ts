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
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
	maxTokens: number;
}

// Our own operating guide, prepended to every role. It REPLACES the structure Pi's base prompt
// used to give (focus, brevity, tool-use, output-only) now that we send --system-prompt instead
// of --append — WITHOUT Pi's "thorough coding agent" framing that made the examiner over-assert,
// and WITHOUT contradicting any role (it governs HOW to operate, never WHAT to produce). The
// "be decisive, do not deliberate at length" line is the direct counter to the planner rambling
// for 600s on a trivial plan once Pi's base prompt was removed.
export const BASE_GUIDE =
	"You are a single-purpose sub-agent in an automated build. Your ONE job is defined under " +
	"YOUR ROLE below; do exactly that and nothing else. Operate with discipline:\n" +
	"- Be decisive and brief. Reach the result and STOP. Do NOT deliberate at length, restate the " +
	"task, think out loud, or add commentary — a long internal monologue wastes the token budget and " +
	"risks truncating your answer before it is written.\n" +
	"- Use the tools you are given to gather exactly what you need, then act. Do not narrate tool use.\n" +
	"- Produce EXACTLY the output your role specifies, in the format it specifies, with nothing around it.\n" +
	"- YOUR ROLE below is authoritative: where it is specific, follow it over this general guidance.\n\n" +
	"=== YOUR ROLE ===\n";

// The coder is the only executor (write/edit/bash + the safety guards). Reviewers are
// read-only judges; the planner turns the spec into a checklist. Budget maps to the ROLE:
// the reasoning roles (plan, review_plan, examine, review_code) think hard; the coder acts
// against an already-decided gate, so it executes rather than deliberates. NOTE: these bite
// only when the model exposes reasoning effort. Mellum/Flint set supportsReasoningEffort:false,
// so --thinking is a no-op for them and reasoning is bounded by max_tokens, not by this budget.
export const PHASES: Record<string, Phase> = {
	plan: {
		thinking: "high",
		tools: "read,grep,find,ls",
		ext: [],
		maxTokens: 8192,
		prompt:
			"You are the PLANNER — step 1 of the pipeline plan → examine → code → test. Turn THIS phase's " +
			"spec (given below, and detailed in specs/) into the implementation checklist the coder will " +
			"follow. specs/roadmap.md may list several phases — plan ONLY the phase(s) the task names. " +
			"Your entire REPLY becomes plan/TODO.md, so output the plan and NOTHING else — no preamble, no " +
			"explanation, no code fences. BEGIN with the exact line `## North Star` (two hashes) and a " +
			"one-sentence goal, then a `- [ ]` checklist of every requirement, copying exact strings, keys, " +
			"routes and status codes verbatim from the spec. Keep it the SIMPLEST plan that meets the phase. " +
			"Do NOT plan to write tests: the EXAMINER writes the acceptance test next, and the coder makes " +
			"it pass — your checklist is the implementation only.",
	},
	review_plan: {
		thinking: "high",
		tools: "read,grep,find,ls",
		ext: [],
		maxTokens: 8192,
		prompt:
			"You are the PLAN REVIEWER — read-only; you judge plan/TODO.md, you do not change files. Read " +
			"plan/TODO.md and specs/. Check the plan (a) opens with a North Star stating the phase's goal " +
			"that every step serves (judge SUBSTANCE — never REDO over heading level or formatting), " +
			"(b) covers every requirement of the phase, and (c) is the simplest that meets it. If it is " +
			"sound, reply EXACTLY `REVIEW: PASS`. Otherwise reply EXACTLY `REVIEW: REDO` then a plain list " +
			"of what to fix — the planner reads your list and revises.",
	},
	examine: {
		thinking: "high",
		tools: "read,grep,find,ls,lookup",
		ext: [ext("mellum-knowledge.ts")],
		maxTokens: 16384,
		prompt:
			"You are the EXAMINER — step 2 of the pipeline (plan → examine → code → test). You write the " +
			"acceptance test — the executable definition of DONE — for THIS phase's spec (given below, and " +
			"detailed in specs/). Your test is FROZEN as the gate the coder must then pass, so you define " +
			"what 'correct' means; you do NOT see or write the implementation. Earlier phases are ALREADY " +
			"frozen in their own gate files and will be re-run; cover only THIS phase here, but do not " +
			"contradict what earlier phases established. Your REPLY is the full contents of a pytest file " +
			"and nothing else (no prose, no code fences). Be EXHAUSTIVE — a weak test that the code passes " +
			"while the real grader fails is " +
			"the one failure mode that matters. Before writing, enumerate EVERY requirement this phase " +
			"states; write at least one assertion for each; do not stop early. Rules, applied to WHATEVER " +
			"the spec actually says:\n" +
			"- Assert exact values ONLY where the spec gives them VERBATIM — a key/field name, status code, " +
			"route/path, or a quoted string the spec states literally. Those you assert character-for-character.\n" +
			"- For a requirement the spec describes WITHOUT a literal value (e.g. 'a responsive viewport', " +
			"'a navbar with links to Home and Complaints', 'a welcoming paragraph'), assert the REQUIREMENT, " +
			"NOT an invented string: that a `<meta name=\"viewport\">` tag exists, that a link whose href is " +
			"the named route is present, that the element is there — NEVER a made-up exact attribute value, " +
			"class list, whitespace or markup the spec did not give. Inventing exact strings the spec never " +
			"stated is the brittleness that fails correct implementations — do not do it.\n" +
			"- Assert each exact BEHAVIOUR the spec states (ordering, redirects, what is included or excluded).\n" +
			"- ABSENCE checks: never assert a bare substring is absent when it is a substring of a word " +
			"the page legitimately shows — `assert \"Resolve\" not in html` is self-contradictory when " +
			"the status \"Resolved\" is present (\"Resolve\" is inside \"Resolved\"). To check an action is " +
			"gone, target the specific control: assert its form `action=\"/...\"` URL is absent, or match " +
			"the exact button, never a prefix of another word on the page.\n" +
			"- Assert the NEGATIVE and EDGE cases the spec implies, not just the happy path: missing or " +
			"invalid input, the empty case, unauthorized/forbidden access, not-found, duplicates, and each " +
			"error case with its exact status and message. A phase is not DONE if only its happy path works.\n" +
			"- For any value DERIVED from data or state (a sum, count, filter, transformation), do not " +
			"hardcode a number: COMPUTE the expected result from the source of truth the spec points to, " +
			"using the EXACT definition the spec gives (watch for traps the spec explicitly calls out), " +
			"and assert the output matches.\n" +
			"- IDENTITY: if the phase acts on a SPECIFIC record (resolve/reopen/update/delete/fetch a " +
			"particular item, or anything addressed by an id), the record must carry a STABLE, EXPLICIT " +
			"identity FIELD on the model itself — never a list position or a route-local id. Assert the " +
			"model exposes that id field, that seeded records have DISTINCT ids, that the mutate route is " +
			"addressed BY that id, and that the id is UNCHANGED across the mutation and does not reorder or " +
			"renumber the collection. A route that 'works' by index passes a weak test and fails the real one.\n" +
			"- For schema/migration/setup requirements, assert the NAMED artifacts exist, apply, and are " +
			"idempotent, using the API the spec names.\n" +
			"- Drive a web app via `from app import app` + `starlette.testclient.TestClient` unless the " +
			"spec says otherwise. If you are unsure of a library's exact API, call the `lookup` tool " +
			"BEFORE writing the assertion.\n" +
			"- REDIRECTS: TestClient follows redirects by default, so a plain `client.post(...)` returns " +
			"the FINAL 200 page, not the 3xx — asserting `status_code == 303` on it fails a CORRECT " +
			"handler. To assert a redirect, pass `follow_redirects=False` to that request, THEN assert the " +
			"status (e.g. 303) and the `Location` header. Only disable it on the redirecting request itself.\n" +
			"Be strict and literal — the test IS the spec made runnable. Output the pytest file only.",
	},
	code: {
		thinking: "low",
		tools: "read,grep,find,ls,write,edit,bash,lookup",
		ext: [ext("mellum-nonblock.ts"), ext("mellum-guards.ts"), ext("mellum-surgical.ts"), ext("mellum-knowledge.ts")],
		maxTokens: 16384,
		prompt:
			"You are the CODER — step 3 of the pipeline (plan → examine → code → test). Read plan/TODO.md " +
			"and specs/. The acceptance tests are ALREADY written for you " +
			"under `tests/` (files named `test_gate_phase_*.py`) — they are the definition of DONE, one " +
			"group per phase. Do NOT edit, delete or weaken ANY of them; your job is to make them ALL pass. " +
			"EARLIER phases' tests must keep passing — build on the existing code, do not break what already " +
			"works. Read the newest `test_gate_phase_*.py` to see exactly what THIS phase requires (exact " +
			"keys, status codes, behaviours), implement each unchecked `- [ ]` item in order, and check it " +
			"off (`- [x]`) once done. Run the tests with `PYTHONPATH=. uv run --with pytest pytest -q tests` " +
			"so `from app import ...` resolves; never start a server — use starlette.testclient.TestClient. " +
			"ALWAYS use the `lookup` tool before writing any unfamiliar or exact-contract API — a library " +
			"signature or default, a database/migration API, exact behaviour — and whenever a failure " +
			"looks API-shaped; do not guess an API you have not confirmed. Make the acceptance test pass. " +
			"Address any reviewer feedback below.",
	},
	review_code: {
		thinking: "high",
		tools: "read,grep,find,ls",
		ext: [],
		maxTokens: 8192,
		prompt:
			"You are the CODE REVIEWER — read-only; you judge, you do not change files. Read specs/, " +
			"plan/TODO.md and the code. Check (1) CONFORMANCE — every requirement of THIS phase is actually " +
			"implemented, including ones the frozen tests may not check (exact keys, status codes, fields, " +
			"stable identity, migrations); (2) SIMPLICITY — the simplest code that meets the spec. If it is " +
			"sound, reply EXACTLY `REVIEW: PASS`. Otherwise reply EXACTLY `REVIEW: REDO` then a plain list " +
			"of what is unmet or over-complex — the coder reads your list and revises, then re-runs the tests.",
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
	// Our operating guide first (focus/brevity), then the authoritative role prompt.
	writeFileSync(promptFile, BASE_GUIDE + cfg.prompt);
	// Per-phase max_tokens: pi has no CLI flag for it, so patch a copy of the inherited agent dir's
	// models.json. The planner/reviewers get a smaller cap than examine/code — but NOT a tight one:
	// the model can't stop thinking, so too low (2048) spends the whole budget thinking and emits an
	// EMPTY output. The cap is a runaway backstop; the BASE_GUIDE is the real brevity lever.
	let env = process.env;
	const baseAgent = process.env.PI_CODING_AGENT_DIR;
	if (baseAgent && existsSync(join(baseAgent, "models.json"))) {
		const agentDir = join(dir, "agent");
		cpSync(baseAgent, agentDir, { recursive: true });
		const mp = join(agentDir, "models.json");
		const data = JSON.parse(readFileSync(mp, "utf8"));
		const prov: any = Object.values(data.providers)[0];
		prov.models[0].maxTokens = cfg.maxTokens;
		writeFileSync(mp, `${JSON.stringify(data, null, 2)}\n`);
		env = { ...process.env, PI_CODING_AGENT_DIR: agentDir };
	}
	const args = [
		"--mode", "json", "-p", "--no-session",
		"--no-extensions", "--no-skills", "--no-prompt-templates", "--no-context-files", "--no-approve",
		"--thinking", cfg.thinking, "--tools", cfg.tools,
	];
	for (const e of cfg.ext) args.push("-e", e); // explicit -e still load under --no-extensions
	// Append our guide + role UNDER Pi's base prompt. We tried REPLACING Pi's base (--system-prompt)
	// to stop it diluting the roles, but without it Mellum's planner thinks without bound and never
	// emits a plan — empty output even at 16384 tokens (every medium run died on an empty TODO). Pi's
	// base scaffolding is what keeps the model producing a final answer, so keep it and append
	// BASE_GUIDE + the role on top; the de-brittle examiner prompt mitigates Pi's "be thorough" nudge.
	args.push("--append-system-prompt", promptFile, `Task: ${task}`);

	feed(`  ━ ${phase} starting (think=${cfg.thinking}) ━`);
	return new Promise((resolve) => {
		const child = spawn("pi", args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
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

/** Extract a Python file from an examiner reply: prefer a ```python block (the examiner sometimes
 * emits an HTML/template block FIRST, which a language-agnostic match would wrongly grab), then any
 * fenced block, then the raw text. */
export function asCode(reply: string): string {
	const py = reply.match(/```python\s*\n([\s\S]*?)```/i);
	const any = reply.match(/```[a-z]*\s*\n([\s\S]*?)```/i);
	const picked = py ? py[1] : any ? any[1] : reply;
	// Safety net: a model can emit a dangling fence (a trailing ``` with no opening, or an opening
	// ```python with no close), which neither regex above pairs, so the raw fence lands in the
	// frozen Python gate and `phase_gate_ok`'s compile() rejects a correct gate — the phase then
	// loops forever. Strip any line that is a lone fence marker; real Python never has one.
	const cleaned = picked.replace(/^[ \t]*```[a-z]*[ \t]*$\n?/gim, "");
	return cleaned.trim() + "\n";
}

/** Is this reply actually a pytest file? It must define a test, and must not be HTML/template
 * leakage (the examiner once emitted a `templates/x.html` Jinja block as the "test"). */
export function looksLikePytest(code: string): boolean {
	if (!/(^|\n)\s*(async\s+)?def\s+test\w*\s*\(|(^|\n)\s*class\s+Test\w*/.test(code)) return false;
	if (/(^|\n)\s*<|\{%|\{\{|(^|\n)\S+\.(html|js|css|txt)\s*(\n|$)/m.test(code)) return false;
	return true;
}

/** The frozen gate holds one acceptance test per phase; the current phase comes from MELLUM_PHASE. */
// Harness bookkeeping lives under plan/ so it never pollutes the solution tree (and a
// write-list check — e.g. the ladder's AgentClinic rule — can keep it out of grading).
export const PLAN_DIR = "plan";
export const GATE_DIR = "plan/gate";

/** Freeze filename for a phase inside the gate dir (phase_1.py, phase_2.py, …). */
export function freezeName(phase: string | number): string {
	const n = String(phase).replace(/[^0-9]/g, "") || "1";
	return `phase_${n}.py`;
}

/** The pytest filename a frozen phase is materialised to under tests/ (distinct per phase → accumulates). */
export function gateTestName(frozenStem: string): string {
	return `test_gate_${frozenStem}.py`;
}

/** Copy EVERY frozen phase into tests/ as a distinct pytest file, clearing stale ones first.
 * This is what makes the gate cumulative and tamper-proof: whatever the coder did to tests/,
 * the restored set is the union of every phase's frozen acceptance test. */
export function materializeGate(cwd: string): number {
	const gate = join(cwd, GATE_DIR);
	if (!existsSync(gate)) return 0;
	const tests = join(cwd, "tests");
	mkdirSync(tests, { recursive: true });
	for (const f of readdirSync(tests)) {
		if (/^test_gate_phase_.*\.py$/.test(f)) rmSync(join(tests, f));
	}
	const frozen = readdirSync(gate).filter((f) => /^phase_\d+\.py$/.test(f)).sort();
	for (const f of frozen) {
		writeFileSync(join(tests, gateTestName(f.replace(/\.py$/, ""))), readFileSync(join(gate, f), "utf8"));
	}
	return frozen.length;
}

/** Per-phase tool-call cap: a clean phase is ~6-10 calls (plan, review, examine, code, review, test,
 * plus a REDO or two). Past this the orchestrator is thrashing — a rung-6 flow run re-ran examine 5×
 * and review_code 3× and never called test, burning the whole deadline on a solution it already had. */
export const PHASE_CALL_CAP = 16;

/** The block decision for a phase tool call, given the running budget and whether this phase's gate
 * is already frozen. `test` and `read` are always allowed (test is the only exit). examine runs ONCE
 * per phase — the gate is its product, re-deriving it is pure waste. Returns a reason to block, or
 * undefined to allow. Pure, so it is unit-tested; the live hook supplies the counts and gate state. */
export function flowBlock(toolName: string, calls: number, gateExists: boolean, cap = PHASE_CALL_CAP): string | undefined {
	if (toolName === "test" || toolName === "read") return undefined;
	if (toolName === "examine" && gateExists)
		return "The acceptance test for this phase is already written and frozen. Do NOT examine again — call code() then test().";
	if (calls >= cap)
		return "Phase tool-call budget reached — you have planned, examined and coded enough. Call test() to check and finish; do not plan/examine/code/review_code again.";
	return undefined;
}

export default function (pi: any): void {
	const cwd = () => process.cwd();
	// TASK.md / TODO.md / REVIEW.md live under plan/, created on demand.
	const planPath = (name: string) => join(cwd(), PLAN_DIR, name);
	const ensurePlan = () => mkdirSync(join(cwd(), PLAN_DIR), { recursive: true });
	const hasTodo = () => existsSync(planPath("TODO.md"));
	const needTodo = "No TODO.md yet — call `plan` first, then `review_plan`, before coding.";

	// Cap the phase so the orchestrator can't loop to the deadline, and make examine run once:
	// re-deriving a frozen gate is the single biggest waste in a thrashing phase.
	let calls = 0;
	pi.on("tool_call", (event: { toolName?: string }) => {
		const name = event?.toolName ?? "";
		const gateExists = name === "examine"
			&& existsSync(join(cwd(), GATE_DIR, freezeName(process.env.MELLUM_PHASE ?? "1")));
		const reason = flowBlock(name, calls, gateExists);
		if (reason) return { block: true, reason };
		if (name !== "test" && name !== "read") calls += 1;
		return undefined;
	});

	pi.registerTool({
		name: "plan",
		label: "Plan",
		description:
			"Write TODO.md for this phase's task (read from TASK.md): a `## North Star` goal and a " +
			"checklist of every requirement. Takes NO arguments. Call this FIRST, and again to revise " +
			"the plan on REDO (it re-reads the reviewer feedback in REVIEW.md).",
		parameters: { type: "object", properties: {}, additionalProperties: false },
		async execute(_id: string, _params: any, signal: AbortSignal) {
			const task = readOr(planPath("TASK.md"));
			const fb = readOr(planPath("REVIEW.md"));
			const prompt = task + (fb ? `\n\n=== REVIEWER FEEDBACK — address every point ===\n${fb}` : "");
			const reply = await runSubagent("plan", prompt, cwd(), signal);
			const todo = asTodo(reply);
			// The harness writes TODO.md from the planner's reply, so a plan is ALWAYS persisted.
			ensurePlan();
			writeFileSync(planPath("TODO.md"), todo);
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
			const verdict = await runSubagent("review_plan", "Review plan/TODO.md against the spec in plan/TASK.md (and specs/).", cwd(), signal);
			ensurePlan();
			writeFileSync(planPath("REVIEW.md"), verdict); // the next plan reads this
			// Fail OPEN: loop back to plan only on an explicit REVIEW: REDO. A thinking-model reviewer
			// that rambles or truncates before emitting "REVIEW: PASS" must not trap the pipeline in an
			// infinite plan↔review loop (it never reaches examine). The examiner's test + hidden grader
			// are the real gates; this review is advisory.
			return textResult(verdict.includes("REVIEW: REDO") ? "REVIEW: REDO (feedback saved for the next plan)." : "REVIEW: PASS");
		},
	});

	pi.registerTool({
		name: "examine",
		label: "Examine",
		description:
			"Write the acceptance test — the executable definition of DONE — from the spec in TASK.md. " +
			"Takes NO arguments. Call this AFTER review_plan and BEFORE code; the coder then builds to " +
			"pass it, and it joins the cumulative gate that test() runs (every earlier phase too).",
		parameters: { type: "object", properties: {}, additionalProperties: false },
		async execute(_id: string, _params: any, signal: AbortSignal) {
			const task = readOr(planPath("TASK.md"));
			let code = asCode(await runSubagent("examine", task, cwd(), signal));
			if (!looksLikePytest(code)) {
				// One corrective retry — a dropped or mis-formatted reply must not freeze a junk gate,
				// which would let the phase "pass" with no real test (and best-of-N would promote it).
				const fix = "\n\nYour previous reply was NOT a valid pytest file. Output ONLY the contents of a " +
					"Python pytest file — `def test_...` functions with assertions. No prose, no code fences, no HTML, no templates.";
				code = asCode(await runSubagent("examine", task + fix, cwd(), signal));
			}
			if (!looksLikePytest(code)) {
				return textResult("examine did not produce a valid pytest file — this phase has NO gate yet. Call examine again before code.", true);
			}
			// Freeze THIS phase under its own name so the gate ACCUMULATES: a later phase can never
			// pass by regressing an earlier one, and the coder cannot weaken a gate it is told not to touch.
			const gate = join(cwd(), GATE_DIR);
			mkdirSync(gate, { recursive: true });
			writeFileSync(join(gate, freezeName(process.env.MELLUM_PHASE ?? "1")), code);
			const n = materializeGate(cwd()); // put this phase + every earlier phase into tests/ for the coder
			return textResult(`Acceptance test written (${code.split("\n").length} lines); gate now covers ${n} phase(s). The coder must pass them ALL.`);
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
			const fb = readOr(planPath("REVIEW.md"));
			const extra = fb ? `\n\n=== FEEDBACK TO ADDRESS ===\n${fb}` : "";
			return textResult(await runSubagent("code", `Implement plan/TODO.md (the spec is in plan/TASK.md).${extra}`, cwd(), signal));
		},
	});

	pi.registerTool({
		name: "review_code",
		label: "Review code",
		description: "Judge the code for conformance to the spec and simplicity. Returns REVIEW: PASS or REDO + reasons.",
		parameters: { type: "object", properties: {}, additionalProperties: false },
		async execute(_id: string, _params: any, signal: AbortSignal) {
			const verdict = await runSubagent("review_code", "Review the implementation against the spec in plan/TASK.md (and specs/).", cwd(), signal);
			ensurePlan();
			writeFileSync(planPath("REVIEW.md"), verdict); // the next code reads this
			// Fail OPEN (see review_plan): REDO only on an explicit REVIEW: REDO, so a lost/truncated
			// verdict can't trap the coder in an endless review loop. test() is the real code gate.
			return textResult(verdict.includes("REVIEW: REDO") ? "REVIEW: REDO (feedback saved for the next code)." : "REVIEW: PASS");
		},
	});

	pi.registerTool({
		name: "test",
		label: "Test",
		description: "Run the test suite (pytest) and report pass/fail with the output tail. Call after coding.",
		parameters: { type: "object", properties: {}, additionalProperties: false },
		async execute() {
			// Restore the WHOLE cumulative gate (every phase) so the coder cannot have weakened or
			// dropped any gate, and a regression in an earlier phase shows up here.
			materializeGate(cwd());
			const { ok, tail } = await runTests(cwd());
			return textResult(`TESTS: ${ok ? "PASS" : "FAIL"}\n${tail}`, false);
		},
	});
}
