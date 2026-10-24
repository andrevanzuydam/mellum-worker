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
  "getting-started/base-pi-on-llamacpp.md",
  "getting-started/troubleshoot.md",
  "getting-started/ditch.md",
  "getting-started/harness.md",
  "getting-started/suite.md",
  "getting-started/worker-extension.md",
  "lessons/index.md",
  "lessons/baseline.md",
  "lessons/primary-agent.md",
  "lessons/short-prompt.md",
  "lesson-template.md",
  "project/index.md",
  "project/toolchain.md",
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

test("the glossary is parsed by zensical-glossary", () => {
  const toml = readFileSync(resolve(ROOT, "zensical.toml"), "utf8");
  assert.match(toml, /\[project\.markdown_extensions\.zensical_glossary\]/);
  assert.match(toml, /glossary_file = "glossary\.md"/);
  assert.match(toml, /heading_level = 3/);
  assert.match(toml, /first_only = true/);
  assert.match(toml, /pymdownx\.superfences = \{\}/);
  const glossary = page("glossary.md");
  for (const term of ["screen", "nudge", "empty-final nudge", "no-nudge",
    "Baseline Worker", "Baseline Pi"])
    assert.match(glossary, new RegExp(`^### ${term}$`, "m"));
});

test("the README builds with the glossary extension", () => {
  const readme = readFileSync(resolve(ROOT, "README.md"), "utf8");
  assert.match(readme, /uvx --with zensical-glossary zensical build/);
  assert.doesNotMatch(readme, /uvx zensical build/);
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
  "Solution", "Validation", "Interpretation"];

test("the lesson template has the six steps in order, badges on 1-5", () => {
  const t = page("lesson-template.md");
  const heads = [...t.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(heads, STEPS);
  const sections = t.split(/^## /m).slice(1);
  sections.forEach((s, i) =>
    assert.equal(/\*\*Badge:\*\*/.test(s), i < 5, `step ${i + 1} badge`));
});

test("lesson 1 numbers every step and fetches every grader", () => {
  const l = page("getting-started/base-pi-on-llamacpp.md");
  const numbers = [...l.matchAll(/^## (\d+)\./gm)].map((m) => Number(m[1]));
  assert.deepEqual(numbers, [1, 2, 3, 4, 5, 6, 7]);
  assert.match(l, /^## 3\. Fetch the tools/m);
  assert.match(l, /uvx complexipy --version/);
  assert.doesNotMatch(l, /PowerShell profile line in\s+step 7/);
});

test("troubleshooting is a standalone Getting Started page", () => {
  const t = page("getting-started/troubleshoot.md");
  assert.match(t, /^track: getting-started$/m);
  assert.match(t, /^prerequisites: \[\]$/m);
});

test("the home page links the Introduction and counts five lessons", () => {
  const index = page("index.md");
  assert.match(index, /\[Introduction\]\(introduction\/index\.md\) — Demystifying/);
  assert.match(index, /five lessons/);
  assert.doesNotMatch(index, /three lessons/);
});

test("the ditch drops author notes and states why it checked Python", () => {
  const l = page("getting-started/ditch.md");
  assert.doesNotMatch(l, /^music:/m);
  assert.doesNotMatch(l, /^notes:/m);
  assert.match(l, /model chose Python|chose Python in this run/);
});

test("lesson 1 walks from uv to a base-Pi answer", () => {
  const l = page("getting-started/base-pi-on-llamacpp.md");
  assert.match(l, /^track: getting-started$/m);
  const order = [
    "install uv", "pyproject.toml", "uvx ruff",
    "uv run scripts/backend.py start", "uv run scripts/backend.py chat",
    "PI_CODING_AGENT_DIR",
  ];
  let at = -1;
  for (const step of order) {
    const next = l.toLowerCase().indexOf(step.toLowerCase());
    assert.ok(next > at, `${step} missing or out of order`);
    at = next;
  }
  for (const text of ["--no-extensions", "--no-context-files", "--no-session",
    "backend.py stop", "learn/code/profile"])
    assert.ok(l.includes(text), `lesson 1 lacks ${text}`);
  const index = page("getting-started/index.md");
  assert.ok(index.includes("base-pi-on-llamacpp.md"), "index does not link lesson 1");
  assert.doesNotMatch(index, /coming/);
});

test("the Getting Started index points to troubleshooting", () => {
  assert.match(page("getting-started/index.md"), /troubleshoot\.md/);
});

test("the project pages orient a maintainer and name the checks", () => {
  const index = page("project/index.md");
  for (const text of ["scripts/backend.py", "docs/sdd.md", "AGENTS.md"])
    assert.ok(index.includes(text), `project index lacks ${text}`);
  const toolchain = page("project/toolchain.md");
  for (const text of ["pyproject.toml", "[tool.mellum]",
    "uv run scripts/backend.py", "PI_CODING_AGENT_DIR", "npm test",
    "uv run pytest", "uvx --with zensical-glossary zensical build"])
    assert.ok(toolchain.includes(text), `toolchain lacks ${text}`);
});

test("lesson 2 explains isolation and the one command", () => {
  const l = page("getting-started/harness.md");
  assert.match(l, /^track: getting-started$/m);
  const order = ["fresh directory", "harness.py run --suite easy",
    "n=1", "--repeat 3"];
  let at = -1;
  for (const step of order) {
    const next = l.toLowerCase().indexOf(step.toLowerCase());
    assert.ok(next > at, `${step} missing or out of order`);
    at = next;
  }
  for (const text of ["hidden", "score line", "trace.jsonl",
    "sessions passed", "not a rate", "temperature 1.0", "top_p 0.95",
    "top_k 20", "max_tokens 16384", "context 50000"])
    assert.ok(l.toLowerCase().includes(text), `lesson 2 lacks ${text}`);
  assert.match(page("getting-started/index.md"), /harness\.md/);
});

test("lesson 3 runs the suite, grading and the trace", () => {
  const l = page("getting-started/suite.md");
  assert.match(l, /^track: getting-started$/m);
  for (const text of ["run --suite all --grade", "ruff", "pyrefly", "complexipy",
    "trace.jsonl", "three", "graders", "one observation"])
    assert.ok(l.toLowerCase().includes(text), `lesson 3 lacks ${text}`);
  assert.match(page("getting-started/index.md"), /suite\.md/);
});

test("the first findings lesson follows the six steps and names its badge", () => {
  const l = page("lessons/primary-agent.md");
  const heads = [...l.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(heads, ["Problem", "Eval case", "Evidence of the problem",
    "Solution", "Validation", "Interpretation"]);
  const sections = l.split(/^## /m).slice(1);
  sections.forEach((s, i) => assert.equal(/\*\*Badge:\*\* `cited`/.test(s), i < 5, `step ${i + 1}`));
  assert.match(l, /weakest badge here is `cited`/);
  assert.match(page("lessons/index.md"), /primary-agent\.md/);
});

test("the baseline shows the actual worker code", () => {
  const l = page("lessons/baseline.md");
  for (const text of ["extensions/mellum-worker.ts", "setActiveTools",
    "createGuardSet"])
    assert.ok(l.includes(text), `baseline lacks ${text}`);
});

test("the Lessons index is grouped without Basic Remedies", () => {
  const index = page("lessons/index.md");
  const items = index.match(/^\d+\. \*\*/gm) ?? [];
  assert.equal(items.length, 22);
  assert.match(index, /\*\((Paul|Andre)\)\*$/m);
  assert.equal((index.match(/\*\(Paul\)\*/g) ?? []).length, 10);
  assert.equal((index.match(/\*\(Andre\)\*/g) ?? []).length, 13);
  for (const text of ["Start here", "Prompt and project"])
    assert.ok(index.includes(text), `index lacks ${text}`);
  assert.ok(!index.includes("Basic Remedies"));
  assert.match(index, /The runaway search/);
});

test("the lesson template asks for evidence of the solution", () => {
  const t = page("lesson-template.md");
  assert.match(t, /^### Evidence of the solution$/m);
  for (const text of ["Passes", "Turns", "Failed checks", "Tool errors",
    "Context", "Wall", "Output tokens"])
    assert.ok(t.includes(text), `template lacks ${text}`);
  assert.match(t, /^### What the telemetry shows$/m);
  assert.match(t, /^### The code$/m);
  assert.ok(t.includes("```ts"), "template lacks a code sample");
  assert.match(t, /n = 1/);
});

test("the ditch shows a claim that did not survive a check", () => {
  const l = page("getting-started/ditch.md");
  for (const text of ["Build AgentClinic", "26 requests", "errors=4",
    "unrecognized arguments", "n = 1", "Before fixing, get evidence"])
    assert.ok(l.includes(text), `the ditch lacks ${text}`);
  assert.match(page("getting-started/index.md"), /ditch\.md/);
});

test("the worker-extension lesson teaches the extension mechanism", () => {
  const l = page("getting-started/worker-extension.md");
  for (const text of ["A Pi extension", "registerCommand", "pi.on",
    "before_provider_request", "tool_call", "agent_before_settle", "context",
    "callback", "/mellum", "runaway search"])
    assert.ok(l.toLowerCase().includes(text.toLowerCase()), `worker lesson lacks ${text}`);
  assert.doesNotMatch(l, /assert True|Run it on the ditch|n = 1/);
  assert.match(page("getting-started/index.md"), /worker-extension\.md/);
});

test("the second findings lesson follows the six steps and names its badge", () => {
  const l = page("lessons/short-prompt.md");
  const heads = [...l.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(heads, ["Problem", "Eval case", "Evidence of the problem",
    "Solution", "Validation", "Interpretation"]);
  const sections = l.split(/^## /m).slice(1);
  sections.forEach((s, i) => assert.equal(/\*\*Badge:\*\* `cited`/.test(s), i < 5, `step ${i + 1}`));
  assert.match(l, /weakest badge is `cited`/);
  assert.match(page("lessons/index.md"), /short-prompt\.md/);
});

test("learn/ never says tutorial or case study", () => {
  for (const p of PAGES)
    assert.doesNotMatch(page(p), /tutorial|case stud/i, p);
});
