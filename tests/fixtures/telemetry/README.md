# Pi 1.1 replay evidence

`pi110.events.json` is the final request (13), parsed provider chunks, actual
normalized assistant reply and settlement from `pi110-hello-ny6sfma5/hello-baseline-1/trace.jsonl`,
in the retained October 11 hello archive. Source archive SHA-256:
`b8e8b0acfd2447d0a4c452ea81f70596c6d21993a525612c9eb3208bcefe0f15`.

Transformation: retain request 13 only; omit the unrelated recorder-stats row;
replace recorder UUID and PID with neutral stable values. The request retains
model, output/sampling/thinking parameters; tools and original conversation
are omitted, with one explanatory user-message placeholder. Chunks, normalized
reply, native duration, timestamps and settlement are unchanged. This is an
event replay fixture, not an eval case or a reconstructed prompt. It contains
no synthetic final message. Runtime identity is supplied by the test from the
source protocol's documented Pi 1.1.0 runtime, not invented as an observed hook.

Legacy compatibility reuses `../worker/a10-rung1-r1.trace.jsonl`; see that
directory's README for its independently recorded transformations.
