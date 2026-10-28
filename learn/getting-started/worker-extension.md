---
title: The worker extension
track: getting-started
position: 5
prerequisites: [getting-started/ditch]
authors: [Paul Everitt]
backends: [llamacpp]
---

# The worker extension

A Pi extension is a TypeScript module that exports a default factory. Pi calls
that factory with an `ExtensionAPI`; the extension registers commands, tools,
or event handlers. It runs inside the Pi process with the same permissions, so
load only extensions you trust.

The worker is `extensions/mellum-worker.ts`. This step is about the
mechanism: the hooks, events and callbacks that let one extension change the
prompt, the tool set and the guards. What each change buys is measured in the
Lessons track.

![A small robot clicking a new modular attachment onto its arm](../assets/illustrations/worker-extension.webp){ .illustration }

## A minimal extension

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("hello", {
    description: "Show a greeting",
    handler: async (name, ctx) => {
      ctx.ui.notify(`Hello, ${name || "world"}!`, "info");
    },
  });

  pi.on("tool_call", (event) => {
    if (event.toolName === "bash" && String(event.input.command).includes("rm -rf")) {
      return { block: true, reason: "Refusing a recursive delete." };
    }
  });
}
```

`registerCommand` adds a `/hello` command. `pi.on` registers a **callback** for
a named **event**. Some callbacks only observe; others transform data, block a
call, or ask Pi for one more model request. The return value is part of the
contract, not decoration.

## The worker's hooks

| Lever | Hook or event | What the callback does |
| --- | --- | --- |
| Command | `registerCommand("mellum")` | One-shot `/mellum <task>`, or `/mellum on` / `off`. |
| Prompt | `before_provider_request` | Replaces the system message with the worker prompt and filters the messages the model sees. |
| Tools | `setActiveTools` | Selects the tools the model may call. |
| Guards | `tool_call` | Returns `{ block: true, reason }` to stop a call. |
| Guards | `turn_end` and `agent_before_settle` | Recognise an empty final turn and return `continue: true` with a nudge. |
| Context | `context` | Collapses the worker span into one handoff block for the parent. |
| Restore | `agent_settled` | Notification-only boundary: the span has ended, so the extension restores the previous model and tools. |

Pi runs handlers in registration order and awaits them. `pi.on` returns an
unsubscribe function. A handler may be async; an error in a `tool_call`
handler blocks the tool as a fail-safe, while an ordinary event error is
reported and Pi continues.

The worker uses these hooks together. `/mellum` registers the command,
`setModel` switches the active model, `setActiveTools` narrows the tool set,
`before_provider_request` installs the worker prompt, `tool_call` guards the
calls, and `agent_before_settle` handles the empty turn. The same session runs
the worker and then returns to the main model with a handoff.

## Prompts, tools and guards are mechanisms

Those are three separate levers, even though the shipped worker pulls all
three:

- the **prompt** is text the extension installs;
- the **tool set** is the active list Pi exposes to the model;
- the **guards** are functions that inspect a call or a turn and decide whether
  to block or continue.

Tool control is not a measured remedy here. The worker's seven tools are
Pi's seven built-in tools, so Baseline Pi and the Baseline Worker offer the same set; the
restriction matters when another extension or MCP server has added tools.
Project facts are another prompt-side remedy, added later.

## Stay in the workspace

A worker can hang a whole run by searching the machine instead of its
workspace: `grep -rl pattern /Users /var /tmp …` crawls everything and keeps
the tool call open. Keep searches relative (`grep -rl pattern .`). PR #1
proposes a **runaway search** guard that blocks recursive searches whose
absolute paths leave the workspace
([code](https://github.com/pauleveritt/mellum-worker/blob/176922f05702d6f8e87a9b2570ed6fe9807db733/extensions/mellum-guards.ts#L145-L185));
it is not shipped yet.

## See it run

The wrappers set the profile, session, model, isolation flags and extension.
This is a smoke, not evidence:

```bash
learn/code/clinic "/mellum Reply with the single word: ready."
```

The command returns when the span settles. The next lessons measure what the
prompt, the empty-final nudge and the loop breaker actually change.
