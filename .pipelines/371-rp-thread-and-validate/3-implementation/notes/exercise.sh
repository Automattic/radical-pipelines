#!/bin/sh
# Drives a review through the delivered assignments: a reviewer opens its review with the commands its first-turn
# request states, the implementer answers with the command its assignment states, the reviewer tries to approve without
# a closing message and then with one, and each turn lands. Prints a transcript with the temporary paths replaced.
# Usage: sh exercise.sh <path of rp.mjs>
set -u
RP=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
REPO=$(mktemp -d)/repo
mkdir -p "$REPO" && cd "$REPO" || exit 1
show() { sed -e "s#$REPO#<repo>#g" -e "s#/private<repo>#<repo>#g" -e "s#$RP#<rp>#g" -e "s#${BODIES:-//}#<bodies>#g"; }
run() { printf '\n$ %s\n' "$*" | show; out=$(sh -c "$*" 2>&1); code=$?; [ -n "$out" ] && printf '%s\n' "$out" | show; printf '[exit %s]\n' "$code"; }
# The code block of the assignment $1 that holds $2, as written, its `<…>` line replaced by the lines of the file $3.
stated() { awk -v pat="$2" -v body="${3:-}" '
  /^```$/ { if (inb) { if (b ~ pat) printf "%s", b; inb = 0; b = "" } else inb = 1; next }
  inb && body != "" && /^<[^>]*>$/ { while ((getline line < body) > 0) b = b line "\n"; next }
  inb { b = b $0 "\n" }' "$1"; }
BODIES=$(mktemp -d)
cat > "$BODIES/review.md" <<'EOF'
### Finding 1: `a` changes without a test, and `$HOME` stays as written

```js
## not a message heading: fenced
```
EOF
echo 'The test resolves it.' > "$BODIES/closing.md"
git init -q -b main && git config user.email a@b.c && git config user.name rp && git config commit.gpgsign false
printf -- '---\n{"conventions": 9, "worktree-folder-root": ".worktrees"}\n---\n' > .rp.md
printf '.worktrees/\n.rp.md\n' >> .git/info/exclude
mkdir -p src && echo 'export const a = 1;' > src/app.js && git add -A && git commit -qm base && git checkout -qb demo
P=.pipelines/demo
mkdir -p $P/0-intent $P/1-spec $P/2-design-doc $P/3-implementation
printf -- '---\n{"format": 8, "target-phase": 4, "base": "main"}\n---\n' > $P/run-config.md
printf -- '---\nissue: 7\n---\n# Intent\n' > $P/0-intent/intent.md
echo '# Spec' > $P/1-spec/spec.md && echo '# Design doc' > $P/2-design-doc/design-doc.md
printf -- '---\nstatus: done\n---\n# Notes\n' > $P/3-implementation/notes.md
echo 'export const a = 2;' > src/app.js && git add -A && git commit -qm pipeline
for f in 1-spec/spec.md 2-design-doc/design-doc.md 3-implementation/notes.md; do
  case $f in 1-*) ins="0-intent/intent.md";; 2-*) ins="1-spec/spec.md";; *) ins="1-spec/spec.md 2-design-doc/design-doc.md";; esac
  list=$(for i in $ins; do printf '"%s@%s",' "$i" "$(git rev-parse HEAD:$P/$i | cut -c1-12)"; done)
  mkdir -p "$(dirname $P/certification/$f)" && printf '{"inputs": [%s]}\n' "${list%,}" > $P/certification/$f.json
done
git add -A && git commit -qm certifications

echo '# 1. The reviewer, woken on its first turn, runs the commands its request states'
run "node $RP next $REPO/$P --apply | grep '^wake reviewer-default \(worktree\|assignment\)'"
WT=$REPO/.worktrees/demo-review-default
A=$(git -C "$WT" rev-parse --path-format=absolute --git-path rp/reviewer.md)
run "sed -n '/^Write your review/,/lists them\.\$/p' $A"
run "ls $WT/$P"
run "cd $WT && $(stated "$A" 'thread open' "$BODIES/review.md")"
run "node $RP validate $WT/$P --role reviewer-default"
run "cat $WT/$P/threads/1-reviewer-default-implementer-implementation.md"
run "cd $WT && git add -A && git commit -qm 'Open review thread (reviewer)' && node $RP land $REPO/$P --role reviewer-default && node $RP check $REPO/$P | grep '^thread\|^review'"

echo
echo '# 2. The implementer answers with the command its assignment states'
run "node $RP next $REPO/$P --apply | grep '^wake implementer assignment'"
IA=$(git rev-parse --path-format=absolute --git-path rp/implementer.md)
run "grep '^- rp: ' $IA"
CMD=$(sed -n 's/^- rp: `\([^`]*\)`.*/\1/p' "$IA" | sed "s#<command>#thread reply --thread $P/threads/1-reviewer-default-implementer-implementation.md --body -#")
run "$CMD <<'EOF'
### Finding 1: changed in $(git rev-parse --short HEAD)

A test covers it.
EOF"
run "git add -A && git commit -qm 'Answer the review (implementer)' && node $RP land $REPO/$P --role implementer && node $RP check $REPO/$P | grep '^thread\|^review'"

echo
echo '# 3. The reviewer approves on its later turn: refused without a closing message, accepted with one'
run "node $RP next $REPO/$P --apply | grep '^wake reviewer-default assignment'"
run "cd $WT && $(stated "$A" 'thread close' "$BODIES/closing.md" | sed 's/ --body - <</ <</')"
run "cd $WT && $(stated "$A" 'thread close' "$BODIES/closing.md")"
run "cd $WT && git add -A && git commit -qm 'Approve review (reviewer)' && node $RP land $REPO/$P --role reviewer-default && node $RP check $REPO/$P | grep '^frontier\|^thread\|^review'"
run "node $RP next $REPO/$P | grep '^\(fix\|repair\|frontier INVALID\)' || echo 'no fix, repair, or INVALID line'"

echo
echo '# 4. Wrong uses say what was wrong and what to run instead'
run "node $RP thread open $REPO/$P --role implementer --artifact intent --body /dev/null"
run "node $RP thread reply $REPO/$P --role implementer --thread $P/threads/1-reviewer-default-implementer-implementation.md --body $BODIES/closing.md"
run "node $RP thread open $REPO/$P --role implementer --artifact spec --body - </dev/null"
run "node $RP thread open $REPO/$P --role implementer --artifact spec --body - <<'EOF'
## Summary
EOF"
run "node $RP thread"
run "git status --short"
