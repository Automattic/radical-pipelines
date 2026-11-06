#!/bin/bash
# Ordinary (non-review) landing: a later input lands on the pipeline branch after the producer's turn commit; the stamp --at the turn commit leaves it uncertified.
set -e
RP=/Users/luisherranz/Code/radical-pipelines/.worktrees/368-certification-out-of-files-spec-omits/skills/radical-pipelines/scripts/rp.mjs
D=$(mktemp -d /tmp/probe368/turn-XXXX); cd $D
git init -q --initial-branch=main
git config user.email t@e.com; git config user.name T; git config commit.gpgsign false
P=.pipelines/demo; mkdir -p $P/0-intent $P/1-spec
printf -- '---\n{"format":6,"target-phase":1,"base":"main"}\n---\n' > $P/run-config.md
printf 'origin: issue 7\n\n# Intent\n\n## Goal\n\nUsers can export.\n' > $P/0-intent/intent.md
printf '# Spec\n\nRequirement.\n' > $P/1-spec/spec.md
git add -A; git commit -q -m "turn commit"; T=$(git rev-parse HEAD)
printf '# Constraint 1: x\n\ntarget: 1-spec/spec.md\norigin: issue 7\n\nRuling.\n' > $P/0-intent/constraint-1.md
git add -A; git commit -q -m "constraint lands after the turn commit"
node $RP stamp $D/$P/1-spec/spec.md --at $T
echo "--- check: spec stale on the constraint that landed after the turn:"; node $RP check $D/$P
echo "--- unchanged artifact, response turn at a later commit, re-stamp:"
git add -A; git commit -q -m "stamp"; node $RP stamp $D/$P/1-spec/spec.md --at HEAD; node $RP check $D/$P
