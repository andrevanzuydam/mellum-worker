import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";
import {
	checkSetup,
	formatFindings,
	loadExpected,
	parseJsonc,
	providerEntry,
	putCommand,
	readProvider,
	settingsDiffs,
} from "../extensions/mellum-check.ts";

const ROOT = resolve(import.meta.dirname, "..");
const FIX = join(ROOT, "tests/fixtures/check");
const fixture = (name) => readFileSync(join(FIX, name), "utf8");
const json = (name) => JSON.parse(fixture(name));
const ok = (value) => ({ ok: true, value });
const expected = loadExpected();
const BASE = "http://127.0.0.1:8001/v1";
const ADMIN = "http://127.0.0.1:8001";

const piTemplate = providerEntry("pi", json("../../../templates/pi/models.omlx.json"));
const ocTemplate = providerEntry("opencode", json("../../../templates/opencode/provider.omlx.json"));
const inputs = (over = {}) => ({
	baseUrl: BASE,
	models: ok(json("v1-models.json")),
	adminModels: ok(json("admin-models-match.json")),
	global: ok(json("global-settings.json")),
	provider: { host: "pi", entry: piTemplate },
	template: piTemplate,
	...over,
});
const byId = (findings, id) => findings.find((f) => f.id === id);

test("loadExpected reads the shipped data file", () => {
	assert.equal(expected.modelId, "Mellum2.1-12B-A2.5B-Thinking-6bit");
	assert.equal(expected.model.max_tokens, 4096);
	assert.equal(expected.global["scheduler.max_concurrent_requests"], 1);
	assert.equal(expected.advice["memory.memory_guard_custom_ceiling_gb"], 14);
});

test("the match fixture: settings ok, no fix", () => {
	assert.deepEqual(settingsDiffs(json("admin-models-match.json"), expected), []);
	const f = byId(checkSetup(inputs(), expected), "settings");
	assert.equal(f.level, "ok");
	assert.equal(f.fix, undefined);
});

