# Docs Review

## Verdict: approved

## Batch scope

Tasks reviewed:

- Task 1: Add the release changeset for the output-rules feature (`.changeset/default-output-rules.md`)
- Task 2: Document the always-on output-quality guarantee in the README value proposition (`README.md`)
- Task 3: Drop the agent-name provenance tag from the product commit shown in the website demo (`website/demo.js`)

## Summary

All three docs surfaces accurately reflect the shipped output rules and satisfy their per-task Acceptance. The changeset declares the correct package (`@automattic/radical-pipelines`) at a `minor` bump with no `BREAKING:` prefix — correct under the project's pre-1.0 feature-to-`minor` policy in `CONTRIBUTING.md` — and its body is a consumer-facing, imperative release note covering both rules, the no-opt-out guarantee, and review-gate enforcement, naming no internal agent profile or artifact path. The README addition sits naturally in the "What this unlocks" value-prop list, matches the surrounding bold-lead-in voice, conveys both rules and the review-gate enforcement at overview altitude, and does not restate the canonical profile wording or reproduce negative examples. The website demo edit drops the provenance tag from the single depicted product commit (the only commit shown in `demo.js`, on the only step that writes paths outside the artifacts folder) while leaving every artifact-only depiction untouched. The batch's own three product commits are correctly untagged, dogfooding Requirement 7. No drift remains on any surface the plan named, and nothing out of scope was touched.

## Checks

No guardrails are defined for this project, so there are no gates to run. Verification is by inspection (per the launch prompt). The accuracy spot-check below is the verification evidence.

| Check | Command | Result |
| ----- | ------- | ------ |
| None  | None    | skipped |

## Accuracy spot-check

**Task 1 (changeset) — front matter and body verified against `package.json` and `CONTRIBUTING.md`.**
- `.changeset/default-output-rules.md` front matter declares `"@automattic/radical-pipelines": minor`. The package name matches `package.json:2` (`"name": "@automattic/radical-pipelines"`). The `minor` bump matches `CONTRIBUTING.md` "Bump types" / "Pre-1.0 policy" (a feature maps to `minor` pre-1.0); the body carries no `BREAKING:` prefix, correct because this is not a breaking change. It is the single new file under `.changeset/` (diff stat: one added `.changeset/*.md`).
- The body's concrete claims match the shipped profiles: "no opt-out and no owner action" matches the always-on rules added to all five profiles; "leaves comments and prose it did not touch exactly as they were" matches Rule 1 as shipped in `agents/code-writer-tdd.md` (and the four others); "code, tests, documentation, and commit messages … reads as if written by hand, with no trace of the pipeline" matches Rule 2 plus the product-commit no-provenance constraint shipped in each producing profile's commit step; "enforced at the existing per-phase review gate, where a violation is a must-fix issue that blocks the phase" matches the must-fix enforcement items added to `agents/code-reviewer.md` and `agents/docs-reviewer.md`. No internal agent name, phase, or this-run artifact path appears.

**Task 2 (README) — value-prop bullet verified against the shipped rules and the surrounding section.**
- The new bullet is `README.md:45`, inside the "What this unlocks" list (`README.md:40`), adjacent to "Compounding quality" and "Consistent assets" — the location the plan specified. It follows the same `**Bold lead-in.** prose` shape as every sibling bullet (voice match).
- Concrete claims verified: "no opt-out and nothing for you to configure per run or per project" matches the always-on / no-opt-out behavior in the profiles; "A change leaves comments and prose it did not touch exactly as they were" matches shipped Rule 1; "the shipped product reads as if written by hand, with no trace of the pipeline that produced it" and the explicit inclusion of "commit messages" match shipped Rule 2 plus the product-commit constraint; "enforced at the same per-phase review gate every other quality check passes through, where a violation blocks the phase until it is resolved" matches the reviewers' must-fix enforcement items. The bullet does not reproduce the canonical profile wording or its "NOT a violation" negative examples, and names no agent profile.

**Task 3 (website/demo.js) — commit depiction verified against the changed-path test.**
- The edited step (`website/demo.js:94-104`) has `writes: ['src/orchestrator.ts (+218)', 'src/orchestrator.test.ts (+162)']` — both paths lie outside the artifacts folder `.pipelines/<slug>/`, so by the changed-path test it is a product commit and must carry no provenance. Its `bash` now reads `git commit -m "Add orchestrator"` (was `git commit -m "Add orchestrator (code-writer-tdd)"`): the agent-name tag is gone and no other pipeline-naming provenance remains. This matches Requirement 7 as shipped.
- `grep` confirms this is the only `git commit` / `bash:` occurrence in `demo.js`, so no other product-commit depiction was missed and no artifact-only depiction was altered. `website/index.html`'s artifact-only `git log` is not in the diff (untouched, correct per Requirement 8 and the plan's out-of-scope list). The change is a single-token edit; no unrelated demo content was restyled or reworded (Rule 1 respected).

**Dogfooding (Requirement 7) on this batch's own commits.** The three product commits — `ddfb2ba` "Add changeset for default output rules", `1b3af79` "Document always-on output guarantee in README value proposition", `5211c33` "Drop provenance tag from the demo product commit" — each touch only paths outside `.pipelines/` (`.changeset/`, `README.md`, `website/demo.js`), so each is a product commit, and each message carries no agent-name tag. Untagged is the compliant outcome; a tagged product commit would have been the violation.

**Drift sweep.** The product diff (`8350faa..HEAD`, excluding `.pipelines/`) touches exactly `.changeset/default-output-rules.md`, `README.md`, `website/demo.js`, and the five `agents/*.md` profiles (the phase-4 code). Every surface the plan named is either updated (README, website demo, changeset; CHANGELOG transitively via the changeset) or deliberately left untouched and confirmed absent from the diff (`.rp.md` commit-format convention, `website/index.html` artifact log, `SKILL.md`, `AGENTS.md`, `CONTRIBUTING.md`, PR template, changeset config). The code introduced no new public runtime surface (prose-only profile edits), so there is no undocumented surface.
