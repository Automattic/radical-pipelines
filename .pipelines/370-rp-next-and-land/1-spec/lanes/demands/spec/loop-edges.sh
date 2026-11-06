#!/usr/bin/env bash
# Edge cases of today's loop step (skill at the base, 369-conventions-as-data), each from a fresh scratch repository.
# Usage: bash loop-edges.sh <path to rp.mjs> <scratch folder, recreated>
set -uo pipefail
RP="$1"; WORK="$2"; rm -rf "$WORK"; mkdir -p "$WORK"
S=42-export; P=".pipelines/$S"
show() { sed -e "s#/private$WORK#<scratch>#g" -e "s#$WORK#<scratch>#g" -e "s#$RP#rp.mjs#g"; }
orch() { echo "ORCH \$ $*" | show; "$@" > "$WORK/.out" 2>&1; local s=$?; show < "$WORK/.out"; echo "(exit $s)"; return 0; }
g() { git -c user.email=t@example.com -c user.name=T -c commit.gpgsign=false "$@"; }
note() { echo; echo "## $*"; }
turn_of() { sed -n 's/^- Turn commit: //p' "$1"; }
asg() { git -C "$1" rev-parse --path-format=absolute --git-path "rp/$2.md"; }

# A repository with a pipeline whose run-config is $1 (JSON), its intent committed on branch $S in worktree $PW.
setup() {
  R="$WORK/$2/repo"; PW="$R/.worktrees/$S"; mkdir -p "$R"; ( cd "$R"; g init -q --initial-branch=main
  mkdir -p src; echo 'export const a = 1;' > src/app.js; printf '.worktrees/\nnode_modules/\n' > .gitignore
  printf -- '---\n{"conventions": 8}\n---\n' > .rp.md; g add -A; g commit -qm base
  g branch -q "$S" main; g worktree add -q "$PW" "$S" )
  mkdir -p "$PW/$P/0-intent"; printf -- '---\nissue: "42"\n---\n\n# Export\n\n## Goal\n\nUsers can export.\n' > "$PW/$P/0-intent/intent.md"
  printf -- '---\n%s\n---\n' "$1" > "$PW/$P/run-config.md"; g -C "$PW" add -A; g -C "$PW" commit -qm "Add intent"
}
# Root artifact $1 written and landed in the pipeline worktree by profile $2.
root_turn() {
  node "$RP" assign "$PW/$P" --role "$2" >/dev/null; local T; T=$(turn_of "$(asg "$PW" "$2")")
  mkdir -p "$(dirname "$PW/$P/$1")"; printf -- "${3:-# $1\n}" > "$PW/$P/$1"; g -C "$PW" add -A; g -C "$PW" commit -qm "Write $1"
  node "$RP" stamp "$PW/$P/$1" --at "$T"; g -C "$PW" add -A; g -C "$PW" commit -qm "Stamp $1"
}

note "E1a: a production lane writes a candidate that does not validate; landing it today"
setup '{"format": 8, "target-phase": 1, "base": "main", "agents": {"spec-producer": {"lanes": {"a": {}}}}}' e1a
LW="$R/.worktrees/$S-spec-a"; g -C "$PW" branch -q "$S-spec-a" "$S"; g -C "$PW" worktree add -q "$LW" "$S-spec-a"
node "$RP" assign "$PW/$P" --role spec-producer-a >/dev/null; T=$(turn_of "$(asg "$LW" spec-producer)")
mkdir -p "$LW/$P/1-spec/lanes/a"; printf -- '---\ntitle: x\n---\n# Candidate\n' > "$LW/$P/1-spec/lanes/a/spec.md"; g -C "$LW" add -A; g -C "$LW" commit -qm "Add candidate"
orch node "$RP" stamp "$LW/$P/1-spec/lanes/a/spec.md" --at "$T"
echo "(orchestrator merges anyway, as loop.md step 4.2 has no stop)"; g -C "$PW" merge -q --no-edit "$S-spec-a"
orch node "$RP" check "$PW/$P"

