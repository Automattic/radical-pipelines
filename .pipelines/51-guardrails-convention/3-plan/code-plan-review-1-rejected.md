# Code plan review 1 — REJECTED

Reviewed: `3-plan/code-plan.md` (commit `799b66e`) against `1-spec/spec.md`
(R1–R17 / AC1–AC12) and `2-design-doc/design-doc.md` (D1–D9, Risks 1–5).

**Verdict: REJECTED.** One blocking issue. The plan is otherwise strong — line
anchors are accurate, all three must-address items are present and correctly
baked into task acceptance, and the changeset obligation is handled. But it omits
one of the three command-gate back-references the design (Risk 4) and the review
brief both flagged by name, leaving a dangling command-gate directive in
`code-reviewer.md`.

---

## Blocking issue

### Issue 1 — Task 7 omits the `code-reviewer.md:97` "Run the verification gates" back-reference

**Task:** Task 7 — Update `code-reviewer.md` to use Guardrails.

**What's wrong.** `code-reviewer.md:97` is a Guidelines bullet that carries the
command-gate role via a non-literal back-reference:

> `code-reviewer.md:97`
> `- **Run the verification gates.** Don't just read the code. A review without verification evidence is not a review.`

This line instructs the reviewer to **run the project's command gates** — it is a
role-A command-gate reference. The literal string is "the verification gates"
(not "verification convention"), so it is exactly the Risk-4 trap: a
`grep "verification convention"` (AC8) passes while this dangling command-gate
directive remains. Task 7's change list enumerates `:18`, `:32`, `:36`, `:68`,
`:98` and **does not include `:97`**. Its R16-leave list (`:30`, `:31`, `:84`)
does not name `:97` either, so it is neither edited nor deliberately protected —
it is simply missed.

**Why this is blocking, not cosmetic.**

- The review brief's known-traps checklist names this line explicitly: *"the
  three non-literal command-gate back-references (code-writer.md:48,
  **code-reviewer.md:97**, doc-writer.md:42/44)."* The plan covers the other two
  (T6 change 4 for `code-writer.md:48`; T8 change 2 for `doc-writer.md:42/44`)
  but not this one.
- Design **Risk 4** is explicit: *"The plan/code phase must use the full edit
  surface, not a literal grep."* Leaving `:97` is precisely the failure mode
  Risk 4 warns against.
- Leaving it violates **R12**'s intent — *"After this change, no agent refers to
  a 'verification convention' for that role"* — and produces an internal
  contradiction: the workflow body (`:18`, `:32`) would speak of *guardrails*
  while a Guidelines bullet still tells the reviewer to *"Run the verification
  gates."*
- The omission is demonstrably an oversight, not a deliberate choice: Task 9
  **does** edit the exact docs-phase twin of this line — `doc-reviewer.md:98`
  (T9 change 2, *"Run the gates if any exist"*) — so the code-phase reviewer's
  equivalent Guidelines bullet should be edited symmetrically. (`code-writer.md`
  has no analogous "run the gates" Guidelines bullet, so there is no
  corresponding gap in T6.)

**Where:** `agents/code-reviewer.md:97`; the fix belongs in `code-plan.md`
Task 7 "Changes" (add a new role-A change item) and in Task 7 "Acceptance."

**Expected.** Add an explicit role-A change to Task 7 that re-anchors
`code-reviewer.md:97` to the guardrails model — e.g. *"Run every guardrail
applicable to the code phase; a review without their evidence is not a review"* —
using the canonical selection phrase from T1, and add it to the post-edit
acceptance so the line is verified. (This is a Risk-4 back-reference, like
`:32`; flag it as such in the task text so the code-writer does not rely on a
literal grep.) Confirm no other non-literal command-gate back-reference remains
in `code-reviewer.md`.

---

## Everything else verified — no other blocking issues

The remainder of the plan was checked adversarially against the real edit targets
and holds up. Recorded here so the next iteration only has to fix Issue 1.

### Must-address items — all present and correct

1. **Changeset task in the code phase (T10).** Present and well-justified.
   Verified against the repo: `.changeset/config.json` `changedFilePatterns` is
   `["skills/**","agents/**",".claude-plugin/**","package.json","README.md"]`, so
   `agents/**` + `skills/**` (code phase) trigger the presence check; a repo-wide
   grep confirms **no** "changeset" mention in `agents/` or `skills/`, so this is
   genuinely no agent's documented job (design Risk 1). Bump `minor` and package
   `@automattic/radical-pipelines` match the two prior feature changesets
   (`local-convention-overrides.md`, `per-agent-model-config.md`) and
   `package.json`; `scripts/validate-changesets.mjs` hard-rejects `major` pre-1.0
   and passes vacuously on zero changeset files — both as the plan/design state.
   Correctly placed in the code phase because the declared `validate-changesets`
   guardrail applies to `code`.

