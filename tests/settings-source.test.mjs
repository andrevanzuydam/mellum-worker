import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const data = JSON.parse(read("templates/omlx-model-settings.json"));
// Every model value the data file names: the server-only ones a request cannot change, and the
// advised ones each request overrides (step 3 still sets them for a client that sends none).
const model = { ...data.model.serverOnly, ...data.model.overridden };
const server = read("skills/mellum-setup/reference/03-server.md");
const readme = read("README.md");
const pi = JSON.parse(read("templates/pi/models.omlx.json")).providers.omlx.models[0];

test("the data file splits the model values into server-only and request-overridden keys", () => {
	assert.deepEqual(Object.keys(data.model).sort(), ["forcedSampling", "overridden", "serverOnly"]);
	assert.deepEqual(data.model.serverOnly, { max_context_window: 56000, turboquant_kv_enabled: false, thinking_budget_enabled: false, max_tool_result_tokens: null });
	for (const k of ["max_tokens", "forced_ct_kwargs", "enable_thinking", "presence_penalty", "repetition_penalty"]) {
		assert.ok(k in data.model.overridden, `overridden lacks ${k}`);
	}
});

test("the advised overridden values are the ones Pi's template sends per request", () => {
	assert.equal(data.model.overridden.max_tokens, pi.maxTokens);
	assert.equal(data.model.overridden.presence_penalty, pi.samplingParams.presence_penalty);
	assert.equal(data.model.overridden.repetition_penalty, pi.samplingParams.repetition_penalty);
	assert.equal(data.model.serverOnly.max_context_window, pi.contextWindow);
	const { temperature, top_p, top_k } = pi.samplingParams;
	assert.deepEqual(data.model.forcedSampling, { temperature, top_p, top_k }, "forced sampling is checked against what Pi sends");
});

test("03-server.md table rows carry the data file's model values", () => {
	const rows = server.split("\n").filter((l) => /^\| `\w+` \|/.test(l));
	const listed = rows.map((l) => l.split("|").map((c) => c.trim()));
	const keys = listed.map((c) => c[1].replaceAll("`", "")).filter((k) => k in model);
	assert.ok(keys.includes("max_context_window"));
	assert.ok(keys.includes("max_tokens"));
	assert.ok(keys.includes("forced_ct_kwargs"));
	for (const k of ["enable_thinking", "thinking_budget_enabled", "max_tool_result_tokens"]) assert.ok(keys.includes(k), `table lacks ${k}`);
	const s = data.model.forcedSampling;
	assert.ok(rows.some((l) => l.includes("`force_sampling`") && l.includes(`${s.temperature} / ${s.top_p} / ${s.top_k}`)), "a force_sampling row with the forced sampling values");
	for (const cells of listed) {
		const key = cells[1].replaceAll("`", "");
		if (!(key in model)) continue;
		assert.ok(
			cells[2].replaceAll("`", "").includes(JSON.stringify(model[key])),
			`${key} row reads ${cells[2]}, expected ${JSON.stringify(model[key])}`,
		);
	}
});

test("03-server.md says Pi sends max_tokens per request and thinking, and forcing beats the request", () => {
	const row = (k) => server.split("\n").find((l) => l.startsWith(`| \`${k}\` |`));
	assert.match(row("max_tokens"), /Pi sends/);
	assert.match(row("forced_ct_kwargs"), /Pi sends/);
	assert.match(row("forced_ct_kwargs"), /over any request/);
});

test("03-server.md PUT body is a subset of the data file's model values", () => {
	const m = server.match(/-d '(\{[^']*\})'/);
	assert.ok(m, "no PUT -d body found");
	const body = JSON.parse(m[1]);
	for (const [k, v] of Object.entries(body)) {
		assert.ok(k in model, `${k} is not a model key`);
		assert.deepEqual(v, model[k], k);
	}
	for (const k of ["max_tokens", "max_context_window", "forced_ct_kwargs", "enable_thinking", "thinking_budget_enabled", "max_tool_result_tokens"]) {
		assert.ok(k in body, `PUT body lacks ${k}`);
	}
});

test("README Model settings table is derived from the data file and the Pi template", () => {
	const fmt = (n) => n.toLocaleString("en-US");
	const s = pi.samplingParams;
	const rows = [
		`| model id | ${data.modelId} | server |`,
		`| max_tokens | ${fmt(pi.maxTokens)} | provider entry, per request |`,
		`| thinking | ${pi.compat.thinkingFormat === "qwen-chat-template" && data.model.overridden.enable_thinking ? "on" : "off"} | provider entry, per request |`,
		`| sampling | ${s.temperature} / ${s.top_p} / ${s.top_k} | provider entry, per request |`,
		`| context window | ${fmt(data.model.serverOnly.max_context_window)} | server only |`,
		`| TurboQuant | ${data.model.serverOnly.turboquant_kv_enabled ? "on" : "off"} | server only |`,
		`| thinking budget | ${data.model.serverOnly.thinking_budget_enabled ? "on" : "off"} | server only |`,
		`| tool-result cap | ${data.model.serverOnly.max_tool_result_tokens === null ? "none" : fmt(data.model.serverOnly.max_tool_result_tokens)} | server only |`,
		`| concurrent requests | ${fmt(data.global["scheduler.max_concurrent_requests"])} | server only |`,
		`| hot cache | ${data.global["cache.hot_cache_max_size"] === "0" ? "off" : "on"} | server only |`,
	];
	for (const row of rows) assert.ok(readme.includes(row), `README lacks ${row}`);
	assert.doesNotMatch(readme, /generation ceiling \(max_tokens\)/);
});
