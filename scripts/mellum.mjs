/**
 * Mellum from the terminal, for any host (Pi Mode, Pi Worker, OpenCode):
 *
 *   node scripts/mellum.mjs check [--host pi|opencode] [--json]
 *
 * check compares the oMLX server (GETs only) and the host's provider entry with the measured
 * settings, prints the findings (fails first) or JSON, and exits 1 on any fail. It never
 * writes: a settings fix is printed as the PUT command for you to run.
 *
 * MELLUM_CHECK_FIXTURES=<dir> (tests) reads <dir>/v1-models.json, admin-models.json and
 * global-settings.json in place of the three GETs.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const USAGE = "usage: node scripts/mellum.mjs check [--host pi|opencode] [--json]";

/**
 * Node refuses to strip types from .ts files under node_modules, where OpenCode installs this
 * package. There, copy the extensions and the templates they read to a mirror in the temp dir
 * (same layout) and import from that. Each file is written whole, then renamed into place.
 */
function codeRoot() {
	if (!PKG.split(sep).includes("node_modules")) return PKG;
	const version = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8")).version;
	const mirror = join(tmpdir(), `mellum-worker-${version}`);
	const files = [
		"package.json",
		"templates/omlx-model-settings.json",
		"templates/pi/models.omlx.json",
		"templates/opencode/provider.omlx.json",
		...readdirSync(join(PKG, "extensions"))
			.filter((f) => f.endsWith(".ts"))
			.map((f) => `extensions/${f}`),
	];
	for (const f of files) {
		const to = join(mirror, f);
		mkdirSync(dirname(to), { recursive: true });
		const partial = `${to}.${process.pid}.tmp`;
		copyFileSync(join(PKG, f), partial);
		renameSync(partial, to);
	}
	return mirror;
}

function fail(msg) {
	console.error(`${msg}\n${USAGE}`);
	process.exit(2);
}

function parseArgs(argv) {
	const [cmd, ...rest] = argv;
	const opts = { cmd, host: "pi", json: false };
	for (let i = 0; i < rest.length; i++) {
		if (rest[i] === "--json") opts.json = true;
		else if (rest[i] === "--host") opts.host = rest[++i];
		else fail(`unknown argument: ${rest[i]}`);
	}
	if (opts.host !== "pi" && opts.host !== "opencode") fail(`unknown host: ${opts.host}`);
	return opts;
}

async function check(opts) {
	const m = await import(pathToFileURL(join(codeRoot(), "extensions/mellum-check.ts")).href);
	const fixtures = process.env.MELLUM_CHECK_FIXTURES;
	const fromFixture = async (url) => {
		const name = url.endsWith("/admin/api/models") ? "admin-models.json" : url.endsWith("/admin/api/global-settings") ? "global-settings.json" : "v1-models.json";
		try {
			return { ok: true, value: JSON.parse(readFileSync(join(fixtures, name), "utf8")) };
		} catch (e) {
			return { ok: false, error: e.code ?? e.message };
		}
	};
	const inputs = await m.gatherInputs(opts.host, {
		home: process.env.HOME || homedir(),
		read: (p) => (existsSync(p) ? readFileSync(p, "utf8") : undefined),
		get: fixtures ? fromFixture : (url) => m.fetchJson(url, { timeoutMs: 3000 }),
	});
	const findings = m.checkSetup(inputs, m.loadExpected());
	console.log(opts.json ? JSON.stringify({ host: opts.host, baseUrl: inputs.baseUrl, findings }, null, 2) : m.formatFindings(findings));
	if (findings.some((f) => f.level === "fail")) process.exitCode = 1;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.cmd === "check") await check(opts);
else if (opts.cmd === "learn") fail("mellum learn: not available yet");
else fail(opts.cmd ? `unknown command: ${opts.cmd}` : "no command");
