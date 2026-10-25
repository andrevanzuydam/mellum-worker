# Lessons

Every findings lesson in one place: Paul's from the mellum-worker phases and
ablations, Andre's from his pull requests. Each is one idea and follows the six
steps. Scheduled lessons are their own phase; the deferred entries are
candidates until their stated gate. Most are independent: each lists its
prerequisites, [Getting started](../getting-started/index.md) is the only one
unless a lesson says otherwise, and you can read them in any order.

The order below is a recommendation, not a dependency chain: what the ditch
teaches first, then the remedies, then the shapes. The author is in italics
at the end of each line. Every lesson is being re-measured; its badges say
what it rests on now.

## Start here

- **[The suite baseline](baseline.md)** — Baseline Pi and the Baseline Worker on easy, medium and hard, n = 3, on llama.cpp. *(Paul)*
1. **[The primary agent is the wrong worker](primary-agent.md)** — An unbounded Pi passed 1 of 3 easy sessions; the baseline separates them on medium. *(Paul)*

## Paul's lessons

2. **[A short prompt, not a procedure](short-prompt.md)** — Prompt v5 is 643 characters, and on easy it did not move a pass: a null at n = 3. *(Paul)*
3. **[Thinking is working memory](thinking-working-memory.md)** — The strip-thinking arm has no instrument on llama.cpp; thinking spends the output budget. *(Paul)*
4. **[Guards for empty turns and loops](guards-for-empty-turns.md)** — The nudge never fired in ten easy sessions: no empty turn had the shape it answers. *(Paul)*
5. **[Project facts](project-facts.md)** — The block reaches the model in every request and did not move easy at n = 3. A null, with a lead. *(Paul)*
6. **[Write only the files you list](write-only-listed.md)** — A file-set check now runs after every session; easy showed no writes outside the layout. *(Paul)*
7. **Who holds the loop** — *retired 2026-10-24.* It compared worker, Mode and a
   delegated child; LC.8 renamed Mode to Worker and removed the delegated child,
   so there is no second policy left to compare. The number is kept so the other
   entries stay stable. *(Paul)*
8. **A prose brief stops at its first reply** — The same brief as one prompt loses four passes; as steps it costs 2.4× the time. *(Paul)*
9. **The intercom block is a prefill tax** — *re-scoped 2026-10-24.* LC.8 removed
   the block, so the page states the reason it went rather than a measured tax.
   *(Paul)*
10. **One spec file per phase** — A one-file roadmap misses the last phase's id in 5 of 6 runs; n = 3. *(Paul)*

Lessons 5–10 still carry the wording their digest gave them. Each is a
feature cycle that re-measures it on llama.cpp when its page is written; the
numbers above are the plan, not a citation.

## Andre's mediation

11. **The worker moves its own goalposts** — It narrows pytest to one test function, passes that, and calls the file done. *(Andre)*
12. **The mediated test clears the hard rungs** — A frozen test the worker cannot weaken, re-dispatched: rungs 6–9 at 12/12, rung 9 cracked. *(Andre)*
13. **Implement the whole spec** — v9 lifts the phase-4 id miss from 0 to 2/3; v11's self-check takes it to 3/3. *(Andre)*
14. **Mediation is a completeness gate** — It leaves the rung the worker can do alone and drags it back only when it stops short. *(Andre)*

## Context and inputs

Entries #16–#20 are **Intermediate candidates** (INT.3), not scheduled
Lessons; #15 remains a lesson candidate. Each needs a recorded screen before
it becomes a lesson page.

15. **Rungs 10–12: what the hard gates catch** — An archive decoy, a trap row and an overflowing file separate capability from completeness. *(Andre)*
16. **Context search for large code** — Index and search the few relevant lines instead of loading whole files. *(Andre)*
17. **Skeptical rethink** — Check a human's checkable claim before encoding the premise. *(Andre)*
18. **Documents and images as inputs** — Read the PDF, the spreadsheet or the screenshot the file tools cannot. *(Andre)*
19. **Live control and replay** — Watch the turns, edit the prompt, replay a bad one, pause at a boundary. *(Andre)*
20. **Next-concept verify** — Re-dispatch on the failing test functions, not the whole file. *(Andre)*

## Pathologies

21. **The runaway search** — A recursive search that leaves the workspace can hang the whole run; the guard is proposed on branch `lc11b-confinement` ([code](https://github.com/pauleveritt/mellum-worker/blob/176922f05702d6f8e87a9b2570ed6fe9807db733/extensions/mellum-guards.ts#L145-L185), [tests](https://github.com/pauleveritt/mellum-worker/blob/176922f05702d6f8e87a9b2570ed6fe9807db733/tests/mellum-guards.test.mjs#L13-L40)). *(Andre)*
22. **The server that never returns** — It started `uvicorn` in the foreground and burned the deadline; exercise the endpoint in process, or detach it and keep the pid ([guard](https://github.com/pauleveritt/mellum-worker/blob/420ba1d/extensions/mellum-guards.ts), [prompt v10](https://github.com/pauleveritt/mellum-worker/blob/4666612/prompts/mellum-worker.md)). *(Andre)*
23. **The rule it knew and skipped** — It read the rule, then left the field `None` in one run of three; a clause-by-clause check against the spec closed it ([prompt v11](https://github.com/pauleveritt/mellum-worker/blob/da04888/prompts/mellum-worker.md)). *(Andre)*
