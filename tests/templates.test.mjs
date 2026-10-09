import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { PLACEHOLDER, render, substituteRoot } from "../build.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const prompt = read("prompts/mellum-worker.md").trim();

test("rendered templates on disk match the build output (no drift)", () => {
	for (const [path, content] of Object.entries(render())) {
		assert.equal(read(path), content, `${path} is stale; run: node build.mjs`);
	}
});

test("both agent templates embed prompt v5 verbatim as their body", () => {
	for (const path of ["templates/pi/mellum-worker.agent.md", "templates/opencode/mellum-worker.md"]) {
		const body = read(path).split("---", 3)[2].trim();
		assert.equal(body, prompt, `${path} body differs from prompts/mellum-worker.md`);
	}
});

test("the Pi agent template carries the root placeholder on the guards line", () => {
	const text = read("templates/pi/mellum-worker.agent.md");
	assert.match(text, new RegExp(`^subagentOnlyExtensions: ${PLACEHOLDER.replace(/[{}]/g, "\\$&")}/extensions/mellum-guards.ts$`, "m"));
});

test("substituteRoot yields an absolute path with no tilde", () => {
	const out = substituteRoot(`x: ${PLACEHOLDER}/extensions/mellum-guards.ts`, "/Users/me/.pi/agent/git/github.com/pauleveritt/mellum-worker");
	assert.equal(out, "x: /Users/me/.pi/agent/git/github.com/pauleveritt/mellum-worker/extensions/mellum-guards.ts");
	assert.throws(() => substituteRoot("y", "~/.pi/agent/git/x"), /absolute/);
	assert.throws(() => substituteRoot("y", "relative/path"), /absolute/);
});

test("the OpenCode provider fragment is JSON with exactly the Mellum model", () => {
	const frag = JSON.parse(read("templates/opencode/provider.omlx.json"));
	assert.deepEqual(Object.keys(frag.provider.omlx.models), ["Mellum2.1-12B-A2.5B-Thinking-6bit"]);
	assert.equal(frag.provider.omlx.models["Mellum2.1-12B-A2.5B-Thinking-6bit"].limit.output, 16384);
});

test("the Pi models fragment is JSON with the validated compat fields", () => {
	const frag = JSON.parse(read("templates/pi/models.omlx.json"));
	const model = frag.providers.omlx.models[0];
	assert.equal(model.id, "Mellum2.1-12B-A2.5B-Thinking-6bit");
	assert.equal(model.compat.supportsDeveloperRole, false);
	assert.equal(model.compat.thinkingFormat, "qwen-chat-template");
	assert.equal(model.maxTokens, 16384);
	assert.equal(model.contextWindow, 56000);
});

test("models-only Pi fragment carries the same model and nothing else on the provider", () => {
	const full = JSON.parse(read("templates/pi/models.omlx.json")).providers.omlx;
	const only = JSON.parse(read("templates/pi/models.omlx.models-only.json")).providers.omlx;
	assert.deepEqual(Object.keys(only), ["models"]);
	assert.equal(only.models.length, 1);
	assert.deepEqual(only.models[0], full.models[0]);
});
