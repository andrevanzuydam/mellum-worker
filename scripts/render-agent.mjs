/**
 * Print the agent file for one host, ready to save.
 *   node scripts/render-agent.mjs pi /absolute/path/to/mellum-worker   > ~/.pi/agent/agents/mellum-worker.md
 *   node scripts/render-agent.mjs opencode                              > ~/.config/opencode/agents/mellum-worker.md
 * For pi the root defaults to this package's own directory, which is the clone Pi made.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { substituteRoot } from "../build.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [host, rootArg] = process.argv.slice(2);

if (host === "pi") {
	const text = readFileSync(resolve(ROOT, "templates", "pi", "mellum-worker.agent.md"), "utf8");
	process.stdout.write(substituteRoot(text, rootArg ?? ROOT));
} else if (host === "opencode") {
	process.stdout.write(readFileSync(resolve(ROOT, "templates", "opencode", "mellum-worker.md"), "utf8"));
} else {
	console.error("usage: render-agent.mjs <pi|opencode> [absolute-package-root]");
	process.exit(2);
}
