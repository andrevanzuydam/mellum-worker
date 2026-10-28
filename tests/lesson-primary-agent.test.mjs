import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const l = readFileSync(resolve(import.meta.dirname, "..", "learn/lessons/hard/primary-agent.md"), "utf8");
const section = (h) => l.split(`## ${h}`)[1].split(/\n## /)[0];

test("lesson 1 opens with the two-sentence paragraph", () => {
  const opening = l.split(/^# .+$/m)[1].split(/^## |^!!! /m)[0].trim();
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
  assert.match(l, /did not reproduce/);
});

test("lesson 1's evidence steps carry reference-run", () => {
  for (const h of ["Evidence of the problem", "Validation"])
    assert.match(section(h), /^\n+\*\*Badge:\*\* `reference-run`/);
});

test("lesson 1 reports a null rather than a pass-rate gap", () => {
  assert.match(l, /null on both suites/);
  assert.doesNotMatch(l, /passes where/);
});

test("lesson 1 dates its medium rows against the earlier fixture", () => {
  // The suite gained acceptance criteria on 2026-10-27; the rows predate it.
  assert.match(l, /Dated note, 2026-10-27/);
  assert.match(l, /acceptance criteria/);
  assert.match(l, /do not reproduce against\s+today's/);
});

test("lesson 1 links the record and the release behind its badge", () => {
  assert.match(l, /2026-10-25-lesson1-run\.md/);
});
