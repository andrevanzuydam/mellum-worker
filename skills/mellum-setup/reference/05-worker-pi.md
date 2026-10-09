# Phase 5 (Pi): Mellum Worker agent

Mellum Worker runs as a child of the `pi-subagents` package. Check for it:
`grep -q 'pi-subagents' ~/.pi/agent/settings.json`. If absent, tell the user
Mellum Worker needs it (`pi install https://github.com/nicobailon/pi-subagents`),
and that Mellum Mode (`/mellum`) works without it. Skip the rest of this
phase if they decline.

Check: `~/.pi/agent/agents/mellum-worker.md` exists and its
`subagentOnlyExtensions` line is an absolute path to an existing
`mellum-guards.ts`.

If missing or stale, render it with the package's absolute path. The path
must be absolute; pi-subagents does not expand `~` here.

```bash
mkdir -p ~/.pi/agent/agents
node "$PKG/scripts/render-agent.mjs" pi "$PKG" > ~/.pi/agent/agents/mellum-worker.md
cat ~/.pi/agent/agents/mellum-worker.md
```

Confirm the guards line points at a file that exists:

```bash
test -f "$(grep '^subagentOnlyExtensions:' ~/.pi/agent/agents/mellum-worker.md | cut -d' ' -f2)" && echo ok
```

What the frontmatter does: `systemPromptMode: replace` drops Pi's base
prompt, the three `inherit*: false` lines keep AGENTS.md and the skills
catalog out of the child, `extensions:` empty keeps every other extension
out (pi-subagents warns about an empty list at launch; that is intended),
`tools:` is the seven file tools, `excludeTools: contact_supervisor` removes
the supervisor protocol the model failed, and `acceptance: none` leaves
verification to the parent, which runs the tests itself.

Optional, global, and it affects every subagent the user has: setting
`{"intercomBridge": {"mode": "off"}}` in
`~/.pi/agent/extensions/subagent/config.json` halves the child's prompt.
Mention it; do not apply it unasked.

Re-run the check.
