/**
 * The setup check: compares what the oMLX server reports and what the host's provider
 * entry says with the measured settings in templates/omlx-model-settings.json.
 * Only server values no request can change fail: the server-only group (context window,
 * TurboQuant, thinking budget, tool-result cap), thinking forced off, and sampling other than
 * the provider's while `force_sampling` is on. oMLX otherwise gives a request's cap, sampling
 * and chat-template values precedence, so the server's own are only advised (info).
 * checkSetup is pure. The front ends (Mode's /mellum check and activation check,
 * scripts/mellum.mjs) pass gatherInputs their own reader and GET, usually fetchJson; this
 * module only ever GETs and never writes. The fix for a settings mismatch is a `PUT`
 * command to show, never to run.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export type Level = "ok" | "info" | "warn" | "fail";

export interface Finding {
	id: "server" | "model" | "settings" | "global" | "advice" | "provider" | "admin";
	level: Level;
	message: string;
	fix?: string;
}

export interface Expected {
	modelId: string;
	/**
	 * `serverOnly`: no request overrides these; `overridden`: each request sends its own;
	 * `forcedSampling`: what the server's sampling must be when its `force_sampling` is on.
	 */
	model: { serverOnly: Record<string, unknown>; overridden: Record<string, unknown>; forcedSampling: Record<string, unknown> };
	global: Record<string, unknown>;
	advice: Record<string, unknown>;
}

export type Fetched<T> = { ok: true; value: T } | { ok: false; status?: number; error: string };

export type Host = "pi" | "opencode";

export interface CheckInputs {
	baseUrl: string;
	models: Fetched<unknown>;
	adminModels: Fetched<unknown>;
	global: Fetched<unknown>;
	/** `entry` is the host's `omlx` provider object (see providerEntry), as read from the user's config. */
	provider: { host: Host; entry?: Record<string, unknown>; error?: string };
	/** The same provider object taken from the host's shipped template. */
	template: Record<string, unknown>;
}

export interface Diff {
	key: string;
	expected: unknown;
	actual: unknown;
}

export const DEFAULT_BASE_URL = "http://127.0.0.1:8001/v1";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

export function loadExpected(read: (p: string) => string = (p) => readFileSync(p, "utf8")): Expected {
	return JSON.parse(read(fileURLToPath(new URL("../templates/omlx-model-settings.json", import.meta.url))));
}

/** JSON with object keys sorted, so equal values compare equal whatever their key order. */
function canon(v: unknown): string {
	if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
	if (isObj(v)) {
		return `{${Object.keys(v)
			.sort()
			.map((k) => `${JSON.stringify(k)}:${canon(v[k])}`)
			.join(",")}}`;
	}
	return JSON.stringify(v) ?? "undefined";
}
const same = (a: unknown, b: unknown) => canon(a) === canon(b);
const show = (v: unknown) => (v === undefined ? "missing" : canon(v));

function diffs(wanted: Obj, actualOf: (key: string) => unknown): Diff[] {
	const out: Diff[] = [];
	for (const [key, want] of Object.entries(wanted)) {
		const actual = actualOf(key);
		if (!same(want, actual)) out.push({ key, expected: want, actual });
	}
	return out;
}

/** Why a rule's diff binds although the key is not server-only by itself. */
const NOTES: Record<string, string> = {
	enable_thinking: "thinking is forced off for every client",
	temperature: "force_sampling is on, so the server's sampling wins over the request",
	top_p: "force_sampling is on, so the server's sampling wins over the request",
	top_k: "force_sampling is on, so the server's sampling wins over the request",
};
const lines = (d: Diff[], word = "expected", notes: Record<string, string> = {}) =>
	d.map((x) => `  ${x.key} ${show(x.actual)} (${word} ${show(x.expected)})${notes[x.key] ? `: ${notes[x.key]}` : ""}`);

// ---- model settings (/admin/api/models) -----------------------------------------------

/**
 * The binding server diffs, or with `group` "overridden" the advised ones; null when the model
 * or its `settings` is absent. Binding: the server-only keys, plus two rules where the server
 * beats the request: `enable_thinking` false while `forced_ct_kwargs` forces it, and
 * temperature/top_p/top_k other than `forcedSampling` while `force_sampling` is true. The
 * activation warning and the run record use the binding diffs.
 */
