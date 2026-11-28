# data_takeover_b1: the teacher's corrections at the student's own mistakes

Built 2026-11-28 with:

    uv run --no-project --with jinja2 --with tokenizers python r1d/build_sft.py \
        --source-all-phases ../../runs/2026-11-28-takeover-b1 --teacher mellum --format deepseek \
        --tokenizer ~/models/r1d-1.5b/hf-tooltokens-v3 --out r1d/data_takeover_b1

- **Source:** take-over batch `runs/2026-11-28-takeover-b1` (see `r1d/DISTILL.md`): 7 `scratch-train` tasks x 3.
  The student (DeepSeek-R1-Distill-Qwen-1.5B, sft-v3-u900) works each task until its first mistake point (a read
  of a missing file, a shell syntax error, the same failing call twice, or 8 looks before any file is written);
  then Mellum 2.1 on the lab answers the rest of the run in the same session (`r1d/takeover.ts`). The steps are
  Mellum's answers to the student's own situations.
- **What a row is:** one teacher step after the switch, rendered with `r1d/deepseek_tools.jinja`, once per
  thinking mode, as in `data_sft_v2`. The student's own steps are context only, never a completion.
- **Gates, all must hold:** the run passed its hidden tests **and** its quality checks (ruff, complexity:
  `takeover_run_ok`); the step's own call succeeded; a written `.py` file parses (`writes_bad_python`). Eval
  suites are refused by name (easy, medium, hard, AgentClinic, the Python eval tasks).

Build output:

    examples: {'takeover-run-not-passed': 12, 'student-step-not-taught': 67, 'failed-step-skipped': 21,
               'bad-python-skipped': 1, 'ok': 356}
    train 356 examples, 2659979 tokens
    valid 0 examples, 0 tokens

178 teacher steps x 2 modes from 9 runs. Taught calls: bash 108 (63%), read 27 (15%), write 20 (11%), edit 14
(8%); most bash calls are `python -c` checks of the code just written. The teacher's first step after the switch:
bash 5 runs, write 2, read 2, so the correction is often a look at the real layout before the write, not the
write itself.
