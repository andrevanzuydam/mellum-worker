import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const SKILL = resolve(ROOT, "skills", "mellum-setup");

test("SKILL.md has the frontmatter both tools require", () => {
	const text = readFileSync(resolve(SKILL, "SKILL.md"), "utf8");
	const fm = text.split("---")[1];
	assert.match(fm, /^name: mellum-setup$/m);
	const desc = fm.match(/^description: (.+)$/m)?.[1] ?? "";
	assert.ok(desc.length > 40 && desc.length <= 1024, "description length");
});

test("every phase referenced by SKILL.md exists", () => {
	const text = readFileSync(resolve(SKILL, "SKILL.md"), "utf8");
	const refs = [...text.matchAll(/reference\/(\d\d-[a-z-]+\.md)/g)].map((m) => m[1]);
	assert.ok(refs.length >= 9, `expected at least 9 reference links, found ${refs.length}`);
	for (const r of new Set(refs)) assert.ok(existsSync(resolve(SKILL, "reference", r)), `${r} missing`);
});

test("the optional project-facts phase is linked and states the section, the cap and the switch", () => {
	const text = readFileSync(resolve(SKILL, "SKILL.md"), "utf8");
	assert.match(text, /reference\/08-project-facts\.md/);
	const step = readFileSync(resolve(SKILL, "reference", "08-project-facts.md"), "utf8");
	assert.match(step, /^## Mellum$/m, "shows the section heading");
	assert.match(step, /600 characters/, "states the cap");
	assert.match(step, /MELLUM_MODE_FACTS=0/, "names the switch");
	assert.match(step, /uv run --offline python -m pytest -q/, "names the fallback");
	// Phase 6 appends `## Mellum Worker`; the check must match only Mode's exact heading.
	assert.ok(step.includes("grep -nE '^##[[:space:]]+Mellum[[:space:]]*$' AGENTS.md"), "check is anchored to the exact heading");
	assert.match(text, /exactly `## Mellum`/, "SKILL.md check names the exact heading");
});

test("the smoke fixture is the failing calculator and its test command is the one in the recipe", () => {
	const dir = resolve(SKILL, "smoke", "calculator");
	const pkg = JSON.parse(readFileSync(resolve(dir, "package.json"), "utf8"));
	assert.equal(pkg.scripts.test, "node --test calculator.test.js");
	assert.throws(() => execFileSync("node", ["--test", "calculator.test.js"], { cwd: dir, stdio: "pipe", env: { ...process.env, NODE_TEST_CONTEXT: undefined } }), "the fixture must fail before the worker fixes it");
});

test("render-agent prints a Pi agent file with an absolute guards path", () => {
	const out = execFileSync("node", [resolve(ROOT, "scripts", "render-agent.mjs"), "pi", "/abs/pkg"], { encoding: "utf8" });
	assert.match(out, /^subagentOnlyExtensions: \/abs\/pkg\/extensions\/mellum-guards\.ts$/m);
	assert.ok(!out.includes("{{"), "no placeholder left");
});

test("render-agent prints the OpenCode agent file unchanged", () => {
	const out = execFileSync("node", [resolve(ROOT, "scripts", "render-agent.mjs"), "opencode"], { encoding: "utf8" });
	assert.equal(out, readFileSync(resolve(ROOT, "templates", "opencode", "mellum-worker.md"), "utf8"));
});
