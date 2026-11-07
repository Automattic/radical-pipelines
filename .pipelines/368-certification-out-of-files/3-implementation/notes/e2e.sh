# Drives rp as the orchestrator does, on a format-7 pipeline. Usage: RP_MJS=<path to rp.mjs> sh e2e.sh
set -e
RP="node ${RP_MJS:?set RP_MJS to skills/radical-pipelines/scripts/rp.mjs}"
newrepo() { rm -rf "$1"; mkdir -p "$1"; git -C "$1" init -q -b main; git -C "$1" config user.email t@t; git -C "$1" config user.name t; git -C "$1" config commit.gpgsign false; }
config() { mkdir -p "$1"; printf -- '---\n{\n  "format": 7,\n  "target-phase": %s,\n  "base": "%s"\n}\n---\n\n# Run configuration\n' "$2" "$3" > "$1/run-config.md"; }
intent() { mkdir -p "$1/0-intent"; printf -- '---\nissue: 1\n---\n\n# Title\n\n## Goal\n\nDo the thing.\n' > "$1/0-intent/intent.md"; }
land() { $RP stamp "$1" --at "$2"; git add -A; git commit -qm "land $1"; }
produce() { # $1 file, $2 contents: a role's turn from HEAD, committed and landed
  T=$(git rev-parse HEAD); mkdir -p "$(dirname "$1")"; printf -- "$2" > "$1"; git add -A; git commit -qm "turn $1"; land "$1" "$T"; }

echo "### 1. Line-ending conversion: check before and after committing the certification, and at HEAD"
for mode in attr autocrlf; do
  R=/tmp/rp-impl-e2e/crlf-$mode; newrepo $R; cd $R
  if [ $mode = attr ]; then printf '*.md text eol=crlf\n' > .gitattributes; else git config core.autocrlf true; fi
  P=.pipelines/p; config $P 1 main; intent $P; git add -A; git commit -qm init
  rm -rf .pipelines; git checkout -- .
  echo "== $mode: intent's first line in the working tree:"; head -1 $P/0-intent/intent.md | od -c | head -1
  T=$(git rev-parse HEAD); mkdir -p $P/1-spec; printf '# Spec\n' > $P/1-spec/spec.md; git add -A; git commit -qm spec
  $RP stamp $P/1-spec/spec.md --at $T
  echo "== $mode: spec.md unchanged by the stamp (empty diff):"; git diff --stat -- $P/1-spec/spec.md; echo "(end)"
  echo "== $mode: rp check before committing the certification:"; $RP check $P
  git add -A; git commit -qm certification
  echo "== $mode: rp check after:"; $RP check $P
  echo "== $mode: rp check --ref HEAD:"; $RP check $P --ref HEAD
done

echo; echo "### 2. Review landing at the change, with a later input committed while the reviewer works"
R=/tmp/rp-impl-e2e/review; newrepo $R; rm -rf $R-lane; cd $R
echo base > code.txt; git add -A; git commit -qm base; git checkout -qb p
P=.pipelines/p; config $P 4 main; intent $P; git add -A; git commit -qm intent
produce $P/1-spec/spec.md '# Spec\n'; produce $P/2-design-doc/design-doc.md '# Design\n'
T=$(git rev-parse HEAD); mkdir -p $P/3-implementation; printf -- '---\nstatus: done\n---\n\n# Notes\n' > $P/3-implementation/notes.md; echo changed > code.txt; git add -A; git commit -qm impl; land $P/3-implementation/notes.md $T
$RP review $P --lane default; CHANGE=$(git rev-parse p-review-default); git worktree add -q $R-lane p-review-default
printf -- '---\ntarget: 3-implementation/notes.md\norigin: issue 1\n---\n\n# Failure 1: x\n\nIt broke.\n' > $P/0-intent/failure-1.md; git add -A; git commit -qm failure
( cd $R-lane; mkdir -p $P/threads; printf -- '---\nstatus: approved\nopener: reviewer-default\nowner: implementer\nartifact: implementation\n---\n\n## reviewer-default — %s\n\nLooks good.\n' $CHANGE > $P/threads/1-reviewer-default-implementer-implementation.md; git add -A; git commit -qm review )
git cherry-pick $CHANGE..p-review-default; BEFORE=$(git hash-object $P/threads/1-reviewer-default-implementer-implementation.md)
land $P/threads/1-reviewer-default-implementer-implementation.md $CHANGE
echo "== the approval's blob before and after landing: $BEFORE $(git rev-parse HEAD:$P/threads/1-reviewer-default-implementer-implementation.md)"
echo "== its certification:"; cat $P/certification/threads/1-reviewer-default-implementer-implementation.md.json
echo "== rp check after landing:"; $RP check $P
produce $P/3-implementation/notes.md '---\nstatus: done\n---\n\n# Notes\n\nfailure-1 does not reproduce.\n'
echo "== rp check after the implementer answers failure-1 without code changes:"; $RP check $P

echo; echo "### 3. Squash merge, branch deleted, continued on p_2"
git checkout -q main; git merge -q --squash p; git commit -qm "Squash p"; git worktree remove --force $R-lane; git branch -D p p-review-default >/dev/null
rm -rf $R-clone; git clone -q file://$R $R-clone; cd $R-clone; git config user.email t@t; git config user.name t
APPROVED=$(sed -n 's/.*"reviewed": "\(.*\)".*/\1/p' $P/certification/threads/1-reviewer-default-implementer-implementation.md.json)
echo "== fresh clone holds the approved commit? $(git cat-file -t $APPROVED 2>/dev/null || echo no)"
git checkout -qb p_2 origin/main
echo "== fresh clone, p_2, no later input (exit status follows):"; $RP check $P; echo "exit $?"
printf -- '---\ntarget: 3-implementation/notes.md\norigin: issue 1\n---\n\n# Failure 2: y\n' > $P/0-intent/failure-2.md; git add -A; git commit -qm failure-2
echo "== fresh clone, p_2, failure-2 targeting notes.md:"; $RP check $P
cd $R; git checkout -qb p_2 main
echo "== original clone (holds the approved commit), p_2:"; $RP check $P
