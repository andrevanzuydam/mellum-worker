#!/bin/sh
[ -d tests ] && { echo "tests visible" >&2; exit 9; }
case "$*" in
  *product*) printf 'def mul(a, b):\n    return a * b\n' > mul.py ;;
  *) printf 'def add(a, b):\n    return a + b\n' > add.py ;;
esac
echo "$PI_CODING_AGENT_DIR" > profile-path.txt
