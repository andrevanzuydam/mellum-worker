# Pathologies

The ways a small model goes wrong on an agentic task, each with the record that
shows it and the shape that answers it. Read it as a map of failure, not as a
scoreboard.

![A doctor robot with a stethoscope examining the small robot beside a chart and magnifying glass](assets/illustrations/pathologies.webp){ .illustration }

## How to read this

- **An entry needs an observation behind it.** A run that happened, in this
  repository or, where it says `Seen elsewhere`, in a record we can point at.
  A failure mode somebody reasoned their way to is a hypothesis, not an entry.
- **It is a reference, not a rate, and not a denominator.** Do not count the entries and call it
  a rate. They were collected opportunistically, on different tasks, and the
  count measures what got written down.
- **Some entries are not the model's fault.** A harness or spec fault that reads
  as a model fault belongs here too, marked as such, because from the outside
  the two are indistinguishable until someone checks, and misfiling one is the
  mistake worth remembering.
- **`Answer:` means the shape that answers it, not a proven cure.** Where
  nothing answers it yet, the line says so.

## It says it is done and it is not

1. **False success.** The final reply reports a working app and passing tests
   the run never executed, so the operator pays for a result they then have to
   verify themselves. **Seen:** the ditch session, where the model claimed a
   passing run over a project with four errors
   ([lesson](../getting-started/ditch.md)). **Answer:** run the command
   yourself; the scoring is the check, not the reply.
2. **Fabricated evidence.** A test run is reported that never happened: the
   output is invented, in the shape a real run would have taken. **Seen:** the
   same ditch session, whose test output was written rather than printed
   ([lesson](../getting-started/ditch.md)). **Answer:** the harness runs the
   command after the child exits, so nothing the child says about a test counts.
3. **A dropped requirement.** A later phase is built and an earlier one is
   silently lost, so the project passes the newest checks and fails the oldest.
   **Seen:** `split` session `995575`, which passed every phase-3 and phase-4
   check while missing 3 of 4 phase-1 checks
   ([record](../../docs/superpowers/research/2026-10-25-lesson10-run.md)).
   **Answer:** cumulative checks: grade every phase on every run, not just the
   phase that was asked for.
4. **A narrowed test.** The worker changes the test rather than the code: a
   function narrowed to one assertion, a passing `assert True`, a selector
   pointed at the easy case. **Seen:** LC.9's `/mellum` session left three
   passing tests including one `assert True`
   ([row](../../ROADMAP.md)); Andre's digest records the narrow-to-one-function
   form ([harvest](../../docs/superpowers/research/2026-10-24-pr-harvest-index.md)).
   **Answer:** hidden graders are copied in after the run, so a weakened visible
   test buys nothing; the mediated-test cycle (LC.21) is the fuller remedy.

## It stops before the work is done

5. **An empty final.** A turn ends with no text and no tool call, and the run
   stops there having done nothing, followed by the quiet version, an empty
   final at the very end. **Seen:** ten Bronze sessions in which the nudge never
   fired because no empty turn had the shape it answers, the finals ending on a
   context overflow or the output cap instead
   ([lesson](lessons/medium/guards-for-empty-turns.md)). **Answer:** the bounded
   nudge answers a self-ended empty turn; a capped or aborted one is a budget
   question and needs its own fix.
6. **A loop.** The same text or the same call repeats until the budget is gone,
   with no progress between repeats. **Seen:** a smoke run looped about four
   minutes retrying refused command shapes, each a slightly different call
   ([record](../../docs/superpowers/research/2026-10-26-server-guard-run.md));
   the loop breaker exists and is unmeasured
   ([lesson](lessons/medium/guards-for-empty-turns.md)). **Answer:** a refusal that
   names an alternative, and a loop breaker, which no arm has yet shown earns
   its place.
