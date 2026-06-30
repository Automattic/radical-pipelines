# Code Summary: Default output rules for pipeline-produced code

## What

Prose-only edits to the five agent profiles that touch host-project product: `agents/code-writer-tdd.md`, `agents/code-writer-e2e.md`, `agents/docs-writer.md`, `agents/code-reviewer.md`, `agents/docs-reviewer.md`. A single canonical Rule 1 + Rule 2 block (1972 bytes) was authored once and copied byte-identically into all five. Each producing profile's commit step gained a one-line no-provenance constraint; each reviewing profile gained a must-fix enforcement item, and `docs-reviewer` additionally gained a standalone product-commit-message-provenance inspection item. The pre-existing narrower Rule 2 line in `code-writer-tdd` ("Comments must be self-contained — never reference the spec, the plan, or any other artifact.") was deleted. No runtime code, no test files, no changes outside these five files.

## Why

Two qualities expected of hand-written work were not guaranteed by the tool and had to be hand-passed into each run: a change should leave untouched comments and prose exactly as they were (Rule 1), and the shipped product should read as if a person wrote it, with no trace of the pipeline that produced it (Rule 2). This batch promotes both into permanent, always-on rules of the tool — in force for every run with no owner action and no opt-out — and makes a violation a must-fix issue at the existing per-phase review gate.

## How

The rules live as standing prose in the profiles because an agent reads only its own profile and a profile cannot reference a shared file; the codebase's duplication-over-reference convention is satisfied by one canonical wording copied verbatim. Task 1 settled the authoritative wording in `code-writer-tdd` (replacing the narrower line) and added the commit constraint; Tasks 2–5 reproduced that exact block byte-for-byte in the other four profiles and added each profile's per-role addition. Rule 2 is stated as a referent-based test (subject-matter-of-the-product vs. process-that-produced-it) with concrete "NOT a violation" negative examples and an explicit self-hosting carve-out, never as a token/keyword/path scan. Producers honor the rules while writing and strip pipeline-naming provenance from product commits at authoring time; reviewers carry the same block plus an enforcement item that routes any found violation through the existing reject-liberally / every-issue-is-must-fix machinery, blocking phase completion until resolved. The commit-message-provenance check rides on `code-reviewer`'s existing Convention-compliance item (which already names commit conventions) but is a distinct new item in `docs-reviewer` (whose convention item is documentation-content-only). Commit classification uses the changed-path test against the artifacts folder `.pipelines/<slug>/`.

## Key decisions

- Rules duplicated verbatim into profiles rather than injected via the conventions block — injection under-delivers enforcement and mis-models a fixed rule as a per-run convention.
- Rule 2 expressed as a referent-based test with negative examples, never a token/keyword/path checklist — self-hosting-safe by construction and consistent with the spec's ban on a mechanical scan.
- Provenance stripped at authoring time as a format-agnostic property (forbid one property on one commit class) — the only mode-independent point, leaving artifact-only commits tagged and never needing the host's specific format.
- Enforcement reuses the existing review gate — no new gate, script, or orchestrator change. The commit-message check is specified independently per reviewer because their step-2 checklists are asymmetric.
- This feature's own prose tasks were typed `tdd` and verified by reviewer inspection (diff inspection, greps, byte-comparison), with no test file written — a structural assertion over agent-file content is forbidden by `CLAUDE.md` / `AGENTS.md`. (Rejected: a structural prose test; an unrelated vacuous test; a spec change to add runtime behavior.)

## Known limitations

- Detection of a Rule 1 / Rule 2 violation is a semantic judgment, not a mechanical check; enforcement guarantees only that a *seen* violation cannot be approved, not that detection is exhaustive (accepted per spec; Out-of-Scope #2 forbids closing the gap with a scan).
- The canonical wording is duplicated across five profiles, so a future edit must touch every copy to avoid drift (the deliberate cost of the duplication-over-reference constraint).
- The writer profiles' test-contract wording is unchanged, so a literal reading still has no explicit test-less branch for prose/instruction-only tasks; this is an accepted residual resolved at the gate and by the no-structural-tests rule, and making the affordance explicit is deferred to a separate, general-purpose effort.
