import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const data = JSON.parse(read("templates/omlx-model-settings.json"));
const server = read("skills/mellum-setup/reference/03-server.md");
const readme = read("README.md");

test("03-server.md table rows carry the data file's model values", () => {
	const rows = server.split("\n").filter((l) => /^\| `\w+` \|/.test(l));
	const listed = rows.map((l) => l.split("|").map((c) => c.trim()));
	const keys = listed.map((c) => c[1].replaceAll("`", "")).filter((k) => k in data.model);
	assert.ok(keys.includes("max_context_window"));
	assert.ok(keys.includes("max_tokens"));
	assert.ok(keys.includes("forced_ct_kwargs"));
	for (const cells of listed) {
		const key = cells[1].replaceAll("`", "");
		if (!(key in data.model)) continue;
		assert.ok(
			cells[2].replaceAll("`", "").includes(JSON.stringify(data.model[key])),
			`${key} row reads ${cells[2]}, expected ${JSON.stringify(data.model[key])}`,
		);
	}
});

test("03-server.md PUT body is a subset of the data file's model values", () => {
	const m = server.match(/-d '(\{[^']*\})'/);
	assert.ok(m, "no PUT -d body found");
	const body = JSON.parse(m[1]);
	for (const [k, v] of Object.entries(body)) {
		assert.ok(k in data.model, `${k} is not a model key`);
		assert.deepEqual(v, data.model[k], k);
	}
	for (const k of ["max_tokens", "max_context_window", "forced_ct_kwargs"]) {
		assert.ok(k in body, `PUT body lacks ${k}`);
	}
});

test("README Model settings table is derived from the data file and the Pi template", () => {
	const fmt = (n) => n.toLocaleString("en-US");
	const pi = JSON.parse(read("templates/pi/models.omlx.json")).providers.omlx.models[0];
	const s = pi.samplingParams;
	const rows = [
		`| model id | ${data.modelId} |`,
		`| context window | ${fmt(data.model.max_context_window)} |`,
		`| generation ceiling (max_tokens) | ${fmt(data.model.max_tokens)} |`,
		`| thinking | ${data.model.enable_thinking ? "on" : "off"} |`,
		`| sampling | ${s.temperature} / ${s.top_p} / ${s.top_k} |`,
		`| concurrent requests | ${fmt(data.global["scheduler.max_concurrent_requests"])} |`,
		`| hot cache | ${data.global["cache.hot_cache_max_size"] === "0" ? "off" : "on"} |`,
	];
	for (const row of rows) assert.ok(readme.includes(row), `README lacks ${row}`);
});
