import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT = resolve(import.meta.dirname, "..");

test("the harness's Python tests pass under uvx", () => {
  const r = spawnSync("uvx", ["pytest", "learn/code/tests", "-q",
    "--ignore=learn/code/tests/fixtures"], {
    cwd: ROOT, encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
