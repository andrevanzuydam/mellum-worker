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
