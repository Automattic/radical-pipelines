# Code Plan Review

## Verdict: approved

## Summary

The code plan is complete, correctly ordered, and faithful to both the spec and the design doc. I verified every spec requirement (1–24) and every entry in the spec's Acceptance Criteria list against the seven tasks: each maps to at least one task with no silent drops. I also checked each file target against the real codebase — `setup.md` lines 114 / 197 / 201 / 188–193, the `load.md` `## Conventions` table and `## Missing conventions` gate, the README Configuration paragraph at line 157, the dogfood `.rp.md` Issues/Agent-models prose, the root `.gitignore` contents, the changeset `config.json` `changedFilePatterns`, the `per-agent-model-config.md` precedent, and the `package.json` package name — and all of them are accurate. The two design-doc scope guards are honored explicitly and called out where they apply (no worktree-folder `.gitignore` retrofit; no forced `**Access:**` refactor of the dogfood `.rp.md`). Ordering is sound: `local-overrides.md` is authored first because every other touchpoint cross-references it, and the changeset is written last so its summary is accurate. The changeset task is correctly justified (repo standing rule plus `changedFilePatterns` covering `skills/**` and `README.md`, both edited here) and correctly typed `minor` (new optional capability, no breaking change), matching the directly comparable precedent. Acceptance criteria are content/behavior assertions plus runnable `git check-ignore` checks — appropriate for a "documentation-as-code" feature with no parser or test runner. The single nit I found (requirement 4 is not named in any task's Traces-to) is non-substantive because its content and a matching acceptance criterion already live in Task 1, so it does not warrant rejection.

## Notes (non-blocking)

These are recorded for awareness only; none changes the verdict.

- **Req 4 traceability label.** Backward-compatibility requirement 4 ("no `.rp.local.md` → behaves exactly as before, no warning") is not named in any task's **Traces to** list, although its content is fully covered by Task 1 §4 (fail-soft) and §8 (absent file → emit nothing), and Task 1's acceptance includes "It states the absent-file behavior emits nothing." The implementation is unaffected; the omission is only in the trace annotation. The code-writer may optionally add `4` to Task 1's trace list for completeness.

- **Breadcrumb target wording.** Spec req 20 describes the optional `.rp.md` breadcrumb as "pointing to `.rp.local.md`," while the design doc (line 167) and Task 3 describe it as "pointing at `local-overrides.md`." These are reconcilable — a one-line breadcrumb can name the `.rp.local.md` capability and link `local-overrides.md` for the procedure — and the plan faithfully executes the design doc's resolved framing. Task 3's text already says the breadcrumb advertises the capability, so the `.rp.local.md` name should appear in the rendered line. No change required.

- **Cited line numbers will shift.** Task 3 references concrete `setup.md` line numbers (114, 197, 201, 188–193) that move as edits land. They are prefixed `~` and paired with quoted anchor strings ("This is the only entry Radical Pipelines requires.", the worktree-folder explainer bullet, the fork-reminder sentence), so the edits remain unambiguous. No action needed.

## Why this is approved rather than iterated

Rejection is reserved for real defects — missing coverage, untraceable or infeasible tasks, wrong ordering, hidden design decisions, scope violations, or untestable acceptance criteria. None are present:

- **Coverage:** all 24 requirements and all Acceptance-Criteria bullets map to tasks.
- **Traceability:** every task cites specific spec requirements and/or design decisions (the lone req-4 label gap is covered by content and acceptance in Task 1).
- **Ordering/feasibility:** dependencies form a valid order (Task 1 → 2/3/4/5 → 6 → 7), and every file target exists and behaves as the task assumes.
- **No hidden design:** the plan introduces no new design; fixed strings (filename, main-root recipe, reason substrings, summary-block shape) are pinned in the shared Reference section so two code-writers would produce the same edits.
- **Scope:** both dogfood scope guards are honored explicitly; no out-of-scope functionality, no `.rp.md` refactor, no worktree-folder `.gitignore` line.
- **No test/doc planning violations:** acceptance criteria assert observable file content and behavior (and runnable `git check-ignore`), not specific tests; the only documentation-adjacent tasks (README touchpoint, changeset) are functional discoverability/release-engineering deliverables mandated by req 20 and the repo's changeset rule, not doc-plan polish, and Task 5 correctly cedes further README refinement to the doc plan.
