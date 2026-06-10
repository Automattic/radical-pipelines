# Doc Plan Review

## Verdict: approved

## Summary

The doc plan is complete, correctly scoped, drift-resistant, traceable, and feasible. Its
central claim — that the only documentation text the new normalize-and-confirm behavior
falsifies is the unconditional "The issue body _is_ the phase-0 intent" sentence in
`manage-issues.md`, and that the only other required surface is a changeset for the
`skills/**` CI gate — survived an independent, adversarial, repo-wide sweep. I verified every
surface the writer enumerated as "stays accurate at its altitude" (README, SKILL, the
workflow/pipeline-creation reference docs, the website, contributor docs, the changeset
convention, and the agent profiles) and could not find a second falsified assertion anywhere.
D-1 is scoped at the level of the correction's intent (not exact wording) and explicitly defers
to the shipped `create-pipeline.md` for the skip-condition phrasing, so it will not drift. D-2
matches the project's changeset convention exactly (package name, `minor` bump for a pre-1.0
feature, hyphenated slug, imperative one-line summary, real validator and `changeset status`
checks). No task plans code. Both tasks have evaluable, drift-resistant acceptance criteria.

## Verification performed

**Coverage sweep (the headline check).** I grepped the entire doc surface — `README.md`,
`SKILL.md`, every file under `skills/radical-pipelines/reference/**`, `website/index.html` +
`website/demo.js`, `.rp.md`, `AGENTS.md`, `CONTRIBUTING.md`, `.changeset/**`, and every
`agents/*.md` — for any assertion about phase-0 / intent **creation** that the
synthesis-and-confirm behavior would contradict:

- `grep -i "issue body"` across all docs returns exactly **one** hit: `manage-issues.md:14`
  ("The issue body _is_ the phase-0 intent"). That is the one falsified assertion, and D-1
  covers it.
- The phase-0 descriptions in `README.md:27` ("Phase 0. Intent. The initial idea or request."),
  `README.md:112` ("phase 0 is the intent, an input rather than an agent-produced artifact"),
  `SKILL.md:35` ("Intent … The input"), and the website demo
  (`demo.js:276`/`:281`, depicting a canonical issue captured to `intent.md` as an "input")
  all describe phase 0 *that* it produces `intent.md`, never *how*, and never assert
  "no confirmation" as a general rule. They stay accurate (the demo depicts the skip path).
- The autonomous "no questions" rule is at `autonomous-workflow.md:11` and is explicitly scoped
  to *after the autonomous run starts*. `work-on-an-issue.md:39` invokes `create-pipeline.md`
  at step 2 — before the workflow-mode choice and before any autonomous run begins — so the
  new confirmation gate runs before the rule is in effect. No carve-out is needed; the
  workflow-table "Already in place" rows (`autonomous-workflow.md:39`, `assisted-workflow.md:17`)
  remain accurate. This corroborates the plan's (and the design's KD-12) reasoning.
- Every other `intent` reference in the skill (`fork-pipeline.md` verbatim `0-intent` copy,
  `pipeline-versioning.md` shared-root, the assisted-phase docs consuming `intent.md`) is a
  read-only / downstream consumer, not an assertion about creation. No agent **writes**
  `intent.md` (grep for write/create/produce/generate intent in `agents/**` returns nothing) —
  phase 0 has no agent profile, consistent with `README.md:112`.
- The changeset convention is confirmed: `package.json` is `@automattic/radical-pipelines` at
  version `0.1.1` (pre-1.0, so `minor` for a feature is correct and `major` is hard-rejected by
  `scripts/validate-changesets.mjs:149`); `.changeset/config.json:12` lists `skills/**` in
  `changedFilePatterns`; CONTRIBUTING confirms the gate and the pre-1.0 → `minor` policy; existing
  slugs (`rename-prompt-to-intent.md`, `per-agent-model-config.md`, …) match the hyphenated
  short-description convention D-2 specifies.

Conclusion: the plan's "two surfaces" count is exactly right. No missed surface is left out of
sync after phase 4.

**Scope / meta-pipeline boundary.** `manage-issues.md` is skill source, but the code plan's
Task 7 is read-only and explicitly edits nothing (and only verifies the *format/taxonomy* in
`manage-issues.md`, never the false line-14 identity sentence). So D-1's edit does not overlap
the code phase, and the line-14 falsehood is a genuine gap only the doc phase can close — which
D-1 does. `create-pipeline.md` is correctly treated as the phase-4 code surface, not a doc
surface. No task plans or changes code.

**D-1 drift-resistance.** D-1 describes the correction's *intent* (remove the unconditional
identity; canonical body maps directly on the skip path, else synthesized) and tells the writer
to read the shipped `create-pipeline.md` step 4 for the exact skip-condition wording. It
prescribes no replacement string; acceptance is behavioral. Drift-resistant. The dependency on
the code phase is correctly declared (the rewritten step 4 does not exist yet — only phases 0–3
artifacts are present — and D-1 is sequenced to run after it in phase 5).

**D-2 convention match.** Bump `minor`, package `@automattic/radical-pipelines`, hyphenated
slug, imperative one-line summary, no `major`, no `BREAKING:` prefix (correct — additive, not
breaking). Acceptance cites the real `node scripts/validate-changesets.mjs` and
`npx changeset status`. Fully matches the repo's changeset structure.

## Non-blocking observations (not grounds for the verdict)

These do not leave any surface inaccurate and are recorded only for completeness; they require no
change before phase 5.

- **Enumeration omits the website / contributor docs.** The plan's "All other surfaces examined"
  list (overview) names the reference docs and `agents/` profiles but does not explicitly mention
  `website/` (demo.js/index.html), `CONTRIBUTING.md`, the `.changeset/README.md`, or `.rp.md`.
  I independently confirmed each of those stays accurate (the website demo depicts the skip path
  and is not release-relevant per `CONTRIBUTING.md`; the others describe consumption or release
  mechanics, not phase-0 creation). Because none is left out of sync, this is a thoroughness nit
  in the prose enumeration, not a coverage gap — the binding "two surfaces" conclusion is correct.
- **D-2's `npx changeset status` acceptance** is satisfied at PR time against the base branch;
  the writer should treat it as "a changeset is present for the `skills/**` change," which the
  plan already states. No action needed.
