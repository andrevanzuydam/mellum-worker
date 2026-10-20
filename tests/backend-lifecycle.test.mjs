import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test, { after } from "node:test";
import assert from "node:assert/strict";

const ROOT = resolve(import.meta.dirname, "..");
const PID = join(tmpdir(), `mellum-test-${process.pid}.pid`);
const LOG = join(tmpdir(), `mellum-test-${process.pid}.log`);
// Async on purpose: spawnSync blocks the event loop, and the fake server
// below answers from that loop.
const run = (...args) => new Promise((done) => {
  const child = spawn("uv", ["run", "scripts/backend.py", ...args], { cwd: ROOT });
  let stdout = "", stderr = "";
  child.stdout.on("data", (d) => (stdout += d));
  child.stderr.on("data", (d) => (stderr += d));
  child.on("close", (status) => done({ status, stdout, stderr }));
});

const server = createServer((req, res) => {
  res.setHeader("content-type", "application/json");
  if (req.url === "/health") return res.end('{"status":"ok"}');
  if (req.url === "/props")
    return res.end('{"default_generation_settings":{"n_ctx":50000}}');
  res.statusCode = 404; res.end("{}");
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const port = server.address().port;
after(() => server.close());

test("status reports a live server and its context", async () => {
  const r = await run("status", "--port", String(port));
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp(`up on 127\\.0\\.0\\.1:${port}`));
  assert.match(r.stdout, /50000/);
});

test("start reports an already-running server instead of spawning one", async () => {
  const r = await run("start", "--port", String(port), "--pidfile", PID);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /already up/);
  assert.equal(existsSync(PID), false);
});

test("status reports a closed port as down", async () => {
  const r = await run("status", "--port", "1");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /down on 127\.0\.0\.1:1/);
});

test("start without llama-server fails clearly and writes no pidfile", async () => {
  // Port 1 has no server, so the check reaches the binary before health.
  const r = await run("start", "--port", "1", "--pidfile", PID,
    "--logfile", LOG, "--server-binary", "/nonexistent/llama-server");
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /not found on PATH/);
  assert.match(r.stderr, /docs\/backends\/llamacpp\.md/);
  assert.equal(existsSync(PID), false);
});
