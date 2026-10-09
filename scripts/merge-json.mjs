/**
 * Deep-merge a JSON fragment into a JSON file, by id for arrays of objects.
 *
 *   node scripts/merge-json.mjs ~/.pi/agent/models.json templates/pi/models.omlx.json          # preview
 *   node scripts/merge-json.mjs ~/.pi/agent/models.json templates/pi/models.omlx.json --write  # apply
 *
 * --write copies the target to <target>.bak-mellum-<timestamp> first.
 * Only for plain JSON files. JSONC (OpenCode's config) loses comments here; edit that by hand.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const hasId = (arr) => arr.length > 0 && arr.every((x) => isObject(x) && typeof x.id === "string");

export function mergeJson(target, fragment) {
	if (Array.isArray(target) && Array.isArray(fragment) && hasId(target) && hasId(fragment)) {
		const out = target.map((x) => structuredClone(x));
		for (const item of fragment) {
			const i = out.findIndex((x) => x.id === item.id);
			if (i === -1) out.push(structuredClone(item));
			else out[i] = mergeJson(out[i], item);
		}
		return out;
	}
	if (isObject(target) && isObject(fragment)) {
		const out = { ...target };
		for (const [k, v] of Object.entries(fragment)) out[k] = k in target ? mergeJson(target[k], v) : structuredClone(v);
		return out;
	}
	return structuredClone(fragment);
}

function main(argv) {
	const [targetArg, fragmentArg, flag] = argv;
	if (!targetArg || !fragmentArg) {
		console.error("usage: merge-json.mjs <target.json> <fragment.json> [--write]");
		process.exit(2);
	}
	const target = resolve(targetArg.replace(/^~(?=$|\/)/, process.env.HOME ?? "~"));
	const current = existsSync(target) ? JSON.parse(readFileSync(target, "utf8")) : {};
	const fragment = JSON.parse(readFileSync(resolve(fragmentArg), "utf8"));
	const merged = mergeJson(current, fragment);
	const before = JSON.stringify(current, null, 2) + "\n";
	const after = JSON.stringify(merged, null, 2) + "\n";
	if (before === after) {
		console.log(`no change: ${target} already contains the fragment`);
		return;
	}
	if (flag !== "--write") {
		console.log(after);
		console.log(`(preview only; add --write to update ${target})`);
		return;
	}
	if (existsSync(target)) {
		const backup = `${target}.bak-mellum-${new Date().toISOString().replace(/[:.]/g, "")}`;
		copyFileSync(target, backup);
		console.log(`backup: ${backup}`);
	}
	writeFileSync(target, after);
	console.log(`wrote ${target}`);
}

if (process.argv[1] && resolve(process.argv[1]).endsWith("merge-json.mjs")) main(process.argv.slice(2));
