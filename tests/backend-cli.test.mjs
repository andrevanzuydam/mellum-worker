import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT = resolve(import.meta.dirname, "..");
const run = (...args) => {
  const r = spawnSync("uv", ["run", "scripts/backend.py", ...args], {
    cwd: ROOT, encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
};

const ARGV = [
  "llama-server", "-hf", "JetBrains/Mellum2.1-12B-A2.5B-Thinking-GGUF:Q4_K_M",
  "-a", "Mellum2.1-12B-A2.5B-Thinking", "--host", "127.0.0.1", "--port", "8002",
  "-c", "50000", "-np", "1", "-ngl", "99", "--jinja", "-fa", "auto",
  "-b", "512", "-ub", "512", "-ctk", "q8_0", "-ctv", "q8_0",
];

test("serve builds llama-server's argv from the settings", () => {
  assert.equal(run("serve", "--dry-run"), ARGV.join(" "));
});

test("chat sends the settings as request parameters", () => {
  assert.deepEqual(JSON.parse(run("chat", "hi", "--dry-run")), {
    messages: [{ role: "user", content: "hi" }],
    max_tokens: 16384, temperature: 1.0, top_p: 0.95, top_k: 20,
  });
});
