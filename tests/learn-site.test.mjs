import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const page = (p) => readFileSync(resolve(ROOT, "learn", p), "utf8");
const PAGES = [
  "index.md",
  "about/index.md",
  "about/how-to-read.md",
  "about/evidence.md",
  "about/contributing.md",
  "glossary.md",
  "credits.md",
  "getting-started/index.md",
  "paul/index.md",
  "andre/index.md",
  "lesson-template.md",
];

test("zensical.toml points docs_dir at learn/", () => {
  const toml = readFileSync(resolve(ROOT, "zensical.toml"), "utf8");
  assert.match(toml, /^docs_dir = "learn"$/m);
  assert.match(toml, /^site_name = "Andre\/Paul Learning Center"$/m);
});

test("every required page exists and is in the nav", () => {
  const toml = readFileSync(resolve(ROOT, "zensical.toml"), "utf8");
  for (const p of PAGES) {
    assert.ok(existsSync(resolve(ROOT, "learn", p)), `learn/${p} missing`);
    assert.ok(toml.includes(`"${p}"`), `learn/${p} not in nav`);
  }
});

test("credits name both authors and Tina4", () => {
  const c = page("credits.md");
  assert.match(c, /a collaboration between Andre van Zuydam and Paul Everitt/);
  assert.match(c, /\[Tina4\]\(https?:\/\//);
});

test("evidence page defines all four badges", () => {
  const e = page("about/evidence.md");
  for (const b of ["reference-run", "cited", "screen", "conjecture"])
    assert.ok(e.includes(`\`${b}\``), `badge ${b} missing`);
});

const STEPS = ["Problem", "Eval case", "Evidence of the problem",
  "Solution", "Evidence it worked", "Interpretation"];

test("the lesson template has the six steps in order, badges on 1-5", () => {
  const t = page("lesson-template.md");
  const heads = [...t.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(heads, STEPS);
  const sections = t.split(/^## /m).slice(1);
  sections.forEach((s, i) =>
    assert.equal(/\*\*Badge:\*\*/.test(s), i < 5, `step ${i + 1} badge`));
});

test("learn/ never says tutorial or case study", () => {
  for (const p of PAGES)
    assert.doesNotMatch(page(p), /tutorial|case stud/i, p);
});
