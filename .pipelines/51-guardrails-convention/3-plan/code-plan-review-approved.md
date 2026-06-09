# Code plan review — APPROVED

Reviewed: `3-plan/code-plan.md` (commit `413a1ab`) against `1-spec/spec.md`
(R1–R17 / AC1–AC12), `2-design-doc/design-doc.md` (D1–D9, Risks 1–5), and the
real edit targets in this repository.

**Verdict: APPROVED.** The single blocking issue from iteration 1
(`code-plan-review-1-rejected.md`) is resolved, with no regression to anything
previously verified.

---

## Iteration-1 issue — resolved

**Issue 1 (Task 7 omitted the `code-reviewer.md:97` back-reference) — FIXED.**

Task 7 now carries a new **change 5 (A + Risk 4)** that re-anchors
`code-reviewer.md:97` — the Guidelines bullet *"**Run the verification gates.**
Don't just read the code. A review without verification evidence is not a
review."* — to *"run every guardrail applicable to the code phase"*, using the
canonical T1 selection phrase. The change:

- correctly identifies it as a Risk-4 non-literal back-reference ("the
  verification gates" carries the command-gate role with no literal "verification
  convention"), so a `grep "verification convention"` for AC8 would otherwise pass
  while the dangling directive remained;
- names it the code-phase twin of `doc-reviewer.md:98` (T9 change 2) and instructs
  symmetric editing, not a literal grep;
- adds a matching acceptance bullet (the `:97` bullet "no longer says 'verification
  gates'; it re-anchors to running every guardrail applicable to the code phase").

The old change 5 (the `:98` blocker-clause strike) is cleanly renumbered to
change 6 with content unchanged. The full command-gate surface for
`code-reviewer.md` is now `:18 / :32 / :36 / :68 / :97 / :98` — complete and
matching the live file. The line citation `:97` is accurate against the current
`agents/code-reviewer.md`.

---

## Regression check — clean

- The cross-commit diff (`799b66e → 413a1ab`) touches **only** `code-plan.md`
  (17 lines) and only the Task 7 region (insert change 5, renumber old 5→6, add
  one acceptance bullet). No other task or section changed.
- The renumber introduced **no** dangling numbered cross-reference: the only
  "change N" mentions in the file are `:363` ("change 4" inside T4's own
  acceptance) and `:531` ("T9 change 2", still accurate — T9's change 2 is the
  `doc-reviewer.md:98` edit). Both unaffected.
- All previously-verified items remain intact and correct:
  - **T10** — changeset authored in the **code** phase; `minor` bump, package
    `@automattic/radical-pipelines`, runs the shape guardrail; justified by
    `changedFilePatterns` (`agents/**`, `skills/**`) and the confirmed absence of
    any "changeset" mention in `agents/`/`skills/` (design Risk 1).
  - **T2** — `.rp.md` H1-title decision baked into the task changes and
    acceptance; restructure + worked-example phase mapping (`npm test` → code;
    `node scripts/validate-changesets.mjs` → code, docs) verified against
    `package.json` and `changedFilePatterns`.
  - **T3** — D5 committed-only / not-locally-overridable carried by the loader
    edit, with an explicit acceptance bullet; placement after `## Missing
    conventions` / before `## Local overrides` and the untouched completeness
    check (AC4 by construction) intact.
  - **Other trap coverage** — `code-writer.md:46` behavior-verification-as-gate
    (T6/Risk 3), `code-writer.md:48` and `doc-writer.md:42/44` back-references,
    and the `pi.md:45` renumber (T5, the sole external `setup.md` step-number
    reference; T4→T5 ordering) — all still present and correct.

---

## Coverage confirmation

- **Every spec AC (AC1–AC12)** is covered by at least one task per the plan's
  coverage map, and each task traces to a spec requirement/AC or design decision.
- **All three must-address items** are present and correct (T10 changeset in the
  code phase; T2 H1-title decision in task acceptance; T3 D5 on the loader edit).
- **All known design traps** are accounted for, including — now — the three
  non-literal command-gate back-references (`code-writer.md:48`,
  `code-reviewer.md:97`, `doc-writer.md:42/44`), the behavior-verification-as-gate
  line (`code-writer.md:46`), and the `pi.md:45` "Step 3 of `setup.md`" renumber
  hazard.
- **No scope creep**: no tests planned (no executable code), no user-facing
  documentation planned (README/website/per-tool human files correctly deferred
  to the docs phase); the changeset is treated as a release artifact, not user
  docs.

The plan is ready for the code phase.