note "E1b: a review lane writes a review thread that does not validate; landing it today"
setup '{"format": 8, "target-phase": 4, "base": "main"}' e1b
root_turn 1-spec/spec.md spec-producer; root_turn 2-design-doc/design-doc.md design-doc-producer; root_turn 3-implementation/notes.md implementer '---\nstatus: done\n---\n# Notes\n'
node "$RP" review "$PW/$P" --lane default >/dev/null; RW="$R/.worktrees/$S-review-default"; g -C "$PW" worktree add -q "$RW" "$S-review-default"
node "$RP" assign "$PW/$P" --role reviewer-default >/dev/null; C=$(g -C "$RW" rev-parse HEAD)
mkdir -p "$RW/$P/threads"; printf -- '---\nstatus: pending\nopener: reviewer-default\nowner: implementer\nartifact: implementation\n---\n\n## reviewer-default — %s\n\nLooks right so far.\n' "$C" > "$RW/$P/threads/1-reviewer-default-implementer-implementation.md"
g -C "$RW" add -A; g -C "$RW" commit -qm "Review"
orch node "$RP" check "$RW/$P"
echo "(landing today: not an approval, so nothing is stamped; the cherry-pick lands it)"; g -C "$PW" cherry-pick "$C..$S-review-default" >/dev/null
orch node "$RP" check "$PW/$P"

note "E2: rp review on a lane branch holding commits the pipeline branch lacks (a turn not landed)"
setup '{"format": 8, "target-phase": 4, "base": "main"}' e2
root_turn 1-spec/spec.md spec-producer; root_turn 2-design-doc/design-doc.md design-doc-producer; root_turn 3-implementation/notes.md implementer '---\nstatus: done\n---\n# Notes\n'
node "$RP" review "$PW/$P" --lane default >/dev/null; RW="$R/.worktrees/$S-review-default"; g -C "$PW" worktree add -q "$RW" "$S-review-default"
C=$(g -C "$RW" rev-parse HEAD); mkdir -p "$RW/$P/threads"
printf -- '---\nstatus: open\nopener: reviewer-default\nowner: implementer\nartifact: implementation\n---\n\n## reviewer-default — %s\n\nFinding.\n' "$C" > "$RW/$P/threads/1-reviewer-default-implementer-implementation.md"; g -C "$RW" add -A; g -C "$RW" commit -qm "Review"
orch node "$RP" review "$PW/$P" --lane default
echo "(after the cherry-pick lands it)"; g -C "$PW" cherry-pick "$C..$S-review-default" >/dev/null
orch node "$RP" check "$PW/$P"

note "E3: rp assign for a lane whose worktree is missing; for a review lane whose worktree is not at a change"
setup '{"format": 8, "target-phase": 1, "base": "main", "agents": {"spec-producer": {"lanes": {"a": {}}}}}' e3
orch node "$RP" assign "$PW/$P" --role spec-producer-a
orch node "$RP" assign "$PW/$P" --role spec-producer

note "E4: the commit a changed input is diffed from, after a respond turn that left the artifact unchanged"
setup '{"format": 8, "target-phase": 2, "base": "main"}' e4
root_turn 1-spec/spec.md spec-producer '# Spec v1\n'; root_turn 2-design-doc/design-doc.md design-doc-producer
D1=$(g -C "$PW" log -1 --format=%h -- "$P/2-design-doc/design-doc.md")
printf '# Spec v2\n' > "$PW/$P/1-spec/spec.md"; g -C "$PW" add -A; g -C "$PW" commit -qm "Spec v2 (a spec-producer response)"
node "$RP" stamp "$PW/$P/1-spec/spec.md" --at HEAD; g -C "$PW" add -A; g -C "$PW" commit -qm "Stamp spec"
orch node "$RP" check "$PW/$P"
orch node "$RP" assign "$PW/$P" --role design-doc-producer
grep 'Changed inputs' "$(asg "$PW" design-doc-producer)" | show
T=$(turn_of "$(asg "$PW" design-doc-producer)")
echo "(the design-doc-producer answers that the design doc stands; it lands at $T, the design doc unchanged since $D1)"
node "$RP" stamp "$PW/$P/2-design-doc/design-doc.md" --at "$T"; g -C "$PW" add -A; g -C "$PW" commit -qm "Stamp design doc"
printf '# Spec v3\n' > "$PW/$P/1-spec/spec.md"; g -C "$PW" add -A; g -C "$PW" commit -qm "Spec v3"
node "$RP" stamp "$PW/$P/1-spec/spec.md" --at HEAD; g -C "$PW" add -A; g -C "$PW" commit -qm "Stamp spec"
orch node "$RP" assign "$PW/$P" --role design-doc-producer
FROM=$(grep 'Changed inputs' "$(asg "$PW" design-doc-producer)" | sed -n 's/.*changed since \([0-9a-f]*\).*/\1/p')
grep 'Changed inputs' "$(asg "$PW" design-doc-producer)" | show
echo "git diff <changed since> HEAD -- spec.md, as the role reads it:"; g -C "$PW" diff "$FROM" HEAD -- "$P/1-spec/spec.md" | sed -n '/^@@/,$p'
echo "the spec the design doc's certification pins:"; cat "$PW/$P/certification/2-design-doc/design-doc.md.json"; g -C "$PW" rev-parse --short=12 "$T:$P/1-spec/spec.md"

