# Docs Summary

## What

One changeset, `.changeset/host-output-no-run-references.md`, recording the new always-on rule that host-project output carries no reference to the run that produced it. It declares a `minor` bump for `@automattic/radical-pipelines` and a one-line release-note summary of the user-facing behavior. No other documentation surface was changed — a sweep confirmed none reproduces the affected profiles' internal guidelines, so none went stale.

## Why

The change adds enforced behavior to shipped, release-relevant files (`agents/**`), which the repository requires to be recorded in a changeset so CI's Changeset Gate passes and the change surfaces in the next release's changelog and GitHub Release. The changeset is the single external documentation surface this behavior warrants.

## How

The changeset was authored in the repository's canonical form: front matter naming the package and a `minor` bump — the correct type under the pre-1.0 policy for a backwards-compatible behavior addition — followed by a non-empty imperative summary. The summary is written for a release-notes reader: it states that every run now, by default, produces hand-written-style output free of pointers to the run (task numbers, requirement/criterion IDs, artifacts cited as source, or an agent credited as author), that the rule is always on, and that the reviewer enforces it at the existing review gate as a must-fix. The summary is itself clean output obeying the rule it ships — its domain vocabulary is subject matter, not a pointer at this run.

## Key decisions

- **A changeset was the only surface produced.** A repository-wide sweep (`README.md`, `website/`, `CONTRIBUTING.md`, `AGENTS.md`, `skills/`) found nothing that reproduces the profiles' internal Guidelines dispositions or review checklists, so the five-profile change left no external doc stale and no other task was warranted.
- **`minor`, not empty.** The change adds enforced behavior to shipped profiles, so it warrants a real bump reflecting a backwards-compatible addition rather than an empty/no-op changeset; pre-1.0 policy maps a feature to `minor`, and it is not breaking, so no `BREAKING:` prefix.

## Known limitations

- **Human-judgment enforcement only.** The rule the changeset records is enforced by reviewer judgment at the existing gate, with no deterministic scanner (the spec forbids one); a leaked reference a reviewer misses can still ship. This limitation belongs to the shipped rule, not the changeset.
