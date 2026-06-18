# Doc Plan Review 1 — Rejected

## Verdict

**Rejected.** The plan's *conclusion* — review-3 needs no external documentation edit, and the changeset gate is already satisfied — is correct and I verified it surface by surface. But the single verification task rests on a **closed-world claim that is factually false**, and a doc-writer executing the task as written will find its acceptance criterion unsatisfiable. The plan missed a tracked guardrail-behavior surface (`pr-description.md`) that sits squarely in the search space it defines and that describes exactly the concepts review-3 touches (the internal `guardrails.md`/`passing.md` split and resolve). Because this plan's entire value is the accuracy of that sweep, the gap is disqualifying as written even though the bottom-line "no edit needed" holds.

## What I verified (and what holds)

The behavior-neutral framing checks out, and every excluded surface the plan *did* name is accurate-as-is:

- **Review-3 has touched no external surface.** `git log 42810e9..HEAD` (review-3 begins at `42810e9 Add review-3 intent`) touches only `.pipelines/` artifacts. The README/website/changeset changes visible in `git diff trunk...HEAD` are all pre-review-3 (base/review-2 `doc-writer`/`code-writer` commits for the `code-writer` → `code-writer-tdd`/`code-writer-e2e` split and the fixed/scoped change). No skill/agent edit has leaked into the doc plan — Task 1 is correctly verification-only (`Files to change: none`).
- **`docs-plan.md` typo is contained.** The lone tree-wide occurrence is `skills/radical-pipelines/reference/guardrails.md:32` (code-plan Task 1's domain). Zero occurrences in any external surface (`README`, `CHANGELOG`, `CONTRIBUTING`, `website/`, `.changeset/`, `pr-description.md`).
- **`README.md` (line 147)** describes the Guardrails convention generically ("deterministic verification gates (exact commands judged pass/fail by exit code)") and defers authoring detail to the convention loader / setup. No internal split, no `{scope}`, no resolve. Accurate-as-is.
- **`website/`** has zero guardrail/scope/resolve content. The two on-branch edits (writer-split roster, agent count 15→18) are pre-review-3 and orthogonal.
- **`CHANGELOG.md`, `CONTRIBUTING.md`, `.changeset/README.md`** are byte-for-byte unchanged vs trunk. CHANGELOG's guardrail entry (PR #118) describes shipped released behavior generically; no internal doc architecture.
- **Changeset gate satisfied.** Config `changedFilePatterns` includes `skills/**`, so review-3's `guardrails.md`/`passing.md` edits ARE release-relevant and a changeset IS required. Two well-formed on-branch changesets (`plan-driven-test-selection.md`, `agent-scoped-guardrails.md`), both `@automattic/radical-pipelines: minor`, non-empty bodies, version `0.3.0` (pre-1.0 `major` policy moot). I ran `node scripts/validate-changesets.mjs` → exit 0 (the gate's shape half). `npx changeset status --since=origin/trunk` (the "require a changeset" half) will exit 0 because both declare a pending minor release for the changed package. No new or empty changeset needed; the existing one correctly must not gain an "internal docs reworded" line.

## Why I am rejecting

### 1. The sweep is incomplete: `pr-description.md` is an un-enumerated guardrail-behavior surface (blocking)

`pr-description.md` is a **tracked** file at the repo root (added on-branch, +31 lines vs trunk, unchanged by review-3). It is inside the exact search space Task 1 defines ("outside `.pipelines/`, `skills/`, `agents/`, and `AGENTS.md`"), and it describes the guardrail concepts review-3 modifies in *more* detail than `README.md` does. From its line 10:

> "…the plan records the chosen value in `## Guardrail scopes`, which the orchestrator substitutes into the agent's `Guardrails:` line before spawn. … The model is centralized in `reference/guardrails.md`, with the spawn-time conventions in `reference/conventions/passing.md`."

That sentence names (a) the internal `guardrails.md` = model / `passing.md` = spawn-conventions split this run re-baselines, and (b) resolve ("the orchestrator substitutes … into the `Guardrails:` line before spawn") — the very behavior review-3's `passing.md` edit makes explicit.

The plan's Task 1 **Acceptance** criterion 1 asserts the opposite as a closed-world fact:

> "A search of the repo outside `.pipelines/`, `skills/`, `agents/`, and `AGENTS.md` finds **the only** guardrail-behavior surfaces to be `.changeset/plan-driven-test-selection.md` and `README.md` (~line 147)…"

A `grep -rIl 'guardrail\|{scope}'` over that space returns `CHANGELOG.md`, `README.md`, `.changeset/plan-driven-test-selection.md`, `.changeset/agent-scoped-guardrails.md`, **and `pr-description.md`** — five, not the two the criterion claims. So the criterion is false as written, and a doc-writer running the verification literally either hits a failing acceptance check or must silently expand scope to assess `pr-description.md` — which the plan's "do not expand scope speculatively" instruction tells them not to do. A verification plan whose acceptance criterion contradicts what the sweep actually finds cannot ship; the accuracy of that closed-world claim is the task's entire deliverable.

### 2. `CHANGELOG.md` is also a guardrail-behavior surface omitted from the same "only two" claim (sub-point of #1)

CHANGELOG's #118 entry is a substantive guardrail-behavior description. The plan elsewhere (Overview line 11, the excluded-surfaces list) correctly handles CHANGELOG as a generated-not-hand-edited surface — so it is *considered* — but Task 1's AC 1 "the only … two surfaces" wording still excludes it incorrectly. Folding CHANGELOG into the AC's enumeration (as already-accurate, generated) removes the contradiction.

### 3. Minor: AC 2's diff-scope wording overstates what `git diff trunk...HEAD` shows

Task 1 **Acceptance** criterion 2 says that diff "shows … **only** the pre-existing branch addition of `plan-driven-test-selection.md`." The actual `git diff trunk...HEAD -- .changeset/ README.md CHANGELOG.md website/ CONTRIBUTING.md` also shows the pre-existing README and `website/` writer-split edits. The load-bearing half ("no *review-3* edit to any of these surfaces") is true and verified; the "only the changeset appears" clause is literally inaccurate. Re-scope the criterion to "no review-3 commit (range `<intent>..HEAD`) touches these surfaces; the only branch changes are pre-review-3" so an executor's diff matches the claim. (Not blocking on its own, but fix it alongside #1–#2.)

## What a passing revision needs

The conclusion stands, so the fix is enumerate-and-clear, not a new edit:

1. **Add `pr-description.md` to the surfaces considered**, and verify-and-clear it as accurate-as-is: it describes resolve and the `guardrails.md`/`passing.md` split, both of which review-3 leaves true (resolve is behavior-neutral / already-described; the split is the shipped baseline this run keeps). Note it needs no edit and explain why, rather than asserting it doesn't exist.
2. **Fix Task 1 AC 1** so it no longer claims "the only … two surfaces." Either enumerate all guardrail-behavior surfaces the sweep returns (`README.md`, `CHANGELOG.md`, `.changeset/*.md`, `pr-description.md`) and clear each as accurate-as-is, or drop the closed-world "only" phrasing for an open "each surface the sweep returns is already accurate" check.
3. **Fix Task 1 AC 2** per #3 above so the asserted diff matches what `git diff trunk...HEAD` actually shows.

Everything else — the behavior-neutral premise, the README/website/CHANGELOG/CONTRIBUTING accuracy, the changeset-gate satisfaction, the no-edit conclusion — is sound and verified; do not reopen it.
