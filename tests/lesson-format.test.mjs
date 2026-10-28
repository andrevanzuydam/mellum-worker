import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

// The Lessons section's standard format: a Carpentries-style frame (overview,
// key points) around Paul's six evidence steps, in easy/medium/hard tiers.
const ROOT = resolve(import.meta.dirname, "..");
const LESSONS = resolve(ROOT, "learn/lessons");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const TIERS = { easy: "E", medium: "M", hard: "H" };
const STEPS = ["Problem", "Eval case", "Evidence of the problem", "Solution", "Validation", "Interpretation"];

const lessonPages = () =>
  Object.keys(TIERS).flatMap((tier) =>
    readdirSync(resolve(LESSONS, tier))
      .filter((f) => f.endsWith(".md") && f !== "index.md")
      .sort()
      .map((f) => ({ tier, file: `learn/lessons/${tier}/${f}`, slug: f.replace(/\.md$/, "") })));

const frontMatter = (text) => {
  const block = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(block, "no front matter");
  return Object.fromEntries(block[1].split("\n").filter((l) => /^\w+:/.test(l))
    .map((l) => [l.split(":")[0], l.slice(l.indexOf(":") + 1).replace(/\s+#.*$/, "").trim()]));
};

test("every tier folder holds its lessons and a landing page", () => {
  for (const tier of Object.keys(TIERS))
    assert.ok(existsSync(resolve(LESSONS, tier, "index.md")), `${tier}/index.md missing`);
  assert.ok(lessonPages().length >= 10, "lesson discovery found too few pages");
});

test("every lesson's front matter names its tier, number and prerequisites", () => {
  const numbers = new Set();
  for (const { tier, file } of lessonPages()) {
    const fm = frontMatter(read(file));
    assert.equal(fm.tier, tier, `${file}: tier`);
    assert.match(fm.number ?? "", new RegExp(`^${TIERS[tier]}[1-9]\\d*$`), `${file}: number`);
    assert.ok(!numbers.has(fm.number), `${file}: duplicate number ${fm.number}`);
    numbers.add(fm.number);
    for (const key of ["title", "time", "prerequisites", "authors", "backends"])
      assert.ok(fm[key], `${file}: no ${key}`);
  }
});

test("every lesson opens with its number, an overview, then Paul's six steps", () => {
  for (const { file } of lessonPages()) {
    const text = read(file);
    const fm = frontMatter(text);
    assert.match(text, new RegExp(`^# ${fm.number} · `, "m"), `${file}: H1 lacks the number`);
    const head = text.split(/^## /m)[0];
    assert.match(head, /^!!! abstract "Overview"$/m, `${file}: no overview box`);
    assert.match(head, /^ {4}\*\*Questions\*\*$/m, `${file}: overview has no questions`);
    assert.match(head, /^ {4}\*\*Objectives\*\*$/m, `${file}: overview has no objectives`);
    assert.deepEqual([...text.matchAll(/^## (.+)$/gm)].map((m) => m[1]), STEPS, `${file}: steps`);
  }
});

test("every lesson ends with how to run it, then its key points", () => {
  for (const { file } of lessonPages()) {
    const last = read(file).split(/^## Interpretation$/m)[1] ?? "";
    const run = last.indexOf("### Run it yourself");
    const keys = last.indexOf('!!! success "Key points"');
    assert.ok(run >= 0, `${file}: no Run it yourself`);
    assert.ok(keys > run, `${file}: key points must follow Run it yourself`);
    assert.equal(last.slice(keys).trim().split("\n").filter((l) => /^\S/.test(l)).length, 1,
      `${file}: nothing may follow the key points box`);
  }
});

test("every lesson is in its tier's nav and on its tier's landing page", () => {
  const toml = read("zensical.toml");
  for (const { tier, file, slug } of lessonPages()) {
    assert.ok(toml.includes(`"lessons/${tier}/${slug}.md"`), `${file} not in nav`);
    assert.ok(read(`learn/lessons/${tier}/index.md`).includes(`(${slug}.md)`),
      `${file} not on the ${tier} landing page`);
  }
  for (const tier of Object.keys(TIERS))
    assert.ok(toml.includes(`"lessons/${tier}/index.md"`), `${tier} landing page not in nav`);
});

test("a moved lesson's old URL redirects to its tier page", () => {
  const stubs = readdirSync(LESSONS).filter((f) => f.endsWith(".md") && !["index.md", "retired.md"].includes(f));
  assert.ok(stubs.length >= 10, "old lesson URLs lost their redirects");
  for (const f of stubs) {
    const stub = read(`learn/lessons/${f}`);
    const target = stub.match(/<meta http-equiv="refresh" content="0; url=\.\.\/(easy|medium|hard)\/([a-z0-9-]+)\/">/);
    assert.ok(target, `${f}: not a redirect stub`);
    assert.ok(existsSync(resolve(LESSONS, target[1], `${target[2]}.md`)), `${f}: redirects nowhere`);
  }
});

test("the site enables the components the format uses", () => {
  const toml = read("zensical.toml");
  for (const ext of ["admonition", "attr_list", "md_in_html", "pymdownx.details", "pymdownx.tabbed"])
    assert.match(toml, new RegExp(`^${ext.replace(".", "\\.")}[ .]`, "m"), `${ext} not enabled`);
  for (const feature of ["navigation.tabs", "navigation.instant", "navigation.footer",
    "search.highlight", "content.code.copy", "content.tabs.link"])
    assert.ok(toml.includes(`"${feature}"`), `${feature} not enabled`);
});
