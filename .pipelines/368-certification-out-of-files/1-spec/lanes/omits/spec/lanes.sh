#!/bin/bash
# Two spec production lanes landed in parallel from one pipeline commit, merged one after the other into the pipeline branch (current format).
set -e
RP=/Users/luisherranz/Code/radical-pipelines/.worktrees/368-certification-out-of-files-spec-omits/skills/radical-pipelines/scripts/rp.mjs
D=$(mktemp -d /tmp/probe368/lanes-XXXX); cd $D
git init -q --initial-branch=main
git config user.email t@e.com; git config user.name T; git config commit.gpgsign false
P=.pipelines/demo; mkdir -p $P/0-intent
printf -- '---\n{"format":6,"target-phase":1,"base":"main","lanes":[{"profile":"spec-producer","id":"a"},{"profile":"spec-producer","id":"b"}]}\n---\n' > $P/run-config.md
printf 'origin: issue 7\n\n# Intent\n\n## Goal\n\nUsers can export.\n' > $P/0-intent/intent.md
git add -A; git commit -q -m pipeline
for l in a b; do
  git worktree add -q -b lane-$l ../lane-$l 2>/dev/null || git worktree add -q -b lane-$l $D-lane-$l
done
for l in a b; do
  W=$(git worktree list --porcelain | awk -v b="refs/heads/lane-$l" '$1=="worktree"{w=$2} $1=="branch"&&$2==b{print w}')
  mkdir -p $W/$P/1-spec/lanes/$l; printf "# Spec candidate $l\n" > $W/$P/1-spec/lanes/$l/spec.md
  (cd $W; git add -A; git commit -q -m "lane $l"; node $RP stamp $W/$P/1-spec/lanes/$l/spec.md --at HEAD; git add -A; git commit -q -m "stamp $l")
done
git merge -q --no-edit lane-a && echo "merged lane-a"
git merge -q --no-edit lane-b && echo "merged lane-b"
node $RP check $D/$P
