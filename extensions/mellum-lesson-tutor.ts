/**
 * mellum-lesson-tutor: /lesson, the course inside Pi.
 *
 *   /lesson          pick a lesson (finished ones are ticked; the next one is first)
 *   /lesson E5       open lesson E5
 *
 * One screen per step: the cover (picture, opening, questions, objectives), Paul's six steps, and
 * the key points. On the Eval case step `r` runs the page's before line and on the Solution step
 * its after line, one session each (`R` runs the page's own n), and the result is summarised from
 * each session's run.json. → / Enter next, ← back, n next lesson (on the last step), Esc leave.
 * The lesson page is the only source (see mellum-lessons.ts). No model is involved.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getMarkdownTheme } from "@earendil-works/pi-coding-agent";
import { Image, Key, Markdown, matchesKey, truncateToWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";
import { cleanProjects, lessonIndex, type Lesson, type LessonEntry, parseLesson, prepareProject, runArgv, sessionProfile, STEPS, summariseRuns, terminalPicture, unwrap } from "./mellum-lessons.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The repository root: the nearest folder above the session's cwd (or this file) with lessons. */
function findRoot(cwd: string): string | undefined {
	for (const start of [cwd, HERE]) {
		let dir = start;
		for (let i = 0; i < 8; i++) {
			if (existsSync(join(dir, "learn", "lessons", "easy"))) return dir;
			const up = dirname(dir);
			if (up === dir) break;
			dir = up;
		}
	}
	return undefined;
}

const agentDir = () => process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent");
const progressFile = () => join(agentDir(), "mellum-lessons.json");

function loadDone(): Set<string> {
	try {
		return new Set(JSON.parse(readFileSync(progressFile(), "utf8")).done ?? []);
	} catch {
		return new Set();
	}
}

function markDone(number: string): void {
	const done = loadDone();
	done.add(number);
	try {
		mkdirSync(dirname(progressFile()), { recursive: true });
		writeFileSync(progressFile(), JSON.stringify({ done: [...done] }, null, 2) + "\n");
	} catch {
		// Progress is a convenience; never fail a lesson over it.
	}
}

interface RunState {
	label: string;
	started: number;
	child?: ChildProcess;
	lines: string[];
	verdict?: string;
}

/** Strip the badge lines and the remedy/check lines the step screens show in their own way. */
const tidy = (md: string) => unwrap(md.replace(/^\*\*Badge:\*\*.*$/gm, "").replace(/\n{3,}/g, "\n\n").trim());

