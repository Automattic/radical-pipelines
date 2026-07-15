# The Intent Format

This describes an intent — whether a tracker issue body, a base intent, or a revision intent. The intent is the input to phase 1.

## Schema and rendering

Render these sections and **omit any that are empty** — no `N/A` placeholders:

- **Title** — concise.
- **Goal** — always present. The desired outcome, stated as an _outcome_, not a solution. ("Users can export their data as JSON" — not "add a `format` param to `ExportController`.")
- **Constraints** _(optional)_ — binding must/must-not the owner owns, including hard boundaries (e.g. "must not break existing CSV consumers", "don't touch billing"). The comprehensive out-of-scope list is phase 1's job, not this.
- **Context** _(optional)_ — links, prior decisions, motivation only the owner holds.
- **Assumptions / directions to explore** _(optional)_ — the owner's hypotheses or proposed direction, **labeled open** so later research may confirm or overturn them.

A vague idea yields just a Title and a Goal. That is a complete, valid intent.

## Authoring discipline

- **Capture, don't converge.** This is a short, owner-led capture pass — not the spec phase. Do NOT probe toward a complete or testable requirements set; that is the `spec-lead`'s job in phase 1. Record what the owner already holds and stop when they have nothing more.
- **Lead with the goal, then invite — don't run a checklist.** Marching through "constraints? assumptions? context?" pressures the owner into manufacturing answers and re-introduces over-specification.
- **No requirements, design, or implementation.** Acceptance criteria belong to phase 1, architecture to phase 2, task breakdown to phase 3. Putting them in **the intent** pre-empts the phase that exists to produce them.
- **Reflect hypotheses back as open.** Anything the owner proposes about _how_ or about the current state is recorded under Assumptions, not as a requirement.

## Provenance header (intents created from an issue)

A base intent created from an issue carries a two-line blockquote placed **after the H1 title and before the first H2**:

```
> Source: <issue reference and link, per the Issues convention>.
> This file is self-contained; agents do not need to open the source issue.
```

Revision intents carry their mandatory **Origin** section as their provenance instead.
