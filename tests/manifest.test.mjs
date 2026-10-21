import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));

test("every pi extension and skills path exists", () => {
	for (const p of [...pkg.pi.extensions, ...pkg.pi.skills]) {
		assert.ok(existsSync(resolve(ROOT, p)), `${p} missing`);
	}
});

test("pi extensions list is explicit and never includes the guards file", () => {
	assert.deepEqual(pkg.pi.extensions, ["./extensions/mellum-worker.ts"]);
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

test("no script that makes npm's git fetcher run a nested install (OpenCode installs from Git via pacote)", () => {
	// pacote #prepareDir runs `npm install` inside the clone when any of these exist;
	// that step fails inside OpenCode's embedded installer with "git dep preparation failed".
	const triggers = ["postinstall", "build", "preinstall", "install", "prepack", "prepare"];
	for (const name of triggers) assert.ok(!pkg.scripts?.[name], `scripts.${name} must not exist`);
	assert.ok(!("workspaces" in pkg), "workspaces must not exist");
});
