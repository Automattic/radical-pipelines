# Doc Plan Review

## Verdict: approved

## Summary

The doc plan is complete, drift-resistant, traceable, and feasible. An independent end-to-end sweep of the repository (README.md, all CONTRIBUTING.md sections, `.changeset/README.md`, `scripts/sync-version.mjs` docstring + inline comments, CHANGELOG.md, `website/**`, AGENTS.md, `.rp.md`, the skill files, the workflow YAML, and a repo-wide grep for `release:version` / `version-bearing` / `single source of truth` / `sync-version`) found exactly the surfaces the plan tasks, no more and no fewer. Every live prose surface that would drift after the feature ships (README "Changelog and versioning", and the CONTRIBUTING versioning policy, release process, manual escape hatch, changeset gate, and local-test descriptions) is covered by a task; every surface the plan deliberately omits is genuinely non-drifting and its reasoning holds. The four tasks each name a concrete audience, point at a real file and an existing section, trace to specific spec requirements / acceptance criteria / code tasks, and carry observable, drift-resistant acceptance criteria framed as reader outcomes. No task plans or alters code. The `## Guardrail scopes` section is the valid `None | None` rendering: `.rp.md` defines no Guardrails convention, and both the design and code plan confirm no guardrail gates exist or were passed, so there is no command to fill or run.

## Verification notes

The two v2-specific omissions called out for scrutiny are both confirmed correct, not gaps:

- **`scripts/sync-version.mjs` carries no task.** Code-plan Task 3 explicitly forbids touching the file or adding the lockfile to `TARGET_MANIFESTS` ("`scripts/sync-version.mjs` is unchanged and `TARGET_MANIFESTS` still lists only `.claude-plugin/plugin.json`"). The lockfile sync is the appended `npm install --package-lock-only` sibling step, not a structured-JSON manifest target. The docstring's "secondary manifest" wording (lines 6, 75) describes only the JSON-edit syncer, which the lockfile never joins, so it stays accurate. Omitting it is correct.
- **The feature's own changeset carries no task.** It is code-plan Task 6 (a code artifact under `.changeset/`), correctly absent from the doc plan; not a doc gap.

Additional surfaces inspected and confirmed non-drifting (so correctly untasked):

- **CONTRIBUTING.md "When a changeset is required" / meta-files block (lines 61–86).** It describes the `changedFilePatterns` in `.changeset/config.json`, which the feature does not modify. `package-lock.json` remains a meta file requiring no changeset, and the example "a `package-lock.json`-only change (e.g. a dependency lockfile resync) does not require a changeset" stays accurate. No drift.
- **`.changeset/README.md`.** Delegates to README/CONTRIBUTING and never names plugin.json or the lockfile; its links stay valid. No drift.
- **AGENTS.md, `website/**`, CHANGELOG.md.** A targeted grep found zero version-sync / release-flow prose in AGENTS.md and `website/**` (only SVG/XML `version=` attributes). CHANGELOG.md references are historical generated entries, correctly excluded.

Cross-checks that passed: README has no changeset-gate, test-suite, or drift prose (those live only in CONTRIBUTING), so Task 3 and Task 4 correctly target CONTRIBUTING alone; the gate currently states "two independent checks" (CONTRIBUTING line 47), and Task 3's acceptance explicitly requires the post-feature check count/framing to match the shipped workflow; Task 1 (README "Cutting a version") and Task 2 (CONTRIBUTING "Release process") describe the same `release:version` behavior consistently with no contradiction; all referenced section headings ("The single source of truth", "Cutting a version", "Versioning policy", "Release process", "Manual release escape hatch", "The changeset gate (CI)", "Running tests and checks locally") exist in the host files.
