set -e
. "$(dirname "$0")/common.sh"
R=/tmp/rp-spec-demands/review; newrepo $R; rm -rf $R-lane; cd $R
echo base > code.txt; git add -A; git commit -qm base
git checkout -qb p
P=.pipelines/p; config $P 4 main; intent $P; git add -A; git commit -qm intent
land() { $RP stamp "$1" --at "$2"; git add -A; git commit -qm "stamp $1"; }
T=$(git rev-parse HEAD); mkdir -p $P/1-spec; printf '# Spec\n' > $P/1-spec/spec.md; git add -A; git commit -qm spec; land $P/1-spec/spec.md $T
T=$(git rev-parse HEAD); mkdir -p $P/2-design-doc; printf '# Design\n' > $P/2-design-doc/design-doc.md; git add -A; git commit -qm dd; land $P/2-design-doc/design-doc.md $T
T=$(git rev-parse HEAD); mkdir -p $P/3-implementation; printf 'status: done\n\n# Notes\n' > $P/3-implementation/notes.md; echo changed > code.txt; git add -A; git commit -qm impl; land $P/3-implementation/notes.md $T
echo "== pipeline before review:"; $RP check $P
$RP review $P --lane default
CHANGE=$(git rev-parse p-review-default); git worktree add -q $R-lane p-review-default
echo "== lane view of 0-intent at the change:"; git ls-tree -r --name-only $CHANGE -- $P/0-intent
# while the reviewer works, a later input lands on the pipeline branch
printf '# Failure 1: x\n\ntarget: 3-implementation/notes.md\norigin: issue 1\n\nIt broke.\n' > $P/0-intent/failure-1.md; git add -A; git commit -qm failure
# the reviewer approves in its lane
( cd $R-lane; mkdir -p $P/threads; printf 'status: approved\nopener: reviewer-default\nowner: implementer\nartifact: implementation\n\n## reviewer-default — %s\n\nLooks good.\n' $CHANGE > $P/threads/1-reviewer-default-implementer-implementation.md; git add -A; git commit -qm review )
# landing per state.md: cherry-pick the lane's commits after the change, stamp --at HEAD
git cherry-pick $CHANGE..p-review-default
$RP stamp $P/threads/1-reviewer-default-implementer-implementation.md --at HEAD; git add -A; git commit -qm "stamp approval"
echo "== approval's frontmatter after landing:"; head -8 $P/threads/1-reviewer-default-implementer-implementation.md
echo "== rp check after landing:"; $RP check $P
# the implementer answers the failure without changing code
T=$(git rev-parse HEAD); printf '\nfailure-1 does not reproduce.\n' >> $P/3-implementation/notes.md; git add -A; git commit -qm notes; land $P/3-implementation/notes.md $T
echo "== rp check after the implementer answers failure-1 without code changes:"; $RP check $P
