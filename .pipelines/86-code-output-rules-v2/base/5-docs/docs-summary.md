# Docs Summary: Default output rules for pipeline-produced code

## What

Three host-project documentation surfaces were brought in sync with the shipped output rules:

- **`.changeset/default-output-rules.md`** — a new changeset declaring `@automattic/radical-pipelines` at a `minor` bump, with a one-paragraph consumer-facing release note for the feature.
- **`README.md`** — a new "Output that reads as your own" bullet in the "What this unlocks" value-proposition list.
- **`website/demo.js`** — the one depicted product commit in the animated demo had its agent-name provenance tag removed (`"Add orchestrator (code-writer-tdd)"` → `"Add orchestrator"`).

No other documentation surface changed. The five `agents/*.md` profile edits in this run are the feature's code (phase 4), not docs.

## Why

The feature promotes two always-on output rules into the tool: Rule 1 (a change leaves untouched comments and prose exactly as they were) and Rule 2 (the shipped product — code, tests, documentation, and commit messages — reads as if written by hand, with no trace of the pipeline). The repository's own documentation had to reflect that: the changeset is mandatory because the change touches the release-relevant `agents/**` path and feeds the changelog and the next release; the README advertises the qualities every run guarantees, so the new always-on guarantee belongs in its value proposition; and the marketing demo previously depicted a product commit carrying the exact agent-name tag the feature now removes, which would have advertised a behavior the tool no longer produces.

## How

A repository-wide sweep in the docs plan found no existing prose describing the output rules, so the changeset and README additions are net-new; the website demo's depicted product commit was the single out-of-sync illustration. The changeset body and README bullet were written at release-note / overview altitude — conveying both rules, the no-opt-out / no-owner-action guarantee, and review-gate enforcement — without restating the canonical profile wording, reproducing its negative examples, or naming individual agent profiles. The website edit applied the changed-path test (the depicted commit writes `src/orchestrator.ts` and `src/orchestrator.test.ts`, both outside the artifacts folder, so it is a product commit) and removed only the provenance tag, leaving every artifact-only depiction and all unrelated demo content untouched. The three docs commits are themselves product commits and were authored untagged, dogfooding the same rule.

## Key decisions

- The changeset bump is `minor` with no `BREAKING:` prefix — the project's pre-1.0 policy maps a non-breaking feature to `minor`.
- Surfaces deliberately left untouched and confirmed unchanged: the `.rp.md` "Commit format" convention (the configuration input the rule preserves rather than alters), `website/index.html`'s artifact-only `git log` (those commits legitimately keep the tag), `CHANGELOG.md` (generated from the changeset), and `SKILL.md` / `AGENTS.md` / `CONTRIBUTING.md` / the PR template (no output-rule prose to repair).

## Known limitations

- The README and changeset describe the guarantee at overview altitude; the authoritative, full statement of the rules lives in the agent profiles (the feature's code), by design — external docs deliberately do not reproduce it.
