#!/bin/sh
# Run with the changed rp: sh probe-respond.sh <path to rp.mjs>
# 1. Per-field overlay: which models a role gets when the local file overrides both fields, or only the subagent model.
# 2. Discovery of a pipeline whose intent frontmatter has no closing line, with and without --issue.
set -u
RP=$1
dir=$(mktemp -d); cd "$dir" || exit 1
git init --quiet --initial-branch=main; git config user.email p@example.com; git config user.name P; git config commit.gpgsign false
echo x > code.txt; git add -A; git commit --quiet -m base; git checkout --quiet -b demo
mkdir -p .pipelines/demo/0-intent
printf -- '---\nissue: 5\n---\n\n# Intent\n' > .pipelines/demo/0-intent/intent.md
cat > .pipelines/demo/run-config.json <<'EOF'
{ "target-phase": 1, "base": "main", "worktree-folder-root": ".worktrees",
  "agents": { "spec-producer": { "model": "other-large", "subagents": "shared-small" } } }
EOF
printf '.worktrees/\nrun-config.local.json\n' > .gitignore
git add -A; git commit --quiet -m pipeline
assignment=$(git rev-parse --path-format=absolute --git-path rp/spec-producer.md)
show() { node "$RP" next "$dir/.pipelines/demo" --apply | grep '^wake spec-producer model'; grep "^- Subagent model:" "$assignment"; }
echo "### committed only: model other-large, subagents shared-small"; show
echo '{ "agents": { "spec-producer": { "model": "local-large", "subagents": "local-small" } } }' > .pipelines/demo/run-config.local.json
echo "### local overrides both fields"; show
echo '{ "agents": { "spec-producer": { "subagents": "local-small" } } }' > .pipelines/demo/run-config.local.json
echo "### local overrides the subagent model only (the model override left out)"; show
rm .pipelines/demo/run-config.local.json
echo "### intent frontmatter without its closing line"
printf -- '---\nissue: 5\n' > .pipelines/demo/0-intent/intent.md; git add -A; git commit --quiet -m broken
echo '$ rp pipelines --base main'; node "$RP" pipelines "$dir/.pipelines" --base main; echo "[exit $?]"
echo '$ rp pipelines --base main --issue 5'; node "$RP" pipelines "$dir/.pipelines" --base main --issue 5; echo "[exit $?]"
echo '$ rp check'; node "$RP" check "$dir/.pipelines/demo" | head -1
cd /; rm -rf "$dir"
