#!/bin/sh
# How Git treats a run-config.local.json beside run-config.json: ignore by bare name, tracked as the index or a commit holds it.
set -u
dir=$(mktemp -d); cd "$dir" || exit 1
git init --quiet --initial-branch=main; git config user.email p@example.com; git config user.name P; git config commit.gpgsign false
mkdir -p .pipelines/demo; echo '{}' > .pipelines/demo/run-config.json; git add -A; git commit --quiet -m base
echo "### untracked, no ignore entry: git status and git add -A"
echo '{}' > .pipelines/demo/run-config.local.json
git status --porcelain --untracked-files=all
git add -A; echo "ls-files after add -A:"; git ls-files .pipelines/demo; git reset --quiet
echo "### .gitignore holds the bare name run-config.local.json"
echo run-config.local.json > .gitignore; git add .gitignore; git commit --quiet -m ignore
git check-ignore -v .pipelines/demo/run-config.local.json; echo "[check-ignore exit $?]"
git status --porcelain --untracked-files=all; echo "[status above: nothing for the local file]"
git add -A; echo "ls-files after add -A:"; git ls-files .pipelines/demo
echo "### forced: staged, then committed"
git add -f .pipelines/demo/run-config.local.json; echo "ls-files (staged):"; git ls-files .pipelines/demo
git commit --quiet -m forced; echo "ls-tree HEAD:"; git ls-tree -r --name-only HEAD .pipelines/demo
echo "### rm --cached, uncommitted: index lacks it, HEAD holds it"
git rm --cached --quiet .pipelines/demo/run-config.local.json; echo "ls-files:"; git ls-files .pipelines/demo; echo "ls-tree HEAD:"; git ls-tree -r --name-only HEAD .pipelines/demo
rm -rf "$dir"
