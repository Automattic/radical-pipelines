# Local Overrides

This document is the canonical procedure for resolving a developer's local, per-developer convention overrides. `load.md` routes here on the required-completeness PASS branch; every other touchpoint (`setup.md`, `SKILL.md`, `README.md`) points at this file. The full mechanism lives here and nowhere else.

You are reading this as the orchestrator. The steps below are instructions you execute when loading conventions.

## Purpose and file basics

A developer may place a single override file, `.rp.local.md`, to adjust a restricted subset of conventions for their own working copy or machine without touching the committed `.rp.md`.

- **Fixed filename:** `.rp.local.md`. This name is not configurable.
- **Location:** the same directory as the committed `.rp.md` — the project main checkout root.
- **Git-ignored, never committed, never affects others.** A `.gitignore` entry keeps it out of version control for every developer. Because it is never committed, and because only conventions that govern the developer's own local runtime behaviour are overridable, nothing a local override changes ever reaches another contributor, a commit, the pipeline branch, the fork branch, or an upstream PR diff.
- **Partial by design.** `.rp.local.md` states only the units it changes; it inherits everything else from the committed `.rp.md`. It is not a complete conventions file, so no required/optional completeness check is ever applied to it. A `.rp.local.md` that omits a required convention is normal and correct, not an error.

## Main-root resolution (worktree-visibility mechanism)

Resolve the project main root — the directory that holds the committed `.rp.md` — as the parent of the git common directory:

```
main_root = dirname( git rev-parse --git-common-dir )
```

This is correct from any working directory in the repository, including inside a Claude Code worktree (`.claude/worktrees/<slug>`). At the main checkout it equals the toplevel; inside a worktree it still points at the main checkout root, not the worktree.

**Do NOT use `git rev-parse --show-toplevel`.** Inside a worktree it returns the worktree directory, not the main checkout root. On resume and manage-issues the orchestrator is already inside the worktree, where the git-ignored `.rp.local.md` is absent — so a `--show-toplevel` (or cwd-relative) probe would silently miss the developer's override.

Read **both** the committed `.rp.md` and `.rp.local.md` anchored to this resolved `main_root`. `.rp.local.md` is read from the main root and merged in memory. Nothing is ever copied or written into the worktree — the worktree never receives a `.rp.local.md` file.

## Idempotent re-resolution

This whole step is re-run on every convention load — fresh start, resume, and manage-issues, in both autonomous and assisted modes. Nothing about the merged result is persisted between sessions. On every load you re-resolve `main_root` and read `.rp.local.md` freshly from it. Never assume a prior session's merge survived; it did not, by design.

## Fail-soft guarantee

If `main_root` cannot be determined (for example, `git rev-parse --git-common-dir` fails), or if `.rp.local.md` cannot be read or cannot be parsed, treat the situation **exactly as "no `.rp.local.md` present"**: proceed with the committed conventions, emit at most a warning, and never hard-stop and never route into the setup flow.

A malformed local file never causes a required convention to read as missing and never triggers the setup flow. The committed conventions already passed the required-completeness check before this step ran; layering an override over them can only keep or replace already-valid values, never remove one.

## The named-unit merge model — three unit shapes

The override unit is the smallest **named sub-statement the committed `.rp.md` already presents**. The committed file decides what is named; the override matches off those names, **never an arbitrary substring**. Three shapes are recognized:

- **Labeled bullet** (e.g. Agent models: a `**Default:**` bullet plus `**<agent-name>:**` bullets). Matched by the exact `**<label>:**`. Resolution is a **map-merge over labels**: a matching label replaces that entry, a new label adds an entry, and an absent label inherits the committed entry.
- **Named prose sub-statement** (e.g. the Issues convention, which names the tracker identity — "GitHub is the source of truth" — separately from how the tracker is accessed — "accessed via the `gh` CLI"). Matched by the convention **heading plus the committed named sub-statement**, restating that named line with its value changed. Never matched by free-substring search anywhere in the block.
- **Atomic convention** (e.g. the health-monitoring cadence). The convention as a whole is the unit.

