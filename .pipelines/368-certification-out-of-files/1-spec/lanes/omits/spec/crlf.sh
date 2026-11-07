#!/bin/bash
set -e
RP=/Users/luisherranz/Code/radical-pipelines/.worktrees/368-certification-out-of-files-spec-omits/skills/radical-pipelines/scripts/rp.mjs
D=$(mktemp -d /tmp/probe368/crlf-XXXX)
cd $D
git init -q --initial-branch=main
git config user.email t@e.com; git config user.name T; git config commit.gpgsign false
printf '*.md text eol=crlf\n' > .gitattributes
mkdir -p .pipelines/demo/0-intent .pipelines/demo/1-spec
printf -- '---\n{"format":6,"target-phase":1,"base":"main"}\n---\n' > .pipelines/demo/run-config.md
printf 'origin: issue 7\n\n# Intent\n\n## Goal\n\nUsers can export.\n' > .pipelines/demo/0-intent/intent.md
printf '# Spec\n\nRequirement.\n' > .pipelines/demo/1-spec/spec.md
git add -A 2>/dev/null; git commit -q -m pipeline
# a fresh checkout: working tree files now carry CRLF
rm -rf .pipelines; git checkout -q -- .pipelines
echo "--- working tree intent bytes:"; head -c 20 .pipelines/demo/0-intent/intent.md | od -c | head -2
node $RP stamp $D/.pipelines/demo/1-spec/spec.md --at HEAD
echo "--- check (worktree) after stamp:"; node $RP check $D/.pipelines/demo
git add -A 2>/dev/null; git commit -q -m stamps
echo "--- check --ref HEAD after commit:"; node $RP check $D/.pipelines/demo --ref HEAD
echo "--- check (worktree) after commit:"; node $RP check $D/.pipelines/demo
echo $D
