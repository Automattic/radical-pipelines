#!/bin/zsh
set -u
RPJS="${RPJS:?path to skills/radical-pipelines/scripts/rp.mjs}"; rp() { node "$RPJS" "$@"; }
T=$(mktemp -d /tmp/rp-omits-changed.XXXXXX)
cd $T && mkdir main && cd main
git init -q --initial-branch=main && git config user.email t@e.com && git config user.name T && git config commit.gpgsign false
echo a > app.js
printf -- '---\n{ "conventions": 8, "commit-format": "Use imperative mood." }\n---\n# c\n' > .rp.md
git add -A && git commit -qm base
git switch -qc 7-demo
P=$T/main/.pipelines/7-demo; mkdir -p $P/0-intent $P/1-spec
printf -- '---\n{ "format": 8, "target-phase": 2, "base": "main" }\n---\n' > $P/run-config.md
printf -- '---\nissue: "7"\n---\n\n# Intent\n\n## Goal\n\nx\n' > $P/0-intent/intent.md
echo '# Spec' > $P/1-spec/spec.md
git add -A && git commit -qm spec; TC=$(git rev-parse HEAD)
rp stamp $P/1-spec/spec.md --at $TC; git add -A; git commit -qm stamp
echo more >> $P/0-intent/intent.md; git add -A; git commit -qm "intent change"
echo "### check json (frontier entry + phases)"; rp check $P --json | python3 -c 'import json,sys; d=json.load(sys.stdin); print(json.dumps({"frontier":d["frontier"],"phases":d["phases"]},indent=1))'
echo "### assign"; rp assign $P --role spec-producer
sed -n 1,60p $(git rev-parse --git-path rp/spec-producer.md) | grep -n -i -A3 "Changed inputs\|Mode"
echo $T
