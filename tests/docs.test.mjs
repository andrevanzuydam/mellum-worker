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
	assert.ok(use.includes("scripts/mellum.mjs check --host pi|opencode"), "names the CLI with both hosts");
	assert.match(use, /exit/i, "says how it exits");
	assert.ok(use.includes("Mellum server settings differ"), "shows the activation warning");
});
