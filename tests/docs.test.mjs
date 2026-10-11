import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { formatMerge, formatReport, learnFromTexts, mergeSuggestion } from "../extensions/mellum-learn.ts";

const ROOT = resolve(import.meta.dirname, "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");

test("README carries both pinned install lines and the status table", () => {
	const readme = read("README.md");
	const version = JSON.parse(read("package.json")).version;
	assert.ok(readme.includes(`mellum-worker@git+https://github.com/pauleveritt/mellum-worker.git#v${version}`));
	assert.ok(readme.includes(`pi install git:github.com/pauleveritt/mellum-worker@v${version}`));
	assert.match(readme, /15\/15/);
	assert.match(readme, /unmeasured/i);
	assert.match(readme, /uv run --offline pytest -q/);
});

test("every relative markdown link in docs and README resolves", () => {
	for (const file of ["README.md", "docs/recipe.md", "docs/backends/omlx.md", "docs/backends/ollama.md"]) {
		const dir = resolve(ROOT, file, "..");
		for (const m of read(file).matchAll(/\]\(([^)#:]+)(?:#[^)]*)?\)/g)) {
			assert.ok(existsSync(resolve(dir, m[1])), `${file}: broken link ${m[1]}`);
		}
	}
});

test("README Use it says how to run the setup check in Pi Mode and from the terminal", () => {
	const use = read("README.md").split("\n## Use it\n")[1].split("\n## What you get\n")[0];
	assert.match(use, /\*\*Check your setup\.\*\*/);
	assert.ok(use.includes("/mellum check"), "names /mellum check");
	assert.ok(use.includes("scripts/mellum.mjs check --host pi"), "names the CLI for Pi");
	assert.ok(use.includes("scripts/mellum.mjs check --host opencode"), "names the CLI for OpenCode");
	for (const fence of use.matchAll(/```bash\n([\s\S]*?)```/g)) assert.doesNotMatch(fence[1], /\w\|\w/, "no a|b alternation in a bash fence");
	assert.match(use, /exit/i, "says how it exits");
	assert.ok(use.includes("Mellum server settings differ"), "shows the activation warning");
});

test("README Use it says how to run learn in Pi Mode and from the terminal, after the check", () => {
	const use = read("README.md").split("\n## Use it\n")[1].split("\n## What you get\n")[0];
	const at = use.indexOf("**Learn from your runs.**");
	assert.ok(at > use.indexOf("**Check your setup.**"), "a Learn from your runs paragraph after Check your setup");
	const learn = use.slice(at);
	assert.ok(learn.includes("/mellum learn"), "names /mellum learn");
	assert.ok(learn.includes("/mellum learn 25"), "shows the run count");
	assert.ok(learn.includes("scripts/mellum.mjs learn [--n 10] [--file <jsonl>] [--json]"), "names the CLI and its flags");
	assert.ok(learn.includes("AGENTS.md"), "says where the suggestion goes");
	assert.ok(learn.includes("MELLUM_MODE_RUNS"), "says where the records live");
	assert.ok(learn.includes("M.7B"), "says Worker runs join in M.7B");
	assert.match(learn, /from\s+the\s+project\s+directory/, "says to run the CLI from the project directory");
	for (const fence of learn.matchAll(/```bash\n([\s\S]*?)```/g)) assert.doesNotMatch(fence[1], /\w\|\w/, "no a|b alternation in a bash fence");
});

test("README Model settings says which values the provider entry sends per request and which only the server sets", () => {
	const use = read("README.md").split("\n## Use it\n")[1].split("\n## What you get\n")[0];
	const settings = use.split("**Model settings.**")[1].split("**Check your setup.**")[0];
	assert.match(settings, /Pi and OpenCode\s+send[^.]*per\s+request/);
	assert.match(settings, /honours/);
	assert.match(settings, /server-only/);
	const check = use.split("**Check your setup.**")[1].split("**Learn from your runs.**")[0];
	assert.match(check, /Mellum server settings differ: (max_context_window|turboquant_kv_enabled) /, "the warning example names a server-only key");
	assert.match(check, /info/, "says overridden server values are info");
});

test("README states the cap the Mode and Worker runs actually used, and no 4,096 ceiling for them", () => {
	const readme = read("README.md");
	assert.doesNotMatch(readme, /All runs used a 4,096/);
	assert.match(readme, /Mode\s+and\s+Worker\s+requests\s+sent\s+max_tokens\s+16,384\s+\(verified\s+in\s+the\s+A10,\s+A17\s+and\s+A19\s+traces\);\s+direct-mode\s+research\s+phases\s+used\s+4,096\./);
	assert.doesNotMatch(readme, /\*\*Ceiling:\*\*/, "the 16,384 ceiling item is withdrawn from Future work");
	assert.doesNotMatch(read("BACKLOG.md"), /Measure a 16,384 ceiling/);
	assert.doesNotMatch(read("docs/recipe.md"), /4,096, the measured baseline/);
	assert.match(read("docs/recipe.md"), /A10, A17 and A19/, "the recipe records the trace finding");
});

test("README What helped follows the rungs 6-9 results, and the results table no longer repeats it", () => {
	const readme = read("README.md");
	const get = readme.split("\n## What you get\n")[1].split("\n## ")[0];
	const helped = readme.split("\n## What helped\n")[1]?.split("\n## ")[0];
	assert.ok(helped, "a What helped section");
	assert.ok(readme.indexOf("\n## What helped\n") > readme.indexOf("\n## What you get\n"));
	assert.ok(readme.indexOf("\n## What helped\n") < readme.indexOf("\n## Findings\n"));
	for (const row of [
		"| AgentClinic, 12 runs each | no facts | fallback only | `## Mellum` section |",
		"| passed | 1 | 7 | 9 |",
		"| requests, median | 50 | 28 | 26 |",
		"| seconds, median | 261 | 143 | 106 |",
		"| wrote outside the layout | 8 | 5 | 0 |",
	]) {
		assert.ok(helped.includes(row), `What helped lacks ${row}`);
	}
	assert.match(helped, /Rungs 1–5 did not regress \(15\/15\)/);
	assert.doesNotMatch(get, /\| passes \| 1\/12 \|/, "What you get no longer repeats the passes row");
	assert.match(get, /A18/, "What you get still links the A18-A20 records");
});

test("README learn paragraph shows a trimmed report and the suggestion", () => {
	const use = read("README.md").split("\n## Use it\n")[1].split("\n## What you get\n")[0];
	const learn = use.slice(use.indexOf("**Learn from your runs.**"));
	assert.match(learn, /```\nmellum learn: \d+ runs in [\s\S]*Suggested for AGENTS\.md:[\s\S]*## Mellum[\s\S]*```/);
});

test("the setup smoke step ends with the check, for every host", () => {
	const smoke = read("skills/mellum-setup/reference/07-smoke.md");
	assert.ok(smoke.includes("scripts/mellum.mjs check --host"), "names the CLI");
	assert.ok(smoke.includes("/mellum check"), "names the Pi Mode command");
	assert.ok(smoke.indexOf("scripts/mellum.mjs check") > smoke.indexOf("calculator.js` multiplies"), "after the fixture passes");
});

test("recipe has a Records, learn and check section with the seven patterns", () => {
	const recipe = read("docs/recipe.md");
	assert.match(recipe, /^## 4c\. Records, learn and check$/m);
	const section = recipe.split(/^## 4c\. Records, learn and check$/m)[1].split(/^## /m)[0];
	for (const id of ["test-thrash", "bent-project", "false-success", "long-run", "servers", "drift", "announce-stop"]) {
		assert.ok(section.includes(`\`${id}\``), `names the ${id} pattern`);
	}
	assert.ok(section.includes("server"), "names the record's server field");
	assert.ok(section.includes("templates/omlx-model-settings.json"), "says where the expected values come from");
	assert.match(section, /Mellum server settings differ/);
});

test("the oMLX backend guide lists step 3's server values; no doc calls 4,096 the server's value", () => {
	const omlx = read("docs/backends/omlx.md");
	assert.match(omlx, /\| `max_tokens` \| 16384 \|/);
	assert.match(omlx, /\| `forced_ct_kwargs` \| `\["enable_thinking"\]` \|/);
	assert.doesNotMatch(read("skills/mellum-setup/reference/04-provider-pi.md"), /server's 4,096/);
	assert.doesNotMatch(read("skills/mellum-setup/reference/04-provider-opencode.md"), /4,096/);
	assert.doesNotMatch(read("skills/mellum-setup/reference/04-provider-pi.md"), /match the server/);
	assert.doesNotMatch(read("skills/mellum-setup/reference/04-provider-opencode.md"), /matches the server/);
	assert.doesNotMatch(read("docs/recipe.md"), /\| on — a client cannot switch thinking off/);
});

test("README Use it says which --host serves which host, and that Pi Worker and OpenCode records join in M.7B", () => {
	const use = read("README.md").split("\n## Use it\n")[1].split("\n## What you get\n")[0];
	const check = use.split("**Check your setup.**")[1].split("**Learn from your runs.**")[0];
	assert.match(check, /`--host pi`[^.]*Pi Mode and Pi Worker/, "--host pi is for Pi Mode and Pi Worker");
	assert.match(check, /`--host opencode`[^.]*OpenCode/, "--host opencode is for OpenCode");
	const learn = use.slice(use.indexOf("**Learn from your runs.**"));
	assert.match(learn, /Pi Worker and OpenCode\s+(runs|records)[^.]*M\.7B/, "Pi Worker and OpenCode records join in M.7B");
	assert.match(learn, /OpenCode[^.]*0 runs/, "says an OpenCode project finds 0 runs today");
});

test("README learn example is the real output on the test fixture it names", () => {
	const use = read("README.md").split("\n## Use it\n")[1].split("\n## What you get\n")[0];
	const learn = use.slice(use.indexOf("**Learn from your runs.**"));
	const fixture = /`(tests\/fixtures\/learn\/[\w./-]+\.jsonl)`/.exec(learn)?.[1];
	assert.ok(fixture, "names the fixture it ran on");
	const shown = /```\n(mellum learn: [\s\S]*?)\n```/.exec(learn)?.[1];
	const cwd = "/home/user/proj";
	const report = learnFromTexts([read(fixture)], { cwd, n: 10 });
	const merged = mergeSuggestion(undefined, report.suggestion);
	assert.equal(shown, formatReport(report, cwd, merged.added) + formatMerge(merged, report.suggestion));
});
