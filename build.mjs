/**
 * Renders the two agent templates from the single prompt file.
 * Run `node build.mjs` after editing prompts/mellum-worker.md.
 * tests/templates.test.mjs fails when the files on disk are stale.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
export const PLACEHOLDER = "{{MELLUM_WORKER_ROOT}}";

const PI_FRONTMATTER = `---
name: mellum-worker
description: Bounded coding task on the local Mellum model
model: omlx/Mellum2.1-12B-A2.5B-Thinking-6bit
advertise: true
systemPromptMode: replace
inheritProjectContext: false
inheritGlobalContext: false
inheritSkills: false
extensions:
subagentOnlyExtensions: ${PLACEHOLDER}/extensions/mellum-guards.ts
tools: read, grep, find, ls, bash, edit, write
excludeTools: contact_supervisor
acceptance:
  level: none
  reason: the parent verifies the child by running the tests itself
---
`;

// steps: the Pi ladder averaged 11 Mellum requests per task with no cap;
// 40 leaves room for the long multi-file rungs without letting a loop run all day.
const OPENCODE_FRONTMATTER = `---
description: Bounded coding task on the local Mellum model. Give it exact file paths, literal search terms, a precise change, and the test command. Not for exploration or design.
mode: subagent
model: omlx/Mellum2.1-12B-A2.5B-Thinking-6bit
temperature: 1
top_p: 0.95
steps: 40
options:
  chat_template_kwargs:
    enable_thinking: true
    preserve_thinking: true
  top_k: 20
  min_p: 0
tools:
  skill: false
  task: false
  todowrite: false
  todoread: false
  webfetch: false
  websearch: false
permission:
  read: allow
  grep: allow
  glob: allow
  list: allow
  edit: allow
  bash: allow
---
`;

export function render() {
	const prompt = readFileSync(resolve(ROOT, "prompts", "mellum-worker.md"), "utf8").trim() + "\n";
	return {
		"templates/pi/mellum-worker.agent.md": PI_FRONTMATTER + prompt,
		"templates/opencode/mellum-worker.md": OPENCODE_FRONTMATTER + prompt,
	};
}

/** Replace the root placeholder with an absolute install path. Used by the setup skill's helper. */
export function substituteRoot(text, root) {
	if (!isAbsolute(root) || root.startsWith("~")) throw new Error(`root must be an absolute path, got ${root}`);
	return text.replaceAll(PLACEHOLDER, root.replace(/\/+$/, ""));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	for (const [path, content] of Object.entries(render())) {
		const out = resolve(ROOT, path);
		mkdirSync(dirname(out), { recursive: true });
		writeFileSync(out, content);
		console.log(`wrote ${path}`);
	}
}