export function settingsDiffs(adminModels: unknown, expected: Expected, group: "serverOnly" | "overridden" = "serverOnly"): Diff[] | null {
	const list = isObj(adminModels) ? adminModels.models : adminModels;
	if (!Array.isArray(list)) return null;
	const entry = list.find((m) => isObj(m) && m.id === expected.modelId);
	if (!isObj(entry) || !isObj(entry.settings)) return null;
	const settings = entry.settings;
	const out = diffs(expected.model[group], (k) => settings[k]);
	if (group !== "serverOnly") return out;
	// oMLX applies the server's chat_template_kwargs, then its enable_thinking toggle when set.
	const forced = settings.forced_ct_kwargs;
	const kwargs = isObj(settings.chat_template_kwargs) ? settings.chat_template_kwargs : {};
	const thinking = settings.enable_thinking ?? kwargs.enable_thinking;
	if (Array.isArray(forced) && forced.includes("enable_thinking") && thinking === false) {
		out.push({ key: "enable_thinking", expected: true, actual: false });
	}
	if (settings.force_sampling === true) out.push(...diffs(expected.model.forcedSampling, (k) => settings[k]));
	return out;
}

/**
 * The exact PUT that applies the measured model settings, sampling included (it binds only
 * under `force_sampling`, and a request's own sampling wins otherwise). Shown, never run.
 */
export function putCommand(adminBase: string, expected: Expected): string {
	const body = { ...expected.model.serverOnly, ...expected.model.overridden, ...expected.model.forcedSampling };
	return (
		`curl -s -X PUT ${adminBase}/admin/api/models/${expected.modelId}/settings ` +
		`-H 'content-type: application/json' -d '${JSON.stringify(body)}'`
	);
}

/** The server root the admin API hangs off: `baseUrl` without a trailing `/` and `/v1`. */
export const adminBaseOf = (baseUrl: string) => baseUrl.replace(/\/+$/, "").replace(/\/v1$/, "");
const getPath = (root: unknown, path: string): unknown =>
	path.split(".").reduce<unknown>((o, k) => (isObj(o) ? o[k] : undefined), root);

// ---- host provider entries -------------------------------------------------------------

/**
 * The `omlx` provider object of a host config: Pi `providers.omlx`, OpenCode `provider.omlx`.
 * Works on the user's config and on the shipped templates, so both sides compare alike.
 */
export function providerEntry(host: Host, config: unknown): Obj | undefined {
	if (!isObj(config)) return undefined;
	const providers = host === "pi" ? config.providers : config.provider;
	const entry = isObj(providers) ? providers.omlx : undefined;
	return isObj(entry) ? entry : undefined;
}

/**
 * The fields compared, mapped to one vocabulary per host. Pi: provider `baseUrl`; the model in
 * `models[]` with `contextWindow`, `maxTokens`, `samplingParams`, `compat`. OpenCode: provider
 * `options.baseURL`; the model in `models{}` with `limit.context` and `limit.output` (it has no
 * sampling block, so none is compared). A host entry is always compared with its own host's
 * template. `maxTokens` and sampling are what each request sends, so they bind (fail); the
 * other fields warn.
 * Returns null when the provider has no entry for the model.
 */
function providerFields(host: Host, entry: Obj, modelId: string): Obj | null {
	if (host === "pi") {
		const models = Array.isArray(entry.models) ? entry.models : [];
		const m = models.find((x) => isObj(x) && x.id === modelId);
		if (!isObj(m)) return null;
		return { baseUrl: entry.baseUrl, contextWindow: m.contextWindow, maxTokens: m.maxTokens, samplingParams: m.samplingParams, compat: m.compat };
	}
	const models = isObj(entry.models) ? entry.models : {};
	const m = models[modelId];
	if (!isObj(m)) return null;
	const limit = isObj(m.limit) ? m.limit : {};
	const options = isObj(entry.options) ? entry.options : {};
	return { baseUrl: options.baseURL, contextWindow: limit.context, maxTokens: limit.output };
}

