# Natural project instructions: context rereads and test-first work

**What is measured.** Seven local headless hello-world probes with normal
context-file discovery, captured provider requests, tool events, and session
logs. The latest probe's generated files passed its own and independent
pytest runs. The installed Pi context-loading documentation and prompt
builder were inspected.

**What is conjecture.** Whether the proposed general wording improves
Mellum's behavior; whether adding a short test-first policy produces genuine
red/green work; whether these results transfer to other tasks or hosts.

**Date:** 2026-10-11  
**Question:** Which project instructions belong in an ordinary developer's
AGENTS.md, and which observed inefficiencies justify intervention?  
**Scope:** Analysis and proposed experiments, not a change to live personal
or project instructions or the shipped worker recipe.

**Follow-up, 2026-10-11:** Paul approved installing the full candidate below
without TDD and using a neutral prompt, n=2. The resulting
[experiment](2026-10-11-natural-agents-n2.md) observed one empty-final failure
and one verified success. The proposals below remain the earlier analysis;
the candidate project file is now installed. No shared worker behavior changed.

## Sources

- [Ongoing lessons log](2026-10-11-bare-pi-lessons.md), this research session,
  accessed 2026-10-11. The seven probe directories under
  `/tmp/mellum-runs/bare-refinements-wv42y8s1/` preserve command/context
  snapshots, full provider payloads, session logs, and generated files.
- Pi, installed coding-agent docs/configuration.md, Context files section;
  docs/cli.md, Prompts and process; dist/core/system-prompt.js,
  renderProjectContext and buildRules. Earendil Works, accessed 2026-10-11.
  Package root:
  `~/.volta/tools/image/packages/@earendil-works/pi-coding-agent/lib/node_modules/@earendil-works/pi-coding-agent/`.
- ac-demo AGENTS.md, specs/roadmap.md, specs/tech-stack.md, Paul Everitt's
  project, accessed 2026-10-11. The latest probe preserves the exact
  AGENTS.md snapshot; the roadmap describes future app.py and models.py.
- [Plain-primary baseline](../../ladder/phase0c-primary-plain/README.md),
  mellum-worker ladder, accessed 2026-10-11. 8/15, with four empty finals
  and three false completion claims. This is evidence for prioritizing
  completion/correctness, not a controlled test of the new proposals.

## Findings

1. **Claim:** The latest project's rules were loaded normally, not injected
   through an unusual CLI prompt option.
   - **Evidence:** command.json has neither --append-system-prompt nor
     --system-prompt nor --no-context-files. The captured first system
     message contains the project's contents under a project_instructions
     element with its path. Pi's docs describe normal discovery from the
     agent directory, working directory, and parents.
   - **Assessment:** Fact. The explicit recorder is observational; it does
     not insert project instructions.
2. **Claim:** The latest AGENTS.md reread was redundant, but is not enough
   evidence to label the behavior pathological across agents.
   - **Evidence:** Its full contents were present before the read and the
     system message was unchanged across all nine requests. The read tool
     returned in approximately 4 ms. Across seven probes, three read an
     AGENTS.md file and four did not; one read both global and project files.
     No comparison against another model's reread frequency was performed.
   - **Assessment:** Fact for this redundancy and frequency; recommendation
     to monitor rather than prohibit. Reading instructions is sensible when
     they were not supplied, changed, or apply to a newly inspected subtree.
     A blanket ban would turn a small efficiency issue into a correctness
     risk. Model-turn cost matters more than the read's own execution time.
3. **Claim:** The latest run spent more effort resolving project context than
   implementing the requested behavior.
   - **Evidence:** Five of eight calls were discovery; first write at 9.800 s
     of 13.347 s. The model referred to app.py from the uv example, despite
     having already seen no such file in git ls-files and ls output.
   - **Assessment:** Fact for the sequence, inference for the example's
     causal contribution. Do not attribute all discovery cost to one reread.
4. **Claim:** The project file mixes stable facts with usage instructions and
   restrictions derived from prior model failures.
   - **Evidence:** The opening paragraph describes /mellum phase invocations;
     the environment bullet names a not-yet-created app.py; the prohibition
     names __init__.py, conftest.py, pytest.ini and setup.cfg. The test command
     is concrete and was followed in six of seven probes. The tech-stack
     page already describes uv usage, and the roadmap names app.py as a
     Phase 1 deliverable.
   - **Assessment:** Fact. Recommendation: preserve real environment facts,
     move host invocation examples to usage documentation, and compare
     general scope/testing constraints against the enumerated bans. The
     measured named-bans recommendation must not silently become a claimed
     measurement of the proposed general wording.
