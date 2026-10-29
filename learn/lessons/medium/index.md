# Medium Lessons

You start where Easy ended, from `preset:easy`, so every failure here is one
the Easy remedies cannot fix. Each lesson adds one thing: what the model is
told, how its turns end, a tool of ours, a check, or the shape of the task.
After M10 you have `preset:medium`, where Hard starts.

![A small robot studying a long unrolled scroll through a magnifying glass](../../assets/illustrations/tier-medium.webp){ .illustration }

<div class="grid cards" markdown>

-   **[M2 · Tell It How to Test](tell-it-how-to-test.md)**

    ---

    The project's own test command, in every request.
    Adds `context/add-project-facts`.

-   **[M3 · A Short Prompt](a-short-prompt.md)**

    ---

    A 643-character prompt in place of a procedure.
    Adds `context/use-short-prompt`.

-   **[M4 · Nudge an Empty Turn](nudge-an-empty-turn.md)**

    ---

    A turn that ends with nothing, part-way through.
    Adds `nudge/nudge-empty-turn`.

-   **[M5 · Thinking Is Working Memory](thinking-is-working-memory.md)**

    ---

    What happens when earlier reasoning is dropped.
    Keeps reasoning, the default.

-   **[M6 · Run Long Commands Safely](run-long-commands-safely.md)**

    ---

    A watcher or server run in the background, with its output returned.
    Adds `tool/background-long-commands`.

-   **[M7 · Look It Up](look-it-up.md)**

    ---

    A `lookup` tool over the installed packages, instead of a guess.
    Adds `tool/lookup-library-docs`.

-   **[M8 · Check Before Finishing](check-before-finishing.md)**

    ---

    Lint and type checks before the model may stop.
    Adds `check/check-code-quality`.

-   **[M9 · One Spec per Phase](one-spec-per-phase.md)**

    ---

    How the brief is laid out: one spec file per phase.
    Task shaping, `--specs split`.

-   **[M10 · Steps, Not One Brief](steps-not-one-brief.md)**

    ---

    How the brief is delivered: phase by phase, not all at once.
    Task shaping, against `--single-prompt`.

</div>
