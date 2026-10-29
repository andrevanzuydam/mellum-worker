/**
 * mellum-lessons: the lesson track as data, for the /lesson tutor (mellum-lesson-tutor.ts).
 *
 * The lesson page is the only source: front matter, opening, picture, Overview, Paul's six
 * steps, the Run it yourself commands and the key points are parsed from
 * learn/lessons/<tier>/<slug>.md, so the site and the tutor cannot disagree. Pure: no Pi
 * imports, so node can test it.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const STEPS = ["Problem", "Eval case", "Evidence of the problem", "Solution", "Validation", "Interpretation"] as const;
const TIERS = ["easy", "medium", "hard"];

export interface LessonEntry {
	number: string;
	title: string;
	tier: string;
	slug: string;
	file: string;
}

export interface Lesson {
	number: string;
	title: string;
	opening: string;
	image: string;
	alt: string;
	questions: string[];
	objectives: string[];
	steps: Record<string, string>;
	commands: string[];
	before?: string;
	after?: string;
	unit: string;
	keyPoints: string[];
}

const frontMatter = (text: string): Record<string, string> => {
	const block = text.match(/^---\n([\s\S]*?)\n---/);
	return Object.fromEntries((block?.[1] ?? "").split("\n").map((l) => l.match(/^(\w+): (.*)$/)).filter(Boolean).map((m) => [m![1], m![2]]));
};

/** Every lesson, in track order: Easy, Medium, Hard, each by number. */
export function lessonIndex(root: string): LessonEntry[] {
	const entries: LessonEntry[] = [];
	for (const tier of TIERS) {
		const dir = join(root, "learn", "lessons", tier);
		for (const name of readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "index.md")) {
			const file = join(dir, name);
			const fm = frontMatter(readFileSync(file, "utf8"));
			entries.push({ number: fm.number, title: fm.title, tier, slug: name.replace(/\.md$/, ""), file });
		}
	}
	const rank = (n: string) => TIERS.indexOf(TIERS.find((t) => t[0].toUpperCase() === n[0])!) * 100 + Number(n.slice(1));
	return entries.sort((a, b) => rank(a.number) - rank(b.number));
}

const bullets = (block: string): string[] => [...block.matchAll(/^ {4}- (.+)$/gm)].map((m) => m[1]);

