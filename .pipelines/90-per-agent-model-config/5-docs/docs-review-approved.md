# Docs review — APPROVED

**Pipeline:** `90-per-agent-model-config` · **Phase:** 5 (docs) · **Iteration:** N/A (approved)
**Batch:** `git diff 5d1469a..HEAD` — `README.md` (+4/−2) and `.changeset/per-agent-model-config.md` (+5).
**Tasks:** doc-plan Task 1 (D1, commit `14caef0`) and Task 2 (D2, commit `b20cb8d`).

## Verdict

**Approved.** Both deferred docs surfaces are accurate to the shipped phase-4 code, use the canonical convention name `Agent models`, respect the anti-drift / no-duplication rule, and the changeset is valid and passes the gate.

## D1 — README per-tool convention catalog (Task 1)

- **Both catalog spots updated.** The `Agent models` convention now appears in the Configuration per-tool enumeration (`README.md:157`, added to both the Claude Code clause and the Pi clause) and in the `.rp.md`-structure sentence (`README.md:167`, "agent models" inserted into the per-tool list). 4 mentions total.
- **Canonical name.** Uses the exact shipped name `Agent models`, matching `setup.md:90`, `load.md:20`, and `.rp.md:86/160`.
- **Optional + per-tool.** Stated explicitly: "an optional `Agent models` convention", "the same optional `Agent models` convention", and "The `Agent models` block is per-tool and optional".
- **References, does not restate.** A pointer ("see the setup conventions for how to author it") replaces any restatement of the block shape, resolution rule, or per-tool value forms — anti-drift and the `AGENTS.md` no-duplication rule are respected.
- **Pointer target exists.** The relative link `./skills/radical-pipelines/reference/conventions/setup.md` resolves from the repo root; the file exists and carries the canonical `### Agent models` shape at `setup.md:90`.
- **No contradiction.** The "same optional `Agent models` convention" (Pi clause) and the ":167" claim that the dogfood `.rp.md` carries both tool sections side-by-side are true: `.rp.md` has an `### Agent models` block under both `## Claude Code` (`:86`) and `## Pi` (`:160`). Voice matches the surrounding terse, present-tense, parenthetical convention list.

## D2 — Mandatory release changeset (Task 2)

- **Well-formed and valid.** Single file `.changeset/per-agent-model-config.md`; front matter names `@automattic/radical-pipelines`; bump `minor`. `node scripts/validate-changesets.mjs` exits 0. Bump is correct per `CONTRIBUTING.md` "Bump types" + pre-1.0 policy (a backwards-compatible new feature → `minor`); package name matches `.changeset/config.json`.
- **Gate satisfied.** Content changeset (not the canonical-empty form), correct for a real feature touching `skills/**` and `README.md` — satisfies the gate's Shape and Presence checks.
- **Body accurate to shipped behavior.** Every claim verified against phase-4 files:
  - optional, additive, "keeps today's behavior in both the Claude Code and Pi runtimes" → `setup.md:92`, `:125`.
  - per spawned agent and/or project-wide `Default` → `setup.md:96–97`.
  - model + settings such as reasoning `effort` → `setup.md:92`, `:121`.
  - per active tool, "passed verbatim ... with no translation" → `autonomous-workflow.md:67`, `setup.md:99`.
  - "rides the spawn channel only, never editing an agent's profile" → `autonomous-workflow.md:68`.
  - "recovery model swaps stay transient — applied only to the recovery re-spawn, never written back and never re-selecting the just-failed model" → `health-monitoring.md:44`, `pi.md:30`, `.rp.md:138`.
  - "Setup, the README convention catalog, and this repository's dogfood `.rp.md` document and demonstrate the new `Agent models` block" → all three surfaces present.
- **No over-restatement.** The body summarizes the capability and its optionality without dumping the block shape or resolution algorithm.

## Accuracy & scope

- Only `README.md` and the new changeset changed since `5d1469a`; no phase-4 skill-reference/internal files re-documented here. Scope is clean.
- Commits in range match the bindings: `14caef0` (D1) and `b20cb8d` (D2).
- Nothing dropped, nothing overclaimed: the changeset claims only what the feature actually does.
