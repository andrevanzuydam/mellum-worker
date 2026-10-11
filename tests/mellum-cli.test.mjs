import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

// The CLI never touches the network here: MELLUM_CHECK_FIXTURES makes it read the three
// GET responses from a directory, and HOME is a temp dir holding the host's config.
const ROOT = resolve(import.meta.dirname, "..");
const FIX = join(ROOT, "tests/fixtures/check");
const SCRIPT = join(ROOT, "scripts/mellum.mjs");
const version = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;

const temp = (prefix) => mkdtempSync(join(tmpdir(), prefix));
const copy = (from, to) => {
	mkdirSync(dirname(to), { recursive: true });
	copyFileSync(from, to);
};

// A fixtures dir with the given admin-models fixture as admin-models.json.
function fixtures(adminModels) {
	const dir = temp("mellum-cli-fix-");
	copy(join(FIX, "v1-models.json"), join(dir, "v1-models.json"));
	copy(join(FIX, adminModels), join(dir, "admin-models.json"));
	copy(join(FIX, "global-settings.json"), join(dir, "global-settings.json"));
	return dir;
}

function home() {
	const dir = temp("mellum-cli-home-");
	copy(join(FIX, "pi-models.json"), join(dir, ".pi/agent/models.json"));
	copy(join(FIX, "opencode.jsonc"), join(dir, ".config/opencode/opencode.jsonc"));
	return dir;
}

function run(args, { adminModels = "admin-models-match.json", script = SCRIPT, env = {} } = {}) {
	return spawnSync(process.execPath, [script, ...args], {
		encoding: "utf8",
		env: { ...process.env, HOME: home(), MELLUM_CHECK_FIXTURES: fixtures(adminModels), ...env },
	});
}

test("check --json on the matching fixtures exits 0 with parseable findings and no fail", () => {
	const r = run(["check", "--json"]);
	assert.equal(r.status, 0, r.stderr);
	const out = JSON.parse(r.stdout);
	assert.equal(out.host, "pi");
	assert.equal(out.baseUrl, "http://127.0.0.1:8001/v1");
	assert.ok(Array.isArray(out.findings) && out.findings.length > 0);
	assert.deepEqual(out.findings.filter((f) => f.level === "fail"), []);
	assert.equal(out.findings.find((f) => f.id === "settings").level, "ok");
});

test("check --json on the drift fixture exits 1 and reports the settings fail with the PUT to run", () => {
	const r = run(["check", "--json"], { adminModels: "admin-models-drift.json" });
	assert.equal(r.status, 1, r.stderr);
	const settings = JSON.parse(r.stdout).findings.find((f) => f.id === "settings");
	assert.equal(settings.level, "fail");
	assert.match(settings.fix, /^curl -s -X PUT http:\/\/127\.0\.0\.1:8001\/admin\/api\/models\//);
});

test("check without --json prints the findings as text, fails first", () => {
	const r = run(["check"], { adminModels: "admin-models-drift.json" });
	assert.equal(r.status, 1);
	assert.match(r.stdout, /^FAIL settings: model settings differ/);
	assert.match(r.stdout, /checks ok\n?$/);
});

test("check --host opencode reads the OpenCode config", () => {
	const r = run(["check", "--host", "opencode", "--json"]);
	assert.equal(r.status, 0, r.stderr);
	const out = JSON.parse(r.stdout);
	assert.equal(out.host, "opencode");
	assert.notEqual(out.findings.find((f) => f.id === "provider").level, "fail");
});

test("a missing fixture file reads as an unreachable server", () => {
	const dir = temp("mellum-cli-empty-");
	const r = run(["check", "--json"], { env: { MELLUM_CHECK_FIXTURES: dir } });
	assert.equal(r.status, 1);
	const server = JSON.parse(r.stdout).findings.find((f) => f.id === "server");
	assert.equal(server.level, "fail");
	assert.match(server.message, /ENOENT/);
});

test("usage errors exit 2: no command, an unknown command, an unknown host", () => {
	for (const args of [[], ["frobnicate"], ["check", "--host", "vim"]]) {
		const r = run(args);
		assert.equal(r.status, 2, `${args.join(" ")}: ${r.stdout}${r.stderr}`);
		assert.match(r.stderr, /usage: node .*mellum\.mjs check/);
	}
});

test("installed under node_modules (as OpenCode installs it), the CLI runs from a mirror in the temp dir", () => {
	const pkg = join(temp("mellum-cli-nm-"), "node_modules", "mellum-worker");
	const files = [
		"package.json",
		"scripts/mellum.mjs",
		"templates/omlx-model-settings.json",
		"templates/pi/models.omlx.json",
		"templates/opencode/provider.omlx.json",
		...readdirSync(join(ROOT, "extensions")).filter((f) => f.endsWith(".ts")).map((f) => `extensions/${f}`),
	];
	for (const f of files) copy(join(ROOT, f), join(pkg, f));
	const tmp = temp("mellum-cli-tmp-");
	const r = run(["check", "--json"], { script: join(pkg, "scripts/mellum.mjs"), env: { TMPDIR: tmp } });
	assert.equal(r.status, 0, r.stderr);
	assert.equal(JSON.parse(r.stdout).host, "pi");
	assert.ok(existsSync(join(tmp, `mellum-worker-${version}`, "extensions", "mellum-check.ts")), "mirror written under the temp dir");
});
