# Design Doc: Local, per-developer overrides of a project's Radical Pipelines conventions

## Overview

Radical Pipelines loads each consuming project's conventions from a single committed `.rp.md`. Today that file is the only sanctioned source of conventions, so an individual developer has no safe way to deviate locally: their only option is to edit the committed `.rp.md`, which risks committing machine- or person-specific settings and leaking them to everyone on the project. This feature lets a developer place a single git-ignored override file, `.rp.local.md`, alongside the committed `.rp.md`. The override adjusts a restricted subset of conventions that govern only the developer's own local runtime behaviour — which agent models to use, how often the health monitor loops, and how the issue tracker is accessed — for that developer's working copy or machine. The override is never committed and never affects other contributors.

The chosen approach is a **read-from-main-root, in-memory layering** step in the convention loader. Radical Pipelines is "documentation as code": the loader and setup flow are Markdown the orchestrator LLM reads and reasons over — there is no parser and no deterministic merger. The loader reads the committed `.rp.md` first and runs its existing required-completeness check unchanged. Only on the PASS branch does it then resolve `.rp.local.md` from the project's main checkout root (correct even when the run executes inside a git-ignored worktree), merge it over the committed conventions per named unit (local wins, committed inherits where the local file is silent), and emit a single batched informational summary of what was applied or ignored. Because the merge is a pure layering step over an already-valid base, it can never make a required convention read as missing, and an absent `.rp.local.md` produces no behavioural change and no output — preserving backward compatibility for every existing consumer. The capability ships entirely as Markdown edits to the skill's documentation plus a new canonical reference doc; this repository's own `.rp.md` is merely the dogfood instance of the same mechanism.

## Approach

The implementer's mental model is a four-stage convention-load that extends the existing two-stage flow:

