import { appendFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

// A lesson-sized recorder: what the run asked for, what tools it used, what
// failed, and how it ended. The ladder's recorder is the fuller instrument.
export function installRecorder(pi, options = {}) {
  const {
    write = (row) =>
      appendFileSync(process.env.MELLUM_TRACE_FILE, JSON.stringify(row) + "\n"),
    runId = randomUUID(),
    pid = process.pid,
  } = options;
  let seq = 0;
  let requests = 0;
  let activeRequest = null;

  function record(fields) {
    try {
      write({
        traceSchema: 1,
        runId,
        seq: ++seq,
        timestamp: new Date().toISOString(),
        pid,
        activeRequest,
        ...fields,
      });
    } catch {
      // A trace is diagnostic: losing a row must not stop the run.
    }
  }

  record({ type: "instance_start", cwd: process.cwd() });
  pi.on("before_provider_request", (event) => {
    activeRequest = `request-${++requests}`;
    record({ type: "provider_request", request: requests, payload: event.payload });
  });
  pi.on("message_end", (event) => {
    record({ type: "message_end", message: event.message });
    activeRequest = null;
  });
  pi.on("tool_call", (event) =>
    record({ type: "tool_call", toolName: event.toolName, input: event.input }));
  pi.on("tool_result", (event) =>
    record({ type: "tool_result", toolName: event.toolName, isError: event.isError }));
  pi.on("agent_settled", (event) => {
    record({ type: "agent_settled", aborted: event.aborted });
    activeRequest = null;
  });
}

export default function install(pi) {
  if (process.env.MELLUM_TRACE_FILE) installRecorder(pi);
}
