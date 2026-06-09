# Design doc review: Guardrails convention — APPROVED

**Verdict:** APPROVED
**Reviewed commit:** `c26913c`
**Review iteration:** 1
**Reviewer:** design-doc-reviewer

The design doc at
`.pipelines/51-guardrails-convention/2-design-doc/design-doc.md` faithfully
realizes the spec, is internally consistent, is feasible against the real
codebase, stays within scope, and carries both flagged carry-over items. It is
approved for the plan phase.

## How the review was conducted

This was an adversarial review. I did not take the design's claims on trust; I
read the actual codebase files the design touches and re-verified every
load-bearing factual claim:

- Spec (`1-spec/spec.md`) — the authoritative intent (R1–R17, AC1–AC12).
- The real targets: root `.rp.md`, `skills/radical-pipelines/reference/conventions/load.md`
  & `setup.md`, and the four agents
  `agents/{code-writer,code-reviewer,doc-writer,doc-reviewer}.md`.
- The grounding files the design's decisions depend on: `pi.md`, `package.json`,
  `.changeset/config.json`, `.github/workflows/{changeset-gate,release}.yml`,
  `CONTRIBUTING.md`, `AGENTS.md`, `README.md`.
- A repo-wide grep of the `verification convention` surface and the
  non-literal back-references.

## Verification performed (all claims held)

- **Four-agent edit surface and back-references (Risk 4) are real and complete.**
  `grep "verification convention"` across editable source returns hits in exactly
  the four agent files (plus a prior pipeline's artifact, out of scope). The three
  back-reference traps the design flags are confirmed present and would survive a
  naive literal grep: `code-writer.md:48` ("Run every gate documented **in the
  convention**"), `code-reviewer.md:97` ("**Run the verification gates.**"),
  `doc-writer.md:42`/`:44` ("If **the convention** enumerates… doc gates").
- **Risk 3 (behavior verification listed as a gate) is real.** `code-writer.md:46`
  literally enumerates "…lints, build, **behavior verification**, anything else…";
  the design's two-part edit (convert to guardrails AND drop behavior verification)
  is correctly called out as the easiest-to-miss R15 edit.
- **D7 / pi.md renumber hazard is real and uniquely scoped.** `pi.md:45` reads
  "Step 3 of `setup.md`"; `claude-code.md` has no step-number reference; this is
  the only external `setup.md` step-number cross-reference. The number-free fix is
  sound and in scope.
- **Worked example (R17/AC12) is grounded.** `package.json` declares only `test`;
  `CONTRIBUTING.md:19` states there is no `lint`/`typecheck` step;
  `changeset-gate.yml:31,34` runs `npm test` and `node scripts/validate-changesets.mjs`;
  `release.yml:29` runs `npm test`. The two-row table is exactly the repo's real
  gates — no invented tooling. The phase mapping (`npm test` → code; changeset
  shape → code, docs) follows correctly from `.changeset/config.json`
  `changedFilePatterns` (`skills/**`, `agents/**`, `.claude-plugin/**`,
  `package.json`, `README.md`). The deliberate exclusion of
  `npx changeset status --since=origin/<base>` (no fixed exact command) is correct.
- **AGENTS.md anti-duplication rule exists** (`AGENTS.md:11`), so D3's
  centralize-in-`load.md` decision is grounded, and the echo-vs-point-to choice is
  an honest minor trade-off rather than an oversight.
- **Spec coverage is accurate, not merely asserted.** I spot-checked the §11 R/AC
  tables against the underlying decisions: R7 (verbatim `###` move under D1), R10
  (guardrails have no `Required?` cell → completeness check untouched, D4), R14
  (blocker-rule deletions + positive optionality sentence, D9), R16 (the R16-leave
  lists + mis-sweep traps, D8/Risk 5). Each maps to a concrete decision.

## Both flagged carry-over items are present

1. **Changeset-authoring task for the plan phase.** Present and prominent as
   Risk 1 (§7), restated in §10: "*The plan phase must assign an explicit 'author
   the changeset' task.*" The design correctly notes the `validate-changesets`
   guardrail passes vacuously with zero changeset files (so declaring it does not
   force authoring), the no-circularity argument (today's definitions produce
   tomorrow's contract), and that no agent currently owns changeset authoring.
2. **Guardrails committed-only / not locally overridable.** Present as D5 (§6) and
   Risk 2 (§7), with the loophole analysis (the "restricted subset" is nowhere
   enumerated; `.rp.local.md` wins per named unit on the same `.rp.md`, so a dev
   could null out a mandatory gate) and a concrete placement (a sentence in
   `load.md`'s `## Guardrails` section or a half-sentence in `## Local overrides`),
   scoped to guardrails only. I independently re-verified `load.md:33-37`'s
   per-named-unit merge rule and that no allowlist is enumerated — the loophole is
   real and the resolution is appropriate.

## Non-blocking note for the plan/code phase

One minor ambiguity the design leaves open (does not block approval):

- **The `.rp.md` H1 title.** `.rp.md:1` is `# Radical Pipelines project
  conventions`. The design reconciles the stale **intro paragraph** at `.rp.md:3`
  (D2, because the file will now hold guardrails too) and renames the `## Shared
  conventions` heading (D1), but never mentions the H1 title — which, after the
  change, describes a conventions-and-guardrails file as "…project conventions,"
  exactly the staleness D2 sets out to remove. No AC strictly requires touching the
  title (AC1/AC12 are about the two `##` sections and content preservation), so the
  conservative default of leaving it is acceptable; but the design should not have
  left it silent given D2's own logic. **The plan phase should make an explicit
  call** — leave the title as-is, or broaden it alongside the D2 intro fix — rather
  than leaving it to an undirected sweep. Recorded as guidance, not a blocker.

## Scope and consistency

- No scope creep: §9 restates the out-of-scope set; README's stale "per-tool
  section" descriptions (`README.md:159,161`, independently confirmed) and CI/user
  "gate" naming are correctly deferred to the docs phase, not renamed here.
- D2's intro rewrite does not violate R7/AC1: the intro is framing prose, not
  convention content, and is already factually wrong (no per-tool sections exist in
  `.rp.md`); correcting an incorrect sentence preserves the *meaning of the
  conventions*.
- Orchestrator/`skills/` no-change claim (§2.3) is correct: the only editable-source
  references to the command-gate role live in the four agents.

Approved.
