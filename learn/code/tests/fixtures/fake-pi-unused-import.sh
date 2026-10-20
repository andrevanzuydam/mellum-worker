#!/bin/sh
[ -d tests ] && { echo "tests visible" >&2; exit 9; }
printf 'import os\n\n\ndef add(a, b):\n    return a + b\n' > add.py
echo "done"
