#!/bin/sh
# The command an assignment states, from a copy of the skill and in a repository whose paths hold a space and a quote,
# run as the assignment writes it. Prints a transcript with the temporary paths replaced.
# Usage: sh paths-with-spaces.sh <path of rp.mjs>
set -u
SOURCE=$(cd "$(dirname "$1")/.." && pwd)
TMP=$(mktemp -d)
SKILL="$TMP/the skill's folder"
mkdir -p "$SKILL" && cp -R "$SOURCE/scripts" "$SOURCE/templates" "$SKILL/"
RP="$SKILL/scripts/rp.mjs"
REPO="$TMP/the repo's folder"
mkdir -p "$REPO" && cd "$REPO" || exit 1
show() { sed -e "s#/private$TMP#<tmp>#g" -e "s#$TMP#<tmp>#g"; }
run() { printf '\n$ %s\n' "$*" | show; out=$(sh -c "$*" 2>&1); code=$?; [ -n "$out" ] && printf '%s\n' "$out" | show; printf '[exit %s]\n' "$code"; }
git init -q -b main && git config user.email a@b.c && git config user.name rp && git config commit.gpgsign false
printf -- '---\n{"conventions": 9, "worktree-folder-root": ".worktrees"}\n---\n' > .rp.md
printf '.worktrees/\n.rp.md\n' >> .git/info/exclude
echo 'export const a = 1;' > app.js && git add -A && git commit -qm base && git checkout -qb demo
mkdir -p .pipelines/demo/0-intent
printf -- '---\n{"format": 8, "target-phase": 1, "base": "main"}\n---\n' > .pipelines/demo/run-config.md
printf -- '---\nissue: 7\n---\n# Intent\n' > .pipelines/demo/0-intent/intent.md
git add -A && git commit -qm pipeline
node "$RP" next "$REPO/.pipelines/demo" --apply > /dev/null
A=$(git rev-parse --path-format=absolute --git-path rp/spec-producer.md)
printf '\n$ grep -e "^- Intent: " -e "^- rp: " <the assignment>\n'
grep -e '^- Intent: ' -e '^- rp: ' "$A" | show
CMD=$(sed -n 's/^- rp: `\([^`]*\)`.*/\1/p' "$A")
run "$(echo "$CMD" | sed 's/<command>/validate/')"
run "$(echo "$CMD" | sed 's/<command>/thread escalate --cites x --body -/') <<'EOF'
Does the intent demand X?
EOF"
