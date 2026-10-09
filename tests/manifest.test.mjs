import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));

test("main points at an existing file", () => {
	assert.ok(existsSync(resolve(ROOT, pkg.main)), `${pkg.main} missing`);
});

test("every pi extension and skills path exists", () => {
	for (const p of [...pkg.pi.extensions, ...pkg.pi.skills]) {
		assert.ok(existsSync(resolve(ROOT, p)), `${p} missing`);
	}
});

test("pi extensions list is explicit and never includes the guards file", () => {
	assert.deepEqual(pkg.pi.extensions, ["./extensions/mellum-mode.ts"]);
});

test("package version matches the newest git tag when one exists", () => {
	let tag = "";
	try {
		tag = execSync("git describe --tags --abbrev=0", { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
	} catch {
		return; // no tags yet
	}
	assert.equal(tag, `v${pkg.version}`);
});
