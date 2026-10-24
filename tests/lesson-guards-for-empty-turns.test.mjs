import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const page = (p) => readFileSync(resolve(ROOT, "learn", p), "utf8");

test("the fourth findings lesson follows the six steps and names its badge", () => {
  const l = page("lessons/guards-for-empty-turns.md");
  const heads = [...l.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(heads, ["Problem", "Eval case", "Evidence of the problem",
    "Solution", "Validation", "Interpretation"]);
  const sections = l.split(/^## /m).slice(1);
  sections.forEach((s, i) => assert.equal(/\*\*Badge:\*\* `cited`/.test(s), i < 5, `step ${i + 1}`));
  assert.match(l, /^### The code$/m);
  assert.match(l, /^### Evidence of the solution$/m);
  assert.match(l, /^### Quality and budget$/m);
  assert.match(l, /^### What to try next$/m);
  assert.match(l, /weakest badge is `cited`/);
  assert.match(l, /^track: lessons$/m);
  assert.match(l, /^position: 4$/m);
  assert.match(l, /^backends: \[omlx\]$/m);
});

test("the guards lesson cites the A0/A1 arms and their rung table", () => {
  const l = page("lessons/guards-for-empty-turns.md");
  for (const text of ["ablation-a0-replace", "ablation-a1-noguards",
    "15/15", "13/15", "rung 3", "rung 5", "empty turn"])
    assert.ok(l.includes(text), `lesson lacks ${text}`);
  assert.match(l, /\| 3 \| 3\/3 \| 2\/3 \|/);
  assert.match(l, /\| 5 \| 3\/3 \| 2\/3 \|/);
  for (const text of ["14.9", "13.1", "17", "10", "11", "4"])
    assert.ok(l.includes(text), `lesson lacks ${text}`);
  assert.match(l, /\bomlx\b/i);
  assert.match(l, /llama\.cpp/);
});

test("the guards lesson quotes the real nudge, not a paraphrase", () => {
  const l = page("lessons/guards-for-empty-turns.md");
  const code = l.match(/```ts\n([\s\S]*?)```/)?.[1] ?? "";
  assert.match(code, /function createEmptyFinalNudge/);
  assert.match(code, /used >= max/);
  assert.match(code, /NUDGE_TEXT/);
  assert.match(l, /blob\/[0-9a-f]{7,}\/extensions\/mellum-guards\.ts#L\d+-L\d+/);
  assert.match(l, /createLoopBreaker/);
  assert.match(page("lessons/index.md"), /guards-for-empty-turns\.md/);
});
