# Easy Lessons

Pi's own tools, one per lesson: what each gives the model, the failure it
invites, and the one remedy for that failure. You start from bare Pi; each
lesson's *before* is everything the earlier lessons added, and its *after*
adds one unit. After E6 you have `preset:easy`, where Medium starts.

![A small robot turning one large dial while a light bulb switches on](../../assets/illustrations/tier-easy.webp){ .illustration }

<div class="grid cards" markdown>

-   **[E1 · Read the Failure](read-the-failure.md)**

    ---

    Run bare Pi, read `run.json` and the trace, and name what went wrong.
    Adds nothing; every later lesson depends on it.

-   **[E2 · Looking Around](looking-around.md)**

    ---

    `read` and `ls`, and the repeat loop they invite.
    Adds `guard/break-repeat-loops`.

-   **[E3 · Searching](searching.md)**

    ---

    `grep` and `find`, and the search that crawls the whole machine.
    Adds `guard/stay-in-workspace`.

-   **[E4 · Creating Files](creating-files.md)**

    ---

    `write` against `edit`, and the whole-file rewrite.
    Adds `guard/refuse-whole-file-rewrite`.

-   **[E5 · Running Commands](running-commands.md)**

    ---

    `bash`, and the foreground server that hangs the session.
    Adds `guard/block-foreground-server`.

-   **[E6 · Too Many Tools](too-many-tools.md)**

    ---

    The tool list itself, and tools the model uses badly.
    Adds `context/narrow-tools` and completes `preset:easy`.

</div>
