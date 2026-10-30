import assert from "node:assert/strict";
import test from "node:test";

import { generatePytest, normalizePath, parseContract } from "../extensions/mellum-acceptance.ts";

const SPEC = `
## Phase 1 — Home Page
- Add a \`GET /\` route returning the home template.
- \`app.py\` holds the FastAPI application as \`app\`.

## Phase 3 — Add Complaint
- Add \`POST /complaints\` that appends a complaint and redirects.

## Phase 4 — Resolve and Reopen
- Add \`POST /complaints/{complaint_id}/resolve\` in app.py: redirect with status 303.
- Add \`POST /complaints/{complaint_id}/reopen\`.
`;

test("normalizePath collapses path params and trailing slashes", () => {
	assert.equal(normalizePath("/complaints/{complaint_id}/resolve"), "/complaints/{}/resolve");
	assert.equal(normalizePath("/complaints/"), "/complaints");
	assert.equal(normalizePath("/"), "/");
});

test("parseContract extracts the app module and every route the spec names", () => {
	const c = parseContract(SPEC);
	assert.equal(c.app, "app");
	const got = c.routes.map((r) => `${r.method} ${r.path}`);
	assert.ok(got.includes("GET /"), got);
	assert.ok(got.includes("POST /complaints"), got);
	assert.ok(got.includes("POST /complaints/{complaint_id}/resolve"), got);
	assert.ok(got.includes("POST /complaints/{complaint_id}/reopen"), got);
});

test("parseContract dedupes routes and defaults the app module to 'app'", () => {
	const c = parseContract("GET / and again GET / here");
	assert.equal(c.routes.length, 1);
	assert.equal(c.app, "app");
});

test("generatePytest imports the app, boots it, and checks each route is registered", () => {
	const py = generatePytest(parseContract(SPEC));
	assert.match(py, /from app import app/);
	assert.match(py, /TestClient\(app\)/);
	assert.match(py, /def test_app_boots\(/);
	// a check per route, param-normalized, with a helpful message
	assert.match(py, /\/complaints\/\{\}\/resolve/);
	assert.match(py, /missing route: POST \/complaints\/\{complaint_id\}\/resolve/);
	// one registration test per parsed route, plus the boot test
	const defs = [...py.matchAll(/^def test_(?:route_|app_boots)/gm)].length;
	assert.equal(defs, parseContract(SPEC).routes.length + 1, py);
});

test("generatePytest marks the file as held-out, auto-derived", () => {
	const py = generatePytest({ app: "app", routes: [], page: { doctype: false, lang: null, nav: false } });
	assert.match(py, /auto-derived|structural contract/i);
});

// --- page-HTML contract (spec-derived: structural hygiene + spec-quoted tagline) ---

const PAGE_SPEC = `
## Phase 1 — Home Page
- A shared Jinja2 layout, \`templates/base.html\`: HTML5 with \`lang="en"\`, a navbar with
  the "AgentClinic" brand and links to Home (\`/\`) and Complaints (\`/complaints\`).
- The home page at \`/\` uses that layout: a hero section with the tagline
  *"Come in. Sit down. Tell us about your human."* and a short welcoming paragraph.
- \`app.py\` holds the FastAPI application as \`app\`.
- Tests: \`GET /\` returns 200 and contains the tagline.
`;

test("parseContract reads page layout requirements from the spec's own words", () => {
	const c = parseContract(PAGE_SPEC);
	assert.equal(c.page.doctype, true, "HTML5 -> doctype");
	assert.equal(c.page.lang, "en", 'lang="en"');
	assert.equal(c.page.nav, true, "navbar/links -> nav");
});

test("parseContract classifies a GET page route as html and derives its required tagline", () => {
	const c = parseContract(PAGE_SPEC);
	const home = c.routes.find((r) => r.method === "GET" && normalizePath(r.path) === "/");
	assert.ok(home, "home route parsed");
	assert.equal(home.html, true, "GET / is an html page");
	assert.ok(
		(home.contains || []).includes("Come in. Sit down. Tell us about your human."),
		JSON.stringify(home.contains),
	);
});

test("generatePytest emits page assertions (200, doctype, lang, nav, tagline) for html routes", () => {
	const py = generatePytest(parseContract(PAGE_SPEC));
	assert.match(py, /def test_page_\d+_root\(/, py);
	assert.match(py, /status_code == 200/);
	assert.match(py, /<!doctype/i);
	assert.match(py, /lang/);
	assert.match(py, /<nav/i);
	assert.match(py, /Come in\. Sit down\. Tell us about your human\./);
});

test("generatePytest emits no page test for a non-html route", () => {
	const py = generatePytest(parseContract("Add a \`POST /complaints\` that appends a complaint."));
	assert.doesNotMatch(py, /def test_page_/);
});
