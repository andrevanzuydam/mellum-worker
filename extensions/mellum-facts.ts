/**
 * Project facts for Mellum Worker: the `## Mellum` section of the project's AGENTS.md
 * (Markdown bullets only, 600 characters at most), plus a `python -m pytest` test
 * command when the section names none and pyproject.toml mentions pytest.
 * Mode appends the block to the user messages it forwards (filterForMellum).
 */
import { join } from "node:path";

export type FactsSource = "agents-md" | "detected" | "agents-md+detected" | "none" | "off";

export interface ProjectFacts {
	source: FactsSource;
	bullets: string[];
	testCommand: string | null;
	/** Sum of the forwarded bullets' lengths, without the "- " prefix. */
	chars: number;
	warning?: string;
}

export const FACTS_CAP = 600;
export const FALLBACK_TEST_COMMAND = "uv run --offline python -m pytest -q";

const SECTION_START = /^##\s+Mellum\s*$/i;
const SECTION_END = /^#{1,2}\s/;
const BULLET = /^\s*[-*]\s+(.+)$/;
const TEST_BULLET = /^test command:\s*(.+)$/i;

/**
 * The first `## Mellum` section of `lines`: its heading's index and the index of the next
 * `#`/`##` heading (or `lines.length`). Undefined when there is none.
 */
export function findMellumSection(lines: string[]): { start: number; end: number } | undefined {
	const start = lines.findIndex((l) => SECTION_START.test(l));
	if (start < 0) return undefined;
	const next = lines.findIndex((l, i) => i > start && SECTION_END.test(l));
	return { start, end: next < 0 ? lines.length : next };
}

/** A Markdown bullet line's text, trimmed; undefined for any other line. */
export function bulletOf(line: string): string | undefined {
	const m = BULLET.exec(line);
	return m ? m[1].trim() : undefined;
}

/** The bullets of the first `## Mellum` section, or undefined when there is none. */
function sectionBullets(md: string): string[] | undefined {
	const lines = md.split(/\r?\n/);
	const section = findMellumSection(lines);
	if (!section) return undefined;
	return lines
		.slice(section.start + 1, section.end)
		.map(bulletOf)
		.filter((b): b is string => b !== undefined);
}

/** The character count the cap applies to: the bullets' lengths, without the "- " prefix. */
export const total = (bullets: string[]) => bullets.reduce((n, b) => n + b.length, 0);

export function readProjectFacts(
	dir: string,
	io: { read(path: string): string | undefined },
	env: Record<string, string | undefined> = process.env,
): ProjectFacts {
	if (env.MELLUM_MODE_FACTS === "0") return { source: "off", bullets: [], testCommand: null, chars: 0 };
	const read = (name: string): string | undefined => {
		try {
			return io.read(join(dir, name));
		} catch {
			return undefined;
		}
	};
	let warning: string | undefined;
	let bullets: string[] = [];
	const agents = read("AGENTS.md");
	const section = agents === undefined ? undefined : sectionBullets(agents);
	if (section && total(section) > FACTS_CAP) {
		warning = `mellum-worker: the ## Mellum section in AGENTS.md has ${total(section)} characters of bullets (the limit is ${FACTS_CAP}); ignoring it`;
	} else if (section) {
		bullets = section;
	}
	const fromSection = bullets.length > 0;
	let testCommand: string | null = null;
	for (const b of bullets) {
		const m = TEST_BULLET.exec(b);
		if (m) {
			testCommand = m[1].trim();
			break;
		}
	}
	let detected = false;
	if (testCommand === null && /pytest/.test(read("pyproject.toml") ?? "")) {
		bullets = [...bullets, `Test command: ${FALLBACK_TEST_COMMAND}`];
		testCommand = FALLBACK_TEST_COMMAND;
		detected = true;
	}
	const source: FactsSource = fromSection ? (detected ? "agents-md+detected" : "agents-md") : detected ? "detected" : "none";
	return { source, bullets, testCommand, chars: total(bullets), ...(warning ? { warning } : {}) };
}

/** The text appended to each forwarded user message; empty when there is nothing to say. */
export function factsBlock(f: ProjectFacts): string {
	return f.bullets.length ? "\n\nProject facts:\n- " + f.bullets.join("\n- ") : "";
}
