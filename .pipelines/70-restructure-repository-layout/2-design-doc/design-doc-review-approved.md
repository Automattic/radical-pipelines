# Design doc review — APPROVED

**Artifact:** `2-design-doc/design-doc.md` (issue #70, restructure repository layout)
**Verdict:** Approved
**Reviewer:** design-doc-reviewer (adversarial pass against spec, design-research, and the live worktree)

## Summary

The design is internally consistent, fully traceable to the spec, feasible against
the real files, and honest about its one residual risk. Every factual claim I could
check against the live tree (branch `worktree-70-restructure-repository-layout`)
holds. It stays at architecture altitude and defers task granularity to phase 3, as
required for a restructuring meta-task. No rejection-worthy issues.

## Live-tree verification (every team-lead-flagged fact)

| Claim in design | Live-tree result | Verdict |
| --- | --- | --- |
| "six tracked mirror symlinks" | `git ls-files -s \| grep 120000` returns exactly 6 (root `agents`, root `skills/radical-pipelines`, `.claude/skills/radical-pipelines`, `.pi/skills/radical-pipelines`, `.pi-extension/skills/radical-pipelines`, `.pi-extension/agents`) | ✓ exact |
| root `package.json` `pi.skills[0]` = `.pi-extension/skills` | confirmed (skills array: `.pi-extension/skills`, two `node_modules/...`); only `[0]` points at the deleted dir, so "repoint `pi.skills[0]`" is precise | ✓ |
| `.pi-extension/package.json` bundledDependencies = 4 pkgs; root has NONE | `.pi-extension` bundledDependencies = `[@pi-agents/loop,@sinclair/typebox,@zenobius/pi-worktrees,pi-teams]`; root `bundledDependencies` = undefined (only `dependencies`) | ✓ — README "declares the same bundled dependencies directly" correction is justified |
| health-monitoring absolute path on line 65 | confirmed: `health-monitoring.md:65` has `.agents/skills/radical-pipelines/reference/health-monitoring.md`; it is the ONLY `.agents/` ref under the shipped skill (grep count = 1) | ✓ |
| `scripts/sync-version.mjs` TARGET_MANIFESTS includes `.pi-extension/package.json` | confirmed: lines 37–40 = `[".claude-plugin/plugin.json", ".pi-extension/package.json"]` | ✓ |
| README false "bundled dependencies directly" line | confirmed at `README.md:139` | ✓ |
| `.changeset/changelog-and-version-sync.md` pending with stale `.pi-extension/package.json` text | confirmed pending (still in `.changeset/`); body names `.pi-extension/package.json` + "regenerates the extension lockfile" — would land verbatim in CHANGELOG.md, so "not merely editorial" is correct | ✓ |
| **OD1 occurrence count = 12 (analyst's correction of spec-research's 11)** | **confirmed 12**: `grep -rn '\.rp\.md' skills/radical-pipelines/` = 12 lines, breaking down exactly as the design's table: `load.md` ×1 (L5), `setup.md` ×9 (L100,108,115,167,169,176,185,193,194), `claude-code.md` ×1 (L7), `pi.md` ×1 (L5). The analyst is right; spec-research undercounted. | ✓ analyst correct |

Additional facts verified:
- `setup.md:52` suggested default = `.pipelines/<pipeline-slug>/` (OD3 single-line target) ✓
- `README.md:3` image ref = `./assets/radical-pipelines.png` (OD4 repoint target) ✓
- `.gitignore` = `node_modules/` + exactly the three dead entries (`.pi/npm/node_modules/`, `.pi/worktrees/`, `.pi-extension/node_modules/`) ✓ matches R10 plan
- `marketplace.json` `plugins[0].source` = `"./"` ✓ (anchor unchanged)
- `agents/` resolves to 17 `.md` files ✓ (R1)
- `scripts/test/sync-version.test.mjs` loops generically over `TARGET_MANIFESTS` (lines 32,61,69,73,79,100,107,118); **ran it now: 6/6 pass.** So KD8's "test unchanged, stays green" claim is verified live, not just asserted. ✓
- README blast-radius lines (88-/107-/116-/133/139/155-/169/192-/248) match real content ✓
- `.pi/.rp.md:47` symlink-agents sentence + `.pi/.rp.md:53` & `.claude/.rp.md:19` health-monitoring `.agents/` literals exist as the merge plan describes ✓
- `.pi/settings.json` exists (deleted with `.pi/`) ✓; root `.rp.md:7-8` per-tool pointer exists ✓

## Adversarial findings

### Branch feasibility (OD1–OD4)
- **Branch A is feasible.** I confirmed the 12 edits are mechanical string replacements in 4 real files, and that there are zero other `.rp.md` references under the shipped skill — so the blast radius is exactly as bounded. The "no tool auto-reads `.rp.md`" premise that makes relocation free is consistent with the live manifests (neither `package.json` `pi` block nor `.claude-plugin/*` references `.rp.md`).
- **Branch B is documented as a real fallback** (KD3 + Risks), with the correct consequence ("`.rp/` holds only `pipelines/`", Layer-1 untouched). Nothing silently assumes Branch A elsewhere — KD5 (OD3) and KD7 (OD7) are independently justified and the design's prose consistently says "OD1 → Branch A" at each dependent point.
- **OD4** is correctly flagged optional/secondary, with both image-winner outcomes spelled out and "nothing else depends on it." No scope creep.

### AC2/AC3 deferral honesty
Honest, not a hidden gap. The Observability section (lines 389-401) states plainly that neither the `pi` CLI nor a live Claude Code load was runnable, gives the exact later-phase commands (`claude --plugin-dir ./` / marketplace add; `pi install . -l` + `pi list`), and grounds the interim confidence in (a) official resolution rules and (b) the fact that the current symlink setup already works. I independently confirmed the symlinks resolve to the same content that becomes the real dirs, so the "resolved paths are preserved" argument is sound. Carried into Risks as "the single largest residual risk."

### Coverage / traceability
Every R/AC maps to a KD or an explicit Components/Failure-Mode entry; every KD cites an R/AC. R10 (gitignore) has no dedicated KD but is covered in Components + Observability and is purely mechanical — acceptable. The "spec-implicit" items (teams.yaml KD9, pending changeset, in-flight self-move) are surfaced rather than hidden, each with a mitigation.

## Non-blocking observations (for the writer/phase 3, not rejection grounds)

1. **Edit-count wording drift.** KD3 prose says "12 lines across 4 shipped files," then parenthetically "(`load.md` ×1 ... `pi.md` ×1)". Step 3 in design-research adds the OD3 `setup.md:52` edit and says "the 12 edits ... plus the OD3 edit." Both are internally correct (OD1 cluster = 12; OD3 is a separate 13th edit), but a careless phase-3 reader could conflate them. Minor; the design-research table is unambiguous.
2. **R10 has no dedicated KD.** Only a Components bullet + Observability. Fine given it's mechanical, but a one-line KD would improve symmetry. Optional.
3. **README line 139 is partly true today** ("points its `pi` manifest paths at `.pi-extension/` files" IS currently true since `pi.skills[0]` = `.pi-extension/skills`). The design correctly targets only the false clause ("declares the same bundled dependencies directly") and the now-obsolete `.pi-extension/` pointer. No correction needed — flagging only so phase 3 rewrites the whole sentence, not just the false half.

None of these affect correctness, feasibility, or scope. Approving.
