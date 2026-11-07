# Whether one certification file per landed file, under one folder of the pipeline, merges without conflict when two
# production lanes land from the same tip, merge into the pipeline branch, take the pipeline branch back, and re-land.
# Plain git: the files stand in for what landing would commit. Usage: sh lanes-certification.sh
set -e
R=/tmp/rp-design-doc/lanes; rm -rf $R; mkdir -p $R; cd $R
git init -q -b main; git config user.email t@t; git config user.name t; git config commit.gpgsign false
echo base > code.txt; git add -A; git commit -qm base; git checkout -qb p
P=.pipelines/p; mkdir -p $P/0-intent; printf -- '---\nissue: 1\n---\n\n# Title\n' > $P/0-intent/intent.md; git add -A; git commit -qm intent
for L in a b; do
  git checkout -qb p-spec-$L p
  mkdir -p $P/1-spec/lanes/$L; printf '# Spec %s\n' $L > $P/1-spec/lanes/$L/spec.md; git add -A; git commit -qm "lane $L"
  mkdir -p $P/certification/1-spec/lanes/$L; printf '{\n  "inputs": [\n    "0-intent/intent.md@%s"\n  ]\n}\n' "$(git rev-parse HEAD:$P/0-intent/intent.md | cut -c1-12)" > $P/certification/1-spec/lanes/$L/spec.md.json
  git add -A; git commit -qm "land lane $L"
done
git checkout -q p
for L in a b; do echo "== merge p-spec-$L into p:"; git merge --no-edit -q p-spec-$L && echo "merged without conflict"; done
echo "== a later input lands on p while lane a responds:"; printf -- '---\ntarget: 1-spec/spec.md\norigin: issue 1\n---\n\n# Constraint 1\n' > $P/0-intent/constraint-1.md; git add -A; git commit -qm constraint
echo "== merge p into p-spec-a (lane a woken again):"; git checkout -q p-spec-a; git merge --no-edit -q p && echo "merged without conflict"
printf '# Spec a, revised\n' > $P/1-spec/lanes/a/spec.md; git add -A; git commit -qm "lane a responds"
printf '{\n  "inputs": [\n    "0-intent/intent.md@000000000000"\n  ]\n}\n' > $P/certification/1-spec/lanes/a/spec.md.json; git add -A; git commit -qm "land lane a again"
git checkout -q p; echo "== merge p-spec-a into p again:"; git merge --no-edit -q p-spec-a && echo "merged without conflict"
echo "== certification files on p:"; git ls-tree -r --name-only p -- $P/certification
