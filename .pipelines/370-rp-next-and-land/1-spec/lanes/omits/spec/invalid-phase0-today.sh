#!/bin/zsh
set -u
RPJS="${RPJS:?path to skills/radical-pipelines/scripts/rp.mjs}"; rp() { node "$RPJS" "$@"; }
T=$(mktemp -d /tmp/rp-omits-invalid.XXXXXX); cd $T && mkdir main && cd main
git init -q --initial-branch=main && git config user.email t@e.com && git config user.name T && git config commit.gpgsign false
echo a > app.js
printf -- '---\n{ "conventions": 8, "commit-format": "Use imperative mood." }\n---\n# c\n' > .rp.md
git add -A && git commit -qm base && git switch -qc 7-demo
P=$T/main/.pipelines/7-demo; mkdir -p $P/0-intent
printf -- '---\n{ "format": 8, "target-phase": 1, "base": "main" }\n---\n' > $P/run-config.md
printf -- '---\nissue: #7\n---\n\n# Intent\n' > $P/0-intent/intent.md
git add -A && git commit -qm intent
echo "### check: the intent is malformed"; rp check $P
echo "### assign: no role writes the intent"; for r in spec-producer implementer; do rp assign $P --role $r; echo "exit $?"; done
echo $T
