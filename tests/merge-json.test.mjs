import assert from "node:assert/strict";
import test from "node:test";
import { mergeJson } from "../scripts/merge-json.mjs";

const fragment = { providers: { omlx: { baseUrl: "http://127.0.0.1:8001/v1", models: [{ id: "mellum", maxTokens: 16384 }] } } };

test("adds the provider when the target has none", () => {
	const out = mergeJson({ providers: { other: { baseUrl: "x" } } }, fragment);
	assert.deepEqual(Object.keys(out.providers).sort(), ["omlx", "other"]);
	assert.deepEqual(out.providers.omlx.models, [{ id: "mellum", maxTokens: 16384 }]);
});

test("keeps the user's other models in an existing omlx provider and appends by id", () => {
	const target = { providers: { omlx: { baseUrl: "http://127.0.0.1:8001/v1", models: [{ id: "gemma", maxTokens: 8192 }] } } };
	const out = mergeJson(target, fragment);
	assert.deepEqual(out.providers.omlx.models.map((m) => m.id), ["gemma", "mellum"]);
	assert.deepEqual(target.providers.omlx.models.map((m) => m.id), ["gemma"], "input not mutated");
});

test("is idempotent and refreshes an existing entry with the same id", () => {
	const once = mergeJson({}, fragment);
	const twice = mergeJson(once, fragment);
	assert.deepEqual(twice, once);
	const updated = mergeJson(once, { providers: { omlx: { models: [{ id: "mellum", maxTokens: 4096 }] } } });
	assert.equal(updated.providers.omlx.models.length, 1);
	assert.equal(updated.providers.omlx.models[0].maxTokens, 4096);
});

test("scalar arrays are replaced, not concatenated", () => {
	assert.deepEqual(mergeJson({ a: [1, 2] }, { a: [3] }), { a: [3] });
});
