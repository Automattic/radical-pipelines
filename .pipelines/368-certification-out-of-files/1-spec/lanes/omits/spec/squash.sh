#!/bin/bash
set -e
RP=/Users/luisherranz/Code/radical-pipelines/.worktrees/368-certification-out-of-files-spec-omits/skills/radical-pipelines/scripts/rp.mjs
T=$(mktemp -d /tmp/probe368/squash-XXXX); cd $T
git init -q --bare origin.git --initial-branch=main
git clone -q origin.git work 2>/dev/null; cd work
git config user.email t@e.com; git config user.name T; git config commit.gpgsign false
echo 'v1' > code.txt; git add -A; git commit -q -m init; git push -q origin main
git checkout -q -b demo
P=.pipelines/demo; mkdir -p $P/0-intent $P/1-spec $P/2-design-doc $P/3-implementation $P/threads
printf -- '---\n{"format":6,"target-phase":4,"base":"main"}\n---\n' > $P/run-config.md
printf 'origin: issue 7\n\n# Intent\n\n## Goal\n\nUsers can export.\n' > $P/0-intent/intent.md
printf '# Spec\n\nRequirement.\n' > $P/1-spec/spec.md
printf '# Design doc\n\nDecision.\n' > $P/2-design-doc/design-doc.md
printf 'status: done\n\n# Notes\n' > $P/3-implementation/notes.md
echo 'v2' > code.txt
git add -A; git commit -q -m work
for f in 1-spec/spec.md 2-design-doc/design-doc.md 3-implementation/notes.md; do node $RP stamp $PWD/$P/$f --at HEAD; done
git add -A; git commit -q -m stamps
H=$(git rev-parse HEAD)
printf 'status: approved\nopener: reviewer-default\nowner: implementer\nartifact: implementation\n\n## reviewer-default — %s\n\nLooks good.\n' "$H" > $P/threads/1-reviewer-default-implementer-implementation.md
git add -A; git commit -q -m approve
node $RP stamp $PWD/$P/threads/1-reviewer-default-implementer-implementation.md --at HEAD
git add -A; git commit -q -m stampapproval
echo "--- before merge: check"; node $RP check $PWD/$P
# squash merge into main and delete the branch
git checkout -q main; git merge -q --squash demo; git commit -q -m "squash demo"; git push -q origin main
git branch -D -q demo
cd $T; git clone -q origin.git continue 2>/dev/null; cd continue
git config user.email t@e.com; git config user.name T; git config commit.gpgsign false
git checkout -q -b demo_2
echo "--- continuation clone: commits present:"; git log --oneline | cat
P=.pipelines/demo
printf '# Failure 1: notes wrong\n\ntarget: 3-implementation/notes.md\norigin: issue 7\n\nIt breaks.\n' > $P/0-intent/failure-1.md
git add -A; git commit -q -m failure
echo "--- continuation check (target 4):"; node $RP check $PWD/$P || true
echo $T
