# An intent committed with CRLF line endings, cloned with core.autocrlf=true: does rp check agree with --ref HEAD?
# Usage: RP_MJS=<path to rp.mjs> sh crlf-committed.sh
set -e
RP="node ${RP_MJS:?set RP_MJS to skills/radical-pipelines/scripts/rp.mjs}"
R=/tmp/rp-impl-crlf-committed; rm -rf $R $R-clone; mkdir -p $R; cd $R
git init -q -b main; git config user.email t@t; git config user.name t; git config core.autocrlf false
P=.pipelines/p; mkdir -p $P/0-intent $P/1-spec
printf -- '---\n{\n  "format": 7,\n  "target-phase": 1,\n  "base": "main"\n}\n---\n' > $P/run-config.md
printf -- '---\r\nissue: 1\r\n---\r\n\r\n# Intent\r\n' > $P/0-intent/intent.md
git add -A; git commit -qm intent; T=$(git rev-parse HEAD)
printf '# Spec\n' > $P/1-spec/spec.md; git add -A; git commit -qm spec
$RP stamp $P/1-spec/spec.md --at $T; git add -A; git commit -qm certification
git clone -q -c core.autocrlf=true $R $R-clone; cd $R-clone
echo "== git status --porcelain in the clone (empty means unmodified):"; git status --porcelain; echo "(end)"
echo "== committed blob of the intent:"; git rev-parse HEAD:$P/0-intent/intent.md
echo "== git hash-object of the working-tree intent:"; git hash-object $P/0-intent/intent.md
echo "== rp check:"; $RP check $P
echo "== rp check --ref HEAD:"; $RP check $P --ref HEAD
