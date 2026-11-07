#!/usr/bin/env bash
# A whole run of the loop in a scratch repository, driven only by rp next, rp next --apply, and rp land, with each
# role's turn simulated by a commit in the worktree the plan names. Usage: loop-run.sh <rp.mjs>
set -euo pipefail
RP=$1
R=$(mktemp -d)/repo; mkdir -p "$R"; R=$(cd "$R" && pwd -P); cd "$R"
git init -q -b main; git config user.email t@t; git config user.name T
cat > .rp.md <<'X'
---
{"conventions": 9, "worktree-folder-root": ".worktrees", "landing-commit": "{subject} (orchestrator)",
 "resources": {"staging": {"resource": "The staging site.", "profiles": ["implementer", "reviewer"]}}}
---
X
printf '.worktrees/\n' > .gitignore
mkdir src; echo "a=1" > src/app.js; git add -A; git commit -qm base; git checkout -qb demo
P=$R/.pipelines/demo; mkdir -p "$P/0-intent"
printf -- '---\n{"format": 8, "target-phase": 4, "base": "main", "agents": {"spec-producer": {"model": "opus", "lanes": {"a": {}, "b": {"model": "sonnet"}}}, "reviewer": {"lanes": {"default": {}, "second": {}}}}}\n---\n' > "$P/run-config.md"
printf -- '---\nissue: 7\n---\n\n# Intent\n' > "$P/0-intent/intent.md"
git add -A; git commit -qm "Add intent"
show() { echo; echo "\$ rp $*" | sed "s|$R|<repo>|g"; node "$RP" "$@" 2>&1 | sed "s|$R|<repo>|g"; }
commit_in() { local wt=$1 rel=$2 text=$3 msg=$4; mkdir -p "$(dirname "$wt/.pipelines/demo/$rel")"; printf '%s' "$text" > "$wt/.pipelines/demo/$rel"; git -C "$wt" add -A; git -C "$wt" commit -qm "$msg"; }
show next "$P" --apply
for l in a b; do commit_in "$R/.worktrees/demo-spec-$l" "1-spec/lanes/$l/spec.md" "# $l
" "Add $l candidate (spec-producer)"; show land "$P" --role spec-producer-$l; done
show next "$P" --apply
commit_in "$R" "1-spec/spec.md" "# Spec
" "Consolidate spec (spec-producer)"; show land "$P" --role spec-producer
show next "$P" --apply
commit_in "$R" "2-design-doc/design-doc.md" "# Design doc
" "Add design doc (design-doc-producer)"; show land "$P" --role design-doc-producer
show next "$P" --apply
echo "a=2" > src/app.js; commit_in "$R" "3-implementation/notes.md" "---
status: done
---
# Notes
" "Implement (implementer)"; show land "$P" --role implementer
show next "$P" --apply
for l in default second; do W=$R/.worktrees/demo-review-$l; C=$(git -C "$W" rev-parse HEAD)
  S=$([ $l = default ] && echo pending || echo approved)
  commit_in "$W" "threads/1-reviewer-$l-implementer-implementation.md" "---
status: $S
opener: reviewer-$l
owner: implementer
artifact: implementation
---

## reviewer-$l — $C

Merge it.
" "Open review thread (reviewer)"; show land "$P" --role reviewer-$l || true; done
show next "$P" --apply
W=$R/.worktrees/demo-review-default; sed -i.bak 's/status: pending/status: approved/' "$W/.pipelines/demo/threads/1-reviewer-default-implementer-implementation.md"; rm "$W/.pipelines/demo/threads/"*.bak
git -C "$W" commit -qam "Repair review thread (reviewer)"; show land "$P" --role reviewer-default
show next "$P"
echo; echo "\$ git log --first-parent --format=%s demo"; git log --first-parent --format=%s demo
