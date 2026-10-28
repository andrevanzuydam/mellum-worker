import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const page = (p) => readFileSync(resolve(ROOT, "learn", p), "utf8");
const BADGE = (s) => /^\*\*Badge:\*\* `(reference-run|cited|screen|conjecture)`$/m.test(s);

test("the third findings lesson follows the six steps and names its badge", () => {
  const l = page("lessons/medium/thinking-working-memory.md");
  const heads = [...l.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(heads, ["Problem", "Eval case", "Evidence of the problem",
    "Solution", "Validation", "Interpretation"]);
  const sections = l.split(/^## /m).slice(1);
  sections.forEach((s, i) => assert.equal(BADGE(s), i < 5, `step ${i + 1}`));
  assert.match(l, /^### Evidence of the solution$/m);
  assert.match(l, /weakest badge is `conjecture`/);
  assert.match(l, /^track: lessons$/m);
  assert.match(l, /^position: 3$/m);
  assert.match(l, /^backends: \[llamacpp\]$/m);
});

test("the thinking lesson says the arm has no instrument on llama.cpp", () => {
  const l = page("lessons/medium/thinking-working-memory.md");
  assert.ok(!/docs\/ladder\//.test(l), "lesson links a ladder record");
  assert.ok(!/ablation-a/.test(l), "lesson cites an ablation");
  for (const text of ["no supported way to strip thinking", "not run: no strip arm exists",
    "max_tokens", "output budget"])
    assert.ok(l.includes(text), `lesson lacks ${text}`);
  // A missing measurement is —, never 0.
  assert.ok(l.includes("| — |"), "missing metrics must be —");
  assert.match(page("lessons/index.md"), /thinking-working-memory\.md/);
});
