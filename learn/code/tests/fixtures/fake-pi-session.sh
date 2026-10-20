#!/bin/sh
[ -d tests ] && { echo "tests visible" >&2; exit 9; }
sid=""; sd=""; prev=""
for a in "$@"; do
  case "$prev" in
    --session-id) sid="$a" ;;
    --session-dir) sd="$a" ;;
  esac
  prev="$a"
  prompt="$a"
done
printf '%s|%s|%s\n' "$sid" "$sd" "$prompt" >> session-log.txt
printf '{"traceSchema":1,"type":"instance_start","runId":"%s"}\n' "$sid" >> "$MELLUM_TRACE_FILE"
case "$prompt" in
  *Second*) : > two.txt ;;
  *) : > one.txt ;;
esac