function providerFinding(p: CheckInputs["provider"], template: Obj, expected: Expected): Finding {
	const fix = `setup step 4: skills/mellum-setup/reference/04-provider-${p.host}.md`;
	if (p.error || !p.entry) {
		return { id: "provider", level: "fail", message: p.error ?? `no omlx provider in the ${p.host} config`, fix };
	}
	const have = providerFields(p.host, p.entry, expected.modelId);
	if (!have) {
		return { id: "provider", level: "fail", message: `the omlx provider has no model ${expected.modelId}`, fix };
	}
	const want = providerFields(p.host, template, expected.modelId) ?? {};
	// One line per leaf: samplingParams.top_k, compat.thinkingFormat, ...
	const d = diffs(want, (k) => have[k]).flatMap((x) =>
		isObj(x.expected) && isObj(x.actual)
			? diffs(x.expected, (k) => (x.actual as Obj)[k]).map((y) => ({ ...y, key: `${x.key}.${y.key}` }))
			: [x],
	);
	if (d.length === 0) return { id: "provider", level: "ok", message: `${p.host} provider entry matches the template` };
	const binds = d.some((x) => x.key === "maxTokens" || x.key.startsWith("samplingParams"));
	return { id: "provider", level: binds ? "fail" : "warn", message: `${p.host} provider entry differs from the template:\n${lines(d).join("\n")}`, fix };
}

// ---- the check -----------------------------------------------------------------------

function modelListed(models: unknown, id: string): boolean {
	const data = isObj(models) ? models.data : undefined;
	return Array.isArray(data) && data.some((m) => isObj(m) && m.id === id);
}

export function checkSetup(inputs: CheckInputs, expected: Expected): Finding[] {
	const adminBase = adminBaseOf(inputs.baseUrl);
	const adminUrl = `${adminBase}/admin`;
	const out: Finding[] = [];
	const serverOk = inputs.models.ok;

	if (inputs.models.ok) {
		out.push({ id: "server", level: "ok", message: `oMLX answers at ${inputs.baseUrl}` });
	} else {
		out.push({
			id: "server",
			level: "fail",
			message: `oMLX did not answer at ${inputs.baseUrl}/models: ${inputs.models.error}`,
			fix: "start oMLX (setup step 3: skills/mellum-setup/reference/03-server.md)",
		});
	}

	// With the server down, model and settings are not checked (never reported as ok).
	if (inputs.models.ok) {
		const id = expected.modelId;
		if (modelListed(inputs.models.value, id)) {
			out.push({ id: "model", level: "ok", message: `${id} is listed` });
		} else {
			out.push({
				id: "model",
				level: "fail",
				message: `${id} is not listed by the server`,
				fix: "point oMLX at the weights (setup step 2: skills/mellum-setup/reference/02-weights.md)",
			});
		}
	}

	if (serverOk && inputs.adminModels.ok && modelListed(inputs.models.ok ? inputs.models.value : undefined, expected.modelId)) {
		const d = settingsDiffs(inputs.adminModels.value, expected);
		if (d === null) {
			out.push({ id: "settings", level: "warn", message: `the admin API has no settings for ${expected.modelId}`, fix: adminUrl });
		} else if (d.length === 0) {
			out.push({ id: "settings", level: "ok", message: "binding model settings match the measured profile" });
		} else {
			out.push({
				id: "settings",
				level: "fail",
				message: `model settings differ from the measured profile:\n${lines(d, "expected", NOTES).join("\n")}`,
				fix: putCommand(adminBase, expected),
			});
		}
		// A key already in the fail (enable_thinking forced off) is not repeated as info.
		const o = (settingsDiffs(inputs.adminModels.value, expected, "overridden") ?? []).filter((x) => !(d ?? []).some((y) => y.key === x.key));
		if (o.length > 0) {
			// Pi's template sends the cap, sampling and thinking flag; OpenCode's only the cap.
			const why =
				inputs.provider.host === "opencode"
					? "OpenCode's template sends only max_tokens, so the server's other values apply"
					: "overridden by the client's request values";
			out.push({ id: "settings", level: "info", message: `server values differ from the advised ones, ${why}:\n${lines(o, "advised").join("\n")}` });
		}
	}

	if (inputs.global.ok) {
		const g = diffs(expected.global, (k) => getPath(inputs.global.ok ? inputs.global.value : undefined, k));
		out.push(
			g.length === 0
				? { id: "global", level: "ok", message: "server-wide settings match the measured profile" }
				: { id: "global", level: "warn", message: `server-wide settings differ:\n${lines(g).join("\n")}`, fix: adminUrl },
		);
		const a = diffs(expected.advice, (k) => getPath(inputs.global.ok ? inputs.global.value : undefined, k));
		out.push(
			a.length === 0
				? { id: "advice", level: "ok", message: "advised settings match" }
				: { id: "advice", level: "info", message: `settings differ from the advised values:\n${lines(a, "advised").join("\n")}` },
		);
	}

	out.push(providerFinding(inputs.provider, inputs.template, expected));

	// The admin API is only worth a finding when the server itself answers.
	if (serverOk) {
		const bad = [inputs.adminModels, inputs.global].find((f) => !f.ok);
		if (bad && !bad.ok) {
			const why = bad.status ? `HTTP ${bad.status}` : bad.error;
			out.push({ id: "admin", level: "warn", message: `settings not readable (${why})`, fix: adminUrl });
		}
	}
	return out;
}

