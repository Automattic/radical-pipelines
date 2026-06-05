# Doc plan review — APPROVED

**Target:** `3-plan/doc-plan.md`
**Reviewer:** doc-plan-reviewer
**Iteration:** 1 (no prior rejections)
**Verdict:** APPROVED

## Summary

The doc plan correctly identifies the two surfaces that need documentation work — a mandatory Changesets entry (D2) and the AGENTS.md-mandated README accuracy check (D1) — and records the remaining repository surfaces as no-change with reasons that hold up under an independent end-to-end sweep. No drifting surface was missed; no surface was invented; no code task was smuggled in; and every referenced file/section exists. The plan is drift-resistant (no hardcoded wording, command flags, or line numbers in the doc tasks) and stays in scope.

## What I verified independently

### Mandates and gates are real

- **AGENTS.md README mandate (D1):** Confirmed at `AGENTS.md:7` — "Whenever any task is performed that changes the code in this repository, the README.md must be updated to keep it up to date." Real obligation; D1 is correctly framed as a deliberate accuracy check that may be a no-op recorded in the PR/changeset narrative.
- **AGENTS.md changeset mandate (D2):** Confirmed at `AGENTS.md:8`.
- **Changeset Gate is genuinely triggered (D2 is mandatory, not optional):** `.github/workflows/changeset-gate.yml` runs `npx changeset status --since=origin/<base>`, which is governed by `.changeset/config.json` `changedFilePatterns`. That array is `["skills/**", "agents/**", ".claude-plugin/**", "package.json", "README.md"]`. The shipped change is to `skills/radical-pipelines/reference/conventions/setup.md`, which matches `skills/**`, so the change IS release-relevant and the gate fails without a changeset. Confirmed.
- **Package name and validator:** `package.json` name is `@automattic/radical-pipelines` (version `0.1.1`, `"private": true`). `scripts/validate-changesets.mjs` exists, enforces that exact name, the valid bump set, and the pre-1.0 no-`major` guard. The plan's references are accurate.
- **Bump-type guidance:** The plan defers to the project's pre-1.0 policy for a backward-compatible feature rather than hardcoding a literal bump, while noting consistency with the existing entries. All three existing entries (`automate-releases.md`, `restructure-repository-layout.md`, `changelog-and-version-sync.md`) are `minor`, so a `minor` outcome will be consistent. Drift-resistant and correct.

### D1 scope is correct

The README describes the interactive setup flow and `.rp.md` at a conceptual altitude ABOVE remote naming:
- `README.md:153,155,157,159,161` describe the interactive setup flow, what it collects, and the merged `.rp.md`.
- `README.md:167` lists `.rp.md`'s shared section topics including "push behavior."
- The README does NOT mention `origin`/`upstream`, the identify-the-remotes step, or remote renaming.

D1's instruction to preserve that altitude and only touch the README where it would otherwise be inaccurate (and not to lift `setup.md`'s step-level mechanics in) is the right scoping and avoids creating a new drift surface. Note (non-blocking): `README.md` is itself in `changedFilePatterns`, so any actual D1 edit is independently release-relevant — but it is already covered by the same D2 changeset, so this introduces no gap.

### No-change justifications all hold (grep-verified)

- **website/** — Only matches are "pushed back on" (review feedback, not git push), a generic "See README for full setup" link, and a font `preconnect`. No fork-mode / remote / `.rp.md` / setup prose. Does not drift.
- **AGENTS.md** — Source of the two mandates, not a surface describing remote naming. Does not drift.
- **CONTRIBUTING.md** — `origin` appears only in maintainer release mechanics (`changeset status --since=origin/<base>`, `git push origin trunk`, push of the version tag). These are radical-pipelines' own release process (spec O3), unrelated to orchestrator fork-mode. "originating" is substring noise. Does not drift.
- **load.md** — No remote-name hits. Its only `setup.md` reference (`load.md:26`) invokes the setup flow; no remote-name dependency. Does not drift.
- **pi.md** — `pi.md:63` references `artifacts-in-fork` for agent install placement by logical role; `pi.md:45` references "Step 3 of `setup.md`" for agent install timing. No hardcoded push-target name. Does not drift.
- **pipeline-versioning.md** — Uses "the fork's main" / "the project's main" by ROLE, plus "fork" in the pipeline-fork sense. No remote-name hardcoding. Does not drift.
- **.rp.md** (dogfood) — No `origin`/`upstream`/`git push`/`git remote` hardcoded to a remote name. Does not drift.

### No missed drifting surface (full-repo sweep)

I grepped every tracked non-artifact file for `upstream|origin|artifacts-in-fork|remote|fork` and inspected every hit the plan did not explicitly enumerate:
- `fork-pipeline.md`, `manage-issues.md`, `resume-pipeline.md`, `work-on-an-issue.md` — matches are pipeline-forking, the logical phrase "upstream of," generic "the remote / local/remote/both," none describing artifacts-in-fork remote naming. Do not drift.
- `agents/spec-*.md` — all hits are the substring "original" in `prompt.md` references; no remote prose.
- `SKILL.md` — no setup/fork/remote prose.
- No file anywhere quotes or cross-references the removed soft-hint sentence (`setup.md:129`), so its removal in phase 4 orphans nothing.
- No `CHANGELOG.md` exists yet (generated at version time), so the plan correctly does not list it. `.changeset/README.md` is the hand-customized cheat-sheet, correctly excluded from D2's target.

### Feasibility, traceability, and containment

- All anchors the plan relies on exist on disk: `setup.md`'s identify-the-remotes block (127–134), the line-121 role-based fence, the create-fork sub-path, and the role-keyed Capture block (148–155).
- No code tasks: both D1 and D2 are documentation surfaces; the plan explicitly fences the doc-writer out of `setup.md` and every other shipped doc, matching code-plan AC9.
- Drift-resistance: the doc tasks specify files, audiences, and acceptance criteria; they do not prescribe final prose, command flags, or line numbers, and defer exact wording to a read of the shipped `setup.md`.
- Ordering (D1 then D2, both depending only on the shipped phase-4 change) is sound and the two are correctly noted as independent.

## Conclusion

The plan's coverage is complete and its no-change reasoning is sound. The plan is ready for the doc phase.