/** The commands in the Run it yourself block, continuation lines joined. */
function commandsIn(section: string): string[] {
	const run = section.split("### Run it yourself")[1] ?? "";
	const out: string[] = [];
	for (const block of run.matchAll(/```bash\n([\s\S]*?)```/g)) {
		const joined = block[1].replace(/\\\n\s*/g, " ");
		out.push(...joined.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")));
	}
	return out;
}

export function parseLesson(text: string): Lesson {
	const fm = frontMatter(text);
	const body = text.replace(/^---\n[\s\S]*?\n---\n/, "");
	const h1 = body.match(/^# (\S+) · (.+)$/m);
	const afterH1 = body.slice((h1?.index ?? 0) + (h1?.[0].length ?? 0)).trimStart();
	const opening = afterH1.split(/\n\s*\n/)[0].replace(/\n/g, " ").trim();
	const image = body.match(/^!\[([^\]]+)\]\(([^)]+)\)\{ \.illustration \}$/m);
	const head = body.split(/^## /m)[0];
	const questions = bullets(head.split("**Questions**")[1]?.split("**Objectives**")[0] ?? "");
	const objectives = bullets(head.split("**Objectives**")[1] ?? "");
	const steps: Record<string, string> = {};
	const parts = body.split(/^## (.+)$/m);
	for (let i = 1; i < parts.length; i += 2) steps[parts[i].trim()] = parts[i + 1] ?? "";
	const commands = commandsIn(steps.Interpretation ?? "");
	if (steps.Interpretation) steps.Interpretation = steps.Interpretation.split("### Run it yourself")[0];
	const keyPoints = bullets(body.split('!!! success "Key points"')[1] ?? "");
	const unit = body.match(/^\*\*Remedy unit:\*\* (.+)$/m)?.[1] ?? "";
	const harness = commands.filter((c) => c.includes("harness.py") || c.includes("flow_run.py"));
	return {
		number: fm.number ?? h1?.[1] ?? "",
		title: fm.title ?? h1?.[2] ?? "",
		opening,
		image: image?.[2] ?? "",
		alt: image?.[1] ?? "",
		questions,
		objectives,
		steps,
		commands,
		before: harness[0],
		after: harness.length > 1 ? harness[1] : undefined,
		unit,
		keyPoints,
	};
}

export interface RunSummary {
	verdict: "PASS" | "FAIL" | "NONE";
	passed: number;
	total: number;
	lines: string[];
}

/** PASS or FAIL for a runs folder, and one line per session saying why. */
export function summariseRuns(dir: string): RunSummary {
	let names: string[] = [];
	try {
		names = readdirSync(dir).sort();
	} catch {
		return { verdict: "NONE", passed: 0, total: 0, lines: [] };
	}
	const lines: string[] = [];
	let passed = 0;
	let total = 0;
	for (const name of names) {
		let r: any;
		try {
			r = JSON.parse(readFileSync(join(dir, name, "run.json"), "utf8"));
		} catch {
			continue;
		}
		total += 1;
		const wall = `${Math.round(r.wall ?? 0)} s`;
		if (r.passed) {
			passed += 1;
			lines.push(`PASS  ${wall}`);
			continue;
		}
		const missed = (r.missing_checks ?? []).length;
		const why = r.output_tokens === 0
			? "no model answered (0 output tokens): is the model server running?"
			: r.stalled
			? `stalled on \`${r.stalled.command}\`${r.checks_ran ? "" : "; the checks never ran"}`
			: !r.checks_ran
				? "the checks never ran (a module they import is missing)"
				: missed
					? `${missed} hidden check${missed === 1 ? "" : "s"} missed`
					: "the tests passed but lint or type checks failed";
		lines.push(`FAIL  ${wall}  ${why}`);
	}
	return { verdict: total === 0 ? "NONE" : passed === total ? "PASS" : "FAIL", passed, total, lines };
}

/** The argv for a page command: one session unless `full`, into `runsDir`. */
export function runArgv(command: string, runsDir: string, full: boolean): string[] {
	const argv = command.trim().split(/\s+/);
	const i = argv.indexOf("--repeat");
	if (!full) {
		if (i >= 0) argv[i + 1] = "1";
		else argv.push("--repeat", "1");
	}
	return [...argv, "--runs-dir", runsDir];
}

/** The PNG copy of a lesson picture that the terminal draws (scripts/terminal-pictures.py). */
export function terminalPicture(root: string, image: string): string {
	const name = image.split("/").pop()!.replace(/\.webp$/, ".png");
	return join(root, "learn", "assets", "illustrations", "terminal", name);
}

/** Join the soft line breaks of Markdown wrapped at 80 columns, so the terminal can rewrap it to
 * its own width. Code blocks, tables and list starts are kept; a list item's continuation joins
 * its item. */
export function unwrap(md: string): string {
	const out: string[] = [];
	let fenced = false;
	for (const line of md.split("\n")) {
		if (/^\s*```/.test(line)) {
			fenced = !fenced;
			out.push(line);
			continue;
		}
		const prev = out.at(-1);
		const starts = /^\s*([-*] |\d+\. |\||#|>|!!!|\?\?\?)/.test(line) || line.trim() === "";
		const joinable = !fenced && prev !== undefined && prev.trim() !== "" && !/^\s*(```|\|)/.test(prev) && !starts;
		if (joinable) out[out.length - 1] = `${prev} ${line.trim()}`;
		else out.push(line);
	}
	return out.join("\n");
}
