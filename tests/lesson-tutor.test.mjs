import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tutor = () => import("../extensions/mellum-lessons.ts");
const ROOT = new URL("..", import.meta.url).pathname;

test("the track lists Start Here, then every lesson in order: Easy, Medium, Hard, by number", async () => {
	const { lessonIndex } = await tutor();
	const ids = lessonIndex(ROOT).map((l) => l.number);
	assert.equal(ids.length, 26);
	assert.deepEqual(ids.slice(0, 4), ["S0", "E1", "E2", "E3"]);
	assert.equal(ids[8], "M1");
	assert.equal(ids.at(-1), "H8");
});

test("every lesson page parses into what the walk-through shows", async () => {
	const { lessonIndex, parseLesson } = await tutor();
	for (const entry of lessonIndex(ROOT)) {
		const l = parseLesson(readFileSync(entry.file, "utf8"));
		assert.equal(l.number, entry.number);
		assert.ok(l.title && l.opening, `${l.number}: title/opening`);
		assert.match(l.image, /^(\.\.\/)+assets\/illustrations\/[a-z0-9-]+\.webp$/, `${l.number}: image`);
		assert.ok(l.alt.length >= 20, `${l.number}: alt`);
		assert.ok(l.questions.length && l.objectives.length, `${l.number}: overview`);
		for (const step of ["Problem", "Eval case", "Evidence of the problem", "Solution", "Validation", "Interpretation"])
			assert.ok(l.steps[step]?.trim(), `${l.number}: ${step}`);
		assert.ok(l.keyPoints.length >= 1, `${l.number}: key points`);
		assert.ok(l.commands.length >= 1, `${l.number}: commands`);
	}
});

test("a lesson with a before and an after line exposes both", async () => {
	const { parseLesson } = await tutor();
	const l = parseLesson(readFileSync(join(ROOT, "learn/lessons/easy/running-commands.md"), "utf8"));
	assert.match(l.before, /--remedy guard\/break-repeat-loops,guard\/stay-in-workspace,guard\/refuse-whole-file-rewrite --repeat 3/);
	assert.match(l.after, /,guard\/block-foreground-server --repeat 3/);
	assert.match(l.unit, /guard\/block-foreground-server/);
});

test("a run is summarised from its run.json files: passes, and why each failure failed", async () => {
	const { summariseRuns } = await tutor();
	const dir = mkdtempSync(join(tmpdir(), "runs-"));
	const write = (name, record) => { mkdirSync(join(dir, name)); writeFileSync(join(dir, name, "run.json"), JSON.stringify(record)); };
	write("a", { passed: true, checks_ran: true, stalled: null, missing_checks: [], wall: 120 });
	write("b", { passed: false, checks_ran: false, stalled: { command: "uv run python app.py" }, missing_checks: ["x", "y"], wall: 130 });
	write("c", { passed: false, checks_ran: true, stalled: null, missing_checks: ["x"], wall: 300 });
	const s = summariseRuns(dir);
	assert.equal(s.verdict, "FAIL");
	assert.equal(s.passed, 1);
	assert.equal(s.total, 3);
	assert.deepEqual(s.lines, [
		"PASS  120 s",
		"FAIL  130 s  stalled on `uv run python app.py`; the checks never ran",
		"FAIL  300 s  1 hidden check missed",
	]);
	const all = mkdtempSync(join(tmpdir(), "runs-"));
	mkdirSync(join(all, "a")); writeFileSync(join(all, "a", "run.json"), JSON.stringify({ passed: true, checks_ran: true, missing_checks: [], wall: 90 }));
	assert.equal(summariseRuns(all).verdict, "PASS");
});

test("a quick run is one session; the full run keeps the page's n", async () => {
	const { runArgv } = await tutor();
	const cmd = "uv run python learn/code/harness.py run --suite easy --arm bare --remedy guard/break-repeat-loops --repeat 3 --grade";
	const quick = runArgv(cmd, "/tmp/r", false);
	assert.equal(quick[quick.indexOf("--repeat") + 1], "1");
	assert.equal(quick[quick.indexOf("--runs-dir") + 1], "/tmp/r");
	const full = runArgv(cmd, "/tmp/r", true);
	assert.equal(full[full.indexOf("--repeat") + 1], "3");
});

test("every lesson picture has a PNG copy for the terminal (Kitty draws PNG only)", async () => {
	const { lessonIndex, parseLesson, terminalPicture } = await tutor();
	const { existsSync } = await import("node:fs");
	for (const entry of lessonIndex(ROOT)) {
		const png = terminalPicture(ROOT, parseLesson(readFileSync(entry.file, "utf8")).image);
		assert.ok(png.endsWith(".png") && existsSync(png), `${entry.number}: ${png}`);
	}
});

