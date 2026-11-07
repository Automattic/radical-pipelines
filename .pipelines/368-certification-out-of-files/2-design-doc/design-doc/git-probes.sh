# Two git behaviors the design binds. Usage: sh git-probes.sh
set -e
R=/tmp/rp-design-doc/git; rm -rf $R; mkdir -p $R; cd $R
git init -q -b main; git config user.email t@t; git config user.name t; git config commit.gpgsign false
echo "### 1. git hash-object, without -w, in a linked worktree under eol=crlf and autocrlf"
printf '*.md text eol=crlf\n' > .gitattributes; mkdir -p pf; printf 'a\nb\n' > pf/one.md; printf 'c\n' > pf/two.txt
git add -A; git commit -qm init
git worktree add -q ../git-wt -b wt; cd ../git-wt; git config core.autocrlf true; rm -rf pf; git checkout -- pf
echo "working-tree bytes of pf/one.md:"; od -c pf/one.md | head -1
echo "committed blobs:"; git rev-parse HEAD:pf/one.md HEAD:pf/two.txt
echo "git hash-object pf/one.md pf/two.txt (filters applied, one call):"; git hash-object pf/one.md pf/two.txt
echo "git hash-object --no-filters pf/one.md:"; git hash-object --no-filters pf/one.md
before=$(git count-objects -v | grep '^count'); git hash-object pf/one.md pf/two.txt >/dev/null; after=$(git count-objects -v | grep '^count')
echo "loose objects before/after hash-object: $before / $after"
cd $R
echo
echo "### 2. git merge-tree --write-tree --name-only: approved commit vs a squash of the pipeline branch"
git checkout -q main; echo base > code.txt; git add -A; git commit -qm base; git checkout -qb p
mkdir -p .pipelines/p/3-implementation; echo "notes v1" > .pipelines/p/3-implementation/notes.md; echo changed > code.txt; git add -A; git commit -qm impl
APPROVED=$(git rev-parse HEAD)
echo "notes v2, after the approval" > .pipelines/p/3-implementation/notes.md; mkdir -p .pipelines/p/certification; echo '{}' > .pipelines/p/certification/x.json; git add -A; git commit -qm after
git checkout -q main; git merge -q --squash p; git commit -qm "Squash p"
set +e; git merge-tree --write-tree --name-only --no-messages $APPROVED main; echo "exit status: $?"; set -e
TREE=$(git merge-tree --write-tree --name-only --no-messages $APPROVED main | head -1 || true)
echo "merged tree vs main outside .pipelines (empty means equal):"; git diff --stat $TREE main -- . ':(top,exclude,literal).pipelines'; echo "(end of diff)"
