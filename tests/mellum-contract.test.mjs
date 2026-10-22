import assert from "node:assert/strict";
import test from "node:test";

import { generatePytest, normalizePath, parseContract } from "../extensions/mellum-contract.ts";

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
	// one route test per parsed route, plus the boot test
	const defs = [...py.matchAll(/^def test_/gm)].length;
	assert.equal(defs, parseContract(SPEC).routes.length + 1, py);
});

test("generatePytest marks the file as held-out, auto-derived", () => {
	const py = generatePytest({ app: "app", routes: [] });
	assert.match(py, /auto-derived|structural contract/i);
});
