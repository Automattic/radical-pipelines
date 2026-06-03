# Design-doc review — APPROVED (Issue #81)

**Verdict:** Approved. The design doc at `2-design-doc/design-doc.md` is ready to
proceed to the plan phase.

## Scope of review

Reviewed `2-design-doc/design-doc.md` against `1-spec/spec.md` (R1–R13,
AC1–AC9) and `2-design-doc/design-doc-research.md` (T1–T5, OQ-1–OQ-4), and
verified feasibility against the live worktree.

## Coverage and traceability — complete

Every spec requirement and acceptance criterion maps to a component or decision,
and the doc's inline `*(R…, AC…)*` tags are accurate:

- R1 → C1 (`.changeset/config.json`, `@changesets/cli` dev dep). R2 → C1
  (`baseBranch: trunk`; `privatePackages` left at default). R3 → C2 (root is
  sole source of truth, never read back). R4 → C1/C3/K4 (Changesets-generated
  changelog, default formatter). R5 → C3/C6 (author per change, consume at
  version step). R6 → C6/C7. R7/R8 → C2/C3/K2 (identical version, bundled
  propagation). R9 → C4 (in-place lockfile regen). R10 → "Explicitly untouched"
  (marketplace.json). R11/R12 → C5/K6 (drift to 0.1.1, no next version pinned).
  R13 → C7. AC1–AC9 all covered, including AC9 (no publish/tags/release CI;
  `deploy-landing.yml` untouched).

## Faithful to the research — nothing dropped

All five settled research topics (T1 propagation mechanism, T2 local/manual,
T3 Docs-phase authoring, T4 default formatter, T5 drift correction) and all four
open questions (OQ-1 optional hardening, OQ-2 changelog-at-baseline, OQ-3
bump-type guidance, OQ-4 prettier) are carried forward and resolved. The
load-bearing constraints survive intact: non-`version` run-script name (FM-3),
in-place lockfile regen never delete-then-regenerate (FM-2), `&&` fail-fast
bundling (FM-1), default formatter to avoid the tokenless hard-abort (FM-4).

## Feasibility — verified against the repo

- Worktree state matches the doc exactly: root `package.json:3` `0.1.1`
  (`"private": true`, `"type": "module"`, **no `scripts` block**),
  `.claude-plugin/plugin.json:3` `0.1.0`, `.pi-extension/package.json:3` `0.1.0`
  with `bundledDependencies`, `.pi-extension/package-lock.json` `0.1.0` at the
  two top-level version keys (lines 3 and 9), `lockfileVersion: 3`. No
  `.changeset/`, no `CHANGELOG.md`, no `scripts/`.
- `marketplace.json` confirmed to carry no version field and use
  `source: "./"` (R10/AC6 correct).
- Every config key the design uses (`changelog`, `baseBranch`, `privatePackages`,
  `commit`, `access`, `prettier`) is valid in the Changesets config schema.
- `doc-writer` (`.agents/agents/doc-writer.md:60`) does own "changelogs" and is
  barred from source code; a `.changeset/*.md` is metadata, not source — so C6's
  "not a source-code violation" claim holds. The Docs phase reference
  (`5 - docs.md:14`) lists "changelogs" in Outputs.

## Non-blocking notes for the plan/code phase (do not require a re-spin)

1. **C6 mechanism altitude — clarify in the plan, not the design.** C6/K5 phrase
   the per-change changeset duty as the `doc-writer` "gaining a duty," but in
   this pipeline the `doc-writer` (phase 5) executes only the task blocks the
   `doc-plan-writer` (phase 3) emits in `doc-plan.md` — it does not self-assign
   standing duties. The durable enforcement is correctly placed by C7 (the
   standing contributor-docs rule, mirroring the AGENTS.md:7 README rule, which
   both the doc-plan-writer and doc-writer read as "host project documentation
   convention"). The design's intent is sound and achievable; the plan phase
   should make the wiring explicit — i.e. the standing rule is the mechanism, and
   the doc-plan should carry a changeset-authoring task — rather than relying on
   the agent to invent the duty. This is a clarity/altitude refinement, not a
   coverage gap.

2. **Leftover research sandboxes.** Two untracked directories from the
   researcher's hands-on verification remain in the worktree — `.cs-sandbox-gh/`
   and `.cs-sandbox/` (untracked, not git-ignored; tracked files are clean).
   Harmless to the design, but the code phase should delete them so they do not
   leak into a commit or confuse `git status`.

3. **`prettier: false` verification (already flagged as OQ-4/C1).** Carry the
   design's own flag forward: the code phase should confirm Changesets writes the
   changelog cleanly with `"prettier": false` and no Prettier installed.

None of these block the design. Coverage is complete, the decisions are faithful
to the research, the mechanism is feasible against the real repo, and scope stays
within the spec without bleeding publish/tags/release-CI work into it.
