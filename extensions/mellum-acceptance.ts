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
	/** A GET route the spec describes as a rendered HTML page (gets page-content checks). */
	html?: boolean;
	/** Required visible text the spec ties to this page (e.g. a quoted tagline). */
	contains?: string[];
}

/** Page-layout requirements the spec states in the open — never read from the grader. */
export interface PageReqs {
	doctype: boolean;
	lang: string | null;
	nav: boolean;
}

export interface Contract {
	app: string;
	routes: Route[];
	page: PageReqs;
}

const ROUTE_RE = /\b(GET|POST|PUT|PATCH|DELETE)\s+`?(\/[A-Za-z0-9_/{}\-]*)/g;
// Words that mark a GET route as a rendered page rather than a data endpoint.
const PAGE_WORDS = /\b(page|template|layout|home|board|hero|render|html|tagline)\b/i;

/** Collapse path params to `{}` and drop a trailing slash, so routes compare structurally. */
export function normalizePath(path: string): string {
	const p = (path || "").replace(/\{[^}]*\}/g, "{}").replace(/\/+$/, "");
	return p === "" ? "/" : p;
}

/** The quoted text the spec ties to a tagline, derived from its prose (not the grader). */
function taglineLiteral(spec: string): string | null {
	const m = /tagline[^"“]*["“]([^"”]+)["”]/i.exec(spec);
	return m ? m[1].trim() : null;
}

/** Page-layout requirements stated in the spec's own words. */
function pageReqs(spec: string): PageReqs {
	const lang = /\blang\s*=\s*["']?([A-Za-z]{2}(?:-[A-Za-z]{2})?)/.exec(spec);
	return {
		doctype: /\bHTML5\b/i.test(spec) || /<!doctype/i.test(spec),
		lang: lang ? lang[1].toLowerCase() : null,
		nav: /\bnav(?:bar|igation)?\b/i.test(spec) || /\blinks?\s+to\b/i.test(spec),
	};
}

/** Pull the app module and every route the spec names, deduped by method + normalized path. */
export function parseContract(spec: string): Contract {
	const routes: Route[] = [];
	const seen = new Set<string>();
	const tagline = taglineLiteral(spec);
	for (const m of spec.matchAll(ROUTE_RE)) {
		const method = m[1].toUpperCase();
		const path = m[2].replace(/`+$/, "") || "/";
		const key = `${method} ${normalizePath(path)}`;
		if (seen.has(key)) continue;
		seen.add(key);
		// Classify from the route's own context — a GET page the spec describes as HTML.
		const at = m.index ?? 0;
		const ctx = spec.slice(Math.max(0, at - 180), at + 200);
		const html = method === "GET" && PAGE_WORDS.test(ctx);
		const contains: string[] = [];
		if (html && tagline && /\btagline\b/i.test(ctx)) contains.push(tagline);
		const route: Route = { method, path };
		if (html) route.html = true;
		if (contains.length) route.contains = contains;
		routes.push(route);
	}
	const named = /`(\w+)\.py`[^`]*?as `(\w+)`/.exec(spec);
	return { app: named ? named[2] : "app", routes, page: pageReqs(spec) };
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
	// Page-content checks for the routes the spec describes as rendered HTML pages.
	// Structural hygiene (doctype/lang/nav) is generic; any `contains` text is spec-quoted.
	const page = contract.page ?? { doctype: false, lang: null, nav: false };
	contract.routes.forEach((route, i) => {
		if (!route.html) return;
		const norm = normalizePath(route.path);
		if (norm.includes("{}")) return; // no value to request a path-param route with
		const slug = norm.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "root";
		lines.push(`def test_page_${i}_${slug}():`);
		lines.push(`    r = client.get(${JSON.stringify(route.path)})`);
		lines.push(`    assert r.status_code == 200, "GET ${route.path} should return 200"`);
		lines.push(`    assert "text/html" in r.headers.get("content-type", "").lower(), "GET ${route.path} should serve HTML"`);
		if (page.doctype) lines.push(`    assert re.search(r"<!doctype\\s+html", r.text, re.I), "page missing HTML5 doctype"`);
		if (page.lang) lines.push(`    assert re.search(r"<html[^>]*lang\\s*=\\s*.{0,1}${page.lang}\\b", r.text, re.I), "html missing lang=${page.lang}"`);
		if (page.nav) lines.push(`    assert re.search(r"<nav\\b|<a\\s[^>]*href", r.text, re.I), "page missing navigation/links"`);
		for (const text of route.contains ?? []) {
			lines.push(`    assert ${JSON.stringify(text)} in r.text, ${JSON.stringify(`page missing required text: ${text.slice(0, 48)}`)}`);
		}
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