For every shape: if `.rp.local.md` defines the unit, the local value is used; otherwise the committed value is inherited. A local value **replaces the matched unit wholesale** — there is no partial blending inside a single unit's value (for example, inside an opaque model string or inside a single access statement). An entry in `.rp.local.md` that maps to no committed-named unit is treated as malformed and is warn-and-ignored (see the warnings surface). This is the rule that keeps you off arbitrary-substring matching.

## The overridable classification — three groups

Overridability is a prose classification, not a column on the conventions table (a single boolean cannot capture that the Issues convention is partially overridable, or that the `/loop` form is tool-forced while its cadence argument is not).

- **Overridable.** A local value wins (unless the project explicitly marked the unit `(non-overridable)`):
  - **Agent models** — which model and settings each agent uses.
  - **Health-monitoring cadence** — how often the run's monitor loops.
  - **The Issues access sub-statement** — how the tracker is accessed (CLI such as `gh`, MCP, or an API token).
- **Locked-shared (inherent).** Locked by classification because they produce committed output or shared identifiers; they never carry a marker:
  - Commit format, artifact folder, pipeline slug, branch names, worktree naming.
  - The Issues **tracker identity** (which tracker is the source of truth) — shared across every collaborator, even though it is a named sub-statement of the otherwise-overridable Issues convention.
- **Tool-forced (inherent).** Command **forms** dictated by the active tool's surface: the worktree, branch-name, team-spawning, and health-monitor command forms. The form is locked, but the in-scope argument values it carries are not. For example, the health-monitoring **cadence** value remains overridable even though the `/loop` command form that consumes it is tool-forced.

An attempt to override any locked-shared or tool-forced unit is ignored, the committed value is used, and a warning is emitted.

## The `(non-overridable)` marker (discretionary lock)

A project may explicitly lock an otherwise-overridable unit with a `(non-overridable)` parenthetical appended to the heading or bullet-label, mirroring the `(required)` idiom `setup.md` already uses. It works at both granularities:

- **Whole convention:** `### Agent models (non-overridable)`
- **Single unit:** `- **spec-writer:** anthropic/claude-opus-4-8 (non-overridable)` or prose `**GitHub is the source of truth** (non-overridable)`

This is the rarely-used, opt-in project marker; the default remains local-wins. It is **distinct from the inherent locks** above so that warnings cite the right reason: a marker hit produces the req-15 reason ("the project marked this unit non-overridable"), whereas an inherent lock produces the req-16 reason. The inherent families (locked-shared and tool-forced) never need and never carry the marker.

## The warnings surface

All conditions surface in a single **batched, present-only** informational summary emitted at load time. Frame it as a short informational report with **no questions** — it is safe inside an autonomous end-to-end run. The orchestrator's run output is the sole human-facing channel; there is no separate log.

Emit this block **only when `.rp.local.md` is present** at the main root:

```
Local overrides (.rp.local.md):
Applied:
  - <unit>: applied your local model.
  - <unit>: added (new entry).
Ignored:                          (only if any)
  - <unit>: <what happened> — <reason>. Using the committed value.
Warning:                          (only if applicable)
  - .rp.local.md is at risk of being committed — the project's ignore rules have no entry that ignores it; add one.
```

The one-line-per-item template for ignored units is `- <unit>: <what happened> — <reason>. Using the committed value.`

- **Absent file:** emit **nothing at all** — no block, no "no overrides found" line. The absence of `.rp.local.md` changes nothing and produces no output, preserving today's behaviour for every existing consumer.
- **Present and fully clean** (every unit applied, no warning): emit the header plus the `Applied:` line only.

The **reason string is chosen by the lock SOURCE**, stated verbatim and exclusively so the warnings are discriminable:

