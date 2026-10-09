import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import plugin, { MellumWorkerPlugin } from "../opencode/plugin.js";

const SKILLS = resolve(import.meta.dirname, "..", "skills");

test("config hook adds the skills directory once, keeping existing paths", async () => {
	const hooks = await MellumWorkerPlugin({ directory: "/tmp/project" });
	const cfg = { skills: { paths: ["~/mine"] } };
	await hooks.config(cfg);
	await hooks.config(cfg);
	assert.deepEqual(cfg.skills.paths, ["~/mine", SKILLS]);
});

test("config hook creates skills.paths when absent", async () => {
	const hooks = await MellumWorkerPlugin({});
	const cfg = {};
	await hooks.config(cfg);
	assert.deepEqual(cfg.skills.paths, [SKILLS]);
});

test("config hook leaves a V2 flat skills array alone", async () => {
	const hooks = await MellumWorkerPlugin({});
	const cfg = { skills: ["x"] };
	await hooks.config(cfg);
	assert.deepEqual(cfg.skills, ["x"]);
});

test("default export names the plugin and points at the same function", () => {
	assert.equal(plugin.id, "mellum-worker");
	assert.equal(plugin.server, MellumWorkerPlugin);
});
