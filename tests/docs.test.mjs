import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

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

test("README Model settings says Pi and OpenCode send their own 16,384 output limit", () => {
	const use = read("README.md").split("\n## Use it\n")[1].split("\n## What you get\n")[0];
	const settings = use.split("**Model settings.**")[1].split("**Check your setup.**")[0];
	assert.match(settings, /Pi and OpenCode\s+send their own 16,384/);
	assert.match(settings, /honours/);
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

test("no setup or backend doc still calls 16,384 or forced thinking the server's values", () => {
	const omlx = read("docs/backends/omlx.md");
	assert.doesNotMatch(omlx, /\| `max_tokens` \| 16384/);
	assert.doesNotMatch(omlx, /forced_ct_kwargs` \| `\["enable_thinking"\]`/);
	assert.doesNotMatch(read("skills/mellum-setup/reference/04-provider-pi.md"), /match the server/);
	assert.doesNotMatch(read("skills/mellum-setup/reference/04-provider-opencode.md"), /matches the server/);
	assert.doesNotMatch(read("docs/recipe.md"), /\| on — a client cannot switch thinking off/);
});
