#!/bin/sh
# The command an assignment states, run in a repository whose path holds a space: as the assignment writes it, and with
# the pipeline folder passed as one shell argument. Prints a transcript with the temporary path replaced.
# Usage: sh paths-with-spaces.sh <path of rp.mjs>
set -u
RP=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
REPO="$(mktemp -d)/with space"
mkdir -p "$REPO" && cd "$REPO" || exit 1
show() { sed -e "s#$REPO#<repo with space>#g" -e "s#/private<repo with space>#<repo with space>#g" -e "s#$RP#<rp>#g"; }
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
run "grep '^- rp: ' '$A'"
CMD=$(sed -n 's/^- rp: `\([^`]*\)`.*/\1/p' "$A")
run "$(echo "$CMD" | sed 's/<command>/validate/')"
run "node '$RP' validate '$REPO/.pipelines/demo' --role spec-producer"
