#!/bin/sh
[ -d tests ] && { echo "tests visible" >&2; exit 9; }
printf 'def add(a, b):\n    return a + b\n' > add.py
echo "$PI_CODING_AGENT_DIR" > profile-path.txt