2. **`.rp.md` H1-title decision (T2 change 1 + acceptance).** Baked into the task
   with a concrete decision (broaden `# Radical Pipelines project conventions` to
   a generic title) and an observable acceptance bullet ("the H1 title no longer
   states the file holds only conventions"). Not left to an undirected sweep.
   Rationale is sound: with the D2 intro rewrite on `.rp.md:3` naming both
   conventions and guardrails, an H1 saying only "conventions" would contradict
   its own intro within two lines.

3. **D5 committed-only / not locally overridable (T3 change 2 + acceptance).**
   Carried by the loader-edit task, stated as a mandatory one-sentence rule with
   an explicit acceptance bullet, and correctly tied to `load.md`'s
   `## Local overrides` mechanism (verified at `load.md:31`–`37`: overrides merge
   "per named unit," which is exactly the loophole D5 closes).

### Other known traps — covered

- **`code-writer.md:46` behavior-verification-as-a-gate** — T6 change 3 does both
  required things (convert to guardrails **and** drop "behavior verification" from
  the enumeration), and flags it as the Risk-3 easiest-to-miss edit. Verified the
  line still reads "...lints, build, behavior verification, anything else...".
- **`code-writer.md:48`** back-reference ("Run every gate documented in the
  convention") — T6 change 4 ✓.
- **`doc-writer.md:42`/`:44`** back-references ("If the convention enumerates doc
  gates" / "...no doc gates") — T8 change 2 ✓.
- **`pi.md:45` renumber hazard** — T5 makes the reference number-free (D7).
  Verified `pi.md:45` is "Step 3 of `setup.md`…" and a repo-wide grep confirms it
  is the **only** external `setup.md` step-number reference (claude-code.md has
  none; README links anchorlessly). T4→T5 ordering is correct.

### Line anchors and structure — accurate

- `setup.md` renumber (T4): step 2 ends at `:170`; `## 3. Apply…` `:171`,
  `## 4. Confirm writes` `:179`, `## 5. Write…` `:188`, `## 6. Set up git ignore`
  `:195`, `## 7. Finish safely` `:203` — all verified exact; 3→4…7→8 is correct.
- `load.md` insertion point (T3): `## Missing conventions` ends `:29`,
  `## Local overrides` begins `:31` — verified; placement after Missing /
  before Local overrides matches D4. The "continue to `## Local overrides` below"
  pointer at `load.md:25` still resolves after insertion (no contradiction).
  Keeping `## Missing conventions` untouched satisfies AC4 by construction
  (no `Required?` cell for guardrails) — correct.
- The four agents' role-A/B/C and R16-leave line cites were cross-checked against
  the live files and are accurate (e.g. code-writer `:13/:36/:44-46/:48/:50/:51/:70`;
  code-reviewer `:18/:32/:36/:68/:98` and R16-leave `:30/:31/:84`; doc-writer
  `:35/:40-44/:45/:65`; doc-reviewer `:33/:98/:99`). doc-reviewer.md and
  doc-writer.md have **no** uncovered command-gate back-reference — the only gap
  is `code-reviewer.md:97` (Issue 1).

### Scope discipline — clean

- No tests planned (no executable code; design §2.1) and no user-facing docs
  planned (README/website/per-tool human files deferred to the docs phase). The
  changeset is correctly treated as a release artifact, not user docs.
- README staleness (the "shared section / per-tool section" framing, strongest at
  `README.md:159`) is correctly logged in the non-task "Notes" and deferred to the
  docs phase. `scripts/validate-changesets.mjs`/`package.json` are explicitly not
  modified. Only one `.rp.md` exists in-repo, so T2's "root `.rp.md`" scope is
  complete.

### Worked-example phase mapping — correct

`npm test` → `node --test 'scripts/test/**/*.test.mjs'` (code-only) and
`node scripts/validate-changesets.mjs` (code + docs, since the docs phase edits
`README.md`, a release-relevant path) both verified against `package.json` and
`changedFilePatterns`. The deliberate exclusion of the PR-base-relative
`npx changeset status` check is sound.

---

## Required fix to clear this review

Add to **Task 7** a role-A change re-anchoring `code-reviewer.md:97` ("Run the
verification gates") to "the guardrails applicable to the code phase," flag it as
a Risk-4 back-reference, and add a matching acceptance bullet. No other change is
required to approve.
