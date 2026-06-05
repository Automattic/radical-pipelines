# Doc Plan Review — APPROVED

**Artifact reviewed:** `3-plan/doc-plan.md` (committed at e777fc1, 4 tasks)
**Reviewer:** doc-plan-reviewer
**Verdict:** APPROVED
**Iteration:** approved on first review (N would have been 1 on rejection)

## Scope of review

Adversarial review of the doc plan for completeness against the design's
documentation surface (design §8), concreteness of each task, accuracy against
the shipped code/behavior in `3-plan/code-plan.md` and `2-design-doc/design-doc.md`,
and traceability to the spec/design. Live worktree files were inspected to
confirm the plan's claims.

## Completeness against the documentation surface — PASS

All four documentation surfaces from design §8 are covered, with no missing
required content:

1. `CONTRIBUTING.md` (new, authoritative mechanics) — Doc Task 1.
2. `README.md` "## Changelog and versioning" rewrite — Doc Task 2.
3. `.changeset/README.md` stale-sentence fix — Doc Task 3.
4. `AGENTS.md` changeset pointer repoint — Doc Task 4.

Team-lead checklist items, all present:
- **`#pre-10-policy` anchor (J7):** Task 1 mandates a heading titled exactly
  `Pre-1.0 policy` (`## Pre-1.0 policy`), called out in Sections-scope and as a
  hard acceptance criterion. Slug check confirmed: `Pre-1.0 policy` →
  `pre-1.0-policy` → GitHub drops the `.` → `pre-10-policy`, matching the
  validator's hard-coded anchor (code-plan Task 4; design §6.4/J7) verbatim.
- **No-npm mechanics:** Task 1 enumerates only the allowed npm commands
  (`npm ci`, `npm install`, `npm test`, `npm run release:version`) and bars
  npm-publish/OIDC/rollback/unpublish/dist-tag/`--dry-run` as an explicit
  acceptance criterion. Tasks 2–4 also bar npm-publish/OIDC instructions.
- **README "Changelog and versioning" rewrite:** Task 2 covers the stale
  "operator-run local action", "no git tags", "no release CI" lines, keeps the
  no-npm claim, reframes the two `release:version` steps as what the Version
  Packages PR runs in CI, adds the R18 local-token note, and shrinks
  `### Adding a changeset` to a `CONTRIBUTING.md` pointer.
- **`.changeset/README.md` stale sentence:** Task 3 scopes the edit to the final
  project-specific paragraph only, leaving the two `changeset init` boilerplate
  paragraphs byte-identical.
- **AGENTS.md pointer:** Task 4 repoints to
  `./CONTRIBUTING.md#adding-a-changeset` (and optionally `#pre-10-policy`).
- **Maintainer prerequisites (R21):** Task 1 documents the three buckets, with
  Bucket 1 phrased "verify enabled (currently satisfied)" (not "off by default")
  and Bucket 2 = "none", matching design §8.5 and spec R21.
- **Manual-release escape hatch:** Task 1 `## Manual release escape hatch`
  documents the no-npm local procedure (design §8.4), producing the same
  `v<version>` tag + Release as CI.

## Task concreteness — PASS

Each of the four tasks carries Goal, Audience, Files, Sections-scope,
Depends on, Traces to, and Acceptance. Sections-scope is concrete (explicit
headings, content lists) while correctly leaving wording free. Acceptance
criteria are observable and testable.

## Accuracy against shipped code/behavior — PASS

Verified against the live worktree and the code/design:

- **Tag form `v<version>`** (not the scoped form): Task 1 and Task 2 both
  document `v<version>`; matches design §4/D1.6/DC1/ST2 and code-plan Task 7.
  The plan explicitly notes the spec's N5 prose is stale and uses `v<version>`.
- **No npm publish; `changeset tag` only:** consistent with code-plan Task 7
  (J3) and design §4.
- **Validator hard-coded anchor:** code-plan Task 4 / design §6.4 emit
  `CONTRIBUTING.md#pre-10-policy` verbatim; Task 1 honors it (J7).
- **`npm test` description:** Task 1 describes `npm test` running the
  sync-version + validator suites — matches code-plan Task 2's exact `test`
  script value and design §5.2. The "no lint/typecheck" note matches design §4.
- **README line range / subsections** (169–210; `### Adding a changeset`,
  `### The single source of truth`, `### Cutting a version`,
  `### How consumers get new versions`): confirmed exact in the live `README.md`.
- **`.changeset/README.md` layout** (boilerplate lines 1–8, stale project
  paragraph lines 10–12): confirmed exact in the live file.
- **AGENTS.md pointer** ("See the README's changelog and versioning section for
  how to author one." at line 8): confirmed exact in the live file.
- **`CONTRIBUTING.md` is new:** confirmed absent in the worktree.
- **`changedFilePatterns` allowlist and exclusions:** Task 1 matches R8 /
  code-plan Task 3; the `package.json` anchoring (not `package-lock.json`) is
  correctly documented.
- **Local-`GITHUB_TOKEN` requirement + PAT scopes + zero CI cost:** Task 1
  matches design §5.1 (classic PAT `repo` + `read:user`; fine-grained
  Contents:Read + Pull requests:Read + Metadata:Read; gitignored `.env` via
  dotenv).
- **Re-run / missing-Release-backfill edge:** Task 1 matches design §4
  idempotency edge note.

## Traceability — PASS

Traces are coherent: Task 1 → R20/R21/R18/R22, design §8.1/§8.4/§8.5, J7, N3;
Task 2 → R19, AC14, design §8.2, ST2, N5; Task 3 → R19, design §8.3, ST2;
Task 4 → R20, design §8.3, J7. The AC numbering (AC13/AC14/AC15) maps to the
spec's numeric acceptance criteria (rich changelog + local-token; README;
contributor/maintainer mechanics).

## Ordering — PASS

Task 1 first (ships the authoritative `#pre-10-policy` and `#adding-a-changeset`
anchors); Tasks 2–4 follow and point into it; all depend on the code phase
landing the described behavior. Task 4's anchor dependency on Task 1 is correct.
The `#adding-a-changeset` slug (from `## Adding a changeset`) referenced by
Tasks 2 and 4 matches Task 1's heading.

## Minor, non-blocking observations (no action required)

- Task 1's exclusion enumeration omits `.rp.md` from the explicit meta-file
  list but uses "meta files incl. …" (non-exhaustive), so it is not a defect at
  the what/where altitude.
- Task 1 does not separately restate design §9's "first *local* run needs a
  token" caveat, but it is subsumed by the documented general local-token
  requirement. Acceptable.

## Conclusion

The doc plan is complete against every required documentation surface, accurate
against the shipped code and design, honors the load-bearing J7 anchor and the
no-npm invariant throughout, and every task is concrete with full structure and
traceability. No blocking findings. **APPROVED.**
