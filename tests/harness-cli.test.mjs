import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT = resolve(import.meta.dirname, "..");
const FIX = resolve(ROOT, "learn/code/tests/fixtures");
const TASKS = resolve(FIX, "tasks");

const run = (runs, binary, ...extra) => spawnSync("uv", [
  "run", "learn/code/harness.py", "run", "--task", "add",
  "--tasks-dir", TASKS, "--runs-dir", runs, "--pi-binary", resolve(FIX, binary),
  ...extra,
], { cwd: ROOT, encoding: "utf8" });

test("a passing run prints one score line", () => {
  const runs = mkdtempSync(join(tmpdir(), "mellum-runs-"));
  const r = run(runs, "fake-pi.sh");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^add: PASS \(run .+; \d+ requests, \d+ tool calls, \d+ tool errors\)$/m);
});

test("a failing run says FAIL and shows the test tail", () => {
  const runs = mkdtempSync(join(tmpdir(), "mellum-runs-"));
  const r = run(runs, "fake-pi-empty.sh");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^add: FAIL \(run .+; \d+ requests, \d+ tool calls, \d+ tool errors\)$/m);
  assert.match(r.stderr, /failed|error/i);
});

test("--dry-run prints the child's argv", () => {
  const r = run(tmpdir(), "fake-pi.sh", "--dry-run");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /-p .*--no-session .*record-pi\.mjs/);
});
