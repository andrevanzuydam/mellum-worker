# Lessons

Every findings lesson in one place: Paul's from the mellum-worker phases and
ablations, Andre's from his pull requests. Each is one idea, follows the six
steps, and is its own phase. Most are independent: each lists its
prerequisites, [Getting started](../getting-started/index.md) is the only one
unless a lesson says otherwise, and you can read them in any order. The Basic
Remedies lessons share a control and are read as a module.

The order below is a recommendation, not a dependency chain: what the ditch
teaches first, then the remedies, then the shapes. The author is in italics
at the end of each line. Every lesson is being re-measured; its badges say
what it rests on now.

## Start here

- **[The suite baseline](baseline.md)** — Baseline Pi and the Baseline Worker on easy, medium and hard, n = 3, on llama.cpp. *(Paul)*
1. **[The primary agent is the wrong worker](primary-agent.md)** — Mellum as the main agent passes 8 of 15; bounded, it passes 15. *(Paul)*

## Prompt and project

2. **[A short prompt, not a procedure](short-prompt.md)** — Prompt v5 is 643 characters, and each line it lost had a run behind it. *(Paul)*
3. **Project facts** — A 600-character facts section takes a four-phase build from 1/12 to 9/12. *(Paul)*
4. **Write only the files you list** — Runs pass the hidden tests and still fail by writing outside the layout. *(Paul)*
5. **One spec file per phase** — A one-file roadmap misses the last phase's id in 5 of 6 runs; n = 3. *(Paul)*

## Mediation and completeness

6. **The worker moves its own goalposts** — It narrows pytest to one test function, passes that, and calls the file done. *(Andre)*
7. **The mediated test clears the hard rungs** — A frozen test the worker cannot weaken, re-dispatched: rungs 6–9 at 12/12, rung 9 cracked. *(Andre)*
8. **Implement the whole spec** — v9 closes the phase-4 id miss: 3/3 on the rung no other arm moved. *(Andre)*
9. **Mediation is a completeness gate** — It leaves the rung the worker can do alone and drags it back only when it stops short. *(Andre)*

## Loop and handoff

10. **Thinking is working memory** — Stripping earlier thinking cuts prefill 57% and makes the run slower. *(Paul)*
11. **Who holds the loop** — Worker, Mode and a delegated child pass alike and cost differently. *(Paul)*
12. **A prose brief stops at its first reply** — The same brief as one prompt loses four passes; as steps it costs 2.4× the time. *(Paul)*
13. **The intercom block is a prefill tax** — Off: the child prompt halves and prefill drops 20%, with the same passes. *(Paul)*

## Context and inputs

14. **Rungs 10–12: what the hard gates catch** — An archive decoy, a trap row and an overflowing file separate capability from completeness. *(Andre)*
15. **Context search for large code** — Index and search the few relevant lines instead of loading whole files. *(Andre)*
16. **Skeptical rethink** — Check a human's checkable claim before encoding the premise. *(Andre)*
17. **Documents and images as inputs** — Read the PDF, the spreadsheet or the screenshot the file tools cannot. *(Andre)*
18. **Live control and replay** — Watch the turns, edit the prompt, replay a bad one, pause at a boundary. *(Andre)*
19. **Next-concept verify** — Re-dispatch on the failing test functions, not the whole file. *(Andre)*