5. **Claim:** The original task does not currently test TDD compliance.
   - **Evidence:** All seven probes wrote the module before the test. The
     prompt says "Write a hello world module then write a Python test for
     it." No test-first policy was in the project file. The latest recorded
     only a green test run. Its test checks actual return behavior and is
     functionally adequate; test-after ordering does not itself establish
     a defect in the code.
   - **Assessment:** Fact. The word "then" encourages code-first ordering,
     although it does not prove why the model chose that order.

## Proposed project file

This is a reviewable candidate, not installed. Retain the functional
`## Mellum` heading because Mode reads it; bare Pi reads the whole file.

```markdown
# AgentClinic — agent notes

A small FastAPI + Jinja2 complaints app. The phased requirements are in
specs/roadmap.md.

## Mellum

- Test command: uv run --frozen python -m pytest tests
- Run Python commands with uv run --frozen.
- Use existing dependencies and test configuration.
- Keep changes scoped to the task; do not weaken existing tests.
- Before reporting completion, run the test command and report its result.
```

Keep the actual test command: it describes this environment rather than
giving away a solution. The positive environment instruction names no future
file. The dependencies/testing lines express normal maintenance policy;
they are not equivalent to an enforced write allow-list and may be less
effective than the current restrictions. No special rule forbids rereading
instructions, limits a task to a scripted number of calls, or supplies
hello.py or the expected implementation.

The completion bullet makes verification an explicit project convention.
It is proposed guidance, not a claim that the full candidate file has been
measured. Report genuine failures rather than treating a planned command
or a guessed successful result as verification.

Treat search hygiene as a tool/setup question first. Separately compare Pi's
seven documented built-in tools against the current four, with the same
project file and task. Ignore-aware tools can reduce accidental traversal;
bash remains available and can still run an unrestricted find. Offering
tools is an honest configuration change, not a demonstrated guarantee.

## Test-first policy candidate

If test-first is a real project convention, add one general bullet:

> For new behavior and bug fixes, write a test first, confirm the expected
> failure, then implement and rerun the tests.

This is natural process guidance. It specifies an engineering standard,
not the solution. Do not import the long Superpowers procedure into a small
model's standing context. The stronger verification goal is observable red
then green, not the agent claiming it used TDD.

Use a neutral request such as "Add a hello world module with a Python test"
for both arms of the TDD comparison. Keep the original "then" request and
its records as the video baseline; do not quietly change it and claim only
the project policy caused the effect. Also use an existing-code behavior
task, where an assertion can fail before a fix without scaffolding a new
module. Distinguish an expected assertion failure from collection errors,
missing dependencies or interpreter failures; the latter alone do not show
that the behavior assertion can catch a regression.

## Recommendation and experiment order

Confidence is high in the factual context-loading explanation and low in
any proposed performance improvement before comparisons.

1. Replace only the app.py environment example. Repeat the unchanged
   original task from the same starting state.
2. Offer the seven built-in tools, changing no project wording in that
   comparison. Record tool choices, large results and completed behavior.
3. Compare the broader proposed project-file cleanup as a disclosed bundle;
   do not attribute its effect to an individual removed sentence. Check a
   phase task too, so the project notes still serve their real purpose.
4. Compare a short TDD policy with neutral prompts, including an existing
   behavior-change task. Report red/green adherence separately from final
   correctness, requests, elapsed time and unexpected changes.

Record all runs, not just the fastest successful take. These are demo
experiments first. A shared prompt/template, setup-skill or learn change
needs the appropriate ladder phase and an explicit Pi/OpenCode path before
being described as a shipped improvement. No universal no-reread rule is
recommended from this evidence.

## What would falsify this

**Round-one follow-up:** All five n=2 conditions, the original-prompt and
layout trials, search-scope results, and the final disposition are recorded
in the [round-one verdict](2026-10-11-bare-pi-round-one-verdict.md). No
red-green policy or shipped behavior change was made.

- General wording produces more environment/configuration mutations or
  worse phase correctness than the specific project constraints.
- Removing the app.py example leaves the same exploration pattern, weakening
  that example's causal explanation.
- The TDD bullet increases tool calls without an expected behavioral red
  followed by green, or causes the agent to weaken tests to escape red.
- A changed tool list does not reduce oversized discovery results.

## Risks

- Seven samples concern one small task and are grouped by changing global
  context; they cannot establish cross-model norms or broad reliability.
- Cache warmth and sampled decoding confound timing comparisons.
- General instructions may be more natural while less effective for Mellum;
  record that tradeoff rather than adding an accumulating list of exceptions.
- Bare Pi, Mode, Pi Worker and OpenCode have different instruction paths.
  A successful demo is not a substitute for testing the shipped recipe.
