# Code Plan Review — Rejected (iteration 1)

Pipeline: `90-per-agent-model-config` — "Optional convention for per-agent model configuration"
Reviewer: `code-plan-reviewer`
Verdict: **Rejected**

## Summary

The plan is strong on the substance of the feature: every file path and line anchor it cites is accurate, every design premise it relies on holds up under verification, all 16 acceptance criteria are traced to tasks, the task dependency graph is acyclic and well-ordered, and the design's hard constraints (table-free `.rp.md` shape, optional `load.md` row, per-key resolution, forbidden frontmatter `model:` channel, paired Pi recovery edits, the Task 10 doc-drift reconciliation) are all preserved. Tasks 1–8 are placed in the correct phase and are individually feasible with concrete, verifiable acceptance criteria.

It is rejected on **one blocking issue**: **Task 9 puts a `README.md` documentation edit inside the code plan, but README updates are a docs-phase (phase 5) responsibility in this repo, not a code-phase (phase 4) one.** This is a phase-scope violation with a clear precedent against it, and it would seed exactly the duplication/drift the plan otherwise works hard to avoid. The fix is small (remove Task 9; let the doc plan own README + changeset), but the boundary matters and the error originates in the plan under review, so it must be corrected before approval.

A second, non-blocking observation about the changeset is recorded below to keep the relaunch fully informed.

---

## Blocking issue

### B1 — Task 9 (README edit) belongs to the doc plan / phase 5, not the code plan

**What the plan does.** Task 9 ("Add the `Agent models` mention to the README per-tool-section catalog") adds a documentation edit to `README.md:157`/`:167` as a code-phase task. The plan itself flags it as "Documentation completeness … No new spec requirement" (`code-plan.md:189`) — a signal that it is docs work, not code work.

**Why this is wrong for the code phase.** The repo enforces a clear split between phase 4 (code) and phase 5 (docs), and `README.md` falls squarely on the docs side:

- The **docs-phase reference** (`skills/radical-pipelines/reference/autonomous-phases/5 - docs.md:14`) names the docs-phase outputs as "Documentation updates (**READMEs**, guides, examples, configuration descriptions, **changelogs**, contributor docs, internal conventions, non-symbol inline narrative)." A README catalog mention is precisely this.
- The **code-phase reference** (`4 - code.md:13`) scopes phase 4 to "Code changes, unit tests, and end-to-end tests." For a documentation-as-implementation feature, the "code" is the skill-reference prose and the dogfood `.rp.md` — not the user-facing README narrative.
- **Git history confirms the convention in practice.** README edits in this repo are consistently `doc-writer` commits (e.g. "Rewrite README configuration section for merged conventions file (doc-writer)"), whereas `.rp.md` and skill-reference edits are `code-writer` commits (e.g. "Create merged rp conventions file … (code-writer)"). So Task 8's `.rp.md` edit is correctly placed in the code phase, but Task 9's README edit is not.
- **The closest analog pipeline proves the split explicitly.** Pipeline `68-recommend-standard-remote-names` is the nearest precedent — a pure-prose skill-convention feature touching one reference file. Its **code plan** fenced the scope to "Only `setup.md` may be modified" and explicitly excluded README/changeset. Its **doc plan** then owned `README.md` as Task D1 ("Verify and, if needed, update `README.md` …") and the changeset as Task D2 — both stated there as docs-phase, AGENTS.md-mandated surfaces. The current code plan inverts that split by pulling README into phase 4.

**Why it matters (not merely cosmetic).** Putting a README narrative edit in the code batch means the phase-4 `code-reviewer` reviews a documentation surface outside its mandate, and the phase-5 doc plan must then either (a) re-touch README and risk duplicating/contradicting the code-phase edit, or (b) skip it and assume the code phase handled it. Both outcomes manufacture the documentation-drift failure mode this plan's own Task 10 and design §12 (risks 2/4) exist to prevent. The README also depends on what actually shipped in the skill files (the canonical name, the per-tool catalog wording), so it is better written after phase 4 lands, against the real shipped text — exactly the rationale the #68 doc plan gives for sequencing README after the code change.

