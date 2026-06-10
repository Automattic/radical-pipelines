# Doc plan review — Add a What/Why/How pull request template

## Verdict

**Approved.**

The doc plan correctly identifies `CONTRIBUTING.md` as the only documentation
surface that warrants a (still optional) edit, and its declaration of "1 optional
task, skip the rest" holds against an independent end-to-end sweep of the
repository's documentation surfaces. No surface is missed that the shipped change
(`.github/PULL_REQUEST_TEMPLATE.md`, code-plan Task 1) would leave factually out
of sync. Task 1 traces to the spec and the code task, its acceptance is
drift-resistant (outcome/coverage-based, not exact wording), it invents no docs
for out-of-scope features, and it locks in no implementation details (placement is
deferred to phase 5; restating the template body is explicitly forbidden). The
"valid skip" clause is sound and bars a silent close.

## Summary

The change ships exactly one file. The information flow is template →
`CONTRIBUTING.md` (the changeset footer links out to it), not the reverse, so the
template is largely self-documenting and the doc surface area is genuinely small.

Completeness is the dominant risk for a doc plan, so I independently swept every
documentation surface (outside the `.pipelines/` artifacts) that references the
PR / contribution process or that a contributor would consult before opening a PR,
and confirmed each disposition:

- **`CONTRIBUTING.md`** — release/changeset mechanics only; it is the changeset
  footer's link target. It contains no "how to open a PR / what goes in the
  description" narrative and makes no claim the template would contradict. This is
  the single (optional) doc task. Correctly identified.
- **`README.md`** — its "Changelog and versioning → Adding a changeset" section
  already delegates changeset detail to `CONTRIBUTING.md`; it carries no
  PR-authoring narrative and no statement (e.g. "the description box opens empty")
  that the template would falsify. Skipping it is correct.
- **`AGENTS.md`** — 11 lines, only "Rules when modifying the skill"; no
  PR-authoring guidance. Skipping it is correct (see Issue 1 for a wording
  nit about how the plan characterizes this file).
- **`.changeset/README.md`** — changesets cheat-sheet; cross-links README and
  CONTRIBUTING for changeset/release flow only; no PR-template surface. Correct.
- **`skills/radical-pipelines/reference/conventions/setup.md`** — its "PR"
  references (lines 128–155) describe the pipeline's own *downstream* upstream-PR
  transformation for fork-mode projects, which the spec puts out of scope (AC10:
  the deliverable is this repo's own template, not a downstream/generated one).
  Verified in context. Correct.
- **`website/index.html`** — "PR" appears only as marketing prose ("Everyone else
  sees the PR at the end" / "Visible before the PR"); not contributor-process
  documentation. Correct.
- **`.rp.md`** — carries the project's commit format and push-at-close-out
  behavior but no PR-description/template guidance. Skipping it is correct (see
  Issue 2: the plan's "end-to-end" sweep did not enumerate this file).

No live doc asserts "no PR template exists" or "the description box opens empty"
(those phrasings appear only inside the `.pipelines/` artifacts), so shipping the
template leaves nothing stale. No surface is missed.

Task 1 is genuinely optional — the spec adds no documentation requirement, and
AC9/AC10 confine the shipped change to `.github/**` — and the plan is candid about
this. Including a discoverability pointer in `CONTRIBUTING.md` (the footer's
link target) is reasonable and reciprocal, and the explicit, recorded no-edit path
prevents the task from being a fabricated obligation or a silent close. Acceptance
criteria are stated as outcomes ("a contributor can learn…", "references the
template by its real role/location", "introduces no second copy of the changeset
rules"), not as exact strings, so they survive reasonable wording drift in phase 5.

## Issues

Neither issue below is rejection-worthy; both are recorded for the doc-writer's
phase-5 awareness.

1. **(Minor, non-blocking) Inaccurate characterization of `AGENTS.md` in the
   sweep.** The plan describes `AGENTS.md` as holding "the standing changeset /
   README-update rule." The live `AGENTS.md` (11 lines) contains only "Rules when
   modifying the skill" — no changeset rule and no README-update rule. The
   `README.md` (line 165) claims that rule "lives in `AGENTS.md`," but the rule is
   not actually present there; this is a **pre-existing** repo inconsistency
   already flagged as out-of-scope by an earlier pipeline
   (`.pipelines/90-per-agent-model-config/3-plan/doc-plan-review-approved.md`),
   not something this change introduces or relies on. The mischaracterization does
   not alter Task 1's disposition — `AGENTS.md` still has no PR-authoring guidance,
   so "no change needed" remains correct — and it is not a missed surface. No fix
   required for this plan.

2. **(Trivial, non-blocking) The sweep narrative omits `.rp.md`.** The plan claims
   an end-to-end sweep but does not enumerate `.rp.md` among the surfaces checked.
   `.rp.md` carries the commit format and push behavior but no PR-description or
   PR-template guidance, so "no change needed" is the correct disposition; it is
   simply absent from the plan's listed surfaces. No coverage gap results.
