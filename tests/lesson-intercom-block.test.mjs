import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const page = (p) => readFileSync(resolve(ROOT, "learn", p), "utf8");
const BADGE = (s) => /^\*\*Badge:\*\* `(reference-run|cited|screen|conjecture)`$/m.test(s);

test("the ninth findings lesson follows the six steps and names its badge", () => {
  const l = page("lessons/hard/intercom-block.md");
  const heads = [...l.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(heads, ["Problem", "Eval case", "Evidence of the problem",
    "Solution", "Validation", "Interpretation"]);
  const sections = l.split(/^## /m).slice(1);
  sections.forEach((s, i) => assert.equal(BADGE(s), i < 5, `step ${i + 1}`));
  assert.match(l, /weakest badge is `conjecture`/);
  assert.match(l, /^track: lessons$/m);
  assert.match(l, /^position: 9$/m);
  assert.match(l, /^backends: \[llamacpp\]$/m);
});

test("the intercom lesson is a rationale, not a measurement", () => {
  const l = page("lessons/hard/intercom-block.md");
  assert.ok(!/docs\/ladder\//.test(l), "lesson links a ladder record");
  assert.ok(!/reference-run/.test(l), "a rationale cannot claim reference-run");
  assert.ok(!/prefill (down|fell) ?\d|20 ?%/.test(l), "lesson restates A11's retired numbers");
  for (const text of ["intercom", "collapseHandoffs", "handoff", "no arm",
    "LC.8", "2,711", "1,220"].slice(0, 5))
    assert.ok(l.toLowerCase().includes(text.toLowerCase()), `lesson lacks ${text}`);
  assert.match(l, /no arm/i);
  assert.match(page("lessons/hard/index.md"), /intercom-block\.md/);
});