1. **Read committed `.rp.md`** from the project main root (unchanged read; today's behaviour).
2. **Validate required completeness** against the existing 9-row conventions table (unchanged gate; a missing required convention still routes to `setup.md`).
3. **[NEW] Layer the local override** — only on the gate's PASS branch, before the conventions are used or passed to any agent: locate the project main root, probe for `.rp.local.md` there, and merge it over the committed conventions per named unit. This step is governed by a new canonical reference doc, `local-overrides.md`; `load.md` only routes to it.
4. **[NEW] Report** — emit a single batched, present-only "Local overrides" informational summary (no questions), then continue the workflow with the resolved conventions.

The override unit is the **smallest named sub-statement the committed `.rp.md` already presents**. The committed file decides what is named; the override matches off those names (never an arbitrary substring) and replaces or adds whole units. Merge resolution is a map-merge over labels for list-shaped conventions and a wholesale replace within any single unit's value (no blending inside an opaque model string or a single access statement). The override is restricted to a closed in-scope set — agent models, health-monitoring cadence, and the Issues access-mechanism — and any attempt to override a shared-output convention, the Issues tracker identity, a tool-forced command form, or a unit the project explicitly marked non-overridable is ignored, the committed value is used, and the run output warns with a reason chosen by *why* the unit is locked.

The whole step is **idempotent and re-run on every load**, including resume and manage-issues. Nothing about the merged result is persisted between sessions; the override is recomputed each time conventions are loaded, always reading `.rp.local.md` freshly from the main root. This matters because the orchestrator may already be inside the worktree when it re-loads conventions on resume, and a cwd-relative probe would silently miss the root-authored override.

## Components

This feature is realized entirely through Markdown documentation that the orchestrator LLM reads. No executable code, parser, or merger is added.

### New components

- **`skills/radical-pipelines/reference/conventions/local-overrides.md`** — the canonical procedure doc. It holds the full override mechanism: main-root resolution, the layering/fail-soft guarantee, the named-unit merge model, the non-overridable marker, the three-group overridable classification, the four warnings and their batched summary surface, the worked examples, the authoring/confirm-before-write rules, and the git-ignored / assisted-inertness notes. This is the single source of truth that every other touchpoint points at.

### Modified components

- **`skills/radical-pipelines/reference/conventions/load.md`** — the thin convention-load gate. Gains one new `## Local overrides` section after the existing `## Missing conventions` gate, firing only on the PASS branch and routing to `local-overrides.md`. Its existing read, conventions table, and missing-conventions gate stay byte-for-byte unchanged.
- **`skills/radical-pipelines/reference/conventions/setup.md`** — the setup procedure that writes `.rp.md` and manages `.gitignore`. Gains the `.rp.local.md` ignore entry, a reworded "only entry" statement at two sites, a cross-reference to `local-overrides.md`, and an optional `.rp.md` breadcrumb offer.
- **`skills/radical-pipelines/SKILL.md`** — the orchestrator's top-level map. Gains a one-clause extension to the "Project conventions" sentence so the capability is discoverable without opening `load.md`.
- **`README.md`** — the public-facing overview. Gains a short standalone paragraph in the Configuration section advertising the capability and linking the canonical doc.

### Untouched-but-relevant components

- **The consuming project's committed `.gitignore`** — setup adds a `.rp.local.md` entry to it (consuming-project behaviour). For the dogfood repo this implies a new line; see the scope guard in Key Decisions.
- **The dogfood `.rp.md`** — deliberately left as-is. The Issues block's existing prose (`**GitHub is the source of truth**` … `accessed via the `gh` CLI`) already presents the named-sub-statement seam the merge model needs; no `**Access:**` refactor is forced because the mechanism is backward-compatible on existing prose.
- **`autonomous-workflow.md` / `assisted-workflow.md`** — unchanged. They consume the *already-resolved* conventions (autonomous injects Artifact folder + Commit format and resolves Agent models at spawn; assisted consumes Commit format and Issues access). No downstream consumer re-resolves conventions, so the merge is transparent once it completes before the first spawn. The assisted-inertness note lives once in `local-overrides.md` rather than being duplicated here.

## Interfaces and Data Flow

### The override file

- **Fixed filename:** `.rp.local.md`.
- **Location:** the same directory as the committed `.rp.md` — the project main checkout root.
- **Format:** Markdown reusing the exact headings, bullet labels, and named sub-statements the committed `.rp.md` already uses. No new syntax is introduced (req 19). The file is partial by design: it states only the units it changes.

### Main-root resolution (the worktree-visibility mechanism)

The loader resolves the project main root as **the parent directory of the git common dir**:

```
main_root = dirname( git rev-parse --git-common-dir )
```

This equals the directory that holds the committed `.rp.md`, and it is correct from any working directory in the repository. At the main checkout it is the toplevel; inside a Claude Code worktree (`.claude/worktrees/<slug>`) it is *not* the worktree dir — `git rev-parse --show-toplevel` would return the worktree dir and is therefore explicitly **not** used. The loader reads both the committed `.rp.md` and `.rp.local.md` anchored to this main root, so the override resolves identically across fresh / resume / manage-issues, autonomous / assisted, and Claude Code / Pi (both create standard `git worktree`s with the same common-git-dir topology).

The override is **read** from the main root and merged in memory. Nothing is ever copied or written into the worktree.

### Data flow

```
load.md
  ├─ read committed .rp.md  ── from main_root
  ├─ required-completeness gate (unchanged)
  │     └─ FAIL → setup.md  (override step never runs)
  └─ PASS → ## Local overrides → local-overrides.md
        ├─ resolve main_root (dirname of common git dir)
        ├─ probe .rp.local.md at main_root
        │     └─ absent / unresolvable / unreadable → proceed with committed conventions, emit nothing
        ├─ present → per-named-unit merge over committed conventions (in memory)
        │     ├─ overridable unit, matched name      → REPLACE committed value
        │     ├─ overridable list label, new          → ADD new entry
        │     ├─ locked (marker / inherent)           → keep committed value, queue warning
        │     └─ unmatched / malformed                → keep committed value, queue warning
        ├─ git check-ignore .rp.local.md  (from main_root) → queue gitignore warning if exit 1
        └─ emit single batched "Local overrides (.rp.local.md):" summary (Applied / Ignored / Warning)
  → continue workflow with resolved conventions (passed to agents at spawn)
```

The resolved conventions are what the orchestrator carries and passes to agents at spawn time. The merge must complete before the first spawn; since conventions load at workflow start and the first spawn happens later (step 5 of the workflow), this is satisfied.

### The merge model — three unit shapes

The override unit is the smallest **named sub-statement the committed `.rp.md` already presents**. Three shapes are recognized, each matched off the committed file's own names:

1. **Labeled bullet** (e.g. Agent models, structured as `**Default:**` plus `**<agent-name>:**` bullets). Matched by the exact `**<label>:**`. Resolution is a **map-merge over labels**: a matching label replaces that entry, a new label adds an entry, an absent label inherits the committed entry.
2. **Named prose sub-statement** (e.g. the Issues convention, which names the tracker identity — "GitHub is the source of truth" — separately from how the tracker is accessed — "accessed via the `gh` CLI"). Matched by the convention **heading plus the committed named sub-statement**, restating the named line with its value changed. Never matched by free-substring search.
3. **Atomic convention** (e.g. the health-monitoring cadence). The convention as a whole is the unit.

For every shape: if `.rp.local.md` defines the unit, the local value is used; otherwise the committed value is inherited. A local value **replaces the matched unit wholesale** — there is no partial blending inside a single unit's value (req 9/10). An entry that cannot be mapped to a unit the committed file names is treated as malformed and warn-and-ignored (req 17); this is the rule that keeps the LLM off arbitrary-substring matching.

### The overridable classification (three groups)

Overridability is expressed as a separate three-group prose classification in `local-overrides.md`, **not** as a new column on the 9-row conventions table (a single boolean cannot capture that the Issues row is partially overridable, or that the health-monitoring `/loop` form is tool-forced while its cadence argument is overridable):

1. **Overridable** — Agent models; Health-monitoring cadence; the Issues **access** sub-statement.
2. **Locked-shared (inherent)** — commit format, artifact folder, pipeline slug, branch names, worktree naming, and the Issues **tracker identity**. Locked by classification; never carry a marker.
3. **Tool-forced (inherent)** — command **forms** dictated by the active tool's surface (worktree, branch-name, team-spawning, and health-monitor command forms). The form is locked, but the in-scope argument values it carries (e.g. the cadence value) are not.

### The non-overridable marker (discretionary lock)

A project may explicitly lock an otherwise-overridable unit using a `(non-overridable)` parenthetical appended to the heading or bullet-label, mirroring the `(required)` idiom setup.md already uses (`### Pipeline base slug (required)`, etc.). It works at both granularities:

- Whole convention: `### Agent models (non-overridable)`
- Single unit: `- **spec-writer:** anthropic/claude-opus-4-8 (non-overridable)` or prose `**GitHub is the source of truth** (non-overridable)`

This is the rarely-used, opt-in project marker (req 14); the default remains local-wins. It is kept distinct from the inherent locks above so the warnings cite the right reason: a marker hit produces the req-15 reason, an inherent lock produces the req-16 reason. Inherent families never need and never carry the marker.

### The warnings surface

A single **batched, present-only** summary is emitted at load time, framed as a short informational report with no questions (mirroring `autonomous-workflow.md:51`'s "deviations from defaults… do not ask questions" framing, which makes it safe inside an autonomous end-to-end run). The orchestrator's run output is the sole human-facing channel; there is no separate log.

Block shape (emitted only when `.rp.local.md` is present at the main root):

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

One-line-per-item template for ignored units: `- <unit>: <what happened> — <reason>. Using the committed value.` The **reason string is chosen by lock SOURCE**, which makes the warnings test-discriminable:

- **req 15 (discretionary marker):** reason contains "the project marked this unit non-overridable" — and never "shared across collaborators" or "forced by the active tool."
- **req 16 (inherent):** reason contains exactly one of "shared across collaborators" (shared-output conventions and the Issues tracker identity) or "forced by the active tool" (tool-forced forms) — and never "the project marked."
- **req 17 (malformed):** reason is "could not be applied (unrecognized or malformed unit)", naming the unit by the **literal heading/label the developer wrote** in `.rp.local.md` (even a typo'd `### Helth monitoring` has a textual handle).

The req-18 gitignore check is **functional, not textual**: `git check-ignore .rp.local.md` run from the main root (exit 0 = ignored/safe, exit 1 = not ignored → warn). Using `git check-ignore` rather than grepping `.gitignore` text correctly honors an entry that legitimately lives in a parent or global ignore file. This check is **independent of the merge outcome** — it fires on mere presence of the file even if every unit was ignored or malformed, because the risk is the untracked *file* landing in a commit, not its contents.

When `.rp.local.md` is absent, the loader emits **nothing at all** — no block, no "no overrides found" line (req 4 backward-compat). When present and fully clean, it emits the header plus the `Applied:` line, which closes the "silently inert" trust gap req 24 calls out.

### Worked examples (in `local-overrides.md`)

**Agent models (full map-merge, all three resolution behaviours in one example):**

- Committed `.rp.md`:
  ```
  ### Agent models
  - **Default:** anthropic/claude-sonnet-4-6
  - **spec-writer:** anthropic/claude-opus-4-8
  - **code-writer:** anthropic/claude-opus-4-8
  ```
- Developer `.rp.local.md`:
  ```
  ### Agent models
  - **spec-writer:** anthropic/claude-opus-4-8 (effort: high)
  - **code-reviewer:** anthropic/claude-sonnet-4-6
  ```
- Resolved: `Default` inherited; `spec-writer` **replaced wholesale** (the entire value, including `(effort: high)`, is swapped in — not blended); `code-writer` inherited; `code-reviewer` **added** as a new label. (Real agent names; opaque provider/model values.)

**Issues access (compact before/after):** committed `… accessed via the `gh` CLI.` → local restates the access line as `… accessed via the GitHub MCP server.` → resolved: access = GitHub MCP, the committed tracker-identity sentence retained.

**Health cadence (one line, form-vs-argument):** committed `/loop 15m`; local sets cadence `30m` → resolved: the monitor loops every 30m. Only the cadence *value* changes; the `/loop` command *form* is tool-forced, so a local file attempting to change the command form is ignored and warned per req 16.

### Setup-flow interface changes

- **`setup.md:114`** (Artifact-storage explainer) — the ignore-entry bullet is extended to name a second required entry (`.rp.local.md`) so the explainer stays consistent with step 6.
- **`setup.md:197`** (step 6) — "This is the only entry Radical Pipelines requires" is replaced with a purpose-stating, count-agnostic reword that names both the worktree-folder entry (per active tool) and the always-required `.rp.local.md`, with the "never committed" rationale; the step appends `.rp.local.md` to the entries it adds and cross-references `local-overrides.md`. The fork reminder (`:201`) needs no separate edit and reads naturally as plural — `.rp.local.md` is one more line in whichever `.gitignore` setup manages (the fork's main in fork mode).
- **`setup.md` step 5 (`:188-193`)** — optionally **offers** a one-line `.rp.md` breadcrumb pointing at `local-overrides.md` (asked, not forced; part of the owner-confirmed `.rp.md` content, advertising the capability without implying a `.rp.local.md` already exists).

### Discoverability touchpoints (four, complete)

1. **`local-overrides.md`** (canonical) — the full content.
2. **`load.md`** — the gate routes to it at the post-validation step.
3. **`setup.md`** — cross-reference at the §6 gitignore edit + the optional breadcrumb at step 5.
4. **Conventions-overview mention, split:** a short standalone paragraph in `README.md` after line 157, and a one-clause extension to the `SKILL.md:46` sentence.

No CONTRIBUTING.md, `website/`, or AGENTS.md change is needed (a whole-repo sweep confirmed none documents the convention catalog).

## Key Decisions

### Decision: Read the override from the main root, never copy it into the worktree

- **Choice:** The loader resolves `.rp.local.md` from the project main checkout root — `dirname` of `git rev-parse --git-common-dir` — regardless of cwd, and merges it in memory. Nothing is written into the worktree.
- **Alternatives:** (a) Copy `.rp.local.md` into the worktree next to the checked-out `.rp.md`. (b) Probe "the same directory you read `.rp.md` from."
- **Trade-offs:** Read-from-root costs one explicit "find the main root" step the orchestrator must perform on resume/manage-issues (it cannot lazily rely on cwd). It is chosen because it is strictly safer: the committed `.rp.md` is tracked and therefore checked out into *every* worktree, so "same dir as `.rp.md`" resolves to the worktree copy on resume/manage-issues — where the git-ignored `.rp.local.md` is absent — and the override is silently missed. Copy-into-worktree would, on a project whose `.gitignore` entry is still missing (exactly the pre-condition req 18 anticipates), drop an untracked `.rp.local.md` that a broad `git add -A` during a phase commit could sweep onto the pipeline branch. Read-from-root never creates a file inside the worktree, so it removes that leak failure mode rather than relying on the ignore entry to neutralize it.
- **Traces to:** Requirement 7; the "never committed / never affects others" criterion; the "root-authored override takes effect inside the worktree" acceptance criterion.

### Decision: Fail-soft on any resolution failure

- **Choice:** If the main root cannot be determined, or `.rp.local.md` cannot be read or parsed, treat it exactly as "no `.rp.local.md` present" — proceed with committed conventions, at most a warning, never a hard-stop and never a path into setup.
- **Alternatives:** Hard-stop or route to setup when the override cannot be resolved.
- **Trade-offs:** Fail-soft makes backward compatibility robust to errors, not just to the clean absent case, and guarantees a malformed local file can never break a previously-working project. The cost is that a genuinely broken override degrades silently to committed behaviour (mitigated by the malformed-unit warning).
- **Traces to:** Requirements 4 and 17; the "malformed local → no missing-required, no setup" acceptance criterion.

### Decision: Put the full mechanism in a new sibling `local-overrides.md`; keep `load.md` a thin gate

- **Choice:** A new `skills/radical-pipelines/reference/conventions/local-overrides.md` holds the full procedure (~80–130 lines of merge rules, warnings, classification, worked examples). `load.md` gains only a short `## Local overrides` step that routes to it.
- **Alternatives:** Inline the entire mechanism in `load.md`.
- **Trade-offs:** A sibling adds one indirection hop at load time, but that is the skill's established decomposition pattern (`load.md` already delegates to `setup.md`; `setup.md` delegates to per-tool files). Inlining would roughly quadruple the smallest, most-frequently-read gate doc and mix "decide completeness" with "layer overrides," eroding the clean binary gate. Req 20's cross-reference-from-setup and conventions-overview mention only make sense if the canonical text lives in one place others point at.
- **Traces to:** Requirement 20; the loader-ordering acceptance criterion.

### Decision: Insert the override step after the required-completeness PASS, idempotent on every load

- **Choice:** The override step runs only on the gate's PASS branch, before conventions are used or passed to any agent, and is re-resolved from the main root on every load (including resume); nothing about the merged result is persisted.
- **Alternatives:** Resolve overrides before/while validating completeness; or persist the merged result across sessions.
- **Trade-offs:** Gating on PASS guarantees a local file can never be the sole source of a required convention and a missing required convention still routes to setup. Idempotent re-resolution costs a recompute per load but is required so that resume/manage-issues *inside* the worktree re-pick the override from the main root rather than assuming a prior session's merge persisted (nothing persists it today, by design).
- **Traces to:** Requirements 5 and 6; the "read and validated first, only afterward probed" and "missing required + local supplies it → still setup" acceptance criteria.

### Decision: Match only off the names the committed file presents; wholesale-replace per unit

- **Choice:** Three unit shapes (labeled bullet, named prose sub-statement, atomic convention), each matched off the committed file's own names. Map-merge over labels for keyed lists; wholesale replace within a unit; entries that map to no committed-named unit are warn-and-ignored as malformed.
- **Alternatives:** Free-substring matching; partial blending inside a unit's value.
- **Trade-offs:** Matching named prose sub-statements off heading + named clause is inherently softer than matching a `**label:**`, which is why the design forbids free-substring matching and routes unmatched entries to warn-and-ignore. The durable mitigation is the recommended (not forced) `**Access:**` labeled line for Issues access, which converts the soft case into a hard-labeled one without new syntax.
- **Traces to:** Requirements 8, 9, and 10; the spec-writer override, code-reviewer add, Issues-access, and "wholesale replace, no blending" acceptance criteria.

### Decision: `(non-overridable)` parenthetical marker, distinct from inherent locks

- **Choice:** A `(non-overridable)` parenthetical on a heading or bullet-label is the opt-in project marker, mirroring setup.md's `(required)` idiom. Inherent locks (shared-output, Issues tracker identity, tool-forced forms) are locked by classification and never carry a marker.
- **Alternatives:** An HTML comment marker (zero precedent in `reference/`, invisible to human skimmers); a trailing sentence (ambiguous binding for a single bullet).
- **Trade-offs:** The parenthetical reuses an idiom the LLM already parses as a status flag and binds tightly to the exact label it follows, at the cost that an author must place it on the right heading/label — documented with examples at both granularities. Keeping discretionary and inherent locks distinct is what lets the warnings cite the right reason.
- **Traces to:** Requirements 11, 14, 15, and 16.

### Decision: Single batched, present-only informational summary for all warnings

- **Choice:** One batched "Local overrides" block emitted at load time, framed as a short informational report with no questions. The reason string is chosen by lock source so req-15 / req-16 / req-17 are mutually exclusive on the reason substring. The req-18 gitignore check is `git check-ignore` from the main root, independent of merge outcome. Absent file → emit nothing.
- **Alternatives:** Inline-at-the-point-of-each-override warnings; grepping `.gitignore` text for the entry.
- **Trade-offs:** Batched gives one deterministic, testable surface that does not interleave with streaming phase output, at the cost that a developer reading a long run sees the report only once at the top (acceptable, since conventions resolve once per load). The "no questions" framing borrows `autonomous-workflow.md:51` so the report is safe in an autonomous end-to-end run. `git check-ignore` is slightly less obvious in prose than grepping but is strictly more correct because it honors parent/global ignore rules. A positive applied-summary is a small amount of extra output traded for closing the silent-inertness gap.
- **Traces to:** Requirements 15, 16, 17, 18, 24; the warning and missing-ignore-entry acceptance criteria.

### Decision: Restrict overrides to a closed in-scope subset

- **Choice:** Only Agent models, Health-monitoring cadence, and the Issues access sub-statement are overridable. The Issues tracker identity, shared-output conventions, and tool-forced command forms are locked and warn-and-ignored.
- **Alternatives:** Allow any convention to be overridden locally.
- **Trade-offs:** Restricting to conventions that govern only the developer's own local runtime behaviour is what guarantees nothing the orchestrator derives from a local override flows into a committed artifact or shared identifier — the "never affects others" guarantee. The cost is that genuinely useful future overrides (notably artifact-storage mode) are deferred; they are severable and recorded as future work.
- **Traces to:** Requirements 12 and 13; the non-overridable / out-of-scope acceptance criteria.

### Decision: Confirm-before-write lives in `local-overrides.md`, not `setup.md`

- **Choice:** The rule that the orchestrator, if it ever writes `.rp.local.md`, first shows the content, asks for explicit confirmation, and never overwrites without approval — a lighter mirror of `setup.md:179-186` that drops the don't-fabricate-a-complete-file concern (a local override is partial by design) — lives in `local-overrides.md`. `setup.md` only cross-references it.
- **Alternatives:** Place the rule in `setup.md`.
- **Trade-offs:** `setup.md` writes `.rp.md` and never `.rp.local.md`; the override path is hand-authoring (req 19) and orchestrator-writes is an optional nicety (req 22). Keeping the rule with the override semantics keeps `setup.md`'s growth to a few lines and the override mechanism in one canonical place, at the cost of one cross-reference hop.
- **Traces to:** Requirements 19 and 22; the authoring-safety acceptance criteria.

### Decision: Scope guards on the dogfood repo

- **Choice (a):** Do **not** retroactively add the missing worktree-folder line to this repo's `.gitignore`. Write the setup instruction generically so it is true for any conforming consumer, and do not treat this repo's non-conformant `.gitignore` as the exemplar in docs.
- **Choice (b):** Do **not** force-refactor the dogfood `.rp.md` Issues block to add a `**Access:**` line. The mechanism is backward-compatible on the existing mid-bullet prose via heading + named-clause matching; the labeled line is a documented recommendation, not a requirement.
- **Alternatives:** Fix the dogfood `.gitignore` and refactor the dogfood `.rp.md` as part of this feature.
- **Trade-offs:** Both keep the feature's blast radius tight. The missing worktree line is a pre-existing, orthogonal dogfood-hygiene gap; req 23 is about documentation truth, not retrofitting this repo. Leaving the Issues block as-is proves the backward-compatible path works on real existing prose. The reworded setup prose is written to be true for a conforming project, which the doc calls out so the code phase does not mistake this repo's `.gitignore` for the prescribed shape.
- **Traces to:** Requirements 4 and 23; the "setup completes → committed `.gitignore` contains a `.rp.local.md` entry" acceptance criterion.

## Dependencies

- **Internal:** the existing convention-load flow (`load.md`), the setup procedure (`setup.md`), the conventions table and required-completeness gate, the `autonomous-workflow.md:51` informational-report channel, and the `setup.md` `(required)` heading idiom that the `(non-overridable)` marker mirrors. The new `local-overrides.md` is a sibling under the existing `reference/conventions/` directory.
- **External:** `git` — specifically `git rev-parse --git-common-dir` (main-root resolution) and `git check-ignore` (req-18 file-safety check). Both are already implicitly required by Radical Pipelines (it operates inside git repositories and uses worktrees). No new library, service, or tool dependency is introduced.
- **Tooling assumption:** worktree creation under both Claude Code (`EnterWorktree`) and Pi (`@zenobius/pi-worktrees`) produces standard `git worktree`s sharing the same common-git-dir topology, so the main-root recipe needs no per-tool branch. (Pi equivalence is reasoned from it being a git-worktree wrapper, not source-verified — flagged in Risks.)

## Failure Modes and Observability

- **Main root unresolvable** (e.g. outside a git repo): `git rev-parse --git-common-dir` fails. The loader treats this as "no `.rp.local.md`" and proceeds with committed conventions. (Degenerate — Radical Pipelines requires git.)
- **`.rp.local.md` unreadable or absent:** proceed with committed conventions; emit nothing (absent) or fail-soft to committed (unreadable).
- **A unit is malformed or maps to no committed-named unit:** that unit is ignored, its committed value is used, the remaining valid units still apply, and the run output warns naming the unit by the literal label the developer wrote. A malformed file never makes a required convention read as missing and never triggers setup.
- **A unit targets a locked convention** (marker, shared-output, Issues tracker identity, or tool-forced form): the committed value is used and the run output warns with a reason chosen by lock source.
- **`.rp.local.md` present but not ignored** (`git check-ignore` exit 1): the run output warns the file is at risk of being committed and the ignore entry should be added. This fires on mere presence, independent of whether any unit merged.
- **Observability:** the orchestrator's run output is the sole human-facing channel. All conditions surface in the single batched "Local overrides" summary at load time. There is no separate log or side channel. The summary is present-only: an absent override produces no output, preserving today's silent behaviour for every existing consumer.

## Risks and Open Questions

- **LLM matching reliability for named prose sub-statements.** Matching the Issues access sub-statement off heading + named clause is softer than matching a `**label:**`. Mitigated by forbidding free-substring matching, routing unmatched entries to warn-and-ignore, and recommending the `**Access:**` labeled line. The implementation plan and code phase should ensure the `local-overrides.md` prose and worked examples make the match rule unambiguous to the orchestrator LLM.
- **Pi worktree topology not source-verified.** The main-root recipe assumes Pi's `@zenobius/pi-worktrees` creates standard `git worktree`s with the same common-git-dir topology as Claude Code. This is reasoned from Pi being a git-worktree wrapper, not source-verified. If Pi diverges, the recipe (`dirname` of common git dir) may need a Pi-specific note; the code/verification phase should confirm under Pi if feasible.
- **Reason-string discriminability is load-bearing for tests.** The req-15 / req-16 / req-17 warnings are distinguished only by their reason substrings. The `local-overrides.md` text must state the reason families verbatim and exclusively (req-15 always "the project marked", req-16 always exactly one of "shared across collaborators" / "forced by the active tool", req-17 always "could not be applied (unrecognized or malformed unit)") so the tests can assert on them. This is a writing-precision obligation the plan should call out for the docs/code phase.
- **No open design questions.** All seven research topics are resolved with cited evidence; no decision is deferred to the implementation plan beyond the writing-precision and verification items above.

## Out of Scope (recorded future work, per spec)

- **Overriding the artifact-storage mode and its fork/remote configuration** (`artifacts-in-repo` vs `artifacts-in-fork`, the upstream/fork remotes, and the upstream branch/commit formats). The leading future-work item: flipping the mode locally rewires where commits are pushed and how the upstream PR is produced — shared, observable effects other contributors and the orchestrator's close-out depend on. Severable; the override mechanism ships cleanly without it.
- **A per-machine override location outside the repository** (e.g. `~/.config/...`). For v1 the repo-root, git-ignored `.rp.local.md` is the only supported location; an external location would break the "alongside `.rp.md`" model, escape the committed `.gitignore` entry that underpins "never committed," and require an additional precedence layer.
- **A dedicated interactive developer flow for authoring `.rp.local.md`.** Authoring is hand-done by copying labeled blocks from `.rp.md`.
- **Mandatory proactive intent-detection** that surfaces the override option. The orchestrator may mention it (req 21), but no detection logic is required.
