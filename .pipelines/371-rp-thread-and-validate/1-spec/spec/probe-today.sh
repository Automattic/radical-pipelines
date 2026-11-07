#!/bin/sh
# Probe: what roles can run today to write and check threads, and what each seat's tree holds.
# Usage: sh probe-today.sh <path to rp.mjs>. Builds a scratch repository under $TMPDIR and prints a transcript,
# with the scratch path written as <repo>.
RP="$1"
R=$(mktemp -d "${TMPDIR:-/tmp}/rp371-XXXXXX")
R=$(cd "$R" && pwd -P)
P=.pipelines/demo
say() { printf '\n$ %s\n' "$*" | sed "s#$R#<repo>#g; s#$RP#rp.mjs#g"; }
run() { say "$@"; out=$("$@" 2>&1); code=$?; printf '%s\n' "$out" | sed "s#$R#<repo>#g"; echo "[exit $code]"; }
fm() { printf -- '---\n%s\n---\n' "$1"; }

cd "$R"
git init --quiet --initial-branch=main
git config user.email probe@example.com; git config user.name Probe; git config commit.gpgsign false
mkdir src; echo 'export const a = 1;' > src/app.js; git add -A; git commit --quiet -m base
git checkout --quiet -b demo
printf '.worktrees/\n.rp.md\n' >> .git/info/exclude
printf -- '---\n{ "conventions": 9, "worktree-folder-root": ".worktrees" }\n---\n' > .rp.md
mkdir -p $P/0-intent $P/1-spec $P/2-design-doc $P/3-implementation $P/threads
printf -- '---\n{ "format": 8, "target-phase": 4, "base": "main", "agents": { "reviewer": { "lanes": { "default": {} } } } }\n---\n' > $P/run-config.md
{ fm 'issue: "7"'; printf '\n# Intent\n\n## Goal\n\nUsers can export.\n'; } > $P/0-intent/intent.md
printf '# Spec\n' > $P/1-spec/spec.md; printf '# Design doc\n' > $P/2-design-doc/design-doc.md
{ fm 'status: done'; printf '\n# Notes\n'; } > $P/3-implementation/notes.md
{ fm 'status: approved
opener: design-doc-producer
owner: spec-producer
artifact: spec'; printf '\n## design-doc-producer — abc1234\n\nFinding.\n'; } > $P/threads/1-design-doc-producer-spec-producer-spec.md
{ fm 'status: approved
opener: implementer
owner: design-doc-producer
artifact: design-doc'; printf '\n## implementer — abc1234\n\nFinding.\n'; } > $P/threads/2-implementer-design-doc-producer-design-doc.md
git add -A; git commit --quiet -m pipeline
# Certify the artifacts as landing would, at HEAD.
id() { git rev-parse "HEAD:$P/$1" | cut -c1-12; }
mkdir -p $P/certification/1-spec $P/certification/2-design-doc $P/certification/3-implementation
printf '{ "inputs": ["0-intent/intent.md@%s"] }\n' "$(id 0-intent/intent.md)" > $P/certification/1-spec/spec.md.json
printf '{ "inputs": ["1-spec/spec.md@%s"] }\n' "$(id 1-spec/spec.md)" > $P/certification/2-design-doc/design-doc.md.json
printf '{ "inputs": ["1-spec/spec.md@%s", "2-design-doc/design-doc.md@%s"] }\n' "$(id 1-spec/spec.md)" "$(id 2-design-doc/design-doc.md)" > $P/certification/3-implementation/notes.md.json
echo 'export const a = 2;' > src/app.js
git add -A; git commit --quiet -m 'certify and change code'

echo "# 1. The commands roles have today"
run node "$RP" thread open
run node "$RP" validate
run node "$RP" --help

echo; echo "# 2. A review lane woken on its first turn"
run node "$RP" next "$R/$P" --apply
W="$R/.worktrees/demo-review-default"
say "find <worktree>/$P -type f"; (cd "$W/$P" && find . -type f | sort)
say "cat <reviewer assignment>"; cat "$(git -C "$W" rev-parse --path-format=absolute --git-path rp/reviewer.md)" | sed "s#$R#<repo>#g"
run node "$RP" check "$W/$P"

echo; echo "# 3. The reviewer writes its review by hand, at the number its assignment names, and the turn lands"
C=$(git -C "$W" rev-parse HEAD)
say "mkdir <worktree>/$P/threads   (the reviewer's tree holds no threads folder)"; mkdir -p "$W/$P/threads"
{ fm 'status: open
opener: reviewer-default
owner: implementer
artifact: implementation'; printf '\n## reviewer-default — %s\n\n## Summary\n\nOne finding.\n' "$C"; } > "$W/$P/threads/3-reviewer-default-implementer-implementation.md"
git -C "$W" add -A; git -C "$W" commit --quiet -m 'Open review thread (reviewer)'
run node "$RP" land "$R/$P" --role reviewer-default
say "the next step, after the rejected landing"
run node "$RP" next "$R/$P"
say "sed -i the '## Summary' line out of the review thread, commit, land"
sed -i.bak '/^## Summary$/d' "$W/$P/threads/3-reviewer-default-implementer-implementation.md"; rm "$W/$P/threads/"*.bak
git -C "$W" add -A; git -C "$W" commit --quiet -m 'Fix review thread (reviewer)'
run node "$RP" land "$R/$P" --role reviewer-default
run node "$RP" check "$R/$P"

echo; echo "# 4. The implementer woken to respond"
run node "$RP" next "$R/$P" --apply
say "cat <implementer assignment>"; cat "$(git rev-parse --path-format=absolute --git-path rp/implementer.md)" | sed "s#$R#<repo>#g"

echo; echo "# 5. Two roles' files rejected at once in the pipeline worktree"
say "write notes.md with an unknown frontmatter key, and a spec thread whose status is hand-written as 'closed'"
{ fm 'status: done
state: done'; printf '\n# Notes\n'; } > $P/3-implementation/notes.md
sed -i.bak 's/^status: approved$/status: closed/' $P/threads/1-design-doc-producer-spec-producer-spec.md; rm $P/threads/*.bak
git add -A; git commit --quiet -m 'two malformed files'
run node "$RP" next "$R/$P" --apply
for role in spec-producer design-doc-producer implementer; do
  say "sed -n '/## Malformed files/,/## Write to/p' <$role assignment>"
  sed -n '/## Malformed files/,/## Write to/p' "$(git rev-parse --path-format=absolute --git-path rp/$role.md)" | sed "s#$R#<repo>#g"
done

echo; echo "# 6. A thread of an earlier-format pipeline, read under today's thread grammar"
say "copy <this repository>/.pipelines/370-rp-next-and-land/threads/1-design-doc-producer-spec-producer-spec.md (format 6) over the scratch spec thread"
cp "$(dirname "$RP")/../../../.pipelines/370-rp-next-and-land/threads/1-design-doc-producer-spec-producer-spec.md" $P/threads/1-design-doc-producer-spec-producer-spec.md
{ fm 'status: done'; printf '\n# Notes\n'; } > $P/3-implementation/notes.md
git add -A; git commit --quiet -m 'an earlier-format thread'
say "head -5 $P/threads/1-design-doc-producer-spec-producer-spec.md"; head -5 $P/threads/1-design-doc-producer-spec-producer-spec.md
run node "$RP" check "$R/$P"

rm -rf "$R"
