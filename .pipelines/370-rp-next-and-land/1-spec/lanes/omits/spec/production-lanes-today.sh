#!/bin/zsh
set -u
RPJS="${RPJS:?path to skills/radical-pipelines/scripts/rp.mjs}"; rp() { node "$RPJS" "$@"; }
T=$(mktemp -d /tmp/rp-omits-loop.XXXXXX)
cd $T && mkdir main && cd main
git init -q --initial-branch=main && git config user.email t@e.com && git config user.name T && git config commit.gpgsign false
echo 'a' > app.js
cat > .rp.md <<'EOM'
---
{
  "conventions": 8,
  "commit-format": "Use imperative mood.",
  "resources": { "staging": { "resource": "The staging site {agent}.example.com", "profiles": ["implementer", "reviewer"] } },
  "variables": { "agent": "{pipeline-slug}-{role}" }
}
---
# conventions
EOM
git add -A && git commit -qm base
git switch -qc 7-demo
mkdir -p .pipelines/7-demo/0-intent
cat > .pipelines/7-demo/run-config.md <<'EOM'
---
{ "format": 8, "target-phase": 4, "base": "main", "agents": { "spec-producer": { "model": "large", "lanes": { "a": { "brief": "A" }, "b": { "brief": "B" } } }, "reviewer": { "lanes": { "default": {}, "sec": { "model": "other" } } } } }
---
EOM
printf -- '---\nissue: "7"\n---\n\n# Intent\n\n## Goal\n\nx\n' > .pipelines/7-demo/0-intent/intent.md
git add -A && git commit -qm intent
P=$T/main/.pipelines/7-demo
echo "### 1 check"; rp check $P
echo "### 2 assign lane a before its worktree exists"; rp assign $P --role spec-producer-a; echo "exit $?"
echo "### 3 orchestrator today: lane branches+worktrees by hand"
for l in a b; do git worktree add -q -b 7-demo-spec-$l $T/wt-spec-$l 7-demo; done
git worktree list
echo "### 4 assign both lanes"; rp assign $P --role spec-producer-a; rp assign $P --role spec-producer-b
echo "### assignment of lane a (head)"; sed -n 1,20p $T/wt-spec-a/.git; cat $(git -C $T/wt-spec-a rev-parse --git-path rp/spec-producer.md) | head -30
echo "### 5 lanes produce candidates"
for l in a b; do mkdir -p $T/wt-spec-$l/.pipelines/7-demo/1-spec/lanes/$l; echo "# cand $l" > $T/wt-spec-$l/.pipelines/7-demo/1-spec/lanes/$l/spec.md; git -C $T/wt-spec-$l add -A; git -C $T/wt-spec-$l commit -qm "Add candidate"; done
echo "### 6 landing today: stamp in the lane worktree at the turn commit, commit, then merge into pipeline branch"
for l in a b; do
  TC=$(git -C $T/wt-spec-$l rev-parse HEAD~1)
  rp stamp $T/wt-spec-$l/.pipelines/7-demo/1-spec/lanes/$l/spec.md --at $TC
  git -C $T/wt-spec-$l add -A; git -C $T/wt-spec-$l commit -qm "Stamp candidate $l"
  git merge -q --no-edit 7-demo-spec-$l
done
git log --oneline | head
echo "### 7 check after merging"; rp check $P
echo "### 8 stamp of an invalid file stops"
echo "garbage" > $T/wt-spec-a/.pipelines/7-demo/threads-x.md
mkdir -p $T/wt-spec-a/.pipelines/7-demo/threads; printf -- '---\nstatus: nope\n---\n' > $T/wt-spec-a/.pipelines/7-demo/threads/1-bad.md
rp check $T/wt-spec-a/.pipelines/7-demo
rp stamp $T/wt-spec-a/.pipelines/7-demo/1-spec/lanes/a/spec.md --at HEAD; echo "exit $?"
echo $T
