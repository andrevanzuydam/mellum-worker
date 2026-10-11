# Bare Pi whack-a-mole: why each AGENTS.md fix moves the problem

Date: 2026-10-11. Project: ac-demo (`/Users/pauleveritt/projects/pauleveritt/ac-demo`).
Launch under study: `uv run --frozen pi --no-extensions --no-skills
--no-prompt-templates --no-themes --model omlx/Mellum2.1-12B-A2.5B-Thinking-6bit`,
with the prompt "Write a hello world module then write a Python test for it."

**What is measured.** Six Pi sessions in ac-demo on 2026-10-11 (16:16 to
16:59 EDT), read from their JSONL files: the system prompt sections and
sizes, the tool schemas offered, every tool call and the size of its result,
per-request `usage`, and the timestamps between messages. ac-demo's git
history for `AGENTS.md` (`ce215fc`, `e489b5d`, `0bd6172`). Pi 1.0.2's
installed source for how the system prompt and tool list are built
(`dist/core/system-prompt.js`, `dist/core/tools/{find,bash,truncate}.js`)
and its CLI and settings docs. Mode's code (`extensions/mellum-mode.ts`,
`mellum-facts.ts`) run against ac-demo's `AGENTS.md` with no model call. The
on-disk counts `find . -name '*.py'` (1,728 paths, 110 KB) and `fd -e py .`
(2 paths) in ac-demo. The ladder records cited by link.

**What is conjecture.** Why the model chose each call (read from its
thinking text, which is evidence of its stated plan, not of its weights).
That a bare-Pi launch with Pi's `find`, `grep` and `ls` tools would stop the
`.venv` sweep: Pi's code says what changes, no run with Mellum measures the
effect. That Mode would handle this exact prompt at or near its ladder
results: the four Mode runs recorded in ac-demo predate project facts.

## The runs

Five runs of the hello-world prompt and one aborted attempt. "Peak ctx" is
the largest `input + cacheRead` of any request in the run (the server's
count). "Wall" is user message to final assistant message. The analysis
turns by deepseek-flash that follow each run are excluded.

| time | launch | AGENTS.md in prompt | turns | tool calls | tool errors | peak ctx | largest tool result | wall | outcome |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 16:16 | `pi` with packages, skills on | yes, plus 11 k chars of skills | 2 | 1 (read) | 0 | 14.2 k | Superpowers `brainstorming/SKILL.md`, 17.5 k chars | aborted at 10 s | read a skill, aborted |
| 16:19 | bare, `-nc` | no | 10 | 9 (bash 5, read 2, write 2) | 1 (`ls -la *.py`) | 25.1 k | bash `find . -name "*.py"`: 51,316 chars, ~21 k tokens, 837 of 838 lines under `.venv/` | 18.0 s | two files written, tests never run |
| 16:30 | bare, `-nc` | no | 10 | 9 (bash 4, read 3, write 2) | 1 (`pytest -v`, exit 127) | 4.0 k | 894 chars (`ls -la`) | 11.5 s | files written, 127 not retried, "should pass" |
| 16:43 | bare, `-nc` | no | 8 | 7 (bash 4, read 1, write 2) | 0 | 3.6 k | 986 chars (`find … \| head -20`) | 7.2 s | files written, no test run; on "Run the test": `pytest` 127, `.venv/bin/pip install` 127, then `.venv/bin/pytest` passed |
| 16:48 | bare, context files on (`e489b5d`) | yes | 13 | 12 (bash 5, read 5, write 2) | 0 | 26.8 k | bash `find . -name "*.py" -o -name "*.md" \| grep -v __pycache__`: 51,327 chars | 17.0 s | read `AGENTS.md` twice and `specs/roadmap.md`; `uv run --frozen python -m pytest tests` passed |
| 16:57 | bare, context files on (`0bd6172`) | yes | 10 | 9 (bash 5, read 2, write 2) | 0 | 25.7 k | bash `find . -name '*.py'`: 51,316 chars | 16.7 s | `git ls-files`, `ls -lh`, `find`, `ls -la`; test command passed |

What the `find` cost, as the tool's own run time plus the next request's
prefill of its result (the next generation is the one that pays):

