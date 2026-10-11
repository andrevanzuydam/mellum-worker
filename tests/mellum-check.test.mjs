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
	serverCheck,
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
	assert.deepEqual(expected.model.serverOnly, { max_context_window: 56000, turboquant_kv_enabled: false, thinking_budget_enabled: false, max_tool_result_tokens: null });
	assert.deepEqual(expected.model.forcedSampling, { temperature: 1, top_p: 0.95, top_k: 20 });
	assert.equal(expected.model.overridden.max_tokens, 16384);
	assert.deepEqual(expected.model.overridden.forced_ct_kwargs, ["enable_thinking"]);
	assert.equal(expected.global["scheduler.max_concurrent_requests"], 1);
	assert.equal(expected.advice["memory.memory_guard_custom_ceiling_gb"], 14);
});

const settingsFindings = (findings) => findings.filter((f) => f.id === "settings");

test("the match fixture: server-only settings ok, no fix; its 4096 and unforced thinking are info", () => {
	assert.deepEqual(settingsDiffs(json("admin-models-match.json"), expected), []);
	const [f, info] = settingsFindings(checkSetup(inputs(), expected));
	assert.equal(f.level, "ok");
	assert.equal(f.fix, undefined);
	assert.equal(info.level, "info");
	assert.match(info.message, /overridden by the client's request values/);
	assert.match(info.message, /max_tokens 4096 \(advised 16384\)/);
	assert.match(info.message, /forced_ct_kwargs null \(advised \["enable_thinking"\]\)/);
	assert.equal(info.fix, undefined);
});

test("the drift fixture: settings fail on the server-only keys, one line each, fix is the PUT; max_tokens is info", () => {
	const drift = json("admin-models-drift.json");
	const diffs = settingsDiffs(drift, expected);
	assert.deepEqual(diffs, [
		{ key: "max_context_window", expected: 56000, actual: 32768 },
		{ key: "turboquant_kv_enabled", expected: false, actual: true },
	]);
	const [f, info] = settingsFindings(checkSetup(inputs({ adminModels: ok(drift) }), expected));
	assert.equal(f.level, "fail");
	const lines = f.message.split("\n").filter((l) => /\(expected /.test(l));
	assert.deepEqual(lines, ["  max_context_window 32768 (expected 56000)", "  turboquant_kv_enabled true (expected false)"]);
	assert.equal(f.fix, putCommand(ADMIN, expected));
	assert.equal(info.level, "info");
	assert.match(info.message, /max_tokens 4096 \(advised 16384\)/);
});

test("server values the client's request overrides are info, never a fail or a warning", () => {
	const admin = json("admin-models-match.json");
	Object.assign(admin.models[0].settings, { max_tokens: 999, forced_ct_kwargs: null, enable_thinking: false, presence_penalty: 0.5, repetition_penalty: 1.1, chat_template_kwargs: { enable_thinking: false } });
	assert.deepEqual(settingsDiffs(admin, expected), []);
	const f = checkSetup(inputs({ adminModels: ok(admin) }), expected);
	assert.deepEqual(f.filter((x) => x.level === "fail" || x.level === "warn"), []);
	const [ok_, info] = settingsFindings(f);
	assert.equal(ok_.level, "ok");
	assert.equal(info.level, "info");
	for (const k of ["max_tokens 999", "enable_thinking false", "presence_penalty 0.5", "repetition_penalty 1.1", "chat_template_kwargs"]) assert.ok(info.message.includes(k), k);
});

test("for OpenCode the info says its template sends only max_tokens, so the server's other values apply", () => {
	const f = checkSetup(inputs({ provider: { host: "opencode", entry: ocTemplate }, template: ocTemplate }), expected);
	const info = settingsFindings(f).find((x) => x.level === "info");
	assert.match(info.message, /OpenCode's template sends only max_tokens/);
	assert.doesNotMatch(info.message, /overridden by the client's request values/);
	const pi = settingsFindings(checkSetup(inputs(), expected)).find((x) => x.level === "info");
	assert.doesNotMatch(pi.message, /OpenCode/);
});

// The three rules: each is a settings fail and counts in settingsDiffs (activation, record).
const withSettings = (over) => {
	const admin = json("admin-models-match.json");
	Object.assign(admin.models[0].settings, over);
	return admin;
};
const settingsOf = (over) => settingsFindings(checkSetup(inputs({ adminModels: ok(withSettings(over)) }), expected));

test("thinking forced off fails: forced_ct_kwargs has enable_thinking and the server's enable_thinking is false", () => {
	const over = { forced_ct_kwargs: ["enable_thinking"], enable_thinking: false };
	assert.deepEqual(settingsDiffs(withSettings(over), expected), [{ key: "enable_thinking", expected: true, actual: false }]);
	const [f, info] = settingsOf(over);
	assert.equal(f.level, "fail");
	assert.match(f.message, /enable_thinking false \(expected true\): thinking is forced off for every client/);
	assert.equal(f.fix, putCommand(ADMIN, expected));
	assert.doesNotMatch(info?.message ?? "", /enable_thinking/, "not repeated as info");
});

test("thinking forced off through chat_template_kwargs fails too: oMLX applies it when enable_thinking is unset", () => {
	const over = { forced_ct_kwargs: ["enable_thinking"], enable_thinking: null, chat_template_kwargs: { enable_thinking: false } };
	assert.deepEqual(settingsDiffs(withSettings(over), expected), [{ key: "enable_thinking", expected: true, actual: false }]);
	assert.equal(settingsOf(over)[0].level, "fail");
	assert.deepEqual(settingsDiffs(withSettings({ ...over, forced_ct_kwargs: null }), expected), [], "near-miss: not forced");
	assert.deepEqual(settingsDiffs(withSettings({ ...over, enable_thinking: true }), expected), [], "near-miss: the toggle wins over the kwargs");
});

test("near-miss: enable_thinking false while it is not forced passes, because the request wins", () => {
	const over = { forced_ct_kwargs: null, enable_thinking: false };
	assert.deepEqual(settingsDiffs(withSettings(over), expected), []);
	const [f, info] = settingsOf(over);
	assert.equal(f.level, "ok");
	assert.match(info.message, /enable_thinking false \(advised true\)/);
	assert.deepEqual(settingsDiffs(withSettings({ forced_ct_kwargs: ["enable_thinking"], enable_thinking: true }), expected), []);
});

test("forced sampling: with force_sampling true, a server temperature, top_p or top_k other than 1 / 0.95 / 20 fails", () => {
	const over = { force_sampling: true, temperature: 0.6, top_p: 0.95, top_k: 40 };
	assert.deepEqual(settingsDiffs(withSettings(over), expected), [
		{ key: "temperature", expected: 1, actual: 0.6 },
		{ key: "top_k", expected: 20, actual: 40 },
	]);
	const [f] = settingsOf(over);
	assert.equal(f.level, "fail");
	assert.match(f.message, /temperature 0\.6 \(expected 1\): force_sampling is on, so the server's sampling wins over the request/);
	assert.match(f.message, /top_k 40 \(expected 20\)/);
	const fixed = JSON.parse(/-d '(\{.*\})'/.exec(f.fix)[1]);
	assert.deepEqual([fixed.temperature, fixed.top_p, fixed.top_k], [1, 0.95, 20], "the printed PUT fixes the forced sampling");
	assert.deepEqual(settingsDiffs(withSettings({ force_sampling: true, top_p: undefined }), expected), [{ key: "top_p", expected: 0.95, actual: undefined }]);
});

test("near-miss: with force_sampling false or absent, server sampling stays unchecked", () => {
	assert.deepEqual(settingsDiffs(withSettings({ force_sampling: false, temperature: 0.6, top_k: 40 }), expected), []);
	assert.equal(settingsOf({ force_sampling: false, temperature: 0.6 })[0].level, "ok");
	assert.deepEqual(settingsDiffs(withSettings({ force_sampling: undefined, temperature: 0.6 }), expected), []);
});

test("thinking budget on or a tool-result cap is a server-only fail; the measured off and unset pass", () => {
	assert.deepEqual(settingsDiffs(withSettings({ thinking_budget_enabled: true, max_tool_result_tokens: 4000 }), expected), [
		{ key: "thinking_budget_enabled", expected: false, actual: true },
		{ key: "max_tool_result_tokens", expected: null, actual: 4000 },
	]);
	assert.equal(settingsOf({ thinking_budget_enabled: true })[0].level, "fail");
	assert.deepEqual(settingsDiffs(withSettings({ thinking_budget_tokens: 4096 }), expected), [], "near-miss: a budget size with the budget off");
});

test("a server at the advised values has no info settings finding", () => {
	const admin = json("admin-models-match.json");
	Object.assign(admin.models[0].settings, expected.model.overridden);
	assert.deepEqual(settingsFindings(checkSetup(inputs({ adminModels: ok(admin) }), expected)).map((x) => x.level), ["ok"]);
});

test("putCommand is a curl PUT of the server-only and advised model values, never run", () => {
	const cmd = putCommand(ADMIN, expected);
	assert.match(cmd, /^curl -s -X PUT http:\/\/127\.0\.0\.1:8001\/admin\/api\/models\/Mellum2\.1-12B-A2\.5B-Thinking-6bit\/settings /);
	const body = JSON.parse(/-d '(\{.*\})'/.exec(cmd)[1]);
	assert.deepEqual(body, { ...expected.model.serverOnly, ...expected.model.overridden, ...expected.model.forcedSampling });
	for (const [k, v] of Object.entries({ enable_thinking: true, thinking_budget_enabled: false, max_tool_result_tokens: null })) assert.deepEqual(body[k], v, k);
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

test("provider differences outside maxTokens and sampling warn, one line per field", () => {
	const entry = structuredClone(piTemplate);
	entry.models[0].contextWindow = 32768;
	entry.models[0].compat.thinkingFormat = "openai";
	const f = byId(checkSetup(inputs({ provider: { host: "pi", entry } }), expected), "provider");
	assert.equal(f.level, "warn");
	assert.match(f.message, /contextWindow 32768 \(expected 56000\)/);
	assert.match(f.message, /compat\.thinkingFormat "openai" \(expected "qwen-chat-template"\)/);
	assert.doesNotMatch(f.message, /\bmaxTokens /);
	assert.equal(f.message.split("\n").filter((l) => /\(expected /.test(l)).length, 2);
});

test("a provider maxTokens or sampling value that differs fails: those are what each request sends", () => {
	const mk = (change) => {
		const entry = structuredClone(piTemplate);
		change(entry.models[0]);
		return byId(checkSetup(inputs({ provider: { host: "pi", entry } }), expected), "provider");
	};
	const cap = mk((m) => (m.maxTokens = 4096));
	assert.equal(cap.level, "fail");
	assert.match(cap.message, /maxTokens 4096 \(expected 16384\)/);
	assert.match(cap.fix, /04-provider-pi|step 4/);
	const top = mk((m) => {
		m.samplingParams.top_k = 40;
		m.contextWindow = 32768;
	});
	assert.equal(top.level, "fail");
	assert.match(top.message, /samplingParams\.top_k 40 \(expected 20\)/);
	assert.match(top.message, /contextWindow 32768 \(expected 56000\)/);
	assert.equal(mk((m) => delete m.samplingParams).level, "fail");
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
	assert.equal(g.level, "warn");
	const out = byId(mk((e) => (e.models[expected.modelId].limit.output = 4096)), "provider");
	assert.equal(out.level, "fail");
	assert.match(out.message, /maxTokens 4096 \(expected 16384\)/);
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
		{ id: "settings", level: "fail", message: "max_context_window 32768 (expected 56000)", fix: "curl -s -X PUT x" },
		{ id: "model", level: "ok", message: "listed" },
	]);
	const at = (s) => out.indexOf(s);
	assert.ok(at("max_context_window 32768") >= 0 && at("max_context_window 32768") < at("two at once"));
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

test("fetchJson: a JSON body, an HTTP error status, and a rejected fetch", async () => {
	const { fetchJson } = await import("../extensions/mellum-check.ts");
	const seen = [];
	const fake = (status, body) => async (url, init) => {
		seen.push({ url, method: init?.method ?? "GET", signal: init?.signal instanceof AbortSignal });
		return { ok: status < 300, status, json: async () => body };
	};
	assert.deepEqual(await fetchJson(`${ADMIN}/admin/api/models`, { timeoutMs: 1000, fetch: fake(200, { models: [] }) }), { ok: true, value: { models: [] } });
	assert.deepEqual(seen, [{ url: `${ADMIN}/admin/api/models`, method: "GET", signal: true }]);
	assert.deepEqual(await fetchJson(ADMIN, { timeoutMs: 1000, fetch: fake(401, {}) }), { ok: false, status: 401, error: "HTTP 401" });
	const refused = async () => {
		throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
	};
	assert.deepEqual(await fetchJson(ADMIN, { timeoutMs: 1000, fetch: refused }), { ok: false, error: "ECONNREFUSED" });
});

test("fetchJson gives up at the timeout even when the fetch ignores its abort signal", async () => {
	const { fetchJson } = await import("../extensions/mellum-check.ts");
	const t0 = Date.now();
	const r = await fetchJson(ADMIN, { timeoutMs: 50, fetch: () => new Promise(() => {}) });
	assert.deepEqual(r, { ok: false, error: "timeout" });
	assert.ok(Date.now() - t0 < 1000, `took ${Date.now() - t0} ms`);
});

test("adminBaseOf strips a trailing slash and /v1", async () => {
	const { adminBaseOf } = await import("../extensions/mellum-check.ts");
	assert.equal(adminBaseOf("http://127.0.0.1:8001/v1"), ADMIN);
	assert.equal(adminBaseOf("http://127.0.0.1:8001/v1/"), ADMIN);
	assert.equal(adminBaseOf("http://h:9/"), "http://h:9");
});

test("gatherInputs reads the host config, GETs the three URLs from its baseUrl, and takes the host's template", async () => {
	const { gatherInputs } = await import("../extensions/mellum-check.ts");
	const urls = [];
	const config = { providers: { omlx: { ...json("pi-models.json").providers.omlx, baseUrl: "http://h:9/v1" } } };
	const files = { "/home/u/.pi/agent/models.json": JSON.stringify(config) };
	const got = await gatherInputs("pi", {
		home: "/home/u",
		read: (p) => files[p],
		get: async (url) => {
			urls.push(url);
			return { ok: false, error: "x" };
		},
	});
	assert.deepEqual(urls.sort(), ["http://h:9/admin/api/global-settings", "http://h:9/admin/api/models", "http://h:9/v1/models"]);
	assert.equal(got.baseUrl, "http://h:9/v1");
	assert.deepEqual(got.provider, { host: "pi", entry: config.providers.omlx });
	assert.deepEqual(got.template, piTemplate);
	const oc = await gatherInputs("opencode", { home: "/nowhere", read: () => undefined, get: async () => ({ ok: false, error: "x" }) });
	assert.match(oc.provider.error, /no opencode config/);
	assert.deepEqual(oc.template, ocTemplate);
	assert.equal(oc.baseUrl, BASE);
});

const reply = (body) => async () => ({ ok: true, status: 200, json: async () => body });

test("serverCheck: the match fixture matches, the drift fixture does not, an unreachable server is null", async () => {
	const seen = [];
	const get = (body) => async (url, init) => {
		seen.push({ url: String(url), method: init?.method });
		return reply(body)();
	};
	assert.deepEqual(await serverCheck(ADMIN, { timeoutMs: 1000, fetch: get(json("admin-models-match.json")) }), { match: true, diffs: [] });
	assert.deepEqual(seen, [{ url: `${ADMIN}/admin/api/models`, method: "GET" }]);
	const drift = await serverCheck(ADMIN, { timeoutMs: 1000, fetch: reply(json("admin-models-drift.json")) });
	assert.equal(drift.match, false);
	assert.deepEqual(drift.diffs.map((d) => d.key), ["max_context_window", "turboquant_kv_enabled"]);
	const refused = async () => {
		throw new TypeError("fetch failed");
	};
	assert.deepEqual(await serverCheck(ADMIN, { timeoutMs: 1000, fetch: refused }), { match: null, diffs: [] });
	const notOk = async () => ({ ok: false, status: 500, json: async () => ({}) });
	assert.deepEqual(await serverCheck(ADMIN, { timeoutMs: 1000, fetch: notOk }), { match: null, diffs: [] });
});
