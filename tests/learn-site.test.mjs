import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const page = (p) => readFileSync(resolve(ROOT, "learn", p), "utf8");
const PAGES = ["index.md"];

test("zensical.toml points docs_dir at learn/", () => {
	const toml = readFileSync(resolve(ROOT, "zensical.toml"), "utf8");
	assert.match(toml, /^docs_dir = "learn"$/m);
	assert.match(toml, /^site_name = "Andre\/Paul Learning Center"$/m);
});

test("every required page exists and is in the nav", () => {
	const toml = readFileSync(resolve(ROOT, "zensical.toml"), "utf8");
	for (const p of PAGES) {
		assert.ok(existsSync(resolve(ROOT, "learn", p)), `learn/${p} missing`);
		assert.ok(toml.includes(`"${p}"`), `learn/${p} not in nav`);
	}
});