test("the drift fixture: settings fail, one line per differing key, fix is the PUT", () => {
	const drift = json("admin-models-drift.json");
	const diffs = settingsDiffs(drift, expected);
	assert.deepEqual(diffs.map((d) => d.key).sort(), ["forced_ct_kwargs", "max_tokens", "turboquant_kv_enabled"]);
	assert.deepEqual(diffs.find((d) => d.key === "max_tokens"), { key: "max_tokens", expected: 4096, actual: 16384 });
	const f = byId(checkSetup(inputs({ adminModels: ok(drift) }), expected), "settings");
	assert.equal(f.level, "fail");
	const lines = f.message.split("\n").filter((l) => /\(expected /.test(l));
	assert.equal(lines.length, 3);
	assert.ok(lines.some((l) => l.includes("max_tokens 16384 (expected 4096)")));
	assert.ok(lines.some((l) => l.includes('forced_ct_kwargs ["enable_thinking"] (expected null)')));
	assert.ok(lines.some((l) => l.includes("turboquant_kv_enabled true (expected false)")));
	assert.equal(f.fix, putCommand(ADMIN, expected));
});

test("putCommand is a curl PUT of the measured model values, never run", () => {
	const cmd = putCommand(ADMIN, expected);
	assert.match(cmd, /^curl -s -X PUT http:\/\/127\.0\.0\.1:8001\/admin\/api\/models\/Mellum2\.1-12B-A2\.5B-Thinking-6bit\/settings /);
	const body = JSON.parse(/-d '(\{.*\})'/.exec(cmd)[1]);
	assert.deepEqual(body, expected.model);
});

test("settingsDiffs is null when the model or its settings are absent", () => {
	assert.equal(settingsDiffs({ models: [] }, expected), null);
	assert.equal(settingsDiffs({ models: [{ id: expected.modelId }] }, expected), null);
	assert.equal(settingsDiffs("nonsense", expected), null);
});

test("server unreachable: server fails; model and settings are not reported", () => {
	const f = checkSetup(inputs({ models: { ok: false, error: "ECONNREFUSED" } }), expected);
	const server = byId(f, "server");
	assert.equal(server.level, "fail");
	assert.match(server.message, /ECONNREFUSED/);
	assert.ok(server.fix);
	assert.equal(byId(f, "model"), undefined);
	assert.equal(byId(f, "settings"), undefined);
	assert.equal(byId(f, "admin"), undefined);
	assert.deepEqual(f.filter((x) => x.level === "ok" && (x.id === "model" || x.id === "settings")), []);
});

test("admin 401: admin warns 'settings not readable' and there is no settings finding", () => {
	const f = checkSetup(inputs({ adminModels: { ok: false, status: 401, error: "HTTP 401" }, global: { ok: false, status: 401, error: "HTTP 401" } }), expected);
	const admin = byId(f, "admin");
	assert.equal(admin.level, "warn");
	assert.match(admin.message, /settings not readable/);
	assert.match(admin.message, /401/);
	assert.match(admin.fix, /127\.0\.0\.1:8001\/admin/);
	assert.equal(byId(f, "settings"), undefined);
	assert.equal(byId(f, "global"), undefined);
	assert.equal(f.filter((x) => x.id === "admin").length, 1);
});

test("the model missing from /v1/models fails with the weights step", () => {
	const f = checkSetup(inputs({ models: ok({ object: "list", data: [{ id: "other" }] }) }), expected);
	const model = byId(f, "model");
	assert.equal(model.level, "fail");
	assert.match(model.fix, /02-weights|step 2/);
	assert.equal(byId(f, "server").level, "ok");
	assert.equal(byId(f, "settings"), undefined);
});

test("global: max_concurrent_requests 2 warns; the fixture itself is fine", () => {
	assert.equal(byId(checkSetup(inputs(), expected), "global").level, "ok");
	const g = json("global-settings.json");
	g.scheduler.max_concurrent_requests = 2;
	const f = byId(checkSetup(inputs({ global: ok(g) }), expected), "global");
	assert.equal(f.level, "warn");
	assert.match(f.message, /scheduler\.max_concurrent_requests 2 \(expected 1\)/);
	assert.match(f.fix, /127\.0\.0\.1:8001\/admin/);
});

test("advice: memory guard 48 is info; 14 is ok", () => {
	const advice = byId(checkSetup(inputs(), expected), "advice");
	assert.equal(advice.level, "info");
	assert.match(advice.message, /memory\.memory_guard_custom_ceiling_gb 48 \(advised 14\)/);
	const g = json("global-settings.json");
	g.memory.memory_guard_custom_ceiling_gb = 14;
	assert.equal(byId(checkSetup(inputs({ global: ok(g) }), expected), "advice").level, "ok");
});

test("findings come in the spec table order", () => {
	const f = checkSetup(inputs({ adminModels: { ok: false, error: "x" } }), expected);
	const order = ["server", "model", "settings", "global", "advice", "provider", "admin"];
	const idx = f.map((x) => order.indexOf(x.id));
	assert.deepEqual(idx, [...idx].sort((a, b) => a - b));
});

test("readProvider pi: the shipped file is found; baseUrl comes from it", () => {
	const reads = [];
	const r = readProvider("pi", "/home/user", (p) => (reads.push(p), fixture("pi-models.json")));
	assert.deepEqual(reads, ["/home/user/.pi/agent/models.json"]);
	assert.equal(r.baseUrl, BASE);
	assert.equal(r.error, undefined);
	assert.deepEqual(r.entry, piTemplate);
});

test("pi models.json without omlx: error, and provider fails", () => {
	const r = readProvider("pi", "/home/user", () => fixture("pi-models-no-omlx.json"));
	assert.ok(r.error);
	assert.equal(r.entry, undefined);
	assert.equal(r.baseUrl, BASE);
	const f = byId(checkSetup(inputs({ provider: { host: "pi", error: r.error } }), expected), "provider");
	assert.equal(f.level, "fail");
	assert.match(f.message, /omlx/);
	assert.match(f.fix, /04-provider-pi|step 4/);
});

test("readProvider pi: unreadable and invalid files give errors", () => {
	assert.ok(readProvider("pi", "/h", () => undefined).error);
	assert.ok(readProvider("pi", "/h", () => {
		throw new Error("EACCES");
	}).error);
	assert.ok(readProvider("pi", "/h", () => "{nope").error);
});

test("provider template equals itself: ok; Pi maxTokens 16384 is compared with the template, not the server", () => {
	const f = byId(checkSetup(inputs(), expected), "provider");
	assert.equal(f.level, "ok");
});

test("provider differences warn, one line per field", () => {
	const entry = structuredClone(piTemplate);
	entry.models[0].contextWindow = 32768;
	entry.models[0].samplingParams.top_k = 40;
	entry.models[0].compat.thinkingFormat = "openai";
	const f = byId(checkSetup(inputs({ provider: { host: "pi", entry } }), expected), "provider");
	assert.equal(f.level, "warn");
	assert.match(f.message, /contextWindow 32768 \(expected 56000\)/);
	assert.match(f.message, /samplingParams\.top_k 40 \(expected 20\)/);
	assert.match(f.message, /compat\.thinkingFormat "openai" \(expected "qwen-chat-template"\)/);
	assert.doesNotMatch(f.message, /\bmaxTokens /);
	assert.equal(f.message.split("\n").filter((l) => /\(expected /.test(l)).length, 3);
});

test("a provider without the Mellum model entry fails", () => {
	const entry = structuredClone(piTemplate);
	entry.models = [];
	const f = byId(checkSetup(inputs({ provider: { host: "pi", entry } }), expected), "provider");
	assert.equal(f.level, "fail");
	assert.match(f.message, new RegExp(expected.modelId));
});

test("opencode: limit.context/output map to contextWindow/maxTokens; no sampling block needed", () => {
	const mk = (over) => {
		const entry = structuredClone(ocTemplate);
		over?.(entry);
		return checkSetup(inputs({ provider: { host: "opencode", entry }, template: ocTemplate }), expected);
	};
	assert.equal(byId(mk(), "provider").level, "ok");
	const f = byId(mk((e) => (e.models[expected.modelId].limit.context = 1000)), "provider");
	assert.equal(f.level, "warn");
	assert.match(f.message, /contextWindow 1000 \(expected 56000\)/);
	assert.match(f.fix, /04-provider-opencode|step 4/);
	const g = byId(mk((e) => (e.options.baseURL = "http://127.0.0.1:9999/v1")), "provider");
	assert.match(g.message, /baseUrl "http:\/\/127\.0\.0\.1:9999\/v1"/);
});

test("parseJsonc parses a file with // and /* */ comments, a trailing comma, and // inside a string", () => {
	const text = fixture("opencode.jsonc");
	assert.throws(() => JSON.parse(text));
	const v = parseJsonc(text);
	assert.equal(v.provider.omlx.options.baseURL, BASE);
	assert.deepEqual(parseJsonc('{"a": "x, ]", "b": [1, 2,], /* c */ "c": "/* not */",}'), { a: "x, ]", b: [1, 2], c: "/* not */" });
});

test("parseJsonc on empty text returns undefined without throwing", () => {
	assert.equal(parseJsonc(""), undefined);
	assert.equal(parseJsonc("  \n// only a comment\n"), undefined);
});

test("readProvider opencode: opencode.jsonc, then opencode.json; none -> default baseUrl and error", () => {
	const reads = [];
	const r = readProvider("opencode", "/home/user", (p) => {
		reads.push(p);
		return p.endsWith("opencode.jsonc") ? fixture("opencode.jsonc") : undefined;
	});
	assert.deepEqual(reads, ["/home/user/.config/opencode/opencode.jsonc"]);
	assert.equal(r.baseUrl, BASE);
	assert.deepEqual(r.entry, ocTemplate);

	const reads2 = [];
	const r2 = readProvider("opencode", "/home/user", (p) => {
		reads2.push(p);
		return p.endsWith("opencode.json") ? '{"provider":{"omlx":{"options":{"baseURL":"http://h:1/v1"},"models":{}}}}' : undefined;
	});
	assert.deepEqual(reads2, ["/home/user/.config/opencode/opencode.jsonc", "/home/user/.config/opencode/opencode.json"]);
	assert.equal(r2.baseUrl, "http://h:1/v1");

	const none = readProvider("opencode", "/home/user", () => undefined);
	assert.equal(none.baseUrl, BASE);
	assert.equal(none.entry, undefined);
	assert.ok(none.error);
});

test("formatFindings: fails first, then warns, then info; oks collapse into a count", () => {
	const out = formatFindings([
		{ id: "server", level: "ok", message: "answers" },
		{ id: "advice", level: "info", message: "guard 48" },
		{ id: "global", level: "warn", message: "two at once" },
		{ id: "settings", level: "fail", message: "max_tokens 16384 (expected 4096)", fix: "curl -s -X PUT x" },
		{ id: "model", level: "ok", message: "listed" },
	]);
	const at = (s) => out.indexOf(s);
	assert.ok(at("max_tokens 16384") >= 0 && at("max_tokens 16384") < at("two at once"));
	assert.ok(at("two at once") < at("guard 48"));
	assert.ok(out.includes("curl -s -X PUT x"));
	assert.ok(out.includes("2 checks ok"));
	assert.ok(!out.includes("answers") && !out.includes("listed"));
	assert.equal(formatFindings([{ id: "server", level: "ok", message: "a" }, { id: "model", level: "ok", message: "b" }]).trim(), "2 checks ok");
});

test("a full match run against the fixtures has no fail or warn", () => {
	const f = checkSetup(inputs(), expected);
	assert.deepEqual(f.filter((x) => x.level === "fail" || x.level === "warn"), []);
});
