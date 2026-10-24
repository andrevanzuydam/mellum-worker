import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const page = (p) => readFileSync(resolve(ROOT, "learn", p), "utf8");

test("the third findings lesson follows the six steps and names its badge", () => {
  const l = page("lessons/thinking-working-memory.md");
  const heads = [...l.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(heads, ["Problem", "Eval case", "Evidence of the problem",
    "Solution", "Validation", "Interpretation"]);
  const sections = l.split(/^## /m).slice(1);
  sections.forEach((s, i) => assert.equal(/\*\*Badge:\*\* `cited`/.test(s), i < 5, `step ${i + 1}`));
  assert.match(l, /^### Evidence of the solution$/m);
  const code = l.match(/```ts\n([\s\S]*?)```/)?.[1] ?? "";
  assert.match(code, /const kept = msgs/);
  assert.match(code, /\.map\(\(m\) =>/);
  assert.match(l, /weakest badge is `cited`/);
  assert.match(l, /^track: lessons$/m);
  assert.match(l, /^position: 3$/m);
  assert.match(l, /^backends: \[omlx\]$/m);
  assert.match(l, /blob\/[0-9a-f]{7,}\/extensions\/mellum-worker\.ts#L107-L110/);
  assert.match(page("lessons/index.md"), /thinking-working-memory\.md/);
});
