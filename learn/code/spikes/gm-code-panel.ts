/**
 * GM.1 spike — a code panel that streams the worker's edits.
 *
 * Decides the streaming approach for guided mode
 * (docs/superpowers/specs/2026-10-30-guided-mode-design.md, phase GM.1): does a
 * `setWidget` panel — which coexists with the chat instead of stealing focus
 * like `ctx.ui.custom` — repaint cleanly as the worker's `edit`/`write` tool
 * calls land?
 *
 * Not shipped. Load it explicitly to try it:
 *   pi -e learn/code/spikes/gm-code-panel.ts
 * then, in a workspace with a file to edit:
 *   /gmspike add.py            # opens a panel watching add.py
 *   fix add.py so add returns a + b   # ask the worker; watch the panel repaint
 */
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

export default function (pi: any): void {
	let ctxRef: any;
	let target = "";

	// Repaint the panel from the file on disk — the file is the source of truth,
	// so a worker edit and a hand edit show up the same way.
	function paint(note = ""): void {
		if (!ctxRef || !target) return;
		let body: string[];
		try {
			body = readFileSync(target, "utf8").replace(/\n+$/, "").split("\n");
		} catch {
			body = ["(not written yet)"];
		}
		const numbered = body.map((l, i) => `${String(i + 1).padStart(3)} │ ${l}`);
		const head = `── ${basename(target)}${note ? "  · " + note : ""}`;
		ctxRef.ui.setWidget("gm-code", [head, ...numbered]);
	}

	pi.registerCommand("gmspike", {
		description: "GM.1 spike: a code panel that streams the worker's edits to a file",
		handler: async (args: string, ctx: any) => {
			ctxRef = ctx;
			const arg = (args || "").trim();
			if (!arg) { ctx.ui.notify("usage: /gmspike <file>", "error"); return; }
			target = resolve(process.cwd(), arg);
			paint("watching");
			ctx.ui.notify(`panel watching ${target} — ask the worker to edit it`, "info");
		},
	});

	// The stream: when the worker edits or writes the watched file, repaint.
	// tool_call fires as the call starts, so repaint again shortly after for the
	// applied contents. The spike's whole question is whether this reads cleanly.
	pi.on("tool_call", (event: any) => {
		const name = event?.toolName;
		if (!target || (name !== "edit" && name !== "write")) return;
		const p = event?.input?.path ? resolve(process.cwd(), event.input.path) : "";
		if (p === target || basename(p) === basename(target)) {
			paint("editing…");
			setTimeout(() => paint("updated"), 150);
		}
	});
}
