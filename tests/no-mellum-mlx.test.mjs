import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";

// M.6: this repo stands alone. Nothing live points at mellum-mlx; the
// provenance note, the changelog and pre-M.6 SDD records are history.
const ROOT = resolve(import.meta.dirname, "..");
const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
	.split("\n")
	.filter(Boolean)
	.filter((f) => existsSync(resolve(ROOT, f)));

const SKIP_EXT = /\.(zip|gz|json|jsonl|png|jpg|jpeg|gif|ico|pdf|safetensors)$/;
const SELF = "tests/no-mellum-mlx.test.mjs";
const HISTORY = [
	/^docs\/ladder\//,
	/^CHANGELOG\.md$/,
	/^docs\/superpowers\/research\/2026-10-09-ac-demo-hello-world-finding\.md$/,
	/^docs\/superpowers\/research\/2026-10-09-steering-and-next-phase(\.md|\/)/,
	/^docs\/superpowers\/specs\/2026-10-09-m5-print-mode-and-record-design\.md$/,
	/^docs\/superpowers\/specs\/2026-10-09-m6-one-repo-design\.md$/,
	/^docs\/superpowers\/plans\/(archive\/)?2026-10-09-m5-print-mode-and-record\.md$/,
	/^docs\/superpowers\/plans\/(archive\/)?2026-10-09-m6-one-repo\.md$/,
];
const isText = (f) => !SKIP_EXT.test(f);
const live = tracked.filter((f) => isText(f) && f !== SELF && !HISTORY.some((re) => re.test(f)));
const read = (f) => readFileSync(resolve(ROOT, f), "utf8");

test("no live file links into the mellum-mlx repository", () => {
	const hits = live.filter((f) => read(f).includes("github.com/pauleveritt/mellum-mlx"));
	assert.deepEqual(hits, []);
});

test("a live file mentions mellum-mlx only on a 'Moved from' line", () => {
	const bad = [];
	for (const f of live) {
		read(f).split("\n").forEach((line, i) => {
			if (line.includes("mellum-mlx") && !line.startsWith("Moved from mellum-mlx on 2026-10-09")) {
				bad.push(`${f}:${i + 1}`);
			}
		});
	}
	assert.deepEqual(bad, []);
});

const MOVED_NOTES = [
	"docs/superpowers/research/2026-10-07-mellum-omlx-native-cache.md",
	"docs/superpowers/research/2026-10-07-mellum-independent-runtime.md",
	"docs/superpowers/research/2026-10-07-mellum-independent-runtime-evidence.json",
	"docs/superpowers/research/2026-10-09-worker-cost-options.md",
	"docs/superpowers/research/2026-10-09-future-work.md",
	"docs/superpowers/research/2026-10-07-mellum-recovery/README.md",
];

test("the moved research notes exist and their relative links resolve", () => {
	const missing = MOVED_NOTES.filter((f) => !existsSync(resolve(ROOT, f)));
	assert.deepEqual(missing, [], "moved notes missing");
	const broken = [];
	const recovery = "docs/superpowers/research/2026-10-07-mellum-recovery";
	const notes = [
		...MOVED_NOTES.filter((n) => n.endsWith(".md")),
		...readdirSync(resolve(ROOT, recovery)).filter((n) => n.endsWith(".md")).map((n) => `${recovery}/${n}`),
	];
	for (const f of new Set(notes)) {
		for (const m of read(f).matchAll(/\]\(([^)\s]+)\)/g)) {
			const target = m[1];
			if (/^(https?:|#|mailto:)/.test(target)) continue;
			const path = target.split("#")[0];
			if (path && !existsSync(resolve(ROOT, dirname(f), path))) broken.push(`${f} -> ${target}`);
		}
	}
	assert.deepEqual(broken, []);
});
