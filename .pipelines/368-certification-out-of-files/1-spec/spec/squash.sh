set -e
. "$(dirname "$0")/common.sh"
R=/tmp/rp-spec-demands/squash; newrepo $R; cd $R
echo base > code.txt; git add -A; git commit -qm base
git checkout -qb p
P=.pipelines/p; config $P 4 main; intent $P; git add -A; git commit -qm intent
land() { # $1 file, $2 turn commit
  $RP stamp "$1" --at "$2"; git add -A; git commit -qm "stamp $1"; }
T=$(git rev-parse HEAD); mkdir -p $P/1-spec; printf '# Spec\n' > $P/1-spec/spec.md; git add -A; git commit -qm spec; land $P/1-spec/spec.md $T
T=$(git rev-parse HEAD); mkdir -p $P/2-design-doc; printf '# Design\n' > $P/2-design-doc/design-doc.md; git add -A; git commit -qm dd; land $P/2-design-doc/design-doc.md $T
T=$(git rev-parse HEAD); mkdir -p $P/3-implementation; printf 'status: done\n\n# Notes\n' > $P/3-implementation/notes.md; echo changed > code.txt; git add -A; git commit -qm impl; land $P/3-implementation/notes.md $T
CODE=$(git rev-parse HEAD); mkdir -p $P/threads
printf 'status: approved\nopener: reviewer-default\nowner: implementer\nartifact: implementation\n\n## reviewer-default — %s\n\nLooks good.\n' $CODE > $P/threads/1-reviewer-default-implementer-implementation.md
git add -A; git commit -qm review; REVIEWED=$(git rev-parse HEAD); land $P/threads/1-reviewer-default-implementer-implementation.md HEAD
echo "== pipeline branch p, before merge:"; $RP check $P
echo "== reviewed recorded: $REVIEWED"
git checkout -q main; git merge -q --squash p; git commit -qm "Squash p"; git branch -D p >/dev/null
rm -rf ../squash-clone; git clone -q file://$R ../squash-clone; cd ../squash-clone; git config user.email t@t; git config user.name t
echo "== fresh clone: does the reviewed commit exist?"; git cat-file -t $REVIEWED 2>&1 || true
git checkout -qb p_2 origin/main
echo "== fresh clone, p_2 from main, no later input: rp check"; $RP check $P 2>&1 || true
printf '# Failure 1: x\n\ntarget: 3-implementation/notes.md\norigin: issue 1\n\nIt broke.\n' > $P/0-intent/failure-1.md; git add -A; git commit -qm failure
echo "== fresh clone, p_2 with failure-1 targeting notes.md: rp check"; $RP check $P 2>&1 || true
echo "== fresh clone, target-phase 3 in the same tree (edit config): rp check"
sed -i '' 's/"target-phase": 4/"target-phase": 3/' $P/run-config.md; $RP check $P 2>&1 || true; git checkout -q -- $P/run-config.md
cd $R; git checkout -qb p_2 main
echo "== original clone (holds reviewed), p_2 from main, no later input: rp check"; $RP check $P 2>&1 || true
echo "== git merge-tree reviewed base, in the original clone:"; git merge-tree --write-tree --name-only $REVIEWED main 2>&1 | head -10 || true
