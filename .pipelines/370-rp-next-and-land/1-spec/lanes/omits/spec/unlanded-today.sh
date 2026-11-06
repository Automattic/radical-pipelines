#!/bin/zsh
set -u
RPJS="${RPJS:?path to skills/radical-pipelines/scripts/rp.mjs}"; rp() { node "$RPJS" "$@"; }
T=$(mktemp -d /tmp/rp-omits-unlanded.XXXXXX)
cd $T && mkdir main && cd main
git init -q --initial-branch=main && git config user.email t@e.com && git config user.name T && git config commit.gpgsign false
echo 'a' > app.js
printf -- '---\n{ "conventions": 8, "commit-format": "Use imperative mood." }\n---\n# c\n' > .rp.md
git add -A && git commit -qm base
git switch -qc 7-demo
mkdir -p .pipelines/7-demo/0-intent
printf -- '---\n{ "format": 8, "target-phase": 4, "base": "main" }\n---\n' > .pipelines/7-demo/run-config.md
printf -- '---\nissue: "7"\n---\n\n# Intent\n\n## Goal\n\nx\n' > .pipelines/7-demo/0-intent/intent.md
git add -A && git commit -qm intent
P=$T/main/.pipelines/7-demo
mkdir -p $P/1-spec $P/2-design-doc $P/3-implementation
echo '# Spec' > $P/1-spec/spec.md; echo '# DD' > $P/2-design-doc/design-doc.md
printf -- '---\nstatus: done\n---\n# n\n' > $P/3-implementation/notes.md
echo 'b' >> app.js
git add -A && git commit -qm work; TC=$(git rev-parse HEAD)
for f in 1-spec/spec.md 2-design-doc/design-doc.md 3-implementation/notes.md; do rp stamp $P/$f --at $TC; done
git add -A && git commit -qm stamps
echo "### check json phases/frontier"; rp check $P --json | head -60
echo "### rp review"; rp review $P --lane default
echo "### orchestrator: lane worktree on the branch"
git worktree add -q $T/wt-rev 7-demo-review-default 2>&1 | tail -1
git worktree list
echo "### assign reviewer"; rp assign $P --role reviewer-default
cat $(git -C $T/wt-rev rev-parse --git-path rp/reviewer.md) | sed -n 1,60p
echo "### reviewer approves"
REV=$T/wt-rev; RC=$(git -C $REV rev-parse HEAD)
mkdir -p $REV/.pipelines/7-demo/threads
printf -- "---\nstatus: approved\nopener: reviewer-default\nowner: implementer\nartifact: implementation\n---\n\n## reviewer-default — $RC\n\nok\n" > $REV/.pipelines/7-demo/threads/1-reviewer-default-implementer-implementation.md
git -C $REV add -A; git -C $REV commit -qm "Approve"
echo "### the lane's turn ended but was not landed; the step plans the lane again"
rp review $P --lane default; echo "exit $?"
git -C $REV log --oneline | head -2
echo $T
