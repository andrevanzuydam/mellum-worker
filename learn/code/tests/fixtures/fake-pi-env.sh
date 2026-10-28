#!/bin/sh
[ -d tests ] && { echo "tests visible" >&2; exit 9; }
printf 'MELLUM_MODE_FACTS=%s\n' "${MELLUM_MODE_FACTS-}" > env.txt
