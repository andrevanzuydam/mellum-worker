/**
 * Command classification for the run record: `commandMutatesFiles` fills the
 * `commands[].mutates` field.
 *
 * "Mutating" means the shell command changes files or the environment: it
 * redirects output to a path, runs a file-changing program (`rm`, `mv`,
 * `touch`, `sed -i`, ...), rewrites the working tree through git, or installs
 * packages or creates a virtualenv.
 *
 * This is a heuristic for the record only. It is never a guard: nothing is
 * blocked on its answer, and a wrong answer only mislabels a record entry.
 * It works on a cleaned copy of the command: heredoc bodies and quoted
 * strings are removed (text in them is data, not commands), and redirects
 * to `/dev/null` and fd duplications (`2>&1`) are ignored. Each segment's
 * program is the first word after shell keywords (`then`, `do`, `{`, `!`, ...),
 * wrappers (`env`, `nohup`, `time`, `xargs`, `sudo` and its flags, ...) and
 * `VAR=value` assignments.
 */

const MUTATING_PROGRAMS = new Set([
	"rm", "mv", "cp", "touch", "mkdir", "rmdir", "ln", "chmod", "chown", "tee", "truncate", "install",
]);

/** Words that come before the program a segment runs: shell keywords and command wrappers. */
const PREFIX_WORDS = new Set(["then", "do", "else", "elif", "{", "!", "time", "env", "nohup", "exec", "command", "xargs"]);

/** sudo flags that take an argument (`sudo -u bob rm x`). */
const SUDO_FLAGS_WITH_ARG = new Set(["-u", "-g", "-C", "-D", "-h", "-p", "-r", "-t", "-T", "-U"]);

const MUTATING_PATTERNS: RegExp[] = [
	/\bgit\s+(checkout|restore|clean|stash|reset|rm|mv|commit|apply)\b/,
	/\bpip3?\s+install\b/,
	/\buv\s+(add|remove|pip|sync|venv)\b/,
	/\bpython3?\s+-m\s+(venv|pip)\b/,
	/\bnpm\s+(install|i|uninstall)\b/,
];

/** Keep each `<<WORD` line, drop the body and the terminator line. `<<<` here-strings have no body. */
function stripHeredocs(command: string): string {
	const lines = command.split("\n");
	const out: string[] = [];
	let terminator: string | undefined;
	for (const line of lines) {
		if (terminator !== undefined) {
			if (line.trim() === terminator) terminator = undefined;
			continue;
		}
		out.push(line);
		const match = /(?<!<)<<(?!<)-?\s*(?:'([^']+)'|"([^"]+)"|\\?(\w+))/.exec(line);
		if (match) terminator = match[1] ?? match[2] ?? match[3];
	}
	return out.join("\n");
}

function stripQuoted(command: string): string {
	return command.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''");
}

function stripIgnorableRedirects(command: string): string {
	return command.replace(/\d*>&\d+/g, " ").replace(/&?\d*>>?\s*\/dev\/null(?=$|[\s;&|)<>])/g, " ");
}

function segmentMutates(segment: string): boolean {
	const words = segment.trim().split(/\s+/).filter(Boolean);
	let i = 0;
	while (i < words.length) {
		const w = words[i];
		if (PREFIX_WORDS.has(w) || /^[A-Za-z_]\w*=/.test(w)) {
			i++;
		} else if (w === "sudo") {
			i++;
			while (words[i]?.startsWith("-")) i += SUDO_FLAGS_WITH_ARG.has(words[i]) ? 2 : 1;
		} else {
			break;
		}
	}
	const first = words[i];
	if (first === undefined) return false;
	const program = first.slice(first.lastIndexOf("/") + 1);
	if (MUTATING_PROGRAMS.has(program)) return true;
	if (program === "sed") return words.slice(i + 1).some((w) => /^-i/.test(w) || w === "--in-place");
	return false;
}

export function commandMutatesFiles(command: string): boolean {
	const cleaned = stripIgnorableRedirects(stripQuoted(stripHeredocs(command)));
	if (/>>?\s*[^\s&|;)]/.test(cleaned)) return true;
	if (MUTATING_PATTERNS.some((p) => p.test(cleaned))) return true;
	return cleaned.split(/;|&&|\|\||\||&|\n|\(|`|\$\(/).some(segmentMutates);
}
