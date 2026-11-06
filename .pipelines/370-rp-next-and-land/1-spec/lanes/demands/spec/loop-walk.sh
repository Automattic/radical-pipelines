#!/usr/bin/env bash
# Walks one pipeline through today's loop (skill at the base, 369-conventions-as-data), as loop.md tells the
# orchestrator. Lines starting with "ORCH $" are commands the orchestrator runs; "ROLE $" lines stand in for a role's turn.
# Usage: bash loop-walk.sh <path to rp.mjs> <scratch folder, recreated>
set -euo pipefail
RP="$1"; WORK="$2"
rm -rf "$WORK"; mkdir -p "$WORK"
R="$WORK/repo"; S=42-export; P=".pipelines/$S"; PW="$R/.worktrees/$S"
orch() { local c="$*"; c="${c//$RP/rp.mjs}"; echo "ORCH \$ ${c//$WORK/<scratch>}"; "$@" 2>&1 | sed -e "s#/private$WORK#<scratch>#g" -e "s#$WORK#<scratch>#g"; return "${PIPESTATUS[0]}"; }
role() { echo "ROLE \$ ${*//$WORK/<scratch>}"; "$@" >/dev/null 2>&1; }
g() { git -c user.email=t@example.com -c user.name=T -c commit.gpgsign=false "$@"; }
note() { echo; echo "## $*"; }

mkdir -p "$R"; cd "$R"; g init -q --initial-branch=main
mkdir -p src; echo 'export const a = 1;' > src/app.js; printf '.worktrees/\nnode_modules/\n' > .gitignore
cat > .rp.md <<'EOF'
---
{
  "conventions": 8,
  "resources": { "env": { "resource": "Your environment `{agent}`.", "profiles": ["implementer", "reviewer"] } },
  "variables": { "agent": "{pipeline-slug}-{role}" }
}
---
# Conventions
EOF
g add -A; g commit -qm base
note "Triage (unchanged by the intent): pipeline branch, worktree, intent, run-config"
g branch -q "$S" main; g worktree add -q "$PW" "$S"
mkdir -p "$PW/$P/0-intent"
printf -- '---\nissue: "42"\n---\n\n# Export\n\n## Goal\n\nUsers can export.\n' > "$PW/$P/0-intent/intent.md"
cat > "$PW/$P/run-config.md" <<'EOF'
---
{"format": 8, "target-phase": 4, "base": "main", "agents": {"spec-producer": {"model": "large", "lanes": {"a": {"brief": "Brief a."}, "b": {"brief": "Brief b."}}}, "reviewer": {"lanes": {"default": {"model": "large"}, "second": {"model": "other"}}}}}
---
EOF
g -C "$PW" add -A; g -C "$PW" commit -qm "Add intent"
turn_of() { sed -n 's/^- Turn commit: //p' "$1"; }

note "Step 1: rp check"
orch node "$RP" check "$PW/$P"
for L in a b; do
  LW="$R/.worktrees/$S-spec-$L"
  orch git -C "$PW" branch "$S-spec-$L" "$S"
  orch git -C "$PW" worktree add "$LW" "$S-spec-$L"
  orch node "$RP" assign "$PW/$P" --role "spec-producer-$L"
done
for L in a b; do
  LW="$R/.worktrees/$S-spec-$L"; mkdir -p "$LW/$P/1-spec/lanes/$L"
  echo "# Candidate $L" > "$LW/$P/1-spec/lanes/$L/spec.md"
  role g -C "$LW" add -A; role g -C "$LW" commit -qm "Add candidate $L"
done
note "Step 1 landing: turn commit read from each assignment, stamp, commit, merge the lane branch"
for L in a b; do
  LW="$R/.worktrees/$S-spec-$L"; A=$(git -C "$LW" rev-parse --path-format=absolute --git-path rp/spec-producer.md)
  echo "ORCH reads $(basename "$A") in ${LW//$WORK/<scratch>}'s git dir: Turn commit $(turn_of "$A")"
  orch node "$RP" stamp "$LW/$P/1-spec/lanes/$L/spec.md" --at "$(turn_of "$A")"
  orch git -C "$LW" add "$P/certification"
  orch g -C "$LW" commit -qm "Stamp candidate $L"
  orch g -C "$PW" merge -q --no-edit "$S-spec-$L"