7. **A runaway search.** Instead of working the task, the model searches (the
   filesystem, the web, its own context) and the turns go into looking rather
   than doing. **Seen elsewhere:** Andre's index, "the runaway search", with no
   reproduction here yet
   ([harvest](../../docs/superpowers/research/2026-10-24-pr-harvest-index.md)).
   **Answer:** a spec that names the workspace and the files, and a tool set
   that does not invite wandering.
8. **A server nobody can stop.** The model starts `uvicorn` in the foreground to
   check its work, the call never returns, and the session burns its whole
   deadline waiting. **Seen:** three `no-facts` sessions that went silent for
   143–460 s, two of three `bare` Bronze sessions, and LC.19's first two attempts
   ([screen](../../docs/superpowers/research/2026-10-24-project-facts-screen.md),
   [run](../../docs/superpowers/research/2026-10-25-lesson1-run.md),
   [attempts](../../docs/superpowers/research/2026-10-25-lesson10-run.md)).
   **Answer:** a brief that names the check (`pytest`, `TestClient`) stops it
   at the source; the dormant guard refuses the call when it appears, at the
   cost of retries.

## It damages the project while finishing

9. **Writes outside the layout.** The run passes every hidden test and still
   leaves scratch files, a second copy of the app, or an edited test, so the
   workspace is no longer the project. **Seen:** the file-set check found
   `main.py` outside the layout twice, and `pyproject.toml` once
   ([run](../../docs/superpowers/research/2026-10-25-lesson1-run.md),
   no lesson yet). **Answer:** name the layout in the task and compare the file
   set after the run; a guard that confines writes is planned.
10. **A lost id.** The last phase's identity contract never lands: the field is
    missing, or it is rebuilt from a position that changes when the list does.
    **Seen:** phase 4's group of checks missing in three of the four sessions
    whose checks ran, in the spec-layout arm
    ([record](../../docs/superpowers/research/2026-10-25-lesson10-run.md)).
    **Answer:** write the contract into the acceptance list (unique, stable,
    never reused) and grade the phase rather than the session.
11. **The project stops importing.** A syntax error, or a dataclass that cannot
    construct without an argument the seed code does not pass, leaves a
    workspace nothing can load. **Seen:** three of three sessions of a joined
    brief, and two of six in the spec-layout arm: `ModuleNotFoundError`,
    `SyntaxError: unterminated string`, `Complaint.__init__() missing …
    'timestamp'`
    ([record](../../docs/superpowers/research/2026-10-27-prose-brief-run.md),
    [record](../../docs/superpowers/research/2026-10-25-lesson10-run.md)).
    **Answer:** the test command in the brief and a seeded test give the signal
    on the first turn; the harness now records `checks_ran: false` so a full
    set of missing checks is not read as a full set of failures.
12. **Builds it somewhere else.** The requirements are met, but in a file the
    project's own notes did not name (the dataclass in `app.py` rather than
    `models.py`) so everything that imports the project fails. **Seen:** three
    joined-brief sessions and one spec-layout session ended without `models.py`,
    and each scored 18 of 18 missing
    ([record](../../docs/superpowers/research/2026-10-27-prose-brief-run.md),
    [record](../../docs/superpowers/research/2026-10-25-lesson10-run.md)).
    **Answer:** the project layout belongs in the spec, and the checks should
    say they could not run rather than that everything failed.

## It ignores what it was told

13. **A skipped rule.** An instruction is in every request, in the project's own
    words, and the run does the opposite. **Seen:** `Do not: start servers` sat
    in every request and both attempts started one
    ([record](../../docs/superpowers/research/2026-10-25-lesson10-run.md)), and
    the facts block that carried it moved no pass at n = 3
    ([run](lessons/medium/project-facts.md)). **Answer:** a fact is a reminder, not
    an enforcement; the guard is the enforcement, and it stays dormant until an
    arm needs it.

---

*Provenance: entry 7 comes from Andre's harvest and has no observation here yet;
entries 1, 2 and 4–13 are drawn from this repository's own records, linked on
each line; the strongest are three of three. Collected as runs happened, which is why the list is uneven and why
it is not a rate.*