| run | find runs | next request | share of wall | result in context afterwards |
| --- | --- | --- | --- | --- |
| 16:19 | 0.5 s | 7.8 s | 8.3 s of 18.0 s, 46% | 21 k of 25.1 k peak |
| 16:48 | 1.2 s | 4.7 s | 5.9 s of 17.0 s, 35% | 21 k of 26.8 k peak |
| 16:57 | 1.7 s | 5.3 s | 6.9 s of 16.7 s, 41% | 21 k of 25.7 k peak (82%; 87% of that one request) |

Every other request in these runs had 70 to 1,700 fresh input tokens. The
two runs without the sweep (16:30, 16:43) peaked at 4.0 k and 3.6 k.

## What the model received in the last run

The system prompt was 6,276 characters in six sections, in this order, with
3,084 characters of tool schemas sent alongside:

| section | chars | starts at | what it says that matters here |
| --- | --- | --- | --- |
| preamble | 169 | 0 | "expert coding assistant operating inside pi" |
| tools | 339 | 170 | `bash: Execute bash commands (ls, grep, find, etc.)` |
| rules | 839 | 510 | `Use bash for file operations like ls, rg, find` |
| docs | 1,523 | 1,350 | Pi's own documentation paths |
| project_context | 3,346 | 2,874 | `~/.pi/agent/AGENTS.md` (2,503 chars, 40% of the prompt) then ac-demo's `AGENTS.md` (843 chars, 13%) |
| cwd | 60 | 6,221 | the directory |

The `## Mellum` section is 343 characters: 5.5% of the system prompt, 3.7%
of the instruction payload with the schemas. Its four bullets total 319
characters, under Mode's 600 cap.

The global `~/.pi/agent/AGENTS.md`, three times the project file, is about
RTK, `il`, and how to ask GLM for a review; its third bullet is "Run
`pytest`, `ruff`, `uv`, `git`, etc. directly", which contradicts the project
bullet "bare python and pytest are not on PATH" two screens later. Pi loads
it whenever context files are on (`docs/configuration.md`: agent directory,
working directory, parents), and `-nc` removes both files together.

Tools offered: `read`, `bash`, `edit`, `write`. No `find`, `grep` or `ls`
tool. Pi's `find` tool exists (`dist/core/tools/find.js`, fd-backed,
"respects .gitignore") and is off by default; `defaultTools` is `read, bash,
edit, write` (`docs/settings.md`).

## Analysis

### 1. Pi tells the model to use bash `find`, and only in this configuration

`buildRules` in `dist/core/system-prompt.js` adds the rule "Use bash for
file operations like ls, rg, find" exactly when `bash` is selected and none
of `grep`, `find`, `ls` is. The default tool set is that case. So the bare
launch does two things at once: it withholds the gitignore-aware `find`
tool, and it instructs the model to use the shell's `find`, which ignores
nothing. The `tools` section repeats the hint ("ls, grep, find, etc.").
Both lines sit 2,400 characters before the project bullets, in Pi's own
voice.

The shell `find` in ac-demo returns 1,728 paths (110 KB). Pi's bash tool
truncates to the last 50 KB, so the model received lines 890 to 1,726, all
`.venv/`, with a note pointing at a temp file. Pi's `find` tool, through
fd, returns 2 paths here. `.ignore` and `.fdignore` change fd's behaviour,
which already honours `.gitignore`; they do nothing for `/usr/bin/find`.

### 2. The model does attend to the bullets; it reads them as leads

Evidence that the bullets are read, from the calls and the thinking:

- 16:57 turn 2: `git ls-files` first, the bullet added at 16:55.
- Both runs with `AGENTS.md` loaded ran the exact `Test command:` bullet;
  the three runs without it ran `pytest`, nothing, or nothing.
- No run with the `Do not:` bullet added `__init__.py`, `conftest.py` or
  installed a package; the 16:43 run without it tried `pip install`.

Evidence that they are read as things to look into, not as constraints:

- 16:57 turn 3, after `ls -lh`, quoting the uv bullet: "There's `app.py`
  mentioned in the project instructions … So there's likely an `app.py`.
  Let me check if it exists." Turn 4 is `find . -name '*.py'`. The bullet
  written at 16:48 to fix exit 127 named a file that does not exist yet and
  produced the 16:57 sweep.