// ---- reading the host config -----------------------------------------------------------

/** JSON with `//` and `/* *\/` comments and trailing commas. Empty text gives undefined; bad text throws. */
export function parseJsonc(text: string): unknown {
	let noComments = "";
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (c === '"') {
			let j = i + 1;
			while (j < text.length && text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
			noComments += text.slice(i, j + 1);
			i = j;
		} else if (c === "/" && text[i + 1] === "/") {
			while (i < text.length && text[i] !== "\n") i++;
			noComments += "\n";
		} else if (c === "/" && text[i + 1] === "*") {
			const end = text.indexOf("*/", i + 2);
			i = end < 0 ? text.length : end + 1;
			noComments += " ";
		} else {
			noComments += c;
		}
	}
	let out = "";
	for (let i = 0; i < noComments.length; i++) {
		const c = noComments[i];
		if (c === '"') {
			let j = i + 1;
			while (j < noComments.length && noComments[j] !== '"') j += noComments[j] === "\\" ? 2 : 1;
			out += noComments.slice(i, j + 1);
			i = j;
		} else if (c === ",") {
			let j = i + 1;
			while (j < noComments.length && /\s/.test(noComments[j])) j++;
			if (noComments[j] !== "}" && noComments[j] !== "]") out += c;
		} else {
			out += c;
		}
	}
	return out.trim() === "" ? undefined : JSON.parse(out);
}

export function readProvider(
	host: Host,
	home: string,
	read: (p: string) => string | undefined,
): { baseUrl: string; entry?: Obj; error?: string } {
	const paths = host === "pi" ? [join(home, ".pi/agent/models.json")] : [join(home, ".config/opencode/opencode.jsonc"), join(home, ".config/opencode/opencode.json")];
	let path: string | undefined;
	let text: string | undefined;
	for (const p of paths) {
		try {
			text = read(p);
		} catch {
			text = undefined;
		}
		if (text !== undefined) {
			path = p;
			break;
		}
	}
	if (path === undefined || text === undefined) {
		return { baseUrl: DEFAULT_BASE_URL, error: `no ${host} config found (looked for ${paths.join(", ")})` };
	}
	let config: unknown;
	try {
		config = parseJsonc(text);
	} catch (e) {
		return { baseUrl: DEFAULT_BASE_URL, error: `${path} is not valid JSON: ${e instanceof Error ? e.message : String(e)}` };
	}
	const entry = providerEntry(host, config);
	if (!entry) return { baseUrl: DEFAULT_BASE_URL, error: `no omlx provider in ${path}` };
	const base = host === "pi" ? entry.baseUrl : isObj(entry.options) ? entry.options.baseURL : undefined;
	return { baseUrl: typeof base === "string" && base ? base : DEFAULT_BASE_URL, entry };
}

