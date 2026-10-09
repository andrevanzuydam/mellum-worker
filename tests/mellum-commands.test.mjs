import assert from "node:assert/strict";
import test from "node:test";
import { commandMutatesFiles } from "../extensions/mellum-commands.ts";

const MUTATING = ["rm tests/test_hello.py", "mv hello.py tests/hello.py", "touch __init__.py",
	"echo hi > out.txt", "cat <<'X' > f.py\nprint(1)\nX", "git checkout -- x.py", "pip install pytest",
	"uv run python -m venv venv", "sed -i '' s/a/b/ f", "cd x && rm y", "make 2>&1 | tee log.txt", "ls >> log"];
const READ_ONLY = ["uv run --offline pytest -q", 'python -c "print(1 > 0)"', "grep -v '>' x", "cmd 2>&1",
	"cmd > /dev/null", "cmd > /dev/null 2>&1", 'uv run python -c "import sys; print(sys.path)"', "git status",
	"git diff", "ls -R", "cat <<'EOF'\nrm -rf build\nEOF", "node --test calculator.test.js", "echo rm"];

test("commands that change files or the environment are mutating", () => {
	for (const c of MUTATING) assert.equal(commandMutatesFiles(c), true, c);
});
test("read-only commands are not", () => {
	for (const c of READ_ONLY) assert.equal(commandMutatesFiles(c), false, c);
});
