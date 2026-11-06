set -e
. "$(dirname "$0")/common.sh"
R=/tmp/rp-spec-demands/crlf-$1; newrepo $R; cd $R
if [ "$1" = attr ]; then printf '*.md text eol=crlf\n' > .gitattributes; else git config core.autocrlf true; fi
echo code > code.txt
P=.pipelines/p; config $P 1 main; intent $P
git add -A; git commit -qm init
# re-checkout so the working tree carries what the conversion writes
rm -rf .pipelines; git checkout -- .
echo "== intent bytes in working tree (first line):"; head -1 $P/0-intent/intent.md | od -c | head -2
echo "== check before spec"; $RP check $P
mkdir -p $P/1-spec; printf '# Spec\n\nspec-requirement-1: x\n' > $P/1-spec/spec.md
git add -A; git commit -qm spec
TURN=$(git rev-parse HEAD~1)
$RP stamp $P/1-spec/spec.md --at $TURN
echo "== spec frontmatter after stamp:"; head -6 $P/1-spec/spec.md
echo "== rp check (working tree) right after stamp:"; $RP check $P
git add -A; git commit -qm stamp
echo "== rp check --ref HEAD after committing the stamp:"; $RP check $P --ref HEAD
echo "== rp check (working tree) after committing the stamp:"; $RP check $P
echo "== identity: committed blob vs working tree bytes of the intent"
git rev-parse HEAD:$P/0-intent/intent.md | cut -c1-12
git hash-object --no-filters $P/0-intent/intent.md | cut -c1-12
git hash-object $P/0-intent/intent.md | cut -c1-12
