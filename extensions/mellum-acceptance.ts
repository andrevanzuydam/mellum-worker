/**
 * mellum-acceptance: Tier-1 dynamic mediation — derive a structural acceptance
 * test from the task spec, with no per-task authoring and no model.
 *
 * Mediation forces the worker to meet a contract it cannot see, redispatching
 * until it does (mellum-ncm). A hand-written frozen test per phase does not
 * scale; this derives a shallow-but-real contract straight from the spec's own
 * nouns — the app module it names, and every route it names — and emits a
 * pytest the ncm gate can run (point NCM_TEST at it). It checks the app boots
 * and that each named route is actually registered (param-normalized, so
 * {id} vs {complaint_id} does not matter).
 *
 * Agnostic: it knows nothing about any particular suite, only what the spec
 * states in the open. It catches the early/mid failures (nothing built, a
 * missing route, the wrong module name) — not deep ones like exact aggregation
 * keys or a migration schema, which are not structurally inferable from prose
 * (that is Tier-2, an examiner model). Pure functions plus a thin writer.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface Route {
	method: string;
	path: string;
}

export interface Contract {
	app: string;
	routes: Route[];
}

const ROUTE_RE = /\b(GET|POST|PUT|PATCH|DELETE)\s+`?(\/[A-Za-z0-9_/{}\-]*)/g;

/** Collapse path params to `{}` and drop a trailing slash, so routes compare structurally. */
export function normalizePath(path: string): string {
	const p = (path || "").replace(/\{[^}]*\}/g, "{}").replace(/\/+$/, "");
	return p === "" ? "/" : p;
}

/** Pull the app module and every route the spec names, deduped by method + normalized path. */
export function parseContract(spec: string): Contract {
	const routes: Route[] = [];
	const seen = new Set<string>();
	for (const m of spec.matchAll(ROUTE_RE)) {
		const method = m[1].toUpperCase();
		const path = m[2].replace(/`+$/, "") || "/";
		const key = `${method} ${normalizePath(path)}`;
		if (!seen.has(key)) {
			seen.add(key);
			routes.push({ method, path });
		}
	}
	const named = /`(\w+)\.py`[^`]*?as `(\w+)`/.exec(spec);
	return { app: named ? named[2] : "app", routes };
}

/** Emit a pytest that boots the app and asserts each named route is registered. */
export function generatePytest(contract: Contract): string {
	const app = contract.app;
	const lines = [
		'"""Structural contract — auto-derived from the spec, held out from the worker."""',
		"import re",
		"from starlette.testclient import TestClient",
		`from ${app} import ${app}`,
		"",
		`client = TestClient(${app})`,
		"",
		"def _norm(p):",
		'    p = re.sub(r"\\{[^}]*\\}", "{}", p or "").rstrip("/")',
		'    return p or "/"',
		"",
		"def _registered():",
		`    return {_norm(getattr(r, "path", "")) for r in ${app}.routes}`,
		"",
		"def test_app_boots():",
		'    assert client.get("/").status_code < 500',
		"",
	];
	contract.routes.forEach((route, i) => {
		const norm = normalizePath(route.path);
		const slug = norm.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "root";
		lines.push(`def test_route_${i}_${route.method.toLowerCase()}_${slug}():`);
		lines.push(`    assert ${JSON.stringify(norm)} in _registered(), "missing route: ${route.method} ${route.path}"`);
		lines.push("");
	});
	return lines.join("\n");
}

/** Concatenate the task's spec sources (specs/*.md and AGENTS.md) found under cwd. */
export function readSpec(cwd: string): string {
	const parts: string[] = [];
	const specs = join(cwd, "specs");
	try {
		if (existsSync(specs)) {
			for (const name of readdirSync(specs).sort()) {
				if (name.endsWith(".md")) parts.push(readFileSync(join(specs, name), "utf8"));
			}
		}
		const agents = join(cwd, "AGENTS.md");
		if (existsSync(agents)) parts.push(readFileSync(agents, "utf8"));
	} catch {
		// best effort: a missing or unreadable spec yields an empty contract
	}
	return parts.join("\n\n");
}

/** Derive the contract from the spec under cwd and write the pytest to outDir; returns its path. */
export function writeContractTest(cwd: string, outDir: string): string {
	const contract = parseContract(readSpec(cwd));
	mkdirSync(outDir, { recursive: true });
	const path = join(outDir, "test_contract.py");
	writeFileSync(path, generatePytest(contract) + "\n");
	return path;
}

export default function (
	pi: { on: (event: string, handler: (event: any, ctx?: any) => unknown) => void },
	options: { outDir?: string } = {},
): void {
	pi.on("session_start", (_event: any, ctx: any) => {
		try {
			const cwd = ctx && typeof ctx.cwd === "string" ? ctx.cwd : process.cwd();
			const outDir = options.outDir ?? join(cwd, "..", "contract");
			const path = writeContractTest(cwd, outDir);
			// The ncm gate reads NCM_TEST when it verifies; point it at the derived contract.
			process.env.NCM_TEST = path;
		} catch {
			// never break the session over contract derivation
		}
		return undefined;
	});
}
