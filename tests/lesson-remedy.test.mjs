import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

// Every lesson names the remedy it teaches and whether its lesson check (a visible FAIL -> PASS on
// a challenge of its own) exists yet. None may claim a FAIL -> PASS it has not shown.
const EXPECTED = {
	E1: "none",
	E2: "none",
	E3: "`guard/break-repeat-loops`",
	E4: "`guard/stay-in-workspace`",
	E5: "`guard/refuse-whole-file-rewrite`",
	E6: "`guard/block-foreground-server`",
	E7: "`context/narrow-tools`",
	M1: "none",
	M2: "`context/add-project-facts`",
	M3: "`context/use-short-prompt`",
	M4: "`nudge/nudge-empty-turn`",
	M5: "none: a default",
	M6: "`tool/background-long-commands`",
	M7: "`tool/lookup-library-docs`",
	M8: "`check/check-code-quality`",
	M9: "none: task shaping",
	M10: "none: task shaping",
	H1: "none:",
	H2: "none:",
	H3: "`workflow/spec-driven-flow`",
	H4: "none:",
	H5: "none:",
	H6: "none:",
	H7: "none: you write it",
	H8: "none: you write it",
};

const pages = [];
for (const tier of ["easy", "medium", "hard"]) {
	for (const f of readdirSync(new URL(`../learn/lessons/${tier}/`, import.meta.url))) {
		if (f.endsWith(".md") && f !== "index.md") pages.push(new URL(`../learn/lessons/${tier}/${f}`, import.meta.url));
	}
}

for (const url of pages) {
	const text = readFileSync(url, "utf8");
	const number = text.match(/^number: (\S+)/m)[1];
	test(`${number} names its remedy unit and its lesson check`, () => {
		const unit = text.match(/^\*\*Remedy unit:\*\* (.+)$/m);
		assert.ok(unit, "no **Remedy unit:** line");
		assert.ok(unit[1].startsWith(EXPECTED[number]), `${number}: ${unit[1]}`);
		const check = text.match(/^\*\*Lesson check:\*\* (.+)$/m);
		assert.ok(check, "no **Lesson check:** line");
		assert.match(check[1], /^(not built yet|run once on \d{4}-\d{2}-\d{2}, and it did not show)/,
			"no lesson has shown FAIL -> PASS on its own challenge, so none may claim it");
	});
}
