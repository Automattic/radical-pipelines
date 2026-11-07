#!/bin/sh
# Probes for the design doc: run from the repository root with `sh <this file>`.
set -e
RP="$PWD/skills/radical-pipelines/scripts/rp.mjs"
S=$(mktemp -d); cd "$S"
g() { git -c user.email=p@example.com -c user.name=Probe "$@"; }
echo "## P1: git cherry on a production lane before and after its merge, and after the pipeline is merged into it"
g init -q -b main repo; cd repo; echo a > a; g add a; g commit -qm base; g checkout -qb p
g branch p-spec-a p; g checkout -q p-spec-a; echo c > c; g add c; g commit -qm candidate; g checkout -q p
echo "before merge: git cherry p p-spec-a"; git cherry p p-spec-a
echo x > x; g add x; g commit -qm "pipeline moves"
g merge -q --no-edit p-spec-a; echo "after merge: git cherry p p-spec-a"; git cherry p p-spec-a; echo "(empty)"
g checkout -q p-spec-a; g merge -q --ff-only p; g checkout -q p
echo "after fast-forwarding the lane to the pipeline: git cherry p p-spec-a"; git cherry p p-spec-a; echo "(empty)"
cd "$S"
echo "## P2: a key outside the version-8 conventions schema"
node --input-type=module -e "
import { parseConventions } from '$RP';
const text = '---\n' + JSON.stringify({ conventions: 8, 'worktree-folder-root': '.worktrees' }) + '\n---\n';
try { parseConventions(Buffer.from(text), false, (reason) => { throw new Error(reason); }); console.log('accepted'); }
catch (error) { console.log('rejected: ' + error.message); }"
rm -rf "$S"
S=$(mktemp -d); cd "$S"
g() { git -c user.email=p@example.com -c user.name=Probe "$@"; }
echo "## P3: git merge-tree --write-tree, which rp check runs to judge an approval's code, adds objects to the object store"
g init -q -b main repo; cd repo; echo a > a; g add a; g commit -qm base; g checkout -qb p; echo b > b; g add b; g commit -qm p
g checkout -q main; echo c > c; g add c; g commit -qm main
echo "loose objects before: $(git count-objects | cut -d' ' -f1)"
git merge-tree --write-tree p main >/dev/null
echo "loose objects after: $(git count-objects | cut -d' ' -f1)"
cd /; rm -rf "$S"