- **Discretionary marker (req 15):** the reason contains "the project marked this unit non-overridable" — and never "shared across collaborators" or "forced by the active tool".
- **Inherent lock (req 16):** the reason contains exactly one of "shared across collaborators" (for shared-output conventions and the Issues tracker identity) or "forced by the active tool" (for tool-forced command forms) — and never "the project marked".
- **Malformed (req 17):** the reason is "could not be applied (unrecognized or malformed unit)", naming the unit by the literal heading or label the developer wrote in `.rp.local.md` (even a typo'd `### Helth monitoring` has a textual handle).

## The gitignore safety check

Check that `.rp.local.md` is actually ignored by running, from the main root:

```
git check-ignore .rp.local.md
```

- Exit 0 = the file is ignored (safe) — no warning.
- Exit 1 = the file is **not** ignored — queue the gitignore warning (the `Warning:` line above).

This check is **functional, not textual** — it is `git check-ignore`, not a grep of `.gitignore` text — so it correctly honors an entry that legitimately lives in a parent or global ignore file.

It is **independent of the merge outcome.** It fires on the mere presence of `.rp.local.md` at the main root, even if every unit in the file was ignored or malformed, because the risk is the untracked *file* landing in a commit, not its contents.

## Worked examples

### Agent models (full map-merge, all three behaviours)

Committed `.rp.md`:

```
### Agent models
- **Default:** anthropic/claude-sonnet-4-6
- **spec-writer:** anthropic/claude-opus-4-8
- **code-writer:** anthropic/claude-opus-4-8
```

Developer `.rp.local.md`:

```
### Agent models
- **spec-writer:** anthropic/claude-opus-4-8 (effort: high)
- **code-reviewer:** anthropic/claude-sonnet-4-6
```

Resolved:

- `Default` — **inherited** (the local file is silent on it).
- `spec-writer` — **replaced wholesale**: the entire value, including `(effort: high)`, is swapped in. It is not blended with the committed string.
- `code-writer` — **inherited**.
- `code-reviewer` — **added** as a new label the committed file lacked.

### Issues access (compact before/after)

Committed (the named tracker-identity sub-statement and the named access sub-statement live in one block):

```
**GitHub is the source of truth** … accessed via the `gh` CLI.
```

Developer `.rp.local.md` restates only the access line:

```
**GitHub is the source of truth** … accessed via the GitHub MCP server.
```

Resolved: access = GitHub MCP server; the committed tracker-identity sentence ("GitHub is the source of truth") is **retained**. Only the access sub-statement changed. An attempt instead to restate the tracker identity itself is ignored and warned under req 16 ("shared across collaborators").

### Health cadence (one line, form-vs-argument)

Committed `/loop 15m`; the developer's `.rp.local.md` sets the cadence to `30m`. Resolved: the monitor loops every `30m`. Only the cadence **value** changes; the `/loop` command **form** is tool-forced, so a local file attempting to change the command form (rather than just the cadence argument) is ignored and warned per req 16 ("forced by the active tool").

## Authoring and confirm-before-write rules

The supported authoring path is **hand-authoring**: the developer copies the relevant committed block(s) from `.rp.md` and edits the value(s), reusing the same headings, bullet labels, and named sub-statements so no new syntax is introduced. No dedicated interactive authoring flow exists for v1.

You **may** (but need not) mention the local-override option when a developer clearly expresses a local-only runtime preference. No proactive intent-detection is required.

If you ever write `.rp.local.md` on a developer's behalf:

- First show the proposed content and ask for **explicit confirmation** before writing.
- Never overwrite an existing `.rp.local.md` without explicit approval.

A local override is **partial by design**, so the "don't fabricate a complete conventions file" concern from `setup.md` does not apply here — a `.rp.local.md` is expected to contain only the units it changes.

## Assisted-mode inertness note

Overrides only take effect where the overridden convention is actually exercised. In assisted runs no agents or monitors are spawned, so **Agent-models and Health-monitoring overrides have no effect** there. The **Issues access-mechanism override still applies** in assisted runs, because the orchestrator itself reads and writes the tracker.
