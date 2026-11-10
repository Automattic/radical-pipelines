#!/usr/bin/env bash
# Probes what rp does today with the conventions in .rp.md and .rp.local.md, and with the pipeline format.
# Usage: probe-today.sh <absolute path of rp.mjs> <repository holding the merged pipeline 371 at v4>
set -u
RP="$1"; SOURCE="$2"
rp() { node "$RP" "$@"; echo "[exit $?]"; }
section() { printf '\n### %s\n\n' "$1"; }

T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
mkdir "$T/repo"; cd "$T/repo"
git init -q -b main; git config user.email probe@example.invalid; git config user.name probe
printf '.worktrees/\n.rp.local.md\n' > .gitignore
mkdir -p .pipelines/demo/0-intent
printf -- '---\nissue: "1"\n---\n\n# Demo\n\n## Goal\n\nDo it.\n' > .pipelines/demo/0-intent/intent.md
printf -- '---\n{"format": 7, "target-phase": 1, "base": "main"}\n---\n\n# Run configuration\n\nOwner directions: keep it local.\n' > .pipelines/demo/run-config.md
conventions() {
  cat > .rp.md <<EOF
---
{ "conventions": 7, "worktree-folder-root": ".worktrees", "landing-commit": "{subject} (orchestrator)",
  "commit-format": "Committed format.",
  "guardrails": { "tests": { "rule": "$1", "profiles": ["spec-producer"] } } }
---

# Conventions
EOF
}
conventions "Committed rule."
git add .gitignore .pipelines; git commit -qm init; git checkout -qb demo
ASSIGNMENT=$(git rev-parse --git-path rp/spec-producer.md)

section "rp next --apply: the assignment carries .rp.md's guardrail and commit format"
node "$RP" next "$PWD/.pipelines/demo" --apply >/dev/null; echo "[exit $?]"
sed -n '/^## Guardrails/,/^## Resources/p;/^## Commit format/,$p' "$ASSIGNMENT"

section ".rp.md edited between two steps of one turn: the assignment written again carries the edit"
conventions "Edited rule."
node "$RP" next "$PWD/.pipelines/demo" --apply >/dev/null; echo "[exit $?]"
sed -n '/^## Guardrails/,/^## Resources/p' "$ASSIGNMENT"

section ".rp.local.md frontmatter replaces the guardrail by name"
printf -- '---\n{"guardrails": {"tests": {"rule": "Local rule.", "profiles": ["spec-producer"]}}}\n---\n' > .rp.local.md
node "$RP" next "$PWD/.pipelines/demo" --apply >/dev/null; echo "[exit $?]"
sed -n '/^## Guardrails/,/^## Resources/p' "$ASSIGNMENT"
rm .rp.local.md

section "rp land: the commit message follows .rp.md's landing-commit"
mkdir -p .pipelines/demo/1-spec; printf '# Spec\n' > .pipelines/demo/1-spec/spec.md
git add -A .pipelines; git commit -qm "Add spec (spec-producer)"
rp land "$PWD/.pipelines/demo" --role spec-producer
git log -1 --format='last commit: %s'

section "rp check reads no .rp.md: it runs with .rp.md missing"
mv .rp.md /tmp/rp-probe-saved.md
rp check "$PWD/.pipelines/demo"
section "rp next and rp land stop with .rp.md missing"
rp next "$PWD/.pipelines/demo"
rp land "$PWD/.pipelines/demo" --role spec-producer
section "rp next stops on a .rp.md of prose sections without JSON frontmatter"
printf -- '---\n{"conventions": 6}\n---\n\n### Worktree folder root\n\n`.worktrees/`\n' > .rp.md
rp next "$PWD/.pipelines/demo"
printf -- '---\nconventions: 7\n---\n\n### Worktree folder root\n\n`.worktrees/`\n' > .rp.md
rp next "$PWD/.pipelines/demo"
mv /tmp/rp-probe-saved.md .rp.md

section "rp check on run-config.md holding owner-directions"
printf -- '---\n{"format": 7, "target-phase": 1, "base": "main", "owner-directions": ["Keep it local."]}\n---\n' > .pipelines/demo/run-config.md
rp check "$PWD/.pipelines/demo"
section "rp check on a run-config.md of format 6, then 8, then none"
printf -- '---\n{"format": 6, "target-phase": 1, "base": "main"}\n---\n' > .pipelines/demo/run-config.md
rp check "$PWD/.pipelines/demo"
printf -- '---\n{"format": 8, "target-phase": 1, "base": "main"}\n---\n' > .pipelines/demo/run-config.md
rp check "$PWD/.pipelines/demo"
rm .pipelines/demo/run-config.md
rp check "$PWD/.pipelines/demo"
git checkout -q -- .pipelines/demo/run-config.md

section "rp pipelines: which folders of the pipelines folder root are pipelines, and the format column"
mkdir -p .pipelines/a-prompt .pipelines/b-base/base/1-spec .pipelines/c-phase/1-spec .pipelines/d-format6/0-intent .pipelines/tools
echo prompt > .pipelines/a-prompt/prompt.md
echo spec > .pipelines/b-base/base/1-spec/spec.md
echo spec > .pipelines/c-phase/1-spec/spec.md
printf -- '---\n{"format": 6, "target-phase": 4, "base": "main"}\n---\n' > .pipelines/d-format6/run-config.md
printf 'origin: issue 1\n\n# Old\n' > .pipelines/d-format6/0-intent/intent.md
echo tool > .pipelines/tools/run.sh
git add -A .pipelines; git commit -qm "older folders"
rp pipelines "$PWD/.pipelines" --base main
section "rp pipelines --issue 1: the format-7 pipeline and the earlier one whose intent names issue 1 in its body"
rp pipelines "$PWD/.pipelines" --base main --issue 1

section "A new pipeline written into the folder of a merged older pipeline: rp check reads the older files"
git checkout -q main
mkdir -p .pipelines; git -C "$SOURCE" archive v4 .pipelines/371-rp-thread-and-validate | tar -x
git add -A .pipelines; git commit -qm "merged older pipeline"
git checkout -qb 371-again
printf -- '---\nissue: "371"\n---\n\n# Again\n\n## Goal\n\nDo it again.\n' > .pipelines/371-rp-thread-and-validate/0-intent/intent.md
printf -- '---\n{"format": 7, "target-phase": 4, "base": "main"}\n---\n' > .pipelines/371-rp-thread-and-validate/run-config.md
git add -A .pipelines; git commit -qm "new pipeline in the same folder"
rp check "$PWD/.pipelines/371-rp-thread-and-validate"