note "E5: repeating today's steps after they are done"
setup '{"format": 8, "target-phase": 1, "base": "main", "agents": {"spec-producer": {"lanes": {"a": {}}}}}' e5
LW="$R/.worktrees/$S-spec-a"
orch git -C "$PW" branch "$S-spec-a" "$S"; orch git -C "$PW" worktree add "$LW" "$S-spec-a"
orch git -C "$PW" branch "$S-spec-a" "$S"; orch git -C "$PW" worktree add "$LW" "$S-spec-a"
node "$RP" assign "$PW/$P" --role spec-producer-a >/dev/null; T=$(turn_of "$(asg "$LW" spec-producer)")
mkdir -p "$LW/$P/1-spec/lanes/a"; echo '# Candidate' > "$LW/$P/1-spec/lanes/a/spec.md"; g -C "$LW" add -A; g -C "$LW" commit -qm "Add candidate"
orch node "$RP" stamp "$LW/$P/1-spec/lanes/a/spec.md" --at "$T"; g -C "$LW" add -A; g -C "$LW" commit -qm "Stamp"
orch node "$RP" stamp "$LW/$P/1-spec/lanes/a/spec.md" --at "$T"; orch g -C "$LW" commit -qm "Stamp"
orch g -C "$PW" merge --no-edit "$S-spec-a"; orch g -C "$PW" merge --no-edit "$S-spec-a"

note "E6: removing a lane worktree holding ignored files (installed dependencies), and one holding an untracked file"
mkdir -p "$LW/node_modules/x"; echo x > "$LW/node_modules/x/index.js"
orch git -C "$PW" worktree remove "$LW"
g -C "$PW" worktree add -q "$LW" "$S-spec-a"; echo scratch > "$LW/scratch.txt"
orch git -C "$PW" worktree remove "$LW"

note "E7: a malformed thread between two roles that sit in the pipeline worktree"
setup '{"format": 8, "target-phase": 2, "base": "main"}' e7
root_turn 1-spec/spec.md spec-producer
mkdir -p "$PW/$P/threads"; printf -- '---\nstatus: pending\nopener: design-doc-producer\nowner: spec-producer\nartifact: spec\n---\n\n## design-doc-producer — abc1234\n\nFinding.\n' > "$PW/$P/threads/1-design-doc-producer-spec-producer-spec.md"
g -C "$PW" add -A; g -C "$PW" commit -qm "Open thread"
orch node "$RP" check "$PW/$P"
orch node "$RP" assign "$PW/$P" --role spec-producer
orch node "$RP" assign "$PW/$P" --role design-doc-producer

note "E8: a lane whose worktree remains from an earlier step, its candidate stale after the intent changed"
setup '{"format": 8, "target-phase": 1, "base": "main", "agents": {"spec-producer": {"lanes": {"a": {}}}}}' e8
LW="$R/.worktrees/$S-spec-a"; g -C "$PW" branch -q "$S-spec-a" "$S"; g -C "$PW" worktree add -q "$LW" "$S-spec-a"
node "$RP" assign "$PW/$P" --role spec-producer-a >/dev/null; T=$(turn_of "$(asg "$LW" spec-producer)")
mkdir -p "$LW/$P/1-spec/lanes/a"; echo '# Candidate' > "$LW/$P/1-spec/lanes/a/spec.md"; g -C "$LW" add -A; g -C "$LW" commit -qm "Add candidate"
node "$RP" stamp "$LW/$P/1-spec/lanes/a/spec.md" --at "$T"; g -C "$LW" add -A; g -C "$LW" commit -qm "Stamp"; g -C "$PW" merge -q --no-edit "$S-spec-a"
printf -- '---\nissue: "42"\n---\n\n# Export\n\n## Goal\n\nUsers can export as CSV.\n' > "$PW/$P/0-intent/intent.md"; g -C "$PW" add -A; g -C "$PW" commit -qm "Rescope intent"
orch node "$RP" check "$PW/$P"
orch node "$RP" assign "$PW/$P" --role spec-producer-a
grep -E 'Mode|Turn commit' -A0 "$(asg "$LW" spec-producer)" | show; echo "lane worktree HEAD: $(g -C "$LW" rev-parse HEAD); pipeline tip: $(g -C "$PW" rev-parse HEAD)"
orch g -C "$LW" merge --no-edit "$S"
orch node "$RP" assign "$PW/$P" --role spec-producer-a
grep -E 'Mode|Turn commit|Changed' -A1 "$(asg "$LW" spec-producer)" | show
