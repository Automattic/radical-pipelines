# Docs Plan Review

## Verdict: approved

## Summary

The revised docs plan resolves both factual inaccuracies raised in the iteration-1 rejection, and an independent re-sweep confirms nothing else regressed. The two surfaces the plan documents — the README "Configuration" spawn-payload sentence and the required release changeset — remain the only prose surfaces outside the three canonical code-phase files (`passing.md`, `claude-code.md`, `pi.md`) that the change would otherwise leave stale. The task set is complete, both tasks are correctly scoped, traceable, and drift-resistant, and the "Surfaces deliberately not given a task" list is accurate and auditable. `## Guardrail scopes` = None is correct (the project defines no guardrails, and there is no `Guardrail scopes to fill:` gate to bind), no code tasks leaked into the docs plan, and the plan stays within the spec and design.

## Resolution of prior issues

- **Issue 1 (Task 1 positional cue).** Resolved. Task 1's "Files to change" now anchors the target on the verbatim opening of the sentence and explicitly states "the verbatim opening locates it uniquely, so use that as the anchor rather than a paragraph position." The inaccurate "second-to-last paragraph" descriptor is gone. Verified against the repo: the target sentence ("The orchestrator loads and verifies conventions before launching phase agents. When it spawns a phase agent or team, it passes …") is at `README.md:155`, and the quoted anchor locates it uniquely.

- **Issue 2 (Task 2 traceability).** Resolved. Task 2's "Traces to" no longer attributes the changeset rule to `AGENTS.md`. It now traces to "the repository's changeset rule in `CONTRIBUTING.md` (`### When a changeset is required`, which lists `skills/**`), mirrored by `.changeset/config.json` (`changedFilePatterns`)." Verified against the repo: `AGENTS.md` contains no changeset rule (`grep -ni changeset AGENTS.md` returns nothing; its only headings are `# Radical Pipelines` and `## Rules when modifying the skill`); `CONTRIBUTING.md:76` carries `### When a changeset is required` listing `skills/**`; and `.changeset/config.json` line 12 lists `skills/**` under `changedFilePatterns`. The traceability pointers now resolve to real content.

## Independent re-sweep

I re-swept the repository to confirm the task set is still complete and the exclusion list still accurate:

- The current `## Conventions` block in `passing.md` carries exactly four labeled fields (Artifact folder, Commit format, Guardrails, Guardrail scopes to fill) — matching the design — so the code phase's two new fields are the only additions, and `README.md:155` is the one prose surface that enumerates the spawn payload and would drift.
- A grep for `worktree root` / `main checkout` / spawn-payload phrasing across the repo (excluding the three code-phase files) surfaced only `README.md`, `pr-description.md`, and `CHANGELOG.md`. `pr-description.md` references the spawn-time conventions file by name without enumerating its fields; `CHANGELOG.md` is generated historical content; both are correctly outside scope. The agent-profile worktree/artifact-folder/commit-format hits are spawn-prompt consumption references (e.g. "use the host project's commit format"), not restatements of the `## Conventions` fields or the worktree/branch model — consistent with the plan's "Agent profiles" exclusion.
- The `website/` worktree mentions are abstract tool-primitive references, as the plan records.

## Notes (not blocking)

- Bump type: the plan correctly defers the determination to `CONTRIBUTING.md`'s bump table and pre-1.0 policy against what actually landed (a backwards-compatible behavioral addition to skill prose), with a `BREAKING:` prefix only if the landed change is actually breaking. This deferral is the right drift-resistant choice.
- Task 1's acceptance criterion permitting the writer to confirm the existing "role-specific host-project conventions" wording already conveys the new items and leave it unchanged is well-judged and drift-resistant.
