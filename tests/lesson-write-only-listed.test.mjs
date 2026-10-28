import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const page = (p) => readFileSync(resolve(ROOT, "learn", p), "utf8");
const BADGE = (s) => /^\*\*Badge:\*\* `(reference-run|cited|screen|conjecture)`$/m.test(s);

test("the sixth findings lesson follows the six steps and names its badge", () => {
  const l = page("lessons/easy/write-only-listed.md");
  const heads = [...l.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(heads, ["Problem", "Eval case", "Evidence of the problem",
    "Solution", "Validation", "Interpretation"]);
  const sections = l.split(/^## /m).slice(1);
  sections.forEach((s, i) => assert.equal(BADGE(s), i < 5, `step ${i + 1}`));
  assert.match(l, /weakest badge is `(?:reference-run|cited|screen|conjecture)`/);
  assert.match(l, /^track: lessons$/m);
  assert.match(l, /^position: 6$/m);
  assert.match(l, /^backends: \[llamacpp\]$/m);
});

test("the layout lesson names its instrument and its null", () => {
  const l = page("lessons/easy/write-only-listed.md");
  assert.ok(!/docs\/ladder\//.test(l), "lesson links a ladder record");
  assert.ok(!/ablation-a/.test(l), "lesson cites an ablation");
  for (const text of ["layout.json", "out_of_layout", "0", "none",
    "The ditch", "ignore"])
    assert.ok(l.toLowerCase().includes(text.toLowerCase()), `lesson lacks ${text}`);
  assert.match(page("lessons/index.md"), /write-only-listed\.md/);
});