- 16:48 turns 4 and 5: `read AGENTS.md`, then `read /Users/…/ac-demo/AGENTS.md`
  ("There's a … AGENTS.md file mentioned in the project context. Let me read
  that one too"), both already in the system prompt; then `ls specs` and
  `read specs/roadmap.md` because the file mentions `specs/`.
- 16:19 turn 7, after the sweep: "We have a lot of virtual environment
  files, but no obvious source code" and moves on; the result bought
  nothing, and stayed in every later request.

A 2.5B-active model following a positive imperative ("Test command: X" →
runs X) while ignoring a parenthetical negative ("(find . walks .venv/)")
that opposes a rule the harness itself stated is the whole pattern. Each
new bullet is one more noun in a prompt the model is told to explore, and
the earlier "Do not: search .venv/" (`e489b5d`) was removed at `0bd6172`
because it had not stopped the search either.

### 3. The prompt invites the exploration

"Write a hello world module then write a Python test for it" names no
file, no directory, no command. In all five runs the first three to five
turns are the model deciding where modules live ("maybe a `modules`
directory", "a `src` directory? Not present", "is there an `app.py`?").
The README's right-sizing rule is that this exploration belongs to the
main model or the user, and the M.7 probe measured the gap on ac-demo: a
full task line 27 requests, a developer sentence 47 to 53
([m7 note](2026-10-09-m7-project-facts.md)). The ladder's rung 5, a change
described only by a symptom, is where bare Pi scores 0/3
([0c plain](../../ladder/phase0c-primary-plain/README.md)).

### 4. Why this cannot be fixed one bullet at a time

Each fix so far addressed the mole's symptom in the one place Paul can
edit, `AGENTS.md`, and that file is 13% of a prompt whose other 87% was
written for a frontier model. The causes are structural:

| cause | where it lives | reachable from AGENTS.md? |
| --- | --- | --- |
| "Use bash for … find" rule and no `find` tool | Pi's tool selection | no: a Pi flag or setting |
| global `AGENTS.md` contradicting the project's | `~/.pi/agent/AGENTS.md` | no: another file, or `-nc` |
| bash output capped at 50 KB, tail kept | Pi's bash tool | no |
| the vague task | the prompt | no |
| no completion fact ("done only when the test command exits 0") | Pi's base prompt | only as another bullet, measured as the lever in the worker prompt ([0b](../../ladder/phase0b-baseline-v3/README.md)) |
| empty finals, false "fixed" claims (4 and 3 of 15 bare-Pi runs) | no guards | no |

Mode's design is these rows, settled by the ladder: its own 643-character
prompt replaces Pi's, seven tools including fd-backed `find`, no context
files except the `## Mellum` bullets, and two guards. The bare-Pi
whack-a-mole is an attempt to rebuild that from inside `AGENTS.md`.

### 5. The same prompt through Mode

Run without a model against the current ac-demo `AGENTS.md`
(`readProjectFacts` from `extensions/mellum-facts.ts`): source `agents-md`,
four bullets, 319 characters, test command recognised as `uv run --frozen
python -m pytest tests`. What each Mellum request would carry:

| | bare Pi (16:57) | Mode |
| --- | --- | --- |
| system prompt | 6,276 chars: Pi preamble, tools, rules, docs, global and project `AGENTS.md`, cwd | 643 chars: `prompts/mellum-worker.md` |
| tools | read, bash, edit, write | read, grep, find, ls, bash, edit, write; `find` and `grep` honour `.gitignore` |
| "use bash for find" rule | present | absent |
| project facts | whole `AGENTS.md`, inside 3,346 chars of project_context | the four bullets as `Project facts:` appended to the task |
| global `~/.pi/agent/AGENTS.md` | sent | not sent |
| completion rule | none | "complete only when the test command exits 0; if it fails, read, change, run again" |
| guards | none | empty-final nudge (≤3), loop breaker |
| record | session JSONL only | `~/.pi/agent/mellum-mode-runs.jsonl` line, handoff block |

Measured neighbours: Mode 14/15 on rungs 1–5, 15/15 with facts; 9/12 on the
AgentClinic rungs with the section against 1/12 without
([summary](../../ladder/ablation-summary.md)). Bare Pi 8/15. The four Mode
runs recorded in ac-demo (2026-10-09, before facts existed) were 21, 7, 18
and 27 requests; their first command was always a test command and none of
their 23 recorded shell commands is a `find`; the two hello-world runs lost
their time to `uv run --offline pytest -q` failing to import `hello`, since
fixed by `pythonpath = ["."]` in `pyproject.toml` and by the `Test command:`
bullet ([finding](2026-10-09-ac-demo-hello-world-finding.md)). Mode's
`bash` tool can still run `find .`; nothing in the records shows it did.

### 6. The levers

| lever | structural? | evidence | cost to an honest demo |
| --- | --- | --- | --- |
| `--tools read,grep,find,ls,bash,edit,write` | yes: removes Pi's bash-find rule (`buildRules`), adds fd-backed `find` (2 paths, not 1,728) | Pi source; on-disk counts; not run with Mellum | none: Pi's own built-in tools, a documented flag |
| project `.pi/settings.json` with `"defaultTools": ["+grep","+find","+ls"]` | same, persistent | `docs/settings.md` | none, but trust-gated: needs `/trust` or `-a` |
| `-nc` (no context files) | removes the facts too | 16:30 and 16:43: smallest contexts, but `pytest` 127 and no test run | none; loses the test command |
| `-nc --append-system-prompt <file with the ## Mellum bullets>` | drops the 2,503-char global file and its contradiction, keeps the facts | not run | low: the bullets are the project's own; it is what Mode does by code |
| edit or move `~/.pi/agent/AGENTS.md` | removes the contradiction for every bare run | the file's text | none, Paul's decision |
| `--system-prompt prompts/mellum-worker.md` with the seven tools | the ladder's "worker alone" launch | 15/15 on rungs 1–5 ([A3](../../ladder/ablation-a3-v4b/README.md)) | medium: a published, measured prompt, but it is the recipe's prompt, and without `-nc` Pi still appends both `AGENTS.md` files |
| Mode: `/mellum <task>` or `pi -p "/mellum <task>"` | all rows at once, plus facts, guards, record | 14–15/15; 9/12 | the demo shows mellum-worker's recipe, not bare Pi; the prompt is 643 public characters and the facts are the project file |
| a precise brief (file names, test command) | no, but measured | README right-sizing; M.7 probe 27 vs 47–53 requests | high for this demo: it reads as rigging the prompt |
| `.ignore`, `.fdignore` | no | affects fd and rg only | none, and no effect on bash `find` |
| codemode | no | a 2.5B model writing JS filters is unmeasured | not for this |
| another `AGENTS.md` bullet | no | three tried today, each moved the problem | none, and the record says it will not hold |

## Recommendation

**Demo Mode.** ac-demo's own `AGENTS.md` already says "one `/mellum` request
per phase"; the demo should do what the file says. Mode is the measured
recipe, and every structural cause above is absent from the request it
sends. The honesty case: the model, the task sentence and the project file
are unchanged; what changes is 643 public characters of prompt in place of
Pi's 6,276, and seven of Pi's own tools in place of four.

```bash
cd /Users/pauleveritt/projects/pauleveritt/ac-demo
uv run --frozen pi            # packages load; Mode strips them from Mellum's requests
# in the TUI:
/mellum Write a hello world module then write a Python test for it.
```

or headless, one line:

```bash
uv run --frozen pi -p "/mellum Write a hello world module then write a Python test for it."
```

Do not pass `--no-extensions`: Mode is a package extension. The installed
package is v0.1.4 (`~/.pi/agent/settings.json`), which has project facts
(shipped in 0.1.3).

**If the story must be "Mellum alone in Pi",** change one flag and keep
everything else:

```bash
uv run --frozen pi --no-extensions --no-skills --no-prompt-templates --no-themes \
  --tools read,grep,find,ls,bash,edit,write \
  --model omlx/Mellum2.1-12B-A2.5B-Thinking-6bit
```

This deletes Pi's "use bash for find" rule and offers a `find` that returns
2 paths. It is unmeasured with Mellum; expect the exploration turns and the
missing completion rule to remain (bare Pi's empty finals and false claims
are not guarded here). Optionally add `-nc --append-system-prompt
/path/to/mellum-section.md` to drop the global `AGENTS.md`.

**Pre-demo check, no model call:**

1. Clean the project. `git status --short` in ac-demo shows `hello.py` and
   `tests/test_hello.py` untracked from today's runs, plus `__pycache__/`;
   the demo prompt must start without them.
2. `fd -e py . | wc -l` (0 after cleanup) against `find . -name '*.py' | wc -l`
   (about 1,728): the two tools the launch chooses between.
3. `node ~/.pi/agent/git/github.com/pauleveritt/mellum-worker/scripts/mellum.mjs check --host pi`
   (reads only; exits 1 on a settings fail).
4. Facts as Mode will read them, from the mellum-worker checkout
   (Node 24+ runs the `.ts` directly):

   ```bash
   node --input-type=module -e '
   import { readFileSync, existsSync } from "node:fs";
   const m = await import("./extensions/mellum-facts.ts");
   console.log(m.readProjectFacts("/Users/pauleveritt/projects/pauleveritt/ac-demo",
     { read: p => existsSync(p) ? readFileSync(p, "utf8") : undefined }));'
   ```

   Expect `source: "agents-md"`, `chars: 319`, `testCommand: "uv run --frozen python -m pytest tests"`.
5. One dry run before the audience (a model call; Paul's choice of time).
   Afterwards: the session shows `[mellum-mode on] facts: agents-md`, and
   the last line of `~/.pi/agent/mellum-mode-runs.jsonl` has
   `facts.source == "agents-md"`, no `find` in `commands`, and
   `lastCommand == "ok"`. For the bare-Pi variant, the newest session file's
   system message must list seven `toolsAdded` names and its `sections.rules`
   must not contain "Use bash for file operations".

**Decisions for Paul.**

- Mode or bare Pi for the demo (above).
- The uv bullet names `app.py`, which does not exist until phase 1 and is
  what sent the 16:57 run looking; the roadmap already carries
  `uv run --frozen python app.py`. Whether the bullet earns its place is a
  wording decision this note does not make.
- The global `~/.pi/agent/AGENTS.md` line "Run `pytest`, `ruff`, `uv`,
  `git`, etc. directly" reaches every bare-Pi session with context files on.

## What would falsify this

- A bare-Pi run with `--tools read,grep,find,ls,bash,edit,write` on the same
  prompt that still runs bash `find .` over `.venv/`: the rule is not the
  cause, the habit is, and only Mode's prompt or a brief would hold.
- A Mode run of this prompt in ac-demo that sweeps `.venv/` through its
  `bash` tool, or ignores the forwarded test command: Mode does not fix
  this case either.
- The same prompt with the uv bullet removed still ending in a `find`: the
  "bullets as leads" reading is overstated and the search is unconditional.
- A ladder phase of bare Pi with the seven tools and context files on at
  13/15 or better on rungs 1–5: the tool list alone carries Mode's gain,
  against 0c's reading that the prompt's completion facts and the nudge do.

## Risks

- Five runs at temperature 1, one machine; the per-run differences include
  sampling. The 16:43 run's `find … | head -20` was luck, not a rule.
- Mode's interactive facts path is unit-tested and not yet observed in a
  real session (recipe §4b caveat); step 5 above is the observation, and it
  should happen before the audience is in the room.
- Mode's `bash` tool is unrestricted; a `find .` through it would cost the
  same 50 KB. Nothing in the 4 ac-demo records or the ladder's published
  tables shows one; the raw traces in the research releases would settle it.
- The 16:16 run shows the other failure mode of "just launch pi": with
  packages and skills on, Mellum's first act was to read a 17.5 k-character
  Superpowers skill. The Mode launch loads the same packages in the parent;
  Mode strips them from Mellum's requests, but the startup and the TUI are
  the full profile's.
- The vague prompt stays vague in Mode. Its runs will still spend turns on
  "where does a module go"; the measured remedy is a brief, which this demo
  declines on purpose.
