#!/bin/bash
set -e
RP=/Users/luisherranz/Code/radical-pipelines/.worktrees/368-certification-out-of-files-spec-omits/skills/radical-pipelines/scripts/rp.mjs
D=$(mktemp -d /tmp/probe368/autocrlf-XXXX); cd $D
git init -q --initial-branch=main
git config user.email t@e.com; git config user.name T; git config commit.gpgsign false; git config core.autocrlf true
mkdir -p .pipelines/demo/0-intent .pipelines/demo/1-spec
printf -- '---\n{"format":6,"target-phase":1,"base":"main"}\n---\n' > .pipelines/demo/run-config.md
printf 'origin: issue 7\n\n# Intent\n\n## Goal\n\nUsers can export.\n' > .pipelines/demo/0-intent/intent.md
printf '# Spec\n\nRequirement.\n' > .pipelines/demo/1-spec/spec.md
git add -A 2>/dev/null; git commit -q -m pipeline
rm -rf .pipelines; git checkout -q -- .pipelines
node $RP stamp $D/.pipelines/demo/1-spec/spec.md --at HEAD
echo "--- check (worktree) after stamp, core.autocrlf=true:"; node $RP check $D/.pipelines/demo
git add -A 2>/dev/null; git commit -q -m stamps
echo "--- check --ref HEAD:"; node $RP check $D/.pipelines/demo --ref HEAD
