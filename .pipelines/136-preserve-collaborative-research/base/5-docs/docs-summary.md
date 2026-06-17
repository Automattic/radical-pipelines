# Docs Summary: Preserve collaborative research across the assisted phases

## What

The Docs phase added one release changeset,
`.changeset/preserve-collaborative-research.md`, recording the run's user-visible
behavior change:

> Preserve the collaborative research from assisted phases — the owner's questions,
> the explanatory exchanges, and the candidate solutions and trade-offs explored
> together are now reliably recorded within each assisted phase and carried forward
> to the next assisted phase.

It bumps `"@automattic/radical-pipelines"` at `minor`.

## Why

The change touches `skills/**`, a release-relevant path, so the CI Changeset Gate
hard-fails any PR lacking a changeset. The changeset both satisfies the gate and
records a consumer-facing, one-line summary of the new behavior in the changelog and
the eventual GitHub Release. A worktree-wide sweep for documentation surfaces
describing the changed behavior found this to be the only surface requiring action;
every other surface (`README.md`, `AGENTS.md`, `CONTRIBUTING.md`,
`.changeset/README.md`, `CHANGELOG.md`, `website/`, `.rp.md`, the autonomous
references) was checked and is genuinely unaffected.

## How

A single new `.changeset/*.md` file with valid front matter naming the package at
`minor`. The bump follows the `CONTRIBUTING.md` bump table (a feature /
backwards-compatible addition) and the pre-1.0 policy; no `BREAKING:` prefix, as the
change is not breaking. The body is one imperative-mood sentence about the
user-visible outcome, matching the tone and length of the existing `.changeset/`
bodies. It deliberately omits internal skill mechanics (the shared
`collaborative-research.md` file, the `## Topics` section, the recording trigger, the
carry-across input) so it stays drift-resistant and speaks to consumers about the
effect, not to maintainers about the implementation.

## Key decisions

- **`minor`, not `patch`.** This is a backwards-compatible behavioral feature of the
  skill (new recording and carry-across behavior), not a bug fix — `minor` per the
  bump table.
- **Outcome over mechanics.** The body names the preserved material (the owner's
  questions, the explanatory exchanges, the candidate solutions and trade-offs) and
  the effect (reliably recorded within a phase, carried to the next assisted phase),
  without describing how the skill achieves it. This keeps the changeset accurate
  even as the internal structure evolves.
- **One surface only.** `CHANGELOG.md` is generated from changesets and never
  hand-edited; `README.md` and the other release-relevant docs say nothing the change
  falsifies, so no further documentation tasks were created.

## Known limitations

- The changeset describes only the assisted-mode behavior the run shipped. The
  autonomous (agent-driven) recording instructions were intentionally left untouched
  and are out of scope; the changeset correctly scopes its claim to the assisted
  phases.
