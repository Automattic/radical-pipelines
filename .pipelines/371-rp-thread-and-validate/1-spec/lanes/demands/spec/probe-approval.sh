#!/bin/sh
# Probe: how a reviewer's approval on a later turn lands, by what its last message heading names.
# Usage: sh probe-approval.sh <path to rp.mjs>. Builds a scratch repository under $TMPDIR and prints a transcript,
# with the scratch path written as <repo>.
RP="$1"
R=$(mktemp -d "${TMPDIR:-/tmp}/rp371-XXXXXX")
R=$(cd "$R" && pwd -P)
P=.pipelines/demo
say() { printf '\n$ %s\n' "$*" | sed "s#$R#<repo>#g; s#$RP#rp.mjs#g"; }
run() { say "$@"; out=$("$@" 2>&1); code=$?; printf '%s\n' "$out" | sed "s#$R#<repo>#g"; echo "[exit $code]"; }
fm() { printf -- '---\n%s\n---\n' "$1"; }
review() { fm "status: $2
opener: reviewer-$1
owner: implementer
artifact: implementation"; }

cd "$R"
git init --quiet --initial-branch=main
git config user.email probe@example.com; git config user.name Probe; git config commit.gpgsign false
mkdir src; echo 'export const a = 1;' > src/app.js; git add -A; git commit --quiet -m base
git checkout --quiet -b demo
printf '.worktrees/\n.rp.md\n' >> .git/info/exclude
printf -- '---\n{ "conventions": 9, "worktree-folder-root": ".worktrees" }\n---\n' > .rp.md
mkdir -p $P/0-intent $P/1-spec $P/2-design-doc $P/3-implementation
printf -- '---\n{ "format": 8, "target-phase": 4, "base": "main", "agents": { "reviewer": { "lanes": { "a": {}, "b": {} } } } }\n---\n' > $P/run-config.md
{ fm 'issue: "7"'; printf '\n# Intent\n\n## Goal\n\nUsers can export.\n'; } > $P/0-intent/intent.md
printf '# Spec\n' > $P/1-spec/spec.md; printf '# Design doc\n' > $P/2-design-doc/design-doc.md
{ fm 'status: done'; printf '\n# Notes\n'; } > $P/3-implementation/notes.md
git add -A; git commit --quiet -m pipeline
id() { git rev-parse "HEAD:$P/$1" | cut -c1-12; }
mkdir -p $P/certification/1-spec $P/certification/2-design-doc $P/certification/3-implementation
printf '{ "inputs": ["0-intent/intent.md@%s"] }\n' "$(id 0-intent/intent.md)" > $P/certification/1-spec/spec.md.json
printf '{ "inputs": ["1-spec/spec.md@%s"] }\n' "$(id 1-spec/spec.md)" > $P/certification/2-design-doc/design-doc.md.json
printf '{ "inputs": ["1-spec/spec.md@%s", "2-design-doc/design-doc.md@%s"] }\n' "$(id 1-spec/spec.md)" "$(id 2-design-doc/design-doc.md)" > $P/certification/3-implementation/notes.md.json
echo 'export const a = 2;' > src/app.js
git add -A; git commit --quiet -m 'certify and change code'

echo "# 1. First review turn: lanes a and b each open a review thread with a finding"
run node "$RP" next "$R/$P" --apply
for l in a b; do
  W="$R/.worktrees/demo-review-$l"; C=$(git -C "$W" rev-parse HEAD); mkdir -p "$W/$P/threads"
  { review $l open; printf '\n## reviewer-%s — %s\n\n### Finding 1: a is 2\n' $l "$C"; } > "$W/$P/threads/1-reviewer-$l-implementer-implementation.md"
  git -C "$W" add -A; git -C "$W" commit --quiet -m "Open review thread (reviewer-$l)"
  run node "$RP" land "$R/$P" --role reviewer-$l
done

echo; echo "# 2. The implementer fixes the code and answers both threads"
run node "$RP" next "$R/$P" --apply
echo 'export const a = 3;' > src/app.js; git add -A; git commit --quiet -m 'Fix a (implementer)'
F=$(git rev-parse HEAD)
for l in a b; do printf '\n## implementer — %s\n\n### 1: changed in %s\n' "$F" "$F" >> $P/threads/1-reviewer-$l-implementer-implementation.md; done
git add -A; git commit --quiet -m 'Answer the review threads (implementer)'
run node "$RP" land "$R/$P" --role implementer

echo; echo "# 3. Later review turn: a sets its status to approved and appends nothing; b appends a message naming this turn's change, then sets approved"
run node "$RP" next "$R/$P" --apply
for l in a b; do
  W="$R/.worktrees/demo-review-$l"; T="$W/$P/threads/1-reviewer-$l-implementer-implementation.md"
  say "git -C <lane $l worktree> rev-parse HEAD"; git -C "$W" rev-parse HEAD
  [ $l = b ] && printf '\n## reviewer-b — %s\n\nThe fix holds.\n' "$(git -C "$W" rev-parse HEAD)" >> "$T"
  sed -i.bak 's/^status: open$/status: approved/' "$T"; rm "$T.bak"
  say "grep '^status\|^## ' <lane $l review thread>"; grep '^status\|^## ' "$T"
  git -C "$W" add -A; git -C "$W" commit --quiet -m "Approve (reviewer-$l)"
  run node "$RP" land "$R/$P" --role reviewer-$l
done
run node "$RP" check "$R/$P"

rm -rf "$R"