done
orch node "$RP" check "$PW/$P"

note "Step 2: consolidate"
for L in a b; do
  orch git -C "$PW" worktree remove "$R/.worktrees/$S-spec-$L"
  orch git -C "$PW" branch -D "$S-spec-$L"
done
orch node "$RP" assign "$PW/$P" --role spec-producer
A=$(git -C "$PW" rev-parse --path-format=absolute --git-path rp/spec-producer.md); T=$(turn_of "$A")
mkdir -p "$PW/$P/1-spec"; echo "# Spec" > "$PW/$P/1-spec/spec.md"; role g -C "$PW" add -A; role g -C "$PW" commit -qm "Add spec"
orch node "$RP" stamp "$PW/$P/1-spec/spec.md" --at "$T"
orch git -C "$PW" add "$P/certification"; orch g -C "$PW" commit -qm "Stamp spec"
orch node "$RP" check "$PW/$P"

note "Steps 3 and 4: produce design-doc, produce implementation"
orch node "$RP" assign "$PW/$P" --role design-doc-producer
T=$(turn_of "$(git -C "$PW" rev-parse --path-format=absolute --git-path rp/design-doc-producer.md)")
mkdir -p "$PW/$P/2-design-doc"; echo "# Design" > "$PW/$P/2-design-doc/design-doc.md"; role g -C "$PW" add -A; role g -C "$PW" commit -qm "Add design doc"
orch node "$RP" stamp "$PW/$P/2-design-doc/design-doc.md" --at "$T"; orch git -C "$PW" add "$P/certification"; orch g -C "$PW" commit -qm "Stamp design doc"
orch node "$RP" assign "$PW/$P" --role implementer
T=$(turn_of "$(git -C "$PW" rev-parse --path-format=absolute --git-path rp/implementer.md)")
echo 'export const a = 2;' > "$PW/src/app.js"; mkdir -p "$PW/$P/3-implementation"; printf -- '---\nstatus: done\n---\n# Notes\n' > "$PW/$P/3-implementation/notes.md"
role g -C "$PW" add -A; role g -C "$PW" commit -qm "Implement"
orch node "$RP" stamp "$PW/$P/3-implementation/notes.md" --at "$T"; orch git -C "$PW" add "$P/certification"; orch g -C "$PW" commit -qm "Stamp notes"
orch node "$RP" check "$PW/$P"

note "Step 5: review lanes"
for L in default second; do
  orch node "$RP" review "$PW/$P" --lane "$L"
  orch git -C "$PW" worktree add "$R/.worktrees/$S-review-$L" "$S-review-$L"
  orch node "$RP" assign "$PW/$P" --role "reviewer-$L"
done
for L in default second; do
  LW="$R/.worktrees/$S-review-$L"; C=$(git -C "$LW" rev-parse HEAD); mkdir -p "$LW/$P/threads"
  printf -- '---\nstatus: approved\nopener: reviewer-%s\nowner: implementer\nartifact: implementation\n---\n\n## reviewer-%s — %s\n\nLooks good.\n' "$L" "$L" "$C" > "$LW/$P/threads/1-reviewer-$L-implementer-implementation.md"
  role g -C "$LW" add -A; role g -C "$LW" commit -qm "Approve ($L)"
done
note "Step 5 landing: cherry-pick each lane's commits after its change onto the pipeline branch, stamp at the change, commit"
for L in default second; do
  LW="$R/.worktrees/$S-review-$L"; T=$(turn_of "$(git -C "$LW" rev-parse --path-format=absolute --git-path rp/reviewer.md)" || true)
  C=$(git -C "$LW" log -1 --format=%H --grep='^rp review change$')
  echo "ORCH reads reviewer.md: Turn commit field: ${T:-none}; the change rp review built: $C"
  orch g -C "$PW" cherry-pick "$C..$S-review-$L"
  orch node "$RP" stamp "$PW/$P/threads/1-reviewer-$L-implementer-implementation.md" --at "$C"
  orch git -C "$PW" add "$P/certification"; orch g -C "$PW" commit -qm "Stamp approval $L"
done
orch node "$RP" check "$PW/$P"
