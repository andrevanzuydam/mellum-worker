import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const toml = () => readFileSync(resolve(import.meta.dirname, "..", "pyproject.toml"), "utf8");

test("the root project pins Python and the model settings", () => {
  const t = toml();
  for (const line of [
    'requires-python = ">=3.14"',
    'model = "JetBrains/Mellum2.1-12B-A2.5B-Thinking-GGUF:Q4_K_M"',
    "context = 50000",
    "max_tokens = 16384",
    "temperature = 1.0",
    "top_p = 0.95",
    "top_k = 20",
  ]) assert.ok(t.includes(line), `pyproject.toml lacks ${line}`);
});