test("soft line breaks are joined for the terminal; code, lists and tables are kept", async () => {
	const { unwrap } = await tutor();
	const md = "One line\nwraps here.\n\n- a list\n- item\n\n```ts\nconst a = 1;\nconst b = 2;\n```\n\n| a | b |\n| --- | --- |\n| 1 | 2 |";
	assert.equal(unwrap(md), "One line wraps here.\n\n- a list\n- item\n\n```ts\nconst a = 1;\nconst b = 2;\n```\n\n| a | b |\n| --- | --- |\n| 1 | 2 |");
	assert.equal(unwrap("- a long item\n  that wraps\n- next"), "- a long item that wraps\n- next");
});

test("a session in which no model answered says so, instead of blaming the checks", async () => {
	const { summariseRuns } = await tutor();
	const dir = mkdtempSync(join(tmpdir(), "runs-"));
	mkdirSync(join(dir, "a"));
	writeFileSync(join(dir, "a", "run.json"), JSON.stringify({ passed: false, checks_ran: false, missing_checks: ["x"], wall: 14, requests: 0, output_tokens: 0 }));
	assert.match(summariseRuns(dir).lines[0], /no model answered/);
});

test("failed hidden tests are named as such, even when no check IDs are listed", async () => {
	const { summariseRuns } = await tutor();
	const dir = mkdtempSync(join(tmpdir(), "runs-"));
	mkdirSync(join(dir, "a"));
	writeFileSync(join(dir, "a", "run.json"), JSON.stringify({ passed: false, tests_passed: false, quality_ok: true, checks_ran: true, missing_checks: [], wall: 1 }));
	assert.match(summariseRuns(dir).lines[0], /the hidden tests failed/);
	mkdirSync(join(dir, "b"));
	writeFileSync(join(dir, "b", "run.json"), JSON.stringify({ passed: false, tests_passed: true, quality_ok: false, checks_ran: true, missing_checks: [], wall: 1 }));
	assert.match(summariseRuns(dir).lines[1], /lint or type checks failed/);
});

test("Start Here runs in seconds with no model: its before fails and its after passes", async () => {
	const { parseLesson } = await tutor();
	const l = parseLesson(readFileSync(join(ROOT, "learn/lessons/start-here.md"), "utf8"));
	assert.match(l.before, /--pi-binary learn\/code\/tests\/fixtures\/fake-pi-wrong\.sh/);
	assert.match(l.after, /--pi-binary learn\/code\/tests\/fixtures\/fake-pi\.sh/);
});

// Manual work happens in project/<lesson number>, never in the repository root: easy to find,
// easy to clean up.
test("prepareProject sets up project/<number> with the lesson's starting files, task and /remedy shim", async () => {
	const { prepareProject, parseLesson } = await tutor();
	const root = mkdtempSync(join(tmpdir(), "repo-"));
	const suite = join(root, "learn/code/suites/demo");
	mkdirSync(join(suite, "base"), { recursive: true });
	mkdirSync(join(suite, "prompts"), { recursive: true });
	writeFileSync(join(suite, "base", "pyproject.toml"), "[project]\nname='d'\n");
	writeFileSync(join(suite, "prompts", "01.md"), "Build it.\n");
	writeFileSync(join(suite, "prompts", "02.md"), "Then test it.\n");
	const lesson = { number: "E6", before: "uv run python learn/code/harness.py run --suite demo --repeat 3" };
	const dir = prepareProject(root, lesson);
	assert.equal(dir, join(root, "project", "E6"));
	assert.equal(readFileSync(join(dir, "pyproject.toml"), "utf8"), "[project]\nname='d'\n");
	assert.equal(readFileSync(join(dir, "TASK.md"), "utf8"), "Build it.\n\nThen test it.\n");
	assert.match(readFileSync(join(dir, ".pi", "extensions", "remedies.ts"), "utf8"), /extensions\/mellum-remedies\.ts/);
	writeFileSync(join(dir, "stray.py"), "x = 1\n");
	prepareProject(root, lesson);
	assert.equal(existsSync(join(dir, "stray.py")), false, "a second prepare starts fresh");
});

test("a lesson's suites folder comes from --suites-dir when the page gives one", async () => {
	const { lessonSuite } = await tutor();
	assert.deepEqual(lessonSuite("/r", "harness.py run --suites-dir learn/challenges --suite e6 --repeat 3"), "/r/learn/challenges/e6");
	assert.deepEqual(lessonSuite("/r", "harness.py run --suite easy --repeat 3"), "/r/learn/code/suites/easy");
	assert.equal(lessonSuite("/r", "pi -p hello"), undefined);
});

test("cleanProjects removes project/ and nothing else", async () => {
	const { cleanProjects } = await tutor();
	const root = mkdtempSync(join(tmpdir(), "repo-"));
	mkdirSync(join(root, "project", "E6"), { recursive: true });
	writeFileSync(join(root, "keep.md"), "x");
	cleanProjects(root);
	assert.equal(existsSync(join(root, "project")), false);
	assert.equal(existsSync(join(root, "keep.md")), true);
});