// ---- fetching -------------------------------------------------------------------------

/**
 * GET `url` and parse JSON. Never throws. Races its own timer as well as passing an abort
 * signal, so a fetch that ignores the signal still gives `{ ok: false, error: "timeout" }`.
 */
export async function fetchJson(url: string, opts: { timeoutMs: number; fetch?: typeof fetch }): Promise<Fetched<unknown>> {
	const get = opts.fetch ?? globalThis.fetch;
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timedOut = new Promise<Fetched<unknown>>((done) => {
		timer = setTimeout(() => done({ ok: false, error: "timeout" }), opts.timeoutMs);
	});
	const attempt = (async (): Promise<Fetched<unknown>> => {
		try {
			const res = await get(url, { method: "GET", signal: AbortSignal.timeout(opts.timeoutMs) });
			if (!res.ok) return { ok: false, status: res.status, error: `HTTP ${res.status}` };
			return { ok: true, value: await res.json() };
		} catch (e) {
			const err = e as { name?: string; message?: string; cause?: { code?: string } };
			if (err?.name === "TimeoutError" || err?.name === "AbortError") return { ok: false, error: "timeout" };
			return { ok: false, error: err?.cause?.code ?? err?.message ?? String(e) };
		}
	})();
	try {
		return await Promise.race([attempt, timedOut]);
	} finally {
		clearTimeout(timer);
	}
}

/** The activation check of the server's model settings: null when they could not be read. */
export interface ServerCheck {
	match: boolean | null;
	diffs: Diff[];
}

/** One admin GET and the server-only comparison; never throws, unreadable gives match null. */
export async function serverCheck(adminBase: string, opts: { timeoutMs: number; fetch?: typeof fetch }): Promise<ServerCheck> {
	try {
		const got = await fetchJson(`${adminBase}/admin/api/models`, opts);
		const diffs = got.ok ? settingsDiffs(got.value, loadExpected()) : null;
		return diffs === null ? { match: null, diffs: [] } : { match: diffs.length === 0, diffs };
	} catch {
		return { match: null, diffs: [] };
	}
}

/** The host's `omlx` provider object from the shipped template. */
export function loadTemplate(host: Host, read: (p: string) => string = (p) => readFileSync(p, "utf8")): Obj {
	const file = host === "pi" ? "../templates/pi/models.omlx.json" : "../templates/opencode/provider.omlx.json";
	return providerEntry(host, JSON.parse(read(fileURLToPath(new URL(file, import.meta.url))))) ?? {};
}

/** Everything checkSetup needs: the host config via `read`, the three GETs via `get`. */
export async function gatherInputs(
	host: Host,
	io: { home: string; read: (p: string) => string | undefined; get: (url: string) => Promise<Fetched<unknown>> },
): Promise<CheckInputs> {
	const p = readProvider(host, io.home, io.read);
	const admin = adminBaseOf(p.baseUrl);
	const [models, adminModels, global] = await Promise.all([
		io.get(`${p.baseUrl.replace(/\/+$/, "")}/models`),
		io.get(`${admin}/admin/api/models`),
		io.get(`${admin}/admin/api/global-settings`),
	]);
	const provider: CheckInputs["provider"] = { host };
	if (p.entry) provider.entry = p.entry;
	if (p.error) provider.error = p.error;
	return { baseUrl: p.baseUrl, models, adminModels, global, provider, template: loadTemplate(host) };
}

// ---- output ----------------------------------------------------------------------------

export function formatFindings(findings: Finding[]): string {
	const rank: Level[] = ["fail", "warn", "info"];
	const out: string[] = [];
	for (const level of rank) {
		for (const f of findings.filter((x) => x.level === level)) {
			const [first, ...rest] = f.message.split("\n");
			out.push(`${level.toUpperCase()} ${f.id}: ${first}`, ...rest);
			if (f.fix) out.push(`  fix: ${f.fix}`);
		}
	}
	const oks = findings.filter((x) => x.level === "ok").length;
	if (oks > 0) out.push(`${oks} checks ok`);
	return out.join("\n");
}
