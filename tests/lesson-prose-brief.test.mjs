import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const page = (p) => readFileSync(resolve(ROOT, "learn", p), "utf8");
const BADGE = (s) => /^\*\*Badge:\*\* `(reference-run|cited|screen|conjecture)`$/m.test(s);

test("the eighth findings lesson follows the six steps and names its badge", () => {
  const l = page("lessons/prose-brief.md");
  const heads = [...l.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(heads, ["Problem", "Eval case", "Evidence of the problem",
    "Solution", "Validation", "Interpretation"]);
  const sections = l.split(/^## /m).slice(1);
  sections.forEach((s, i) => assert.equal(BADGE(s), i < 5, `step ${i + 1}`));
  assert.match(l, /weakest badge is `(?:reference-run|cited|screen|conjecture)`/);
  assert.match(l, /^track: lessons$/m);
  assert.match(l, /^position: 8$/m);
  assert.match(l, /^backends: \[llamacpp\]$/m);
});

test("the prose-brief lesson reports its reversal at n=1", () => {
  const l = page("lessons/prose-brief.md");
  assert.ok(!/docs\/ladder\//.test(l), "lesson links a ladder record");
  assert.ok(!/ablation-a/.test(l), "lesson cites an ablation");
  for (const text of ["--single-prompt", "n = 1", "39df1a", "ad1bb7",
    "F401", "did not appear", "Apple M1 Pro"])
    assert.ok(l.includes(text), `lesson lacks ${text}`);
  // The old claims must be retired, not merely left out.
  assert.match(l, /retired/);
  assert.match(page("lessons/index.md"), /prose-brief\.md/);
});
