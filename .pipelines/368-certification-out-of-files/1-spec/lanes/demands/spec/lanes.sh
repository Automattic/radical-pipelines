set -e
. "$(dirname "$0")/common.sh"
R=/tmp/rp-spec-demands/lanes; newrepo $R; cd $R
echo base > code.txt; git add -A; git commit -qm base
git checkout -qb p
P=.pipelines/p; config $P 1 main '[{"profile":"spec-producer","id":"a"},{"profile":"spec-producer","id":"b"}]'; intent $P; git add -A; git commit -qm intent
echo "== frontier:"; $RP check $P
TURN=$(git rev-parse HEAD)
for L in a b; do
  git checkout -qb p-spec-$L p; mkdir -p $P/1-spec/lanes/$L; printf '# Spec %s\n' $L > $P/1-spec/lanes/$L/spec.md; git add -A; git commit -qm "lane $L"
  $RP stamp $P/1-spec/lanes/$L/spec.md --at $TURN; git add -A; git commit -qm "stamp lane $L"
done
git checkout -q p
for L in a b; do echo "== merge p-spec-$L into p:"; git merge --no-edit -q p-spec-$L && echo "merged without conflict"; done
echo "== frontier after both lanes landed:"; $RP check $P
echo "== a lane producer overwrites its candidate without the frontmatter (no content change to its body):"
git checkout -q p
printf '# Spec a\n' > $P/1-spec/lanes/a/spec.md
$RP check $P
git checkout -q -- $P
echo "== a role writes a thread header as frontmatter today:"
mkdir -p $P/threads; printf -- '---\n{}\n---\nstatus: open\nopener: reviewer-x\nowner: spec-producer\nartifact: spec\n\n## reviewer-x — abcdef0\n\nq\n' > $P/threads/1-reviewer-x-spec-producer-spec.md
$RP check $P; rm -rf $P/threads
echo "== merge the pipeline branch into lane a's branch:"
git checkout -q p-spec-a; git merge --no-edit -q p && echo "merged without conflict"; git checkout -q p
