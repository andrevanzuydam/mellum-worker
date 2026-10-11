/**
 * Mellum from the terminal, for any host (Pi Mode, Pi Worker, OpenCode):
 *
 *   node scripts/mellum.mjs check [--host pi|opencode] [--json]
 *   node scripts/mellum.mjs learn [--n 10] [--file <jsonl>] [--json]
 *
 * check compares the oMLX server (GETs only) and the host's provider entry with the measured
 * settings, prints the findings (fails first) or JSON, and exits 1 on any fail. It never
 * writes: a settings fix is printed as the PUT command for you to run.
 *
 * learn names what went wrong in the last n runs (default 10) under the current directory,
 * from $MELLUM_MODE_RUNS (or ~/.pi/agent/mellum-mode-runs.jsonl) and
 * ~/.pi/agent/mellum-worker-runs.jsonl, or only --file. It prints the suggested ## Mellum
 * section and any conflict with ./AGENTS.md, and never writes: /mellum learn in Pi does that.
 *
 * MELLUM_CHECK_FIXTURES=<dir> (tests) reads <dir>/v1-models.json, admin-models.json and
 * global-settings.json in place of the three GETs.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const USAGE = "usage: node scripts/mellum.mjs check [--host pi|opencode] [--json]\n       node scripts/mellum.mjs learn [--n 10] [--file <jsonl>] [--json]";

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
	const opts = { cmd, host: "pi", json: false, n: 10, file: undefined };
	for (let i = 0; i < rest.length; i++) {
		if (rest[i] === "--json") opts.json = true;
		else if (rest[i] === "--host" && cmd === "check") opts.host = rest[++i];
		else if (rest[i] === "--n" && cmd === "learn") opts.n = /^\d+$/.test(rest[++i] ?? "") ? Number(rest[i]) : 0;
		else if (rest[i] === "--file" && cmd === "learn") opts.file = rest[++i];
		else fail(`unknown argument: ${rest[i]}`);
	}
	if (opts.host !== "pi" && opts.host !== "opencode") fail(`unknown host: ${opts.host}`);
	if (!(opts.n >= 1)) fail("--n must be a whole number above 0");
	if (cmd === "learn" && opts.file !== undefined && !existsSync(opts.file)) fail(`no such file: ${opts.file}`);
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

async function learn(opts) {
	const m = await import(pathToFileURL(join(codeRoot(), "extensions/mellum-learn.ts")).href);
	const cwd = process.cwd();
	const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : undefined);
	const files = opts.file !== undefined ? [opts.file] : m.recordFiles(process.env, process.env.HOME || homedir());
	const report = m.learnFromTexts(files.map(read), { cwd, n: opts.n });
	const merged = m.mergeSuggestion(read(join(cwd, "AGENTS.md")), report.suggestion);
	console.log(opts.json ? JSON.stringify({ cwd, ...report, added: merged.added, conflicts: merged.conflicts }, null, 2) : m.formatReport(report, cwd) + m.formatMerge(merged, report.suggestion));
}

const opts = parseArgs(process.argv.slice(2));
if (opts.cmd === "check") await check(opts);
else if (opts.cmd === "learn") await learn(opts);
else fail(opts.cmd ? `unknown command: ${opts.cmd}` : "no command");