/** Walk one lesson. Resolves "next" to go on to the next lesson, or "leave". */
function walk(ctx: any, root: string, lesson: Lesson, entry: LessonEntry, total: { index: number; count: number }): Promise<"next" | "leave"> {
	return ctx.ui.custom((tui: any, theme: any, _kb: unknown, done: (r: "next" | "leave") => void) => {
		const pages = ["Cover", ...STEPS, "Key points"];
		let page = 0;
		let cached: string[] | undefined;
		const runs: Record<string, RunState> = {};
		let prepared: string | undefined;
		const md = (text: string) => new Markdown(text, 1, 0, getMarkdownTheme());
		const list = (items: string[]) => items.map((i) => `- ${i}`).join("\n");
		const pngPath = terminalPicture(root, lesson.image);
		const picture = existsSync(pngPath)
			? new Image(readFileSync(pngPath).toString("base64"), "image/png", { fallbackColor: (s: string) => theme.fg("muted", s) },
				{ maxWidthCells: 64, maxHeightCells: 14, filename: lesson.alt })
			: undefined;
		const timer = setInterval(() => {
			if (Object.values(runs).some((r) => r.child)) refresh();
		}, 1000);

		function refresh() {
			cached = undefined;
			tui.requestRender();
		}

		function leave(result: "next" | "leave") {
			clearInterval(timer);
			for (const r of Object.values(runs)) r.child?.kill();
			if (page === pages.length - 1) markDone(lesson.number);
			done(result);
		}

		function startRun(key: "before" | "after", full: boolean) {
			const command = key === "before" ? lesson.before : lesson.after;
			if (!command || runs[key]?.child) return;
			const runsDir = mkdtempSync(join(tmpdir(), `lesson-${lesson.number}-${key}-`));
			const isHarness = command.includes("harness.py");
			const profile = isHarness ? sessionProfile(agentDir(), ctx.model, mkdtempSync(join(tmpdir(), `lesson-${lesson.number}-profile-`))) : undefined;
			const argv = isHarness ? runArgv(command, runsDir, full, profile) : command.split(/\s+/);
			const state: RunState = { label: full ? "full run" : "one session", started: Date.now(), lines: [] };
			runs[key] = state;
			const child = spawn(argv[0], argv.slice(1), { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
			state.child = child;
			running.add(child);
			let tail = "";
			const keep = (b: Buffer) => { tail = (tail + b.toString()).slice(-2000); };
			child.stdout?.on("data", keep);
			child.stderr?.on("data", keep);
			child.on("close", (code) => {
				running.delete(child);
				state.child = undefined;
				if (isHarness) {
					const s = summariseRuns(runsDir);
					state.verdict = s.verdict === "NONE" ? "NO RESULT" : `${s.verdict}  (${s.passed} of ${s.total} passed)`;
					state.lines = s.total ? s.lines : tail.trim().split("\n").slice(-4);
				} else {
					state.verdict = code === 0 ? "PASS" : `FAIL (exit ${code})`;
					state.lines = tail.trim().split("\n").slice(-4);
				}
				refresh();
			});
			refresh();
		}

		function projectBlock(width: number): string[] {
			const rel = `project/${lesson.number}`;
			if (!prepared) return ["", theme.fg("muted", ` p  set up ${rel} to try it by hand in Pi`)];
			return ["", theme.fg("success", ` Ready: ${rel}`), ...wrapTextWithAnsi(theme.fg("muted",
				` In a second terminal: cd ${rel} && pi  (the first time: /trust, then restart). Ask it to do the task in TASK.md; switch remedies with /remedy. /lesson clean removes every project folder.`), width)];
		}

		function runBlock(key: "before" | "after", width: number): string[] {
			const command = key === "before" ? lesson.before : lesson.after;
			if (!command) return [];
			const out = ["", theme.fg("accent", key === "before" ? " Before" : " After"), ...wrapTextWithAnsi(theme.fg("dim", ` ${command}`), width)];
			const r = runs[key];
			if (!r) out.push(theme.fg("muted", ` r  run one session   R  run the page's n${ctx.model ? `   on ${ctx.model.provider}/${ctx.model.id}` : ""}`));
			else if (r.child) out.push(theme.fg("warning", ` running (${r.label}) … ${Math.round((Date.now() - r.started) / 1000)} s`));
			else {
				const good = r.verdict?.startsWith("PASS");
				out.push((good ? theme.fg("success", ` ${r.verdict}`) : theme.fg("error", ` ${r.verdict}`)));
				for (const l of r.lines) out.push(...wrapTextWithAnsi(`   ${l}`, width));
				if (r.label === "one session") out.push(theme.fg("dim", "   one session is a demonstration, not the lesson check"));
			}
			return out;
		}

		function render(width: number): string[] {
			if (cached) return cached;
			const w = Math.max(20, width);
			const name = pages[page];
			const lines: string[] = [];
			const head = ` ${lesson.number} · ${lesson.title}   lesson ${total.index + 1} of ${total.count}   step ${page + 1} of ${pages.length}: ${name}`;
			lines.push(theme.fg("accent", truncateToWidth(head, w)), theme.fg("dim", "─".repeat(w)));
			if (name === "Cover") {
				if (picture) lines.push(...picture.render(w));
				lines.push("", ...md(`**${lesson.opening}**`).render(w), "");
				lines.push(theme.fg("accent", " Questions"), ...md(list(lesson.questions)).render(w));
				lines.push(theme.fg("accent", " Objectives"), ...md(list(lesson.objectives)).render(w));
			} else if (name === "Key points") {
				lines.push(...md(list(lesson.keyPoints)).render(w));
				lines.push("", theme.fg("muted", total.index + 1 < total.count ? " n  next lesson   Esc  leave" : " That was the last lesson. The Challenge is next: see learn/challenge/index.md"));
			} else {
				lines.push(...md(tidy(lesson.steps[name] ?? "")).render(w));
				if (name === "Eval case") lines.push(...runBlock("before", w), ...projectBlock(w));
				if (name === "Solution") {
					lines.push(...runBlock("after", w));
					const unit = lesson.unit.match(/`([a-z]+\/[a-z-]+)`/)?.[1];
					if (unit) lines.push("", theme.fg("muted", ` By hand: /remedy on ${unit}`));
					lines.push(...projectBlock(w));
				}
			}
			lines.push("", theme.fg("dim", " ← back   → / Enter next   Esc leave"));
			cached = lines.map((l) => truncateToWidth(l, w));
			return cached;
		}

		function handleInput(data: string) {
			const name = pages[page];
			if (matchesKey(data, Key.escape)) return leave("leave");
			if (matchesKey(data, Key.right) || matchesKey(data, Key.enter)) {
				if (page < pages.length - 1) page += 1;
				return refresh();
			}
			if (matchesKey(data, Key.left)) {
				if (page > 0) page -= 1;
				return refresh();
			}
			if ((data === "r" || data === "R") && (name === "Eval case" || name === "Solution"))
				return startRun(name === "Eval case" ? "before" : "after", data === "R");
			if (data === "n" && name === "Key points" && total.index + 1 < total.count) return leave("next");
			if (data === "p" && (name === "Eval case" || name === "Solution")) {
				prepared = prepareProject(root, lesson);
				return refresh();
			}
		}

		return { render, invalidate: () => { cached = undefined; }, handleInput };
	});
}

/** Runs still going when the session ends are stopped with it. */
const running = new Set<ChildProcess>();

export default function (pi: any): void {
	pi.on("session_shutdown", () => {
		for (const child of running) child.kill();
		running.clear();
	});
	pi.registerCommand("lesson", {
		description: "Take a lesson: /lesson to pick one, /lesson E5 to open it",
		getArgumentCompletions: (prefix: string) => {
			const root = findRoot(process.cwd());
			if (!root) return null;
			const items = lessonIndex(root).filter((l) => l.number.toLowerCase().startsWith(prefix.toLowerCase()))
				.map((l) => ({ value: l.number, label: `${l.number} · ${l.title}` }));
			return items.length ? items : null;
		},
		handler: async (args: string, ctx: any) => {
			try {
				await openLesson(args, ctx);
			} catch (error) {
				ctx.ui.notify(`/lesson failed: ${(error as Error)?.stack ?? error}`, "error");
			}
		},
	});
}

async function openLesson(args: string, ctx: any): Promise<void> {
			const root = findRoot(ctx.cwd ?? process.cwd());
			if (!root) return ctx.ui.notify("/lesson runs in a checkout of mellum-worker (no learn/lessons here)", "error");
			if (ctx.mode && ctx.mode !== "tui") return ctx.ui.notify("/lesson needs Pi's interactive terminal", "error");
			if (args.trim() === "clean") {
				if (await ctx.ui.confirm("Remove project/ and every lesson's work in it?", "This deletes the folder; the repository is untouched.")) {
					cleanProjects(root);
					ctx.ui.notify("removed project/", "info");
				}
				return;
			}
			const track = lessonIndex(root);
			const done = loadDone();
			let index = track.findIndex((l) => l.number.toLowerCase() === args.trim().toLowerCase());
			if (index < 0) {
				const next = track.findIndex((l) => !done.has(l.number));
				const order = next > 0 ? [...track.slice(next), ...track.slice(0, next)] : track;
				const options = order.map((l) => `${done.has(l.number) ? "✓" : " "} ${l.number} · ${l.title}`);
				const picked = await ctx.ui.select("Lessons (the next one is first)", options);
				if (!picked) return;
				index = track.findIndex((l) => picked.includes(` ${l.number} · `));
				if (index < 0) return;
			}
			while (index < track.length) {
				const entry = track[index];
				const lesson = parseLesson(readFileSync(entry.file, "utf8"));
				const result = await walk(ctx, root, lesson, entry, { index, count: track.length });
				if (result !== "next") break;
				index += 1;
			}
}
