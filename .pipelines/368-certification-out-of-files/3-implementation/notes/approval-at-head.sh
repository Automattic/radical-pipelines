# An approval landed with --at the change, and with --at HEAD, after a later input reached the pipeline branch while
# the lane reviewed. Usage: RP_MJS=<path to rp.mjs> sh approval-at-head.sh
set -e
RP="node ${RP_MJS:?set RP_MJS to skills/radical-pipelines/scripts/rp.mjs}"
R=/tmp/rp-impl-approval-at-head; rm -rf $R $R-lane; mkdir -p $R; cd $R
git init -q -b main; git config user.email t@t; git config user.name t; git config commit.gpgsign false
echo base > code.txt; git add -A; git commit -qm base; git checkout -qb p
P=.pipelines/p; mkdir -p $P/0-intent $P/1-spec $P/2-design-doc $P/3-implementation
printf -- '---\n{"format": 7, "target-phase": 4, "base": "main"}\n---\n' > $P/run-config.md
printf -- '---\nissue: 1\n---\n\n# Intent\n' > $P/0-intent/intent.md; git add -A; git commit -qm intent
land() { $RP stamp "$1" --at "$2"; git add -A; git commit -qm "land $1"; }
T=$(git rev-parse HEAD); printf '# Spec\n' > $P/1-spec/spec.md; git add -A; git commit -qm spec; land $P/1-spec/spec.md $T
T=$(git rev-parse HEAD); printf '# Design\n' > $P/2-design-doc/design-doc.md; git add -A; git commit -qm dd; land $P/2-design-doc/design-doc.md $T
T=$(git rev-parse HEAD); printf -- '---\nstatus: done\n---\n' > $P/3-implementation/notes.md; echo changed > code.txt; git add -A; git commit -qm impl; land $P/3-implementation/notes.md $T
$RP review $P --lane default >/dev/null; CHANGE=$(git rev-parse p-review-default); git worktree add -q $R-lane p-review-default
printf -- '---\ntarget: 3-implementation/notes.md\n---\n\n# Failure 1: x\n' > $P/0-intent/failure-1.md; git add -A; git commit -qm failure
( cd $R-lane; mkdir -p $P/threads; printf -- '---\nstatus: approved\nopener: reviewer-default\nowner: implementer\nartifact: implementation\n---\n\n## reviewer-default — %s\n\nLooks good.\n' $CHANGE > $P/threads/1-reviewer-default-implementer-implementation.md; git add -A; git commit -qm review )
git cherry-pick $CHANGE..p-review-default >/dev/null
A=$P/threads/1-reviewer-default-implementer-implementation.md
for at in $CHANGE HEAD; do
  echo "== rp stamp --at $at:"; $RP stamp $A --at $at; echo "exit $?"
  cat $P/certification/threads/1-reviewer-default-implementer-implementation.md.json
  echo "== review lane:"; $RP check $P | grep '^review '
done
