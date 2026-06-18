# Design Doc Review

## Verdict: approved

## Summary

The design doc faithfully re-baselines the pipeline's design onto the skill **as shipped** and supersedes review-2's out-of-sync statements without touching review-2's files. I verified every shipped-state claim against the actual worktree, the five "Supersedes review-2" quotes verbatim against review-2's committed artifacts, both planned edits for behavior-neutrality, and the scope boundary. All checks pass. The doc covers every spec requirement and acceptance criterion, is internally consistent, and stays in scope.

## What I verified against the worktree

**Shipped-state claims — all true:**

- `guardrails.md` (33 lines) carries exactly the model: gate kinds, the per-gate `.rp.md` block, the fill lifecycle. No validation, resolve/`{scope}`-substitution, or spawn-field content. It is a sink (references no skill file back — only `.rp.md`, `code-plan.md`, `docs-plan.md`). Matches design lines 59-65, 91-96.
- `passing.md` (18 lines) owns both spawn fields (`Guardrails:`, `Guardrail scopes to fill:`) with applicability/omit rules and defers to `guardrails.md` twice (`See reference/guardrails.md`). The `Guardrails:` line today is a passive field-content *description* ("that command is the resolved command after `{scope}` substitution"), not an active instruction — the resolve gap is real. Matches design lines 67-76 and the Resolve decision.
- `setup.md:179` carries the fixed/scoped capture-time probe with the "did the command execute?" bar; the side-effects rule is at line 190. Matches design lines 78-85.
- The plan-reviewers (`agents/code-plan-reviewer.md:17-19`, `agents/doc-plan-reviewer.md:18-20`) carry the identical "Validate the `## Guardrail scopes`" substitute-and-execute check plus the coverage/bind checks; the assisted `3 - plan.md` self-checks (lines 118, 211) mirror it. Matches design line 83.
- `AGENTS.md:14` states the self-containment rule verbatim. A grep over `agents/` for `reference/`, `.rp.md`, `SKILL.md`, `guardrails.md`, `passing.md`, `skills/`, `setup.md`, `load.md` returns **zero** across all profiles. Running-agent profiles run "the guardrails convention" they received — never "the `Guardrails:` field" or a skill file (`code-writer-tdd.md:37`, `doc-writer.md:40`, `code-reviewer.md:42`, `code-writer-e2e.md:28`, `doc-reviewer.md:44`). Matches design lines 87-89.
- `autonomous-workflow.md:63` is verbatim the conventions-block hook the design relies on for single-home resolve inheritance. Phases 4/5 carry **no** substitution/resolve/guardrail line (gap confirmed). Matches design line 96.

**"Supersedes review-2" — all five quotes accurate, corrections truthful, via decisions not edits:**

- Quote 1 (review-2 `spec.md:9`), Quote 2 (`spec.md:37`), Quote 3 (`design-doc.md:18`), Quote 4 (`design-doc.md:63`, cited as `:61-66`), Quote 5 (`design-doc.md:57`) — each is an **exact** match against the review-2 committed source. Each correction reflects the shipped split truthfully.
- The mechanism honors "supersede via decisions, not edits": `git log` shows review-2's `spec.md`/`design-doc.md` were last touched only by the original review-2 authoring commits; no review-3 commit touches any review-2 file, and the working tree is clean for that subtree.

**Fill lifecycle described as shipped, not the four-arrow chain:** design lines 37-41 describe the model's fill lifecycle as who-fills / per-phase-spanning / plan-records-value (matching `guardrails.md:26-32`) and explicitly replace review-2's "setup → plan → resolve → run." The separate "end-to-end lifecycle across all four homes" (lines 43-53) is correctly framed as the *full path*, distinct from the model's lifecycle — it does not reintroduce the four-arrow chain as the model's concern.

**Both planned edits sound and behavior-neutral:**

- `docs-plan.md → doc-plan.md` typo: exactly one occurrence in the skill tree (`guardrails.md:32`); `doc-plan.md` (singular) is the established convention everywhere else. A one-word fix, behavior-neutral.
- `passing.md` `Guardrails:` active-resolve upgrade: since running agents receive no template and no scope value, the substitution must already happen orchestrator-side before spawn today; the edit only writes that existing duty down as an imperative. Implicit → explicit, guarded to scoped gates. Behavior-neutral, and the argument holds against the shipped state.

**No scope creep:** the Out of Scope section preserves behavior-unchanged, owner edits not reverted, the fixed/scoped model not reopened, the `load.md` gloss not flagged, the `CLAUDE.md`/`AGENTS.md` divergence out of scope, and no structural tests over prose. The two edits are confined to the typo and the resolve upgrade.

## Coverage

Every spec requirement (1-8) and acceptance criterion (1-8) is addressed by a corresponding design section, architecture invariant, or Key Decision, and each is checkable against the shipped files. The single reading-path invariant is correctly stated as "`guardrails.md` is a sink," not "only `passing.md` may reference it" — matching the research's subtlety and `setup.md`'s legitimate inbound defer.
