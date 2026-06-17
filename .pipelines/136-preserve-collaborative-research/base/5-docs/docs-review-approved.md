# Docs Review: Approved

The documentation batch for "Preserve collaborative research across the assisted
phases" is approved.

## Batch reviewed

- **Doc Task 1** — Add the release changeset
  (`.changeset/preserve-collaborative-research.md`).

## Verification

- **Accurate to shipped behavior.** The changeset body states that the assisted
  phases' collaborative research — the owner's questions, the explanatory
  exchanges, and the candidate solutions and trade-offs explored together — is now
  reliably recorded within each assisted phase and carried forward to the next
  assisted phase. This faithfully describes the shipped skill edits: the new
  `collaborative-research.md` recording trigger (reliable, settled-thread
  recording), the spec phase's new `## Topics` home for owner-initiated questions
  and explanatory exchanges, and the carry-across via the supplementary research
  inputs added to the assisted design-doc and plan phases. No over-claiming.
- **Bump and package.** Names `"@automattic/radical-pipelines"` at `minor`,
  consistent with the `CONTRIBUTING.md` bump table (a feature / backwards-compatible
  addition) and the pre-1.0 policy. No `BREAKING:` prefix, correct since this is not
  a breaking change.
- **Drift-resistant.** The body speaks to consumers about the outcome and does not
  restate internal skill mechanics — no mention of the shared file, the `## Topics`
  section, the recording trigger, or the carry-across input. Tone and length match
  the existing `.changeset/` bodies.
- **Gate passes.** `node scripts/validate-changesets.mjs` exits 0;
  `npx changeset status --since=origin/trunk` reports `@automattic/radical-pipelines`
  bumped at `minor` (the change is covered).
- **Excluded surfaces confirmed.** The only non-artifact changes are the four
  shipped skill files plus this changeset. No other documentation surface
  (`README.md`, `AGENTS.md`/`CLAUDE.md`, `CONTRIBUTING.md`, `.changeset/README.md`,
  `CHANGELOG.md`, `website/`, `.rp.md`, the autonomous references) is falsified by
  the change. The doc plan's "Surfaces checked and excluded" list is sound; no
  surface was missed. README's "in real time" occurrences are unrelated motivation
  prose, not the recording-timing guidance this change replaced.
