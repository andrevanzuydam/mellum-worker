# Lessons

Every findings lesson in one place: Paul's from the mellum-worker phases and
ablations, Andre's from his pull requests. Each is one idea, follows the six
steps, and is its own phase. They are independent: each lists its
prerequisites, [Getting started](../getting-started/index.md) is the only
one unless a lesson says otherwise, and you can read them in any order.

The order below is a recommendation, not a dependency chain: what the ditch
teaches first, then the remedies, then the shapes. The author is in italics
at the end of each line. Every lesson is being re-measured; its badges say
what it rests on now.

## Lessons

1. **[The primary agent is the wrong worker](primary-agent.md)** — Mellum as the main agent passes 8 of 15; bounded, it passes 15. *(Paul)*
2. **[A short prompt, not a procedure](short-prompt.md)** — Prompt v5 is 643 characters, and each line it lost had a run behind it. *(Paul)*
3. **The worker moves its own goalposts** — It narrows pytest to one test function, passes that, and calls the file done. *(Andre)*
4. **The mediated test clears the hard rungs** — A frozen test the worker cannot weaken, re-dispatched: rungs 6–9 at 12/12, rung 9 cracked. *(Andre)*
5. **Implement the whole spec** — v9 closes the phase-4 id miss: 3/3 on the rung no other arm moved. *(Andre)*
6. **Mediation is a completeness gate** — It leaves the rung the worker can do alone and drags it back only when it stops short. *(Andre)*
7. **Project facts** — A 600-character facts section takes a four-phase build from 1/12 to 9/12. *(Paul)*
8. **Write only the files you list** — Runs pass the hidden tests and still fail by writing outside the layout. *(Paul)*
9. **Guards for empty turns and loops** — Without the nudge and the breaker, two of fifteen runs end with nothing. *(Paul)*
10. **Thinking is working memory** — Stripping earlier thinking cuts prefill 57% and makes the run slower. *(Paul)*
11. **Who holds the loop** — Worker, Mode and a delegated child pass alike and cost differently. *(Paul)*
12. **A prose brief stops at its first reply** — The same brief as one prompt loses four passes; as steps it costs 2.4× the time. *(Paul)*
13. **The intercom block is a prefill tax** — Off: the child prompt halves and prefill drops 20%, with the same passes. *(Paul)*
14. **One spec file per phase** — A one-file roadmap misses the last phase's id in 5 of 6 runs; n = 3. *(Paul)*
15. **Rungs 10–12: what the hard gates catch** — An archive decoy, a trap row and an overflowing file separate capability from completeness. *(Andre)*
16. **Context search for large code** — Index and search the few relevant lines instead of loading whole files. *(Andre)*
17. **Skeptical rethink** — Check a human's checkable claim before encoding the premise. *(Andre)*
18. **Documents and images as inputs** — Read the PDF, the spreadsheet or the screenshot the file tools cannot. *(Andre)*
19. **Live control and replay** — Watch the turns, edit the prompt, replay a bad one, pause at a boundary. *(Andre)*
20. **Next-concept verify** — Re-dispatch on the failing test functions, not the whole file. *(Andre)*
