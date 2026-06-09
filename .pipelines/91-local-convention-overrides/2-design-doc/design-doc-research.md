# Design-doc research — Local, per-developer overrides of a project's Radical Pipelines conventions

_Source: GitHub issue [Automattic/radical-pipelines#91](https://github.com/Automattic/radical-pipelines/issues/91)._
_Inputs: `1-spec/spec.md` (approved spec — the WHAT), `1-spec/spec-research.md`, `0-prompt/prompt.md`._

## Purpose of this document

The spec settled the WHAT (observable outcomes). This document settles the HOW at full
implementation depth: the exact edits to `skills/radical-pipelines/reference/conventions/load.md`
and `setup.md`, the worktree-visibility resolution mechanism, the named-unit merge model expressed
so an LLM applies it reliably (with a worked Agent-models example the dogfood `.rp.md` lacks), the
four warnings and where they surface, the docs/discoverability surface, and backward compatibility.

Radical Pipelines is "documentation as code": the loader and setup flow are Markdown the orchestrator
LLM reads and reasons over — there is no parser, no deterministic merger. Every design decision is
therefore constrained by one question: **can a human author and the orchestrator LLM both apply this
rule reliably from prose alone?** That constraint, not code elegance, drives the choices below.

## Implementation surface (established from the codebase before Q&A)

- **`load.md`** (30 lines) is read "at the start of any workflow" (`work-on-an-issue.md:7`,
  `manage-issues.md:5`). It lists 9 conventions in a required/optional table and, on a missing
  *required* convention, routes to `setup.md`. It currently reads only `.rp.md`. This is the primary
  extension point: probe + merge + warnings live here.
- **`setup.md`** (211 lines) writes `.rp.md` and manages `.gitignore`. Step 6 (`setup.md:195-201`)
  adds the worktree-folder entry and says (line 197) it is "the only entry Radical Pipelines requires"
  — a statement that becomes false. Step 4 (`setup.md:179-186`) is the committed-file
  confirm-before-write discipline to mirror at a lighter bar.
- **Dogfood `.rp.md`**: has **no Agent-models block** (so the worked example must be designed, not
  pointed at). Its Issues convention (`.rp.md:9-12`) already names *tracker identity* ("**GitHub is
  the source of truth**") separately from *access* ("accessed via the `gh` CLI") — the exact
  named-sub-statement seam the merge model needs. Health monitoring is `.rp.md:73-80` (`/loop 15m`).
- **`.gitignore`**: currently only `node_modules/`, `.env`, `.env.local`. Neither `.rp.local.md` nor
  the worktree folder is listed; `.claude/worktrees` is ignored via the **global** excludesfile
  (`~/.gitignore_global`), not this repo's `.gitignore`. So even the dogfood repo needs the new line.
- **Worktree topology (decisive for requirement 7)**: from inside `.claude/worktrees/<slug>`,
  `git rev-parse --git-common-dir` returns the **main** repo's `.git`
  (`/Users/.../radical-pipelines/.git`); the main repo root is that path's parent. `--show-toplevel`
  inside the worktree returns the worktree dir, but the main checkout (where the committed `.rp.md`
  lives and where the developer authors `.rp.local.md`) is deterministically the parent of the common
  git dir. This gives the loader a tool-agnostic way to find the developer's root-authored override.
- **Workflow ordering**: `create-pipeline.md:11-13` enters the worktree in step 2, *after* the
  workflow began and conventions were loaded — so on a fresh pipeline the loader runs at the main
  root. But on **resume** (`resume-pipeline.md:11-16`) and **manage-issues** the orchestrator may
  already be inside the worktree when it (re)loads conventions. The loader must therefore work
  correctly from **either** cwd, which is why a cwd-only probe is insufficient.
- **Single human-facing channel**: `SKILL.md:14` — "Humans only talk with you, never with the other
  agents." The orchestrator's run output is the only place warnings can surface; there is no log.

## Topics to resolve (decided one at a time, on the researcher's evidence)

1. Worktree-visibility mechanism — how the loader resolves a root-authored `.rp.local.md` when running
   inside the git-ignored worktree (the must-resolve item).
2. The exact `load.md` loader change — read order, probe, merge, validate-after-completeness placement,
   and how the merge/precedence rules are phrased for reliable LLM application.
3. The named-unit merge model in practice + the non-overridable marker syntax + a worked Agent-models
   override example (designed, since the dogfood `.rp.md` has none).
4. The four warnings — exact wording shape and where/how they surface (inline vs. batched summary).
5. The `setup.md` changes — `.gitignore` entry, fixing the "only entry required" contradiction,
   optional `.rp.md` breadcrumb, and the light confirm-before-write rule.
6. Docs / discoverability surface (load.md / README) and the assisted-mode inertness note.
7. Backward compatibility — absent `.rp.local.md` behaves exactly as today.

---

## Q&A

_(Questions routed to the researcher via `team-lead`, one topic at a time. Each entry records the
question, the researcher's findings, and the design decision reached.)_

### Q1 — Worktree-visibility mechanism (the must-resolve item)

**Question (to researcher):** Spec req 7 names two candidate mechanisms — (i) the loader reads
`.rp.local.md` from the project's main root regardless of cwd, vs (ii) ensure the file is present next
to whichever `.rp.md` the loader reads (copy into the worktree). Which is more robust / less leak-prone
here? (1) Does copying into the worktree risk it landing in a pipeline commit, given the worktree is a
real checkout on the pipeline branch? (2) Is "directory containing the committed `.rp.md` = main root =
parent of the common git dir" a reliable, tool-agnostic phrasing, or is a CC-/Pi-specific path needed —
does Pi's `@zenobius/pi-worktrees` share the same common-git-dir topology? (3) Can the probe be phrased
"probe for `.rp.local.md` in the same directory you read `.rp.md` from," or are there entry points
(fresh / resume / manage-issues) where `.rp.md` is read from a worktree copy, breaking that shorthand?
(4) Failure mode where the main root can't be determined, and what to do then.

My pre-question leaning: READ-from-root model (loader reads the override from the main checkout root —
the parent of the common git dir / the directory holding the committed `.rp.md` — regardless of cwd),
not a copy-into-worktree model.

**Answer (researcher, via team-lead):** Read-from-root is the right mechanism, for a sharper reason
than "copy is leak-prone." Key findings:

- **Premise correction:** the worktree folder is ignored by *nothing* in this repo (project
  `.gitignore` = only `node_modules/`, `.env`, `.env.local`; global excludesfile has no claude pattern;
  `.git/info/exclude` is the default). Proof: `git check-ignore -v .claude/worktrees` → exit 1;
  `git status --porcelain` → `?? .claude/`. (Existing/separate concern — pipeline commits happen *inside*
  the worktree on the pipeline branch, so the parent-repo untracked `.claude/` never reaches a pipeline
  commit.)
- **Leak risk (Q1):** Once setup adds the committed `.gitignore` entry for `.rp.local.md` (req 2 & 23),
  **both** approaches are leak-safe — a worktree checks out that same committed `.gitignore`, so a
  physically-copied `.rp.local.md` is ignored inside the worktree too (scratch-repo proof: check-ignore
  matches inside `git worktree add`, worktree `git status` empty). **But** the leak risk is real when the
  ignore entry is *missing* — exactly the pre-condition req 18 anticipates. Proof in this very worktree:
  `git check-ignore -v --no-index .rp.local.md` → exit 1 (not yet ignored, old 3-line `.gitignore`).
  Copy-into-worktree on such a project would drop an untracked `.rp.local.md` where a broad `git add -A`
  during a phase commit could sweep it onto the pipeline branch. **Read-from-root never creates a file
  inside the worktree, so it cannot be swept in regardless of ignore-entry state** — it removes the
  failure mode rather than relying on the ignore entry to neutralize it.
- **Location phrasing (Q2):** topology confirmed — from inside the worktree `--show-toplevel` → the
  *worktree* dir; `--git-common-dir` → the *main* repo's `.git` (absolute); main root is its parent. So
  `dirname(git rev-parse --git-common-dir)` reliably yields the project main root from **any** cwd in the
  repo. Phrase it as "parent of the common git dir," **not** `--show-toplevel` (which diverges inside
  worktrees). Tool-agnostic: both Claude Code's `EnterWorktree` and Pi's `@zenobius/pi-worktrees` create
  standard `git worktree`s → same common-git-dir topology, so no per-tool helper needed. _(Pi equivalence
  reasoned from it being a git-worktree wrapper, README:113/135/147; not source-verified.)_
- **"Same dir as `.rp.md`" shorthand is UNSAFE (Q3):** the committed `.rp.md` is *tracked*, so it's
  checked out into every worktree too — it exists at both the main root *and* inside the worktree.
  `load.md:5` has no directory anchor, so the orchestrator reads whichever `.rp.md` is in cwd. Fresh
  pipeline → main-root `.rp.md` (correct by luck, conventions load before worktree entry). **Resume and
  manage-issues → the orchestrator may already be inside the worktree → "same dir" resolves to the
  worktree copy, where `.rp.local.md` is git-ignored-absent → the override is silently missed.** So the
  override-probe must resolve **explicitly to the project main root (parent of common git dir)**,
  independent of cwd and of which `.rp.md` copy was read. More robustly: anchor **both** reads (committed
  `.rp.md` and `.rp.local.md`) to the main root so they always come from the same authoritative place
  (also future-proofs against a worktree's `.rp.md` momentarily diverging during a convention-editing
  branch).
- **Failure modes (Q4):** outside a git repo `--git-common-dir` fails (degenerate — RP requires git);
  detached HEAD still resolves; assisted flow uses the same loader. General principle (grounded in
  req 4/17): any inability to locate or parse the override must **degrade to "committed conventions only"
  with at most a warning — never hard-stop, never make a required convention read as missing or trigger
  setup.**

**Decision — RESOLVED: read-from-main-root, anchored to the parent of the common git dir, fail-soft.**

1. **Anchor both reads to the project main root.** The loader resolves the project main root once as
   **the parent directory of the git *common* dir** (`dirname` of `git rev-parse --git-common-dir`), which
   equals the directory holding the committed `.rp.md`, and is correct from any cwd — at the main checkout
   it is the toplevel; inside a worktree it is *not* the worktree dir. The loader reads the committed
   `.rp.md` from this main root and probes for `.rp.local.md` in the **same main root**. This makes the
   override resolve identically across fresh / resume / manage-issues, autonomous / assisted, Claude Code /
   Pi.
2. **No copy into the worktree.** The override is *read* from the main root and merged in memory; the
   resolved conventions are what the orchestrator carries and passes to agents. Nothing is written into the
   worktree. This is strictly more robust than copy-into-worktree because it is correct even in the exact
   pre-condition req 18 anticipates (a project that has not yet added the ignore entry) — there is no file
   inside the worktree for a broad `git add` to sweep onto the pipeline branch.
3. **Phrasing in `load.md`:** name the location as "the project's main checkout root — the directory that
   holds the committed `.rp.md`, i.e. the parent of the repository's common git directory — even when you
   are running inside a worktree, where the current directory is *not* that root." Give the orchestrator
   the concrete `git rev-parse --git-common-dir` recipe as the reliable way to find it. Tool-agnostic; no
   CC-/Pi-specific branch.
4. **Fail-soft on resolution failure:** if the main root cannot be determined or the override cannot be
   read, treat it exactly as "no `.rp.local.md` present" (proceed with committed conventions, req 4) — at
   most a warning, never a hard-stop and never a path into setup. This mirrors req 17's malformed-unit
   fail-soft rule.

**Trade-offs noted:** read-from-root costs one explicit "find the main root" step in the loader prose
that the orchestrator must perform on resume/manage-issues (it can't lazily rely on cwd). That is a
deliberate, small cost paid to eliminate (a) the silent-miss bug on resume and (b) the
sweep-onto-branch leak when the ignore entry is absent. The alternative (copy-into-worktree) is simpler
to phrase but only as safe as an ignore entry the spec explicitly says may be missing — unacceptable for
the "never committed" guarantee.

### Q2 — The exact `load.md` loader change (flow & document structure)

**Question (to researcher):** (1) Structure — should the override mechanism (probe + merge rules +
warnings + worked example + overridable-subset guidance) live INLINE in `load.md` or in a NEW sibling
reference file that `load.md` points to (mirroring how `setup.md` is a separate file `load.md` routes
to)? Which matches the skill's existing decomposition norm? Does req 20 ("in the convention-loading
docs") bias toward inline? (2) Ordering — confirm the insertion point sits after the
required-completeness check PASSES and before conventions are used; any existing wording it would
contradict; any downstream consumer that assumes conventions are fully resolved at a specific point.
(3) Presenting the overridable subset — add an "Overridable?" column to the 9-row table, or a separate
prose list (given Issues is only partially overridable)? (4) Fail-soft phrasing — how to phrase that
override resolution can never turn a valid committed set into "missing required → setup"; any precedent
"this step cannot change that earlier step's outcome" phrasing to mirror.

**Answer (researcher, via team-lead):**

- **(Q1 structure) NEW sibling file `conventions/local-overrides.md`; `load.md` gains only a short
  post-validation probe step that routes to it.** Matches the skill's exact decomposition precedent:
  `load.md` (29 lines, the smallest reference doc) *already* delegates — "If one or more required
  conventions are missing... Read `setup.md`" (load.md:27) — to a separate 210-line `setup.md`. The
  pattern repeats throughout: SKILL.md (56) → load.md; load.md → setup.md + per-tool files; setup.md →
  claude-code.md/pi.md (setup.md:21-24); autonomous-workflow.md → autonomous-phases/<n>.md. Norm: short
  orchestrator-facing *gate* docs delegate detail to *procedure* siblings. Line counts: gate docs cluster
  under ~85 lines (load.md 29, claude-code.md 42, work-on-an-issue.md 57, pi.md 65, manage-issues.md 66,
  autonomous-workflow.md 83); only setup.md (210) and assisted-phase guides (138/162/272) run long, and
  those are pure procedure. The override merge rules + 4 warnings + worked example + overridable subset are
  ~80-130 lines of "fat procedure"; inlining would ~quadruple load.md and break its altitude. On req 20
  ("in the convention-loading docs"): a sibling under `conventions/` IS "the convention-loading docs"
  (setup.md already is). Req 20's cross-reference-from-setup + conventions-overview-mention only make sense
  if the canonical text lives in ONE place others point at — a sibling, not duplicated inline.
- **(Q2 ordering) Insert after the "## Missing conventions" gate's PASS branch, before conventions are
  used.** load.md today: read (1-8) → "## Conventions" table (10-21) → "## Missing conventions" gate
  (23-29). Add a new "## Local overrides" step after the gate, executed only when all required are present.
  No current wording is contradicted; sequence against load.md:25 ("continue the workflow unchanged") so
  "continue" now means "continue after applying any local overrides." Downstream check: **NO consumer
  re-resolves conventions** — all consume the already-resolved set, so the merge is transparent if it
  completes before hand-off. The consumption point is autonomous-workflow.md:59-63 (injects Artifact
  folder + Commit format, resolves Agent models at spawn) and assisted-workflow.md:28 (Commit format +,
  per req 24, Issues access); both assume resolution already happened. Only obligation: **merge runs before
  the first spawn** (load at workflow start, spawn in step 5 — satisfied). **SUBTLETY flagged:** load.md
  can be RE-invoked on resume/manage-issues, so the merge step must be **idempotent and re-run on each
  load** — nothing persists the merged result today (recomputed per session), which is the desired
  behaviour; resume *inside* the worktree must re-resolve from main root rather than assume a prior merge
  persisted.
- **(Q3 presenting the subset) Keep the 9-row table as-is; express overridability as a SEPARATE
  three-group classification in `local-overrides.md`. Do NOT add an "Overridable?" column.** A single
  boolean can't capture the Issues row (access overridable, tracker identity locked — `.rp.md:9` "GitHub
  is the source of truth" AND `.rp.md:11` "accessed via the `gh` CLI" in one block) nor Health monitoring
  (the `/loop` *form* is tool-forced, only the cadence *argument* is overridable). Overridability is
  orthogonal to "Required?" with three values. Clean grouping (mirrors req 12/13/16): **(1) Overridable** —
  Agent models; Health-monitoring cadence; Issues ACCESS sub-statement. **(2) Locked-shared** — commit
  format, artifact folder, pipeline slug, branch names, worktree naming, Issues TRACKER IDENTITY.
  **(3) Tool-forced** — command FORMS dictated by the active tool (worktree/branch-name/team-spawning/
  health-monitor command forms); form locked, but in-scope argument values (e.g. cadence) are not.
- **(Q4 fail-soft phrasing) Precedents to mirror:** setup.md:186 ("do not create a MISLEADING complete
  conventions file" — same "a later writing step must not fabricate completeness" spirit) and load.md:25
  ("continue the workflow UNCHANGED") + the gate's binary already-decided outcome. Recommended text for
  `local-overrides.md`: _"Local overrides are applied only AFTER the committed conventions have already
  passed the required-completeness check. The merge is a layering step over an already-valid base: for each
  named unit it may REPLACE the committed value or ADD a new keyed entry, but it can never REMOVE a
  convention or make one read as missing. Required completeness is decided by the committed `.rp.md` alone,
  before this step runs; nothing here can change that outcome or route to setup. If `.rp.local.md` is
  absent, malformed, or unresolvable, proceed with the committed conventions unchanged."_ And one guard
  sentence in `load.md` after the gate: _"The required-completeness decision above is final; the
  local-override step below can only adjust or add values on top of an already-valid set — it never
  re-opens that decision."_

**Decision — RESOLVED.**

1. **Sibling file `skills/radical-pipelines/reference/conventions/local-overrides.md`** holds the full
   override mechanism: the main-root probe (from Q1), the merge model + non-overridable marker (Q3 topic),
   the three-group overridable classification, the four warnings, the worked example, and the assisted-mode
   inertness note. `load.md` stays a thin gate that routes to it.
2. **`load.md` edits (minimal):**
   - Keep the existing read (1-8), the 9-row table (10-21) **unchanged** (no new column), and the
     "## Missing conventions" gate (23-29) **verbatim**.
   - Add a new final section, "## Local overrides," that fires **only on the gate's PASS branch**: "Once
     the committed conventions pass the required-completeness check above, and before using them or passing
     them to any agent, probe for a local override and apply it per `local-overrides.md`. If absent, proceed
     unchanged." Include the guard sentence: "The required-completeness decision above is final; the
     local-override step can only adjust or add values on top of an already-valid set — it never re-opens
     that decision."
   - Note idempotence: "Resolve the override on every load (including resume), reading `.rp.local.md` from
     the project's main checkout root; nothing about the result is persisted between sessions."
3. **`local-overrides.md` structure** (the fat procedure doc), in this order: (a) what/where the file is +
   main-root resolution (Q1); (b) the layering/fail-soft guarantee (Q4 text above); (c) the merge model +
   non-overridable marker (Q3 next topic); (d) "What's overridable" — the three labeled groups; (e) the
   four warnings; (f) the worked Agent-models example; (g) assisted-mode inertness note (req 24); (h)
   git-ignored / never-affects-others note (req 20). Discoverability wiring: setup.md cross-references it
   (also its §6 gitignore step, req 23); SKILL.md's "Project conventions" blurb (SKILL.md:42-46) gains the
   one-line conventions-overview mention; README conventions overview gains a mention (req 20).

**Trade-offs noted:** a sibling file adds one indirection hop the orchestrator must follow at load time,
but that is the skill's own established pattern (load.md→setup.md) and keeps load.md at its current
altitude. The alternative — inlining — would quadruple the smallest, most-frequently-read gate doc and
mix "decide completeness" with "layer overrides," eroding the clean binary gate. Idempotent re-resolution
on every load is required (not optional) so resume/manage-issues inside the worktree re-pick the override
from main root; this is recorded as an explicit instruction, since an LLM might otherwise assume a prior
session's merge persisted.

### Q3 — Merge model in practice, non-overridable marker syntax, worked Agent-models example

**Question (to researcher):** (1) Matching rule for a named PROSE sub-statement (Issues access) so the
LLM matches reliably without arbitrary-substring matching, with NO new syntax (req 19) — restate the
block, recommend authoring access as its own labeled line, or other? (2) Non-overridable marker syntax
(req 14) — concrete marker working at both whole-convention and single-unit granularity, natural for a
human, reliable for LLM detection; and keep INHERENT locks (tracker identity, shared-output) distinct
from DISCRETIONARY project locks so warnings 15 vs 16 name the right reason. (3) Worked Agent-models
example end-to-end (committed block + local override of one agent + add a new agent + resolved result),
using real RP agent names and opaque tool-native values. (4) Whether Issues-access and health-cadence
also need worked micro-examples or just the Agent-models one is mandated.

**Answer (researcher, via team-lead):**

- **(Q1 prose matching)** The two Issues sub-statements have UNEQUAL anchor quality: tracker identity
  (`.rp.md:9` `**GitHub is the source of truth**`) is a bolded phrase in its own sentence — strong, stable
  anchor; access (`.rp.md:11` `- **GitHub**: <url> — accessed via the `gh` CLI.`) sits MID-BULLET after an
  em-dash, on a bullet whose label (`**GitHub**`) is really about identity — WEAK anchor (the
  arbitrary-substring hazard req 8 warns against). **Recommendation — blend, with the labeled line as the
  durable fix:** (a) matching rule = the local file restates the convention by its committed HEADING plus
  the smallest committed-named anchor; the LLM matches on heading + recognizable named sub-statement, NOT
  free substring search (for Issues access, the local file reproduces the access-bearing bullet with the
  access clause changed, merge replaces the access sub-statement and leaves the identity sentence
  untouched). (b) the design SHOULD recommend authors who want per-developer access overrides give the
  access mechanism its OWN labeled line — e.g. `- **Access:** the `gh` CLI` — reusing the existing
  `**Label:**` idiom (NO new syntax, req 19) so it map-merges like an Agent-models bullet and the warning
  split (identity locked / access overridable) is unambiguous. Mechanism works on current prose
  (backward-compatible, no `.rp.md` change forced); docs note the labeled-line benefit. Whether to also
  refactor the dogfood `.rp.md` Issues block to add `**Access:**` is a scoping call (would make the dogfood
  exemplary; not required).
- **(Q2 marker)** **Recommendation: a parenthetical `(non-overridable)` appended to the heading or
  bullet-label of the locked unit** — strongest because it MIRRORS an idiom the skill already uses:
  setup.md marks status as `### Pipeline base slug (required)`, `### Issues (required)`,
  `### Health monitoring (required)` (setup.md:32,46,62,68,74,100,106). The LLM already reads parenthetical
  heading tags as status flags. Whole convention: `### Agent models (non-overridable)`. Single unit:
  `- **spec-writer:** anthropic/claude-opus-4-8 (non-overridable)` or prose
  `**GitHub is the source of truth** (non-overridable)`. **Rejected:** HTML comment (zero precedent — grep
  `<!--` over reference/ → none; invisible to human skimmers); trailing sentence (ambiguous binding for a
  single bullet). The parenthetical binds tightly to the exact label it follows and is collision-safe
  (sits in heading/label metadata namespace; no convention VALUE ends in that token). **INHERENT vs
  DISCRETIONARY locks kept distinct:** INHERENT (req 16) = shared-output conventions + Issues TRACKER
  IDENTITY + tool-forced forms, locked BY CLASSIFICATION, NEVER need a marker. DISCRETIONARY (req 14) = the
  `(non-overridable)` marker, ONLY for a project to lock an otherwise-overridable unit (pin Agent models;
  freeze Issues access). **Maps to warning text by lock SOURCE, not outcome:** req-15 ("the project marked
  it non-overridable") fires ONLY for marker hits; req-16 ("not locally overridable because shared across
  collaborators / forced by the active tool") fires for inherent families and must NEVER cite a marker.
- **(Q3 worked Agent-models example)** Real names (grep confirms `spec-writer`/`code-writer`/
  `code-reviewer` are actual agents; setup.md:93 itself uses spec-writer/code-reviewer); opaque
  tool-native values (setup.md:98).
  - Committed `.rp.md` (illustrative): `### Agent models` → `- **Default:** anthropic/claude-sonnet-4-6` /
    `- **spec-writer:** anthropic/claude-opus-4-8` / `- **code-writer:** anthropic/claude-opus-4-8`.
  - Developer `.rp.local.md`: `### Agent models` → `- **spec-writer:** anthropic/claude-opus-4-8
    (effort: high)` / `- **code-reviewer:** anthropic/claude-sonnet-4-6`.
  - Resolved: Default inherited; **spec-writer REPLACED wholesale** (whole value incl. `(effort: high)`
    swapped in, not blended — reinforces "no partial blending inside a unit"); code-writer inherited;
    **code-reviewer ADDED** (new label). Shows req 9/10 in one example.
- **(Q4 micro-examples)** Agree with the lean. Req 20 mandates the FULL Agent-models example (Q3); the
  other two appear as COMPACT illustrations: **Issues access** — before/after (`… accessed via the
  `gh` CLI.` → local restates the access line as `… accessed via the GitHub MCP server.` → resolved:
  access = GitHub MCP, identity sentence retained); doubles as the worked example for acceptance criterion
  spec.md:109. **Health cadence** — one line (committed `/loop 5m`; dogfood `15m` at `.rp.md:76`; local
  sets cadence `30m`; resolved: loops every 30m), emphasizing ONLY the cadence VALUE changes — the `/loop`
  command FORM is tool-forced (claude-code.md:37, req 13), so a local file changing the command form is
  ignored+warned per req 16. The natural place to make the form-vs-argument distinction concrete.

**Decision — RESOLVED.**

1. **Unit-matching rules (in `local-overrides.md`):** state three unit shapes and how each is matched —
   (a) **labeled bullet** (Agent models): match by the exact `**<label>:**`; (b) **named prose
   sub-statement** (Issues access vs identity): match by the convention HEADING + the committed named
   sub-statement, restating the named line with its value changed — NEVER free-substring matching; (c)
   **atomic convention** (health cadence): the whole convention is the unit. Explicit instruction: "Match
   only against names the committed file already draws; if you cannot map a local entry to a named unit the
   committed file presents, treat that entry as malformed (warn-and-ignore per req 17)." This is what keeps
   the LLM off arbitrary-substring matching.
2. **Recommend (don't force) a labeled `**Access:**` line for Issues access.** `local-overrides.md` and
   the authoring guidance note that a project wanting reliable per-developer access overrides benefits from
   authoring the access mechanism as its own `**Access:**`-style labeled bullet, reusing the existing
   bold-label idiom — but the mechanism still works on the current mid-bullet prose via heading+named-clause
   matching, so backward compatibility holds (req 4). **Scoping decision (mine, to flag to team-lead):**
   leave the dogfood `.rp.md` Issues block AS-IS for now (no forced refactor) — the mechanism is
   backward-compatible by design and refactoring the dogfood conventions is outside this feature's blast
   radius; the docs will carry the `**Access:**` recommendation for projects that want it. (If the code
   phase finds the dogfood example reads better refactored, that's a small optional follow-up, not a design
   requirement.)
3. **Non-overridable marker = `(non-overridable)` parenthetical** appended to the heading or bullet-label,
   mirroring setup.md's `(required)` idiom. Works at whole-convention and single-unit granularity.
   `local-overrides.md` documents it as the rarely-used, opt-in project marker (req 14).
4. **Two lock SOURCES drive two warning texts (locks recorded here, wording finalized in the warnings
   topic):** DISCRETIONARY marker hit → req-15 text "the project marked it non-overridable"; INHERENT
   family (shared-output, Issues tracker identity, tool-forced form) → req-16 text "not locally overridable
   because it is shared across collaborators or forced by the active tool." The LLM selects the warning by
   WHY the unit is locked, never by the outcome. Inherent families never need and never carry the marker.
5. **Worked examples in `local-overrides.md`:** the FULL Agent-models map-merge example exactly as the
   researcher designed it (committed block → local override of `**spec-writer:**` + add `**code-reviewer:**`
   → resolved set with replace/add/inherit annotations and the `(effort: high)` wholesale-replace point);
   plus the COMPACT Issues-access before/after and the one-line Health-cadence illustration (with the
   form-vs-argument distinction). All three unit shapes shown once.

**Trade-offs noted:** the `(non-overridable)` parenthetical reuses an idiom the LLM already parses, at the
cost that an author must place it on the right heading/label; documented with examples at both
granularities to make that unambiguous. Matching named prose sub-statements off the committed heading +
named clause is inherently softer than matching a `**label:**`, which is exactly why the design (a)
forbids free-substring matching and routes unmatched entries to warn-and-ignore, and (b) recommends the
labeled `**Access:**` line as the durable fix — converting the soft case into a hard-labeled one without
new syntax. Not forcing the dogfood refactor keeps the feature's blast radius tight and proves the
backward-compatible path works on real existing prose.

### Q4 — The four warnings: wording template and where/how they surface

**Question (to researcher):** (1) Surfacing — inline-at-load-time vs a single batched startup summary;
which is more usable and more testable given autonomous runs go end-to-end (SKILL.md:24) and the
orchestrator is the sole channel (SKILL.md:14); is there an existing "tell the owner" pattern (e.g.
setup.md:5-11, :205-210) to mirror? (2) Wording template — one consistent one-line-per-warning template
that NAMES THE UNIT + STATES REASON, with req-15 vs req-16 reasons distinct enough for a test, and req-17
naming the offending unit by whatever label the local file used. (3) Suppression — confirm the summary is
emitted only when `.rp.local.md` is present; emit a short positive applied-summary when all units apply
cleanly, vs stay silent. (4) Gitignore-missing (req 18) — which `.gitignore` is checked (main root, per
the read-from-root decision); is it independent of merge outcome.

**Answer (researcher, via team-lead):**

- **(Q1 surfacing) Batched startup summary, and NOT a novel surface.** Closest existing precedent:
  **autonomous-workflow.md:51** — on phase completion the orchestrator gives "a short report… and any
  notes worth surfacing (e.g. … **deviations from defaults**). Do not ask questions — this is informational
  only." Local overrides ARE deviations from defaults; this line already establishes the exact surface
  (short, informational, non-blocking) and **resolves the SKILL.md:24 "end-to-end without further
  questions" tension** — an informational summary is allowed, a QUESTION is not. Structural template:
  **setup.md:5-11** ("Tell the owner:" enumerated found/missing list) fires at the same convention-load
  moment; setup.md:205-210 is a second enumerated-report precedent. Batched beats inline: (a) testable —
  one deterministic place to assert; (b) usable — doesn't interleave with streaming phase output; (c)
  matches the load-at-start step. The gitignore-missing warning folds into the same block. Phrase the
  summary as "give the owner a short, informational report (do not ask questions)," borrowing
  autonomous-workflow.md:51's no-questions framing so it's safe inside an autonomous run.
- **(Q2 wording template)** One line per item: `- <unit>: <what happened> — <reason>. Using the committed
  value.` (trailing sentence omitted for applied/gitignore lines). Distinct reason strings:
  - APPLIED: `- Agent models › spec-writer: applied your local model.` / `- Agent models › code-reviewer:
    added (new entry).`
  - req-15 DISCRETIONARY: `- Agent models › spec-writer: override ignored — the project marked this unit
    non-overridable. Using the committed value.`
  - req-16 INHERENT (three sub-reasons): shared-output → `- Commit format: override ignored — not locally
    overridable because it is shared across collaborators. Using the committed value.`; Issues tracker
    identity → `- Issues › tracker identity: override ignored — not locally overridable because the
    source-of-truth tracker is shared across collaborators. Using the committed value.`; tool-forced →
    `- Worktrees command form: override ignored — not locally overridable because it is forced by the
    active tool. Using the committed value.`
  - req-17 MALFORMED: `- <label/heading as written in .rp.local.md>: ignored — could not be applied
    (unrecognized or malformed unit). Using the committed value.`
  - **Discriminability confirmed:** req-15's reason ALWAYS contains "the project marked" and NEVER "shared
    across collaborators / forced by the active tool"; req-16's ALWAYS contains exactly one of "shared
    across collaborators" / "forced by the active tool" and NEVER "the project marked." The LLM picks the
    reason string by lock SOURCE, not outcome (the Q3 rule, surfaced verbatim; a test asserts on the reason
    substring). req-17 names the offending unit by **whatever label/heading the local file used** (the
    literal text the developer wrote, e.g. a typo'd `### Helth monitoring`) — always possible, even a
    malformed unit has a textual handle.
- **(Q3 suppression) Confirmed:** emit the block **iff `.rp.local.md` exists at the main root** (the
  gitignore-missing case implies presence). When ABSENT, emit NOTHING — no block, no "no overrides found"
  line — per req 4 (verified `.rp.local.md` is absent in this repo today, so present-day behaviour stays
  silent). **Positive applied-confirmation: ENDORSED** — emit a short applied-summary whenever the file is
  present, because req 24's worry is "silently inert" overrides; a one-line "local overrides applied:
  <units>" closes the trust gap and makes the happy-path criterion assertable (sanctioned by
  autonomous-workflow.md:51's "deviations from defaults"). Suggested block shape: a `Local overrides
  (.rp.local.md):` header, an `Applied:` line, an `Ignored:` line (only if any), and a `Warning:` line for
  the gitignore gap (only if applicable). One block, present-only, informational, no questions.
- **(Q4 gitignore-missing) WHICH `.gitignore`: the project MAIN-ROOT one** — same directory the loader
  resolves `.rp.local.md` from (parent of common git dir, Q1). That root `.gitignore` is the committed
  shared file setup carries the entry in (req 2/23, setup.md §6 :196-201) and its checked-out copy protects
  the worktree too. **Most robust check is FUNCTIONAL, not textual: `git check-ignore .rp.local.md` from
  the main root** (exit 0 = ignored/safe; exit 1 = NOT ignored → warn). Verified in this worktree: exit 1
  (absent/unignored today). Using `git check-ignore` rather than grepping `.gitignore` text correctly
  accounts for the entry possibly living in a parent/global ignore (avoids a false "missing" warning).
  **Independent of merge outcome: YES** — req 18 is a file-safety check, orthogonal to whether any unit
  merged; must fire even if every unit is shared/ignored/malformed (the risk is the untracked FILE landing
  in a commit, not its contents). Runs on mere presence; if the file is absent, no check, no warning.

**Decision — RESOLVED.**

1. **Single batched "Local overrides" summary, emitted at load time** right after the merge and before the
   first spawn / phase work, framed as a **short informational report, no questions** (explicitly mirroring
   autonomous-workflow.md:51 so it is safe inside an autonomous end-to-end run). `local-overrides.md`
   documents this surface; `load.md`'s new "## Local overrides" step references it as the moment the report
   is given.
2. **Block shape** (present-only): a `Local overrides (.rp.local.md):` header followed by — `Applied:`
   (units that took effect, naming each); `Ignored:` (each ignored unit on its own line with its reason,
   only if any); `Warning:` (the gitignore-gap line, only if applicable). When `.rp.local.md` is absent,
   **emit nothing at all** (req 4 backward-compat). When present and fully clean, emit just the header +
   `Applied:` line (closes the "silently inert" trust gap, req 24).
3. **One-line-per-item template** `- <unit>: <what happened> — <reason>. Using the committed value.` with
   the four reason families exactly as the researcher proposed. The doc states the **reason string is
   chosen by lock SOURCE**: discretionary marker → "the project marked this unit non-overridable" (req 15);
   inherent → exactly one of "shared across collaborators" / "forced by the active tool" (req 16); malformed
   → "could not be applied (unrecognized or malformed unit)" (req 17), **naming the unit by the literal
   heading/label the developer wrote in `.rp.local.md`**. The doc explicitly notes these reason strings are
   mutually exclusive so tests can discriminate req-15 vs req-16 vs req-17 on the reason substring.
4. **req-18 gitignore check = `git check-ignore .rp.local.md` run from the project main root**, functional
   not textual, **independent of the merge outcome** (fires on mere presence even if every unit is ignored).
   On exit 1 (not ignored) emit the `Warning:` line; suggest adding the entry to the root `.gitignore`. The
   doc phrases it as "the project's ignore rules have no entry that ignores `.rp.local.md`" to stay correct
   when the entry could legitimately live in a parent/global ignore.

**Trade-offs noted:** batched-at-load gives one deterministic, testable surface and avoids interleaving
with phase output, at the cost that a developer reading a long run sees the override report only once at
the top — acceptable because conventions are resolved exactly once per load and the report rides the
existing "deviations from defaults" reporting channel. Using `git check-ignore` instead of grepping
`.gitignore` text is slightly less obvious to a reader of the doc but is strictly more correct (honors
parent/global ignore rules), so the doc names the command explicitly. Emitting a positive applied-summary
(rather than warning-only) is a small amount of extra output traded for closing the silent-inertness trust
gap the spec calls out in req 24.

### Q5 — The `setup.md` changes

**Question (to researcher):** (1) Step 6 edit — add the `.rp.local.md` entry alongside the worktree
folder, and a minimal reword of line 197's "only entry Radical Pipelines requires" that covers both
"worktree folder (per active tool)" and "`.rp.local.md` (always)" without over-specifying a count;
confirm the fork reminder (line 201) extends with no special handling. (2) Worktree-folder reality check —
the dogfood `.gitignore` lacks the worktree-folder line; should step-6 try to fix that or is it a separate
pre-existing concern (I lean: scope the edit to adding `.rp.local.md` + fixing the "only entry" wording,
not retroactively fixing the worktree line, but the reworded prose must be TRUE for a project that follows
setup). (3) Confirm-before-write for `.rp.local.md` (req 22) — does it live in `local-overrides.md` (my
lean) with setup.md cross-referencing, or in setup.md? (4) Breadcrumb (req 20) — does setup.md step 5
optionally offer the one-line breadcrumb, or just document that authors may add it; confirm no conflict
with confirm-before-write.

**Answer (researcher, via team-lead):**

- **(Q1 step-6 edit)** (a) Add `.rp.local.md` as a committed ignore entry alongside the worktree-folder
  entry. (b) Reword setup.md:197's "the only entry Radical Pipelines requires" to cover BOTH entries
  without over-specifying a count — preferred phrasing states purpose and degrades if more entries are
  added: _"Add the `.gitignore` entries Radical Pipelines requires: the worktree folder used by the active
  tool, and `.rp.local.md` (the git-ignored per-developer override file). The `.rp.local.md` entry is what
  makes the override file's 'never committed' guarantee hold."_ Cross-reference `local-overrides.md` here
  (req 20). (c) Fork reminder (setup.md:201) extends with NO special handling — `.rp.local.md` is one more
  line in whichever `.gitignore` setup manages (fork's main in fork mode, setup.md:127,193,201); being
  git-ignored it's airtight against upstream-PR leak (PR cherry-picks only code commits, :129-135; an
  ignored file is in no commit). Make :197 read plural so "the `.gitignore` change" at :201 follows
  naturally.
- **(Q2 worktree-folder reality check)** ENDORSE the lean: scope step-6 to ADD `.rp.local.md` + FIX the
  "only entry" wording; do NOT retroactively fix this dogfood repo's missing worktree line. This repo's
  `.gitignore` is `node_modules/`/`.env`/`.env.local` only (no worktree entry; `git check-ignore
  .claude/worktrees` → exit 1), so setup.md:197 already over-claims for this repo independent of this
  feature — a pre-existing dogfood-hygiene gap, orthogonal to overrides. Req 23 is about DOCS truth, not
  retrofitting this repo's `.gitignore`. Obligation it DOES impose: the reworded prose must be TRUE for a
  project that follows setup (a fresh consumer adds BOTH the worktree-folder entry AND `.rp.local.md`) —
  so state the step-6 instruction generically (both entries) and don't point at THIS repo's `.gitignore`
  as the exemplar. **IMPORTANT additional edit site the researcher caught: setup.md:114.** The
  Artifact-storage explainer (:114) lists "A `.gitignore` entry for the worktree folder used by the active
  agentic coding tool" — req 23 means RP now creates a SECOND required ignore entry, so :114 must be
  extended too (e.g. "…for the worktree folder, and one for `.rp.local.md`") or the explainer still implies
  a single entry. **Touch BOTH :114 and :197.**
- **(Q3 confirm-before-write)** ENDORSE: the rule lives in `local-overrides.md`, NOT setup.md (setup.md
  writes `.rp.md`, never `.rp.local.md`; the override path is hand-authoring, req 19; orchestrator-writes
  is an optional nicety, req 22). Phrase as a LIGHTER mirror of setup.md:179-186 — KEEP discipline (1)
  confirm-before-write / ask-before-overwrite (:181-184) but DROP (2) the don't-fabricate-COMPLETE-file
  concern (:186), since a local override is partial by design. Text: _"If the orchestrator ever writes
  `.rp.local.md` on the developer's behalf, first show the proposed content and ask for explicit
  confirmation; never overwrite an existing `.rp.local.md` without explicit approval. Unlike `.rp.md`, no
  completeness check applies — a local override states only the units it changes."_ setup.md's only role:
  the req-20 cross-reference to `local-overrides.md`.
- **(Q4 breadcrumb)** ENDORSE: setup.md step 5 (:188-193, where `.rp.md` content is composed) OPTIONALLY
  OFFERS a one-line breadcrumb (asked, not forced — req 20 says MAY), e.g. _"Local per-developer overrides
  are supported; see `local-overrides.md`."_ NO conflict with confirm-before-write: the breadcrumb is part
  of the `.rp.md` CONTENT the owner already confirms in step 4 (:181), not a separate write. Keep the
  breadcrumb pointing at the DOCS (advertising the CAPABILITY), not implying a `.rp.local.md` already
  exists (the file is created later, hand-authored by the developer).

**Decision — RESOLVED. setup.md edit surface:**

1. **setup.md:114** — extend the Artifact-storage explainer's ignore-entry bullet to name a SECOND
   required entry: the worktree folder *and* `.rp.local.md`. (Keeps the explainer consistent with step 6.)
2. **setup.md:197 (Step 6)** — replace "This is the only entry Radical Pipelines requires" with the
   purpose-stating, count-agnostic reword above (worktree folder per active tool + always-required
   `.rp.local.md`, with the "never committed" rationale), append `.rp.local.md` to the entries the step
   adds, and cross-reference `local-overrides.md` (req 20). The fork reminder (:201) needs no separate edit
   beyond reading naturally as plural.
3. **setup.md Step 5 (:188-193)** — optionally OFFER a one-line `.rp.md` breadcrumb pointing at
   `local-overrides.md` (asked, part of the owner-confirmed `.rp.md` content; advertises the capability,
   does not imply `.rp.local.md` exists).
4. **NOT in setup.md:** the confirm-before-write-`.rp.local.md` rule and the merge/warning machinery both
   live in `local-overrides.md` (req 22). setup.md only cross-references it.
5. **Scope guard:** do NOT retroactively add the worktree-folder line to this dogfood repo's `.gitignore`
   (pre-existing, orthogonal). Write the step-6 instruction generically so it is true for any conforming
   consumer; don't use this repo's non-conformant `.gitignore` as an exemplar in the docs.

**Trade-offs noted:** keeping the confirm-before-write rule and merge machinery OUT of setup.md (in
`local-overrides.md`) means setup.md grows by only a few lines (two ignore-entry edits + one optional
breadcrumb offer + one cross-reference) and the override mechanism stays in one canonical place — at the
cost of one cross-reference hop, consistent with the Q2 decomposition. Not fixing the dogfood worktree-line
gap keeps blast radius tight; the reworded prose is written to be true for a conforming project rather than
to describe this repo's current (non-conformant) `.gitignore`, which the design doc calls out explicitly so
the code phase doesn't mistake this repo's `.gitignore` for the prescribed shape.

### Q6 — Docs / discoverability surface + assisted-mode inertness note

**Question (to researcher):** (1) README touchpoint — exact placement/minimal content for the
conventions-overview mention (lean: short standalone paragraph after line 157 naming the subset and
pointing to the canonical doc). (2) SKILL.md mention — separate one-liner vs transitive pointer via
load.md (lean: add a clause to the existing SKILL.md:42-46 sentence). (3) Assisted-inertness note (req 24)
— single location in `local-overrides.md` (lean) vs also in assisted-workflow.md; confirm the three claims
against assisted-workflow.md:3/:21-22 and claude-code.md:35. (4) Any other req-20 touchpoint missing
(CONTRIBUTING.md, website/), or is README + SKILL.md + conventions/ docs the complete surface?

**Answer (researcher, via team-lead):**

- **(Q1 README) ENDORSE a short STANDALONE paragraph in Configuration, inserted AFTER line 157.** The
  section progresses :153 "what conventions are" → :155 "missing→setup" → :157 "shared vs per-tool incl.
  optional Agent models"; :157 is the natural seam because the overridable subset is exactly the set :157
  just described. Folding into :167 is wrong (:167 is about the merged single-file SHAPE); appending to
  :157 overloads an already-long paragraph. Suggested (one refinement — point the link at the
  convention-loading docs, matching :157's link style): _"Beyond the committed `.rp.md`, a developer may
  place a git-ignored `.rp.local.md` alongside it to override a restricted subset of conventions — agent
  models, the health-monitoring cadence, and how the issue tracker is accessed — for their own working copy
  or machine. It is never committed and never affects other contributors. See the
  [convention-loading docs](./skills/radical-pipelines/reference/conventions/local-overrides.md)."_
  Satisfies req 20's conventions-overview mention without restating the merge rule. README is the right
  level.
- **(Q2 SKILL.md) ENDORSE a CLAUSE on the existing sentence (no new paragraph), explicit over purely
  transitive.** SKILL.md is the orchestrator's top-level map; a reader scanning it should see local
  overrides EXIST without opening load.md — req 20 wants the capability discoverable through committed
  passive touchpoints, and a silent transitive link is not a touchpoint. Extend SKILL.md:46:
  _"...passing them to agents — including how a developer can locally override a restricted subset via a
  git-ignored `.rp.local.md`."_
- **(Q3 assisted-inertness) ENDORSE single canonical location in `local-overrides.md`, NO duplication into
  assisted-workflow.md** (req 24 is an override-EFFECT fact, belongs with override semantics;
  assisted-workflow.md stays terse). The three claims VERIFIED: (1) no agents in assisted runs → Agent
  models inert (assisted-workflow.md:3 "No agents are spawned"; :21-22 phases 4-5 can't run assisted; agent
  models consumed only at spawn, autonomous-workflow.md:62); (2) no monitor in assisted runs → cadence
  inert (claude-code.md:35 / pi.md:34 "Only the autonomous workflow launches the monitor; assisted runs do
  not"; monitor started only in autonomous-workflow.md:35); (3) orchestrator does tracker I/O → Issues
  access still applies (work-on-an-issue.md:15, manage-issues.md:5, .rp.md:27-38 — orchestrator reads/writes
  the tracker itself in BOTH modes). **Precision:** phrase claim 3 as "still applies because the
  orchestrator reads and writes the tracker itself in every mode" — it's the orchestrator-vs-agent
  distinction (not autonomous-vs-assisted) that makes access survive.
- **(Q4 completeness sweep) The req-20 surface is EXACTLY the four planned touchpoints; no other doc needs
  changing.** Req 20 does not imply a single doc (it enumerates content that must exist somewhere — all
  canonical content in `local-overrides.md`, lightweight mentions in README/SKILL.md). Whole-repo sweep:
  CONTRIBUTING.md does NOT document `.rp.md`/conventions (only unrelated hits at :138 changeset style,
  :264 GitHub settings) — no change; `website/` is marketing/demo, grep of index.html for
  `.rp.md`/conventions/configuration/setup/agent model/local override → ZERO matches — no change;
  AGENTS.md holds shared cross-agent INSTRUCTIONS (README:161), not the convention catalog — no obligation.

**Decision — RESOLVED. Discoverability surface (four committed touchpoints, complete):**

1. **`local-overrides.md` (NEW, canonical)** — carries the full req-20 content: filename + location; the
   merge rule; the three-group overridable-vs-shared guidance; the git-ignored / never-affects-others note;
   the worked Agent-models example; the confirm-before-write rule (Q5); and the **assisted-inertness note**
   (req 24) phrased with the orchestrator-vs-agent precision: _"Overrides take effect only where the
   convention is exercised. In assisted runs no agents and no monitor are spawned, so Agent-models and
   Health-monitoring overrides have no effect; the Issues access-mechanism override still applies because
   the orchestrator reads and writes the tracker itself in every mode."_
2. **`load.md`** — the thin gate routes to `local-overrides.md` at the post-validation step (Q2).
3. **`setup.md`** — cross-reference to `local-overrides.md` at the §6 git-ignore edit + the optional
   `.rp.md` breadcrumb at step 5 (Q5).
4. **Conventions-overview mention (req 20), split:** a short standalone paragraph in README after line 157
   (text above), and a one-clause extension to SKILL.md:46 (text above). No CONTRIBUTING.md / website/ /
   AGENTS.md change.

**Trade-offs noted:** the canonical override content lives in exactly one place (`local-overrides.md`) and
every other touchpoint is a lightweight pointer — this keeps the four surfaces in sync (one source of
truth) at the cost of the reader following one link from README/SKILL.md/load.md/setup.md to the full
rules, which is the skill's established pattern. The assisted-inertness note is stated once where override
semantics live rather than duplicated into assisted-workflow.md, so the terse workflow doc stays terse and
there is no risk of the two copies drifting.

### Q7 — Backward compatibility (req 4) — synthesis, no new research round

**Why no researcher round:** req 4 ("a project with no `.rp.local.md` behaves exactly as before — the
absence changes nothing and produces no warning") is satisfied entirely by decisions already taken under
Q1/Q2/Q4 with cited evidence; there is no open design question to put to the researcher. Recording the
synthesis rather than manufacturing a question.

**Decision — backward compatibility is structural, not an added check:**

1. **The override step is gated on the existing required-completeness PASS branch (Q2).** `load.md`'s
   read (1-8), the 9-row table (10-21), and the "## Missing conventions" gate (23-29) stay **byte-for-byte
   unchanged**; the new "## Local overrides" section runs *after* the gate and only on PASS. A project
   that never had `.rp.local.md` and the orchestrator that never finds one therefore traverse the exact
   same path as today up to and including the completeness decision.
2. **Absent `.rp.local.md` → probe finds nothing → emit NOTHING (Q4).** The summary block is emitted only
   when `.rp.local.md` is present at the main root; absence produces no block, no "no overrides found"
   line, no warning. Verified the file is absent in this repo today (main root and worktree), so present-day
   behaviour stays silent — the common case.
3. **Fail-soft means even a resolution hiccup degrades to today's behaviour (Q1).** If the main root can't
   be determined or the file can't be read, the loader treats it as "no `.rp.local.md`" and proceeds with
   committed conventions — never a hard-stop, never a path into setup. So backward compatibility is robust
   to errors, not just to the clean absent case.
4. **The required-completeness outcome can never change (Q2 fail-soft guard).** The override is a pure
   layering step that only REPLACES or ADDS over an already-valid base and can never make a convention read
   as missing (the load.md guard sentence + the `local-overrides.md` layering paragraph). So a malformed
   present `.rp.local.md` also can't break a previously-working project (req 17), and a missing required
   convention still routes to setup regardless of the local file (req 6).

**Maps directly to the spec's backward-compat / discovery acceptance criteria:** "no `.rp.local.md` →
loads exactly as before, no override warning" (gate unchanged + present-only emission); "`.rp.md` read and
validated first, only afterward `.rp.local.md` probed" (ordering, Q2); "root-authored override takes
effect inside the worktree" (read-from-main-root, Q1); "missing required + local supplies it → still
setup" and "malformed local → no missing-required, no setup" (layering guard, Q2/Q4). No residual open
question.

---

## Consolidated design (all topics decided)

The design is complete. Summary of every change, by file, for the plan/code phases.

### New file — `skills/radical-pipelines/reference/conventions/local-overrides.md` (the canonical doc)

Sections, in order:
1. **What/where:** the fixed filename `.rp.local.md`, placed in the same directory as the committed
   `.rp.md` (the project main checkout root). Resolved by the loader from **the project's main root — the
   directory holding the committed `.rp.md`, i.e. the parent of the repository's common git directory**
   (`dirname` of `git rev-parse --git-common-dir`) — **even when running inside a worktree**, where cwd is
   not that root. Read from the main root; never copied into the worktree. _(Q1)_
2. **Layering / fail-soft guarantee:** overrides apply only AFTER the committed conventions pass the
   required-completeness check; the merge only REPLACES a value or ADDS a keyed entry, never REMOVES or
   makes a convention read as missing; required completeness is decided by `.rp.md` alone; absent /
   malformed / unresolvable → proceed with committed conventions unchanged. _(Q2/Q4)_
3. **Merge model — three unit shapes and how each is matched:** labeled bullet (match by `**<label>:**`);
   named prose sub-statement (match by convention HEADING + committed named sub-statement, restated with
   value changed — NEVER free-substring); atomic convention (the whole convention is the unit). Local wins
   per unit; committed inherits where local is silent; map-merge over labels for list-shaped (replace on
   match, add on new label, inherit on absent); wholesale replace within a unit (no partial blending).
   Entries that don't map to a committed-named unit → warn-and-ignore (malformed). _(Q3)_
4. **Non-overridable marker:** `(non-overridable)` parenthetical appended to a heading or bullet-label,
   mirroring setup.md's `(required)` idiom; works at whole-convention and single-unit granularity; the
   rarely-used, opt-in project marker (req 14). _(Q3)_
5. **"What's overridable" — three labeled groups:** (1) Overridable — Agent models; Health-monitoring
   cadence; Issues ACCESS sub-statement. (2) Locked-shared — commit format, artifact folder, pipeline slug,
   branch names, worktree naming, Issues TRACKER IDENTITY. (3) Tool-forced — command FORMS dictated by the
   active tool; form locked, in-scope argument values (e.g. cadence) not. _(Q2/Q3)_
6. **The four warnings + the batched present-only "Local overrides" summary surface** (short informational
   report, no questions, mirroring autonomous-workflow.md:51), with the one-line-per-item template and the
   reason strings chosen by lock SOURCE (req 15 marker vs req 16 inherent vs req 17 malformed), plus the
   req-18 `git check-ignore .rp.local.md` file-safety check run from the main root, independent of merge
   outcome. _(Q4)_
7. **Worked examples:** the full Agent-models map-merge example (override `**spec-writer:**` + add
   `**code-reviewer:**` → resolved set with replace/add/inherit), plus the compact Issues-access before/after
   and the one-line Health-cadence illustration (form-vs-argument). _(Q3)_
8. **Authoring + safety:** hand-authoring by copying labeled blocks from `.rp.md` (req 19); the
   lighter-mirror confirm-before-write rule for the optional orchestrator-writes case (show content,
   confirm, never overwrite without approval, no completeness check) (req 22); the recommendation (not
   requirement) to author Issues access as its own `**Access:**` labeled line for a stable anchor. _(Q3/Q5)_
9. **Git-ignored / never-affects-others note** and the **assisted-mode inertness note** (orchestrator-vs-
   agent precision). _(Q6, req 20/24)_

### Edited — `skills/radical-pipelines/reference/conventions/load.md` (kept thin)

- Read (1-8), the 9-row table (10-21), and the "## Missing conventions" gate (23-29) **unchanged**.
- Add a final "## Local overrides" section that fires only on the gate's PASS branch: probe for
  `.rp.local.md` at the project main root and apply it per `local-overrides.md`, before using the
  conventions or passing them to any agent; if absent, proceed unchanged. Include the guard sentence ("the
  required-completeness decision above is final; the local-override step can only adjust or add…") and the
  idempotence note (resolve on every load incl. resume, from the main root; nothing persists). _(Q2)_

### Edited — `skills/radical-pipelines/reference/conventions/setup.md`

- **:114** — extend the Artifact-storage explainer's ignore-entry bullet to name a second required entry
  (`.rp.local.md`).
- **§6 / :197** — replace "the only entry Radical Pipelines requires" with the purpose-stating,
  count-agnostic reword (worktree folder per active tool + always-required `.rp.local.md`, with the
  "never committed" rationale); append `.rp.local.md` to the entries the step adds; cross-reference
  `local-overrides.md` (req 20). Fork reminder (:201) needs no separate edit.
- **Step 5 (:188-193)** — optionally OFFER a one-line `.rp.md` breadcrumb pointing at `local-overrides.md`
  (asked, part of the owner-confirmed `.rp.md` content). _(Q5)_

### Edited — `skills/radical-pipelines/SKILL.md`

- Extend the "Project conventions" sentence (SKILL.md:46) with a clause naming the local-override
  capability via `.rp.local.md`. _(Q6)_

### Edited — `README.md`

- Add a short standalone paragraph in the Configuration section after line 157 (filename + location +
  subset + never-committed/never-affects-others + link to `local-overrides.md`). _(Q6)_

### Edited — `.gitignore` (consuming-project behaviour; dogfood note)

- Setup adds the `.rp.local.md` entry to the committed `.gitignore` (req 2/23). For the dogfood repo this
  means a new `.rp.local.md` line is needed (its `.gitignore` is `node_modules/`/`.env`/`.env.local`
  today). **Scope guard:** do NOT retroactively add the missing worktree-folder line to this repo's
  `.gitignore` (pre-existing, orthogonal); write the setup instruction generically so it is true for any
  conforming consumer, and don't treat this repo's non-conformant `.gitignore` as the exemplar. _(Q5)_

### NOT changed (deliberately)

- The dogfood `.rp.md` Issues block (no forced `**Access:**` refactor — the mechanism is backward-compatible
  on existing prose; the labeled line is a documented recommendation, not a requirement). _(Q3)_
- `assisted-workflow.md` (the inertness note lives once in `local-overrides.md`). _(Q6)_
- CONTRIBUTING.md, `website/`, AGENTS.md (not part of the req-20 surface). _(Q6)_
- The 9-row conventions table gains no "Overridable?" column (overridability is the three-group prose
  classification instead). _(Q2)_

### Out of scope (recorded future work, per spec)

- Overriding the artifact-storage mode and its fork/remote configuration (leading future-work item).
- A per-machine override location outside the repository (e.g. `~/.config/...`).
