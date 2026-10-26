import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const l = readFileSync(resolve(import.meta.dirname, "..", "learn/lessons/primary-agent.md"), "utf8");
const section = (h) => l.split(`## ${h}`)[1].split(/\n## /)[0];

test("lesson 1 opens with the two-sentence paragraph", () => {
  const opening = l.split(/^# .+$/m)[1].split(/^## /m)[0].trim();
  assert.equal(opening.split(/(?<=\.)\s+/).filter(Boolean).length, 2);
  assert.ok(opening.split(/\s+/).length <= 45, "opening is over 45 words");
  assert.doesNotMatch(opening, /`|\]\(|\*\*Badge/);
});

test("lesson 1 states the pathology, not just the outcome", () => {
  assert.match(section("Problem").replace(/\s+/g, " "), /confident final over work it never checked/);
  assert.doesNotMatch(l, /Give Mellum the whole job/);
});

test("lesson 1 names the three decisions the worker takes", () => {
  const s = section("Solution");
  assert.doesNotMatch(s, /Do not make the model the main agent/);
  for (const t of ["setActiveTools", "before_provider_request", "agent_before_settle"])
    assert.ok(s.includes(t), `solution lacks ${t}`);
});

test("lesson 1 does not claim every medium session was killed", () => {
  assert.doesNotMatch(l, /every medium session, both arms, was killed/);
  assert.match(l, /359 s/);
  assert.match(l, /204 s/);
});
