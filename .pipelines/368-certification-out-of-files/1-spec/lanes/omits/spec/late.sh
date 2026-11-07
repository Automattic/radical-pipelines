#!/bin/bash
set -e
RP=/Users/luisherranz/Code/radical-pipelines/.worktrees/368-certification-out-of-files-spec-omits/skills/radical-pipelines/scripts/rp.mjs
T=$(mktemp -d /tmp/probe368/late-XXXX); cd $T
git init -q main-repo --initial-branch=main; cd main-repo
git config user.email t@e.com; git config user.name T; git config commit.gpgsign false
echo v1 > code.txt; git add -A; git commit -q -m init
git checkout -q -b demo
P=.pipelines/demo; mkdir -p $P/0-intent $P/1-spec $P/2-design-doc $P/3-implementation $P/threads
printf -- '---\n{"format":6,"target-phase":4,"base":"main"}\n---\n' > $P/run-config.md
printf 'origin: issue 7\n\n# Intent\n\n## Goal\n\nUsers can export.\n' > $P/0-intent/intent.md
printf '# Spec\n\nRequirement.\n' > $P/1-spec/spec.md
printf '# Design doc\n\nDecision.\n' > $P/2-design-doc/design-doc.md
printf 'status: done\n\n# Notes\n' > $P/3-implementation/notes.md
echo v2 > code.txt
git add -A; git commit -q -m work
for f in 1-spec/spec.md 2-design-doc/design-doc.md 3-implementation/notes.md; do node $RP stamp $PWD/$P/$f --at HEAD; done
git add -A; git commit -q -m stamps
echo "--- rp review:"; node $RP review $PWD/$P --lane default
# the reviewer's worktree on the lane branch
git worktree add -q ../lane demo-review-default 2>&1 || true
# owner records a constraint on the pipeline branch while the reviewer works
printf '# Constraint 1: x\n\ntarget: 1-spec/spec.md\norigin: issue 7\n\nA new binding ruling.\n' > $P/0-intent/constraint-1.md
git add -A; git commit -q -m "constraint lands during review"
# reviewer approves on lane branch
cd ../lane; CH=$(git rev-parse HEAD); mkdir -p $P/threads
printf 'status: approved\nopener: reviewer-default\nowner: implementer\nartifact: implementation\n\n## reviewer-default — %s\n\nLooks good.\n' "$CH" > $P/threads/1-reviewer-default-implementer-implementation.md
git add -A; git commit -q -m approve
APPROVE=$(git rev-parse HEAD)
# orchestrator lands: cherry-pick lane commits after the change, stamp at HEAD
cd ../main-repo; git cherry-pick $APPROVE >/dev/null
node $RP stamp $PWD/$P/threads/1-reviewer-default-implementer-implementation.md --at HEAD
git add -A; git commit -q -m "stamp approval"
echo "--- frontier after landing: (constraint-1 targets the spec: spec should respond; the review column is of interest)"
node $RP check $PWD/$P
echo "--- the reviewer's view of 0-intent on the lane branch:"; git ls-tree -r --name-only demo-review-default -- $P/0-intent | cat
echo "--- approval's pins:"; head -12 $P/threads/1-reviewer-default-implementer-implementation.md
echo $T