**Required fix.**
- Remove Task 9 from the code plan.
- Confine the code plan to the skill-reference edits (Tasks 1–7) plus the dogfood `.rp.md` edit (Task 8) and the Task 10 consistency pass (which should then drop README from its cross-file checklist, since README is no longer a code-phase surface).
- Note in the plan (e.g. an "Out of scope for the code phase / deferred to the doc plan" line) that the `README.md` `Agent models` catalog mention — and the mandatory changeset (see N1) — are docs-phase surfaces, owned by the doc plan / `doc-writer`, so the relaunched plan does not silently drop them but explicitly hands them off.

---

## Non-blocking observation (record, do not necessarily add a task)

### N1 — The mandatory changeset is (correctly) absent from the code plan; confirm it is a deliberate hand-off, not an oversight

This feature edits `skills/**` and `README.md`, both **release-relevant** paths per `.changeset/config.json` (`changedFilePatterns: ["skills/**", "agents/**", ".claude-plugin/**", "package.json", "README.md"]`). The CI **Changeset Gate** (`.github/workflows/changeset-gate.yml`, documented in `CONTRIBUTING.md`) fails any such PR that lacks a committed `.changeset/*.md`.

The code plan does not add a changeset — and that is **correct for the code phase**: the changeset is a docs-phase artifact here. Pipeline #68's changeset (`.changeset/recommend-standard-remote-names.md`) was committed by `doc-writer` ("Add changeset for standard remote names (doc-writer)") as doc-plan Task D2, and the docs-phase reference lists "changelogs" among its outputs. So the changeset belongs to the doc plan, not the code plan.

This is not an independent rejection reason; it is recorded so the relaunched code plan makes the hand-off **explicit** (per the fix in B1) rather than leaving an unstated gap. The risk to guard against is the opposite of over-scoping: if neither the code plan nor a clearly-scoped doc plan owns the changeset, the eventual PR fails the gate. Stating in the code plan that README + changeset are deferred to the doc plan closes that gap cleanly.

---

## What was verified and is correct (for the relaunch's benefit — do not re-litigate)

- **File/line accuracy — all correct.** `setup.md` Commit-format `:54` and Spawning-teams `:82` headings; `load.md` table `:11-20` and Missing-conventions `:22-28`; `autonomous-workflow.md` Important block `:56-62` (prompt-channel bullet at `:59-61`, commit bullet `:62`); `claude-code.md` fence `:9-42` with the "forced … canonical content" framing `:3-7`; `pi.md` fence `:7-41`, "Canonical `.rp.md` content for Pi" `:5`, recovery sentence `:30`; `health-monitoring.md` recovery table `:32-37` and escalation payload `:43-48`; dogfood `.rp.md` Pi recovery numbered list with step 1 at `:123`, step 4 at `:126`, step 5 at `:127`, provider-neutral closer at `:130`; README catalog at `:157`/`:167`. The plan's line-anchor reconciliation note (`code-plan.md:15`) correctly maps the design's approximate numbers to the real file.
- **Design premises — all hold.** `.rp.md` is table-free (`grep -c '^|' .rp.md` → 0); no YAML/TOML/JSON fenced config exists under `skills/.../reference/`; 17 agents, none named `default`; `grep -l '^model:' agents/*.md` → none. The reserved `Default` label cannot collide.
- **AC coverage — complete.** AC1–AC16 are each traced to at least one task with a verifiable acceptance check; the per-key resolution rule (model-only entry inherits `Default`'s `effort`) and the AC16 paired Pi recovery edit are carried consistently across Tasks 1/3/8 and Tasks 5/8 respectively, with Task 10 verifying both.
- **Task ordering — sound and acyclic.** Tasks 1–2 independent; 3 depends on 1/2; 4/5 on 1; 6 on 1/2; 7 on 6; 8 on 1/5; 10 on 1–9. (Task 9's removal does not break any other dependency — nothing depends on Task 9 except Task 10's now-removable README check.)
- **Design constraints — preserved.** Table-free bold-label shape, optional `load.md` row with the Missing-conventions branch left untouched, spawn-channel (not prompt) application, verbatim pass-through with no pre-validation, forbidden frontmatter `model:` channel, paired Pi recovery disambiguation in both `pi.md` and `.rp.md`, and the Task 10 reconciliation pass are all correctly represented.

---

## Verdict

**Rejected.** Resolve B1 (remove the README edit from the code phase and explicitly hand README + changeset to the doc plan) and the plan should be approvable; everything else verified clean.
