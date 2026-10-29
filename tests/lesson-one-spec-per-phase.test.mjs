import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const page = (p) => readFileSync(resolve(ROOT, "learn", p), "utf8");
const BADGE = (s) => /^\*\*Badge:\*\* `(reference-run|cited|screen|conjecture)`$/m.test(s);

test("the tenth findings lesson follows the six steps and names its badge", () => {
  const l = page("lessons/medium/one-spec-per-phase.md");
  const heads = [...l.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(heads, ["Problem", "Eval case", "Evidence of the problem",
    "Solution", "Validation", "Interpretation"]);
  const sections = l.split(/^## /m).slice(1);
  sections.forEach((s, i) => assert.equal(BADGE(s), i < 5, `step ${i + 1}`));
  assert.match(l, /weakest badge is `(?:reference-run|cited|screen|conjecture)`/);
  assert.match(l, /^track: lessons$/m);
  assert.match(l, /^position: 7$/m);
  assert.match(l, /^backends: \[llamacpp\]$/m);
});

test("the spec-layout lesson states its null and its mechanism", () => {
  const l = page("lessons/medium/one-spec-per-phase.md");
  assert.ok(!/docs\/ladder\//.test(l), "lesson links a ladder record");
  for (const text of ["--specs", "joined", "split", "check_groups",
    "checks_ran", "models.py", "n = 3", "Apple M1 Pro", "0eefd4", "995575"])
    assert.ok(l.includes(text), `lesson lacks ${text}`);
  // The null is stated, and the old ladder claim is retired rather than dropped.
  assert.match(l, /null/i);
  assert.match(l, /retired/);
  assert.ok(!/reference-run/.test(l), "a null cannot claim reference-run");
  assert.match(page("lessons/medium/index.md"), /one-spec-per-phase\.md/);
  // A page that quotes a run links the record and the release it came from.
  assert.match(l, /2026-10-25-lesson10-run\.md/);
  assert.match(l, /releases\/tag\/research-2026-10-25/);
});
