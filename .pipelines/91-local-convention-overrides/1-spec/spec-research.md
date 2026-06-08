# Spec Research — Support local, per-developer overrides of a consuming project's conventions

_Source: GitHub issue [Automattic/radical-pipelines#91](https://github.com/Automattic/radical-pipelines/issues/91)._

## Rough idea

In any project that uses Radical Pipelines, a developer should be able to override that project's
committed Radical Pipelines conventions **locally** — for their own working copy or machine — without
editing the project's committed `.rp.md`, and without those changes being committed or affecting other
contributors.

Today, Radical Pipelines loads each consuming project's conventions from a single committed `.rp.md`
(see `skills/radical-pipelines/reference/conventions/load.md`). That file is the only sanctioned source
of conventions. There is no sanctioned way for an individual developer to deviate locally; editing the
committed `.rp.md` risks committing machine- or person-specific settings and leaks them to everyone.

The directions to explore (open, from the prompt):

- A git-ignored file such as `.rp.local.md` (exact name TBD) sitting alongside a project's `.rp.md`,
  overriding or merging over the shared conventions.
- The convention loader (`conventions/load.md`) would need to discover and apply it.
- Loading/merge precedence (local over shared; whole-file vs. per-key override) is a design question,
  not settled here.

### Key facts established from the codebase (before Q&A)

- `.rp.md` structure: a "Shared conventions" section plus per-tool sections (Claude Code, Pi). Agents
  read the shared section plus the section for the active tool. (`.rp.md`, `conventions/claude-code.md`,
  `conventions/pi.md`)
- `load.md` enumerates conventions, marks each required/optional, and — on missing required conventions —
  routes to `setup.md`. The conventions are: Pipeline base slug, Artifact folder, Commit format, Issues,
  Worktrees, Branch names, Team spawning, Agent models, Health monitoring (plus Artifact storage mode in
  setup).
- Conventions are passed verbatim to spawned agents (e.g. commit format), so an override must be able to
  reach the agents the orchestrator spawns, not just the orchestrator's own behavior.
- `setup.md` writes `.rp.md` and manages `.gitignore` (it already adds the worktree folder). It handles
  two artifact-storage modes: `artifacts-in-repo` and `artifacts-in-fork`.
- This repo (radical-pipelines) is the dogfood instance; the feature is a product capability that applies
  in every consuming project, not a one-off for this repo's own `.rp.md`.

## Q&A

### Q1 — Concrete motivating use cases

**Question:** What concrete, real situations should a local override solve? For each: which convention
is being overridden and why it must be per-developer/per-machine rather than committed. Candidates put
forward for confirm/reject:

1. **Agent models** — developer wants cheaper/faster or more capable model than project default (own
   cost budget or API access). Likely the clearest per-developer case.
2. **Health monitoring / loop interval** — different monitor cadence locally.
3. **Issues / tracker access** — different CLI auth or personal MCP endpoint than documented default.
4. **Artifact storage mode** (`artifacts-in-repo` vs `artifacts-in-fork`) and fork/remote names —
   developer works through a personal fork though the project commits `artifacts-in-repo`, or uses
   different remote names locally.
5. **Commit format / artifact folder / slugs / worktrees / branch names** — ever legitimately overridden
   per-developer, or inherently shared (they affect committed output and shared naming)?

Asked which are in scope and whether motivating cases are missing — this determines whether overrides
apply to the whole convention set or only a subset.

**Answer (spec-researcher, via team-lead):**

The dividing line: a convention is safely overridable locally **only if its value governs that
developer's local runtime behavior** and does NOT flow into committed artifacts or shared naming that
collaborators must agree on.

- **In scope (clear per-developer cases):**
  1. **Agent models** — strongest case. Tool-native, opaque, passed verbatim to the spawn mechanism;
     affects cost/latency/provider/API key of the running developer; never changes committed artifacts'
     content or naming. The textbook case. (`setup.md:88-98`, README optional/per-tool.)
  2. **Health monitoring / loop cadence** — monitor only watches the developer's own run; pure local
     preference, zero shared-output impact. (The dogfood `.rp.md:76` already diverges: `/loop 15m` vs
     the per-tool default `/loop 5m` in `claude-code.md:37`.) "Required" in `load.md` means a value must
     exist, not that it can't be locally overridden.
  3. **Issues — access mechanism ONLY** — `setup.md:62-66` separates *which tracker* (shared, must NOT
     be overridable: `.rp.md:9` "GitHub is the source of truth") from *how to access it* (CLI like `gh`,
     MCP, API token — per-developer/per-machine by nature). Only the access sub-part is in scope, not
     tracker identity. This split is concrete evidence that **per-key/per-field override is more correct
     than whole-file replacement**.
  4. **Artifact-storage mode + fork/remote names** — genuinely per-developer in spirit (a developer
     routing their own artifact work through a personal fork while the project commits in-repo is the
     single most compelling "must not commit my setup" case), BUT the heaviest/most invasive: mode flips
     change where commits are pushed, whether an upstream PR is cherry-picked, and the whole close-out
     flow (`setup.md:106-169`). In-scope-but-requires-explicit-design-care, not a freebie. Note: Artifact
     storage is a `setup.md` convention NOT in `load.md`'s 9-row table — the override design must decide
     whether it covers setup-only conventions too. This case is the one **most in tension with "not
     affecting other contributors"**; decide explicitly whether in or out.

- **Out of scope (inherently shared):**
  5. **Commit format, artifact folder, pipeline slug, branch names, worktree naming** — produce committed
     output or shared identifiers; must be identical for everyone (`setup.md:56` commit format passed
     verbatim "so all commits match the project's style"; `setup.md:40-42` slugs must be deterministic
     and collision-proof across the project). Additionally, worktree/branch/team/health *commands* are
     tool-forced (`claude-code.md:1-6` "forced by Claude Code's tool surface. Do not ask the owner to
     choose alternatives.") — nothing meaningful to override.

- **Missing case worth adding:** Team spawning / provider selection closely tied to Agent models (e.g. a
  Pi user authenticated with a different provider than the documented default).

**Net implication:** Overrides apply to a **SUBSET**, not the whole set — roughly the optional +
access-path conventions (Agent models, Health-monitoring cadence, Issues-access, and—carefully—
Artifact-storage/remotes), never the shared-output/shared-naming ones. The Issues convention (shared
tracker identity + local access in one block) is direct evidence that **per-key/per-field override** is
more correct than whole-file replacement: a whole-file override would force a developer to restate shared
tracker identity just to change their auth, inviting drift.

**Sources:** `load.md:11-21`; `setup.md:56,:62-66,:88-98,:40-42,:106-169,:155`; `claude-code.md:1-6,37`;
`pi.md`; `.rp.md:9,:34,:76`; README optional/per-tool markers; repo-wide grep confirmed NO pre-existing
per-developer/local-override concept anywhere (new ground).

### Q2 — Merge granularity and semantics

**Question:** Settle how a local override file combines with the committed `.rp.md`:
(a) **Unit of override** — whole convention, sub-field within a convention, or finer (a single agent's
model within the Agent-models list, which is per-agent bullets plus a `Default:` bullet, `setup.md:91-93`)?
(b) **Merge direction/precedence** — confirm local wins where both specify a unit and committed fills
silence; any case where committed should win (project forbids overriding a convention)?
(c) **Additive vs. replace** — for list-shaped conventions (agent models), can local add a bullet without
replacing the whole block, or is it strict per-unit replacement?
(d) **Practical realizability** — these are human-readable Markdown read by an LLM orchestrator, not a
deterministic merger; what's the simplest set of merge rules a human and the LLM can both reliably apply?

**Answer (spec-researcher, via team-lead):**

Recommended model — **map-merge at the labeled-unit level, wholesale replace within a unit, local-wins,
with an optional project opt-in non-overridable marker.**

- **(a) Unit of override** = the smallest *named, self-contained value the convention already exposes* —
  usually a single labeled bullet, occasionally a whole convention block. Rule: a convention is the
  override unit by default, EXCEPT where the convention is already structured as a keyed list of named
  bullets, in which case the bullet is the unit. **Do not invent finer granularity than the labels the
  committed file already presents** (an LLM can only reliably match units with an explicit, stable label).
  - **Agent models** is the proof case: a keyed map (`**Default:**` plus `**<agent-name>:**` bullets,
    `setup.md:91-93`) with documented fallback. Override one `**spec-writer:**` bullet, inherit `Default:`
    and every other agent. Whole-block replacement here would be a regression.
  - **Issues** is the sub-field case: `setup.md:62-66` presents *which tracker* and *how to access it* as
    distinct named sub-statements; override "access" while inheriting "tracker identity." Works only
    because the committed prose draws the line — target the named sub-statement, not an arbitrary substring.
  - Atomic conventions (slug format, folder pattern, loop cadence): the convention *is* the unit.
  - Spec framing: "The override unit is a labeled convention or, where the committed convention is a list
    of labeled bullets, a single bullet. Overrides key off the exact label the committed file uses." One
    rule yields per-agent, sub-field, and whole-convention granularity with no special-casing.
- **(b) Direction/precedence:** confirmed — local wins on collision, committed fills silence. One escape
  valve: a project may mark a convention/unit **non-overridable** (e.g. "Issues: GitHub is the source of
  truth — not overridable," mirroring `.rp.md:9`); there committed wins, the conflicting local value is
  ignored, and the orchestrator **warns** the developer it was ignored. Keep this an explicit, rarely-used
  project opt-in — default stays local-wins (making everything lockable by default would defeat the feature).
- **(c) Additive vs. replace:** default = replace the matched unit; units local doesn't mention are
  untouched (inheritance, not additivity). Additive matters only for the keyed-list convention **Agent
  models**: adding a `**code-reviewer:**` bullet the committed file lacks should *add* it (unmatched local
  key = new entry). So across the keyed map: standard map-merge (replace on matching key, add on new key,
  inherit on absent key). Inside a single bullet's value: pure wholesale replace — never merge within an
  opaque model string or one access statement (`setup.md:95` "tool-native and opaque … passed verbatim").
- **(d) Practical realizability (most important constraint):** realistic mechanism is "the orchestrator
  reads both files and reasons about precedence per documented rules"; rules must be a **keyed lookup over
  labeled units**, never a prose diff. Simplest rule-set a human author and the LLM can both apply:
  1. **Match by label** — override entries keyed by the same heading/bullet label committed `.rp.md` uses
     (`### Agent models` → `**spec-writer:**`; `### Issues` → the access sub-statement). No label match =
     new addition (only meaningful for keyed-list conventions).
  2. **Local wins per unit; committed inherits.** No partial blending within a unit.
  3. **Respect non-overridable markers** (project opt-in); on conflict there, ignore local and warn.
  4. **Read order:** load committed `.rp.md` first (per `load.md`), then the local override file, then
     apply 1-3 before passing the resolved set to agents.

**Caveat to verify in design:** there is currently NO Agent-models block in the dogfood `.rp.md` (optional,
unused here) — the per-agent-bullet shape lives only in `setup.md` as the canonical authoring format. So
per-bullet override behavior needs a **worked example** in the spec/design rather than an existing one to
point at. The override mechanism should reuse the *same* labels `setup.md` mandates so authors don't learn
a second syntax.

**Sources:** `setup.md:88-98` (Agent models keyed list, opaque values), `:62-66` (Issues tracker-vs-access
seam); `load.md:1-8` (orchestrator-read, no parser → LLM-reasoned merge); `.rp.md:9` (canonical
non-overridable example); `prompt.md:7` (local-wins intent); grep of `.rp.md` → no Agent-models block;
git `a9d54d1` "Refine agent model resolution" (Default:-fallback is the established lookup model to mirror).

### Q3 — File discovery, naming, and the "never committed / never affects others" guarantee

**Question:**
(a) **Name/location** — `.rp.local.md` alongside `.rp.md` in repo root? Any case for a per-machine
location outside the repo (`~/.config/...`), or is git-ignored-alongside sufficient/simplest?
(b) **Discovery** — loader probes for the fixed filename after `.rp.md`, silently proceeds if absent?
Malformed/partially-applicable local file = hard stop or warn-and-ignore?
(c) **Git-ignore responsibility/timing** — (i) setup.md adds a committed `.gitignore` entry once so
everyone inherits protection (analyst leans this), (ii) developer adds it, or (iii) loader ensures it.
Which is sanctioned?
(d) **Artifact-storage modes** — special handling in `artifacts-in-fork` (where `.gitignore`/`.rp.md`
live on the fork, `setup.md:127,201`)? Confirm a local override can never leak into an upstream PR.

**Answer (spec-researcher, via team-lead):**

- **(a) Name/location:** single fixed filename **`.rp.local.md`** in the **same directory as the project's
  `.rp.md`** (today the repo root). Repo-root, git-ignored is sufficient and simplest. **NO `~/.config`
  per-machine location in v1** (breaks "alongside `.rp.md`," needs a third precedence layer, isn't covered
  by the committed `.gitignore` so the part-(c) guarantee collapses; Q1's cases are per-project anyway) —
  mark as explicit out-of-scope/future, not silent omission. `.rp.local.md` mirrors `.rp.md` and follows
  the `*.local.*` precedent already in this repo's `.gitignore` (`.env.local`).
  - **WORKTREE WRINKLE (must-resolve in design, not a blocker to naming):** Claude Code runs every pipeline
    inside a git-ignored worktree at `.claude/worktrees/<slug>`. `.rp.md` is committed so it appears in the
    worktree checkout, but `.rp.local.md` is git-ignored so it will NOT automatically appear inside a fresh
    worktree directory. The loader runs inside the worktree — if it only looks in cwd it silently sees no
    override. Design MUST resolve, e.g. (i) loader reads `.rp.local.md` from the repo's main root regardless
    of cwd, or (ii) ensure it's present next to whichever `.rp.md` the loader reads.
- **(b) Discovery/robustness:** read `.rp.md` first (unchanged), then **ALWAYS probe** for fixed
  `.rp.local.md` in the same location; **silently proceed if absent** (mandatory backward compat — anyone
  without an override is completely unaffected). Malformed/partial local file → **warn-and-ignore the bad
  parts, NOT hard-stop** (a personal git-ignored convenience file must never break the pipeline for its own
  author). Two carve-outs: (1) **never let a malformed local file make a *required* convention read as
  missing** and trigger setup — override layers on top of an already-validated committed set, so a broken
  local file degrades to "committed value used," never "missing → setup" (`load.md:25-29`); (2) **never
  silently drop a non-overridable conflict** — always surface it (policy violation, not malformed). Warn
  clearly (name the unit, say committed value used), apply valid units, continue.
- **(c) Git-ignore responsibility — confirmed option (i):** `setup.md` adds the committed `.gitignore`
  entry for fixed `.rp.local.md` **once at project setup**, so every developer inherits protection with zero
  per-developer action. (ii) fails for anyone who forgets; (iii) is reactive (window where an untracked file
  could be `git add -A`'d). **Belt-and-suspenders (mild iii):** when the loader first detects `.rp.local.md`,
  verify the ignore entry exists and warn if missing — backstops (i), doesn't replace it.
  - **Doc contradiction to fix:** `setup.md:197` currently says the worktree folder is "the only entry
    Radical Pipelines requires" — becomes FALSE (now two required entries: worktree folder + `.rp.local.md`).
    Design must edit that exact line. Also: the dogfood `.gitignore` currently ignores only `node_modules/`,
    `.env`, `.env.local` — NOT `.rp.local.md`, so even this repo needs the new line (good test the setup
    change is exercised).
- **(d) Artifact-storage modes:** **no special handling** — the `.rp.local.md` ignore line is just one more
  line in whichever `.gitignore` setup already manages (the fork's main in fork mode, project main in repo
  mode), mirroring the existing worktree-entry wording (`setup.md:201`). **Upstream-leak guarantee is
  airtight by construction:** being git-ignored, `.rp.local.md` is in NO commit whatsoever — nothing for the
  cherry-pick to include/exclude; holds even if someone fork-pushes the entire fork branch. **Defense in
  depth, two independent layers:** (1) git-ignore = no commit contains it [primary, both modes]; (2)
  cherry-pick excludes non-code commits [secondary, fork mode only] — (2) never even fires for the local
  file. **Acceptance test:** "a `.rp.local.md` present in the working tree never appears in `git status`
  staged set, in any pipeline commit, in the fork branch, or in the upstream PR diff."
  - **Residual risk (effect leak, not a commit leak):** anything the orchestrator *derives from* the local
    override and writes into a *committed* artifact could leak the override's effect — reinforces Q1's
    dividing line (keep shared-output conventions non-overridable). File-level guarantee (git-ignore) and
    effect-level guarantee (only local-runtime conventions overridable) are complementary; state both.

**Sources:** `load.md:5` (loader reads only `.rp.md` today — extension point), `:25-29` (missing required →
setup); `setup.md:195-201` (step 6 git-ignore; "only entry required" line 197 needs editing; fork
`.gitignore` line 201), `:126-135` (fork cherry-pick excludes artifact commits, private fork), `:114`;
`claude-code.md` (pipelines run inside `.claude/worktrees/<slug>` — worktree-visibility wrinkle);
`prompt.md:7,18`; local `.gitignore` = `node_modules/`,`.env`,`.env.local` (`*.local` precedent, proves
`.rp.local.md` not yet ignored); repo-wide grep → no existing rp.local references (new).

### Q4 — Developer-facing authoring workflow and discoverability

**Question:**
(a) **Authoring path** — sanctioned developer-triggered flow to create/edit `.rp.local.md`, or is it
purely hand-authored (loader + docs + worked example + gitignore entry)? Trying to avoid over-building.
(b) **Discoverability** — how does a developer learn it exists (mention in committed `.rp.md`, skill docs,
proactive orchestrator surfacing)? Is proactive surfacing in scope?
(c) **Confirm-before-write** — does `setup.md:177,184` confirm-before-write discipline apply if the
orchestrator writes `.rp.local.md`? Is overwrite/merge less sensitive for a git-ignored personal file?
(d) **Assisted vs autonomous** — some overrides (agent models, monitor cadence) are inert in assisted
mode (no team/monitor spawned). Should the spec note this, or is it a design detail?

Goal: decide minimum viable surface — loader + docs + gitignore vs loader + a dedicated developer flow.

**Answer (spec-researcher, via team-lead):**

**Bottom line: ship loader + docs (with worked example) + committed `.gitignore` entry. Do NOT build a
dedicated developer authoring flow.** Add a lightweight confirm-before-write safeguard only for the
optional orchestrator-writes case, and note assisted-mode inertness.

- **(a) Authoring path — minimal, self-authoring:** no parallel setup-style flow. `setup.md`'s heavy
  interactive flow exists because it produces a committed, shared, team-affecting `.rp.md` whose
  correctness is load-bearing (`setup.md:179-186` guards a "misleading complete conventions file").
  `.rp.local.md` is the opposite on every axis: personal, git-ignored, affects no one else, trivially
  deletable, restricted (Q1) to low-stakes local-runtime conventions. Asymmetry of consequences →
  asymmetry of ceremony. The format is **self-documenting by construction**: because Q2 settled that
  overrides reuse the exact labels `.rp.md` already uses (`### Agent models` → `**spec-writer:**`), a
  developer authors by **copying the block to change and editing the value** — no new syntax, no flow; the
  committed `.rp.md` is itself the template. The orchestrator MAY offer to scaffold the file when asked
  (nice-to-have, inherits the (c) confirm rule), but that is not the sanctioned path.
  - **Docs must contain:** (1) fixed filename + location; (2) the merge rule in one paragraph (local wins
    per labeled unit; committed inherits; map-merge for keyed lists); (3) at least one **worked example**
    (Agent-models single-agent override — Q2 showed no existing Agent-models block in the dogfood `.rp.md`
    to point at); (4) the Q1 overridable-vs-shared guidance; (5) a note it's git-ignored and never affects
    others.
- **(b) Discoverability — in scope, but committed + passive (not runtime-proactive):** a passive loader
  alone fails "a developer CAN override" if nobody knows it exists. Two committed touchpoints: (1) a skill
  docs section (most naturally `load.md` where the loading story lives, plus a README conventions-overview
  touchpoint and a `setup.md` cross-ref); (2) an optional **one-line breadcrumb the project author leaves
  in the committed `.rp.md`** (e.g. "Local per-developer overrides: see `.rp.local.md`"; low cost, high
  reach — recommend `setup.md` optionally add it). **Proactive surfacing is OUT as a requirement for v1**
  (needs fuzzy intent detection, untestable as acceptance criterion, risks nagging) but the spec should
  **permit** the orchestrator to mention the option when a developer clearly voices a local-only runtime
  preference, without mandating detection logic.
- **(c) Confirm-before-write — yes, lighter bar:** mirror `setup.md:177,179-184` (never write/overwrite a
  config file without explicit human say-so) whenever the orchestrator writes `.rp.local.md`, but
  lower-stakes (git-ignored, personal, recoverable) → lighter discipline. Spec rule: "If the orchestrator
  writes `.rp.local.md` on the developer's behalf, it first shows the proposed content and asks for
  confirmation, and **never overwrites an existing `.rp.local.md` without explicit approval** — mirroring
  setup.md's confirm-before-write at a lighter bar." No full required/optional-completeness ceremony — a
  local override is **allowed to be partial by design** (states only the units it changes). The one real
  hazard is clobbering a hand-authored local file; guard that explicitly.
- **(d) Assisted vs autonomous — NOTE it in the spec (scope/expectations fact, not just design detail):**
  assisted runs spawn no agents (`assisted-workflow.md:3`) and the only team-spawning phases (Code, Docs)
  can't run assisted (`assisted-workflow.md:21-22`); the monitor launches only in autonomous
  (`claude-code.md:36`/`pi.md:34`). So **Agent-models and Health-monitoring overrides are entirely inert
  in assisted runs**, while the **Issues access-mechanism override DOES still apply** (the orchestrator
  itself reads/writes the tracker). State: "Overrides only take effect where the overridden convention is
  actually exercised; in assisted runs no agents or monitors are spawned, so Agent-models and
  Health-monitoring overrides have no effect, while the Issues access-mechanism override still applies."
  Silently inert behavior erodes trust; surfacing costs one line.

**Sources:** `assisted-workflow.md:3` (no agents spawned), `:21-22` (Code/Docs can't run assisted);
`claude-code.md:36`/`pi.md:34` (monitor only in autonomous); `setup.md:177,179-186` (confirm-before-write
principle; the heavy "misleading complete conventions file" concern that does NOT apply to a personal
local file); `load.md:1-8` (home for override docs/discoverability section); README conventions overview
touchpoint; Q1/Q2 findings (overridable subset reuses committed labels → self-authoring viable, heavy flow
unnecessary).

### Q5 — Final overridable set, the `required` interaction, and the warning surface

**Question:**
(a) Settle the **artifact-storage/fork case** explicitly in/out for v1. Analyst leans OUT (heaviest;
rewires close-out & upstream-PR cherry-pick; most "affects others" risk), leaving in-scope set = Agent
models, Health-monitoring cadence, Issues access-mechanism (tracker identity non-overridable). Agree, or
strong reason to keep it?
(b) Interaction with the **`required` classification** — can a local override be the *sole provider* of a
required convention, or does override resolution happen strictly AFTER the committed set is validated
complete (local only adjusts/adds to an already-valid base, never rescues a missing required one)?
(c) Which **warnings** are observable requirements: (1) override of a locked/non-overridable unit →
ignore+warn; (2) override of an out-of-scope/shared convention (commit format, slug) → ignore+warn; (3)
malformed unit → ignore that unit+warn, rest applied; (4) `.rp.local.md` present but no matching
`.gitignore` entry → warn. All four required? Is "warn" = surface to the developer in run output?

**Answer (spec-researcher, via team-lead):**

- **(a) Fork-mode OUT of scope for v1 (explicitly out/future, not silently omitted).** In-scope set is
  exactly: **Agent models, Health-monitoring cadence, and the Issues access-mechanism (tracker identity
  non-overridable).** Fork-mode uniquely violates "never affects others": flipping artifact-storage mode
  changes where commits are pushed, whether an upstream PR is cherry-picked, the commit-message rewrite,
  and the whole close-out flow (`setup.md:124-135`) — several are shared, observable effects (pushed
  branch location, upstream PR shape) that other contributors and the orchestrator's close-out depend on
  (`.rp.md:28-34`). It's also not a single value but a coupled bundle (mode + upstream remote + fork
  remote + upstream branch/commit formats; `setup.md:155,164-169`), breaking Q2's clean per-unit merge.
  The mechanism still ships cleanly without it; fork-mode is severable. **Record as the leading
  future-work item** with a one-line rationale (the motivation is real — solo contributor wanting a
  private fork on an in-repo project — deferring doesn't deny the need; the safe local-override for it
  needs more design than v1).
- **(b) Override resolution happens strictly AFTER the committed set passes `load.md`'s required-
  completeness check.** The local file operates on an already-valid base: it may (1) replace a unit the
  committed file defines, or (2) add to a list-shaped convention (Agent models, optional/absent → pure
  addition fine), but **NEVER be the sole source of a required convention** (cannot rescue a
  missing-required one — that still routes to setup). This is the positive rule pairing with Q3's negative
  rule. Applied to the in-scope set (`load.md:16,20,21`): Issues = required, Health monitoring = required,
  Agent models = optional. Every required member is *adjusted* (Health-monitoring cadence value; Issues
  access sub-field), never *provided*; the only *additive* member (Agent models) is optional — so the rule
  is automatically satisfied. Spec: "The local override is resolved only after the committed conventions
  satisfy load.md's required-completeness check. It may modify a convention the committed file defines or
  add an entry to a list-shaped convention; it may never be the sole source of a required convention."
- **(c) All four warnings are required observable outcomes; "warn" = surface to the developer in the
  orchestrator's run output** (`SKILL.md:14` "Humans only talk with you, never with the other agents" →
  the orchestrator is the single human-facing surface; no log/side channel). Each is a testable observable
  (given input X, run output contains a warning naming the unit + resolution):
  1. Override targets a **non-overridable/locked unit** → committed value used; warn naming the unit + that
     the project marked it non-overridable. *(intent-clarifying)*
  2. Override targets an **out-of-scope/shared convention** (commit format, slug, artifact folder,
     branch/worktree names) → ignored; warn it isn't locally overridable because it affects shared output.
     *(guarantee-protecting — operationalizes "never affects others" at point of use)*
  3. **Malformed local unit** → that unit ignored, committed value used, rest applied; warn naming the bad
     unit. *(intent-clarifying — warn-and-ignore is only safe if the developer is told which unit didn't
     take)*
  4. **`.rp.local.md` present but no matching `.gitignore` entry** → warn the file is at risk of being
     committed and the entry should be added. *(guarantee-protecting — backstops "never committed" for
     files created in pre-feature projects; a silent gap here is the most dangerous of the four)*
  Whether warnings appear inline at load time vs batched in a startup summary is a design detail; the
  observability is the spec requirement.

**Sources:** `SKILL.md:14` (sole human-facing channel); `load.md:16,20,21` (required/optional split),
`:25-29` (required-completeness → setup, the validation the override runs after); `setup.md:124-135`
(fork mode rewires push/cherry-pick/commit/PR), `:155`, `:164-169` (artifact-storage = coupled multi-field
cluster); `.rp.md:28-34` (close-out depends on push/branch/Linear); `prompt.md:7`; Q1/Q2/Q3 findings.

## Consolidated Requirements

Each requirement is an observable outcome. Scope: a **product capability of Radical Pipelines that applies
in every consuming project**, exercised here in the dogfood instance. The committed `.rp.md` and its
loading flow (`skills/radical-pipelines/reference/conventions/`) are the things that change; this repo's
own `.rp.md` is only the dogfood example.

### The local override file

1. A developer can place a single, fixed-name file **`.rp.local.md`** in the same directory as the
   project's committed `.rp.md` (today the repository root) to override that project's Radical Pipelines
   conventions for their own working copy or machine.
2. `.rp.local.md` is never committed: a setup-installed, committed `.gitignore` entry for the fixed
   filename keeps it out of version control for every developer with no per-developer action required.
3. `.rp.local.md` and its effects never appear in any commit, the pipeline branch, the fork branch (in
   `artifacts-in-fork` mode), or an upstream PR diff. (Acceptance: a `.rp.local.md` present in the working
   tree never appears in `git status`'s staged set, in any pipeline commit, in the fork branch, or in the
   upstream PR diff.)
4. A project that has no `.rp.local.md` behaves exactly as before — the file's absence changes nothing and
   produces no warning (backward compatibility for every existing consumer).

### Discovery and loading

5. When loading conventions, the loader reads the committed `.rp.md` first (unchanged), validates required
   completeness exactly as today, and only then probes for `.rp.local.md` in the same location; if absent,
   it proceeds exactly as today.
6. Override resolution runs strictly **after** the committed conventions pass the existing
   required-completeness check. The local file operates on an already-valid base: it may modify a unit the
   committed file defines, or add an entry to a list-shaped convention, but it may **never be the sole
   source of a required convention** (a missing required convention still routes to the setup flow,
   regardless of `.rp.local.md`).
7. The loader runs inside the Claude Code worktree (`.claude/worktrees/<slug>`), where the git-ignored
   `.rp.local.md` is not automatically present; the loading flow must still resolve the developer's
   `.rp.local.md` for the run (e.g. by reading it from the project's main root, or by ensuring it sits next
   to whichever `.rp.md` the loader reads). _(Mechanism is a design decision; the observable requirement is
   that an override authored at the project root takes effect in the run.)_

### Merge semantics

8. The override unit is a **labeled convention** or, where the committed convention is a list of labeled
   bullets (e.g. Agent models with `**Default:**` and `**<agent-name>:**` bullets), a **single labeled
   bullet**. Overrides key off the exact heading/bullet label the committed `.rp.md` uses; no finer
   granularity than the labels the committed file already presents.
9. For each labeled unit: if `.rp.local.md` defines it, the local value is used; otherwise the committed
   value is inherited. The local value replaces the matched unit wholesale (no partial blending inside a
   unit's value).
10. For a list-shaped convention, resolution is a map-merge over labels: a matching label replaces that
    entry, a new label adds an entry, and an absent label inherits the committed entry (e.g. overriding
    `**spec-writer:**`'s model while inheriting `**Default:**` and every other agent; adding a
    `**code-reviewer:**` bullet the committed file lacks).
11. Local conventions take precedence over committed ones, except where the project has explicitly marked a
    convention or unit as non-overridable; there the committed value wins (see requirement 14).

### Overridable subset (the dividing line)

12. Local overrides apply only to conventions whose value governs the developer's **local runtime
    behavior** and does not flow into committed artifacts or shared naming. For v1 the in-scope set is
    exactly: **Agent models**, **Health-monitoring cadence**, and the **Issues access-mechanism** (how the
    tracker is accessed — CLI/MCP/token). The Issues **tracker identity** (which tracker is the source of
    truth) is not overridable.
13. Local overrides do not apply to conventions that produce committed output or shared identifiers —
    **commit format, artifact folder, pipeline slug, branch names, and worktree naming** — nor to
    tool-forced mechanism conventions. An attempt to override one of these is ignored.
14. A project may explicitly mark a specific convention or unit as **non-overridable** in its committed
    `.rp.md`; a conflicting local value for such a unit is ignored and the committed value is used. This is
    a rarely-used, opt-in project marker — the default remains local-wins.

### Warnings (all surfaced to the developer in the orchestrator's run output)

15. If `.rp.local.md` targets a unit the project marked non-overridable, the committed value is used and
    the run output warns, naming the unit and stating the project marked it non-overridable.
16. If `.rp.local.md` targets an out-of-scope/shared convention (e.g. commit format, slug, artifact folder,
    branch/worktree names), the attempt is ignored and the run output warns that it is not locally
    overridable because it affects shared output.
17. If a unit in `.rp.local.md` is malformed or cannot be applied, that unit is ignored (the committed
    value is used), the remaining valid units still apply, and the run output warns, naming the bad unit. A
    malformed local file never causes a required convention to read as missing and never triggers the setup
    flow.
18. If `.rp.local.md` is present but the project's `.gitignore` has no matching entry for it, the run
    output warns that the file is at risk of being committed and the ignore entry should be added.

### Authoring, discoverability, and safety

19. The supported authoring path is **hand-authoring**: a developer creates `.rp.local.md` by copying the
    relevant labeled block(s) from the committed `.rp.md` and editing the value(s) — reusing the same
    labels the committed file already uses, so no new syntax is introduced. No dedicated interactive
    developer authoring flow is built for v1.
20. The capability is discoverable through committed, passive touchpoints: a section in the Radical
    Pipelines skill documentation (in the convention-loading docs, with a cross-reference from setup and a
    conventions-overview mention) that states the fixed filename and location, the merge rule, the
    overridable-vs-shared guidance, that the file is git-ignored and never affects others, and includes at
    least one **worked example** (an Agent-models single-agent override). The project author may optionally
    leave a one-line breadcrumb pointing to `.rp.local.md` in the committed `.rp.md`.
21. The orchestrator is permitted (but not required) to mention the local-override option when a developer
    clearly expresses a local-only runtime preference; no proactive intent-detection is mandated for v1.
22. If the orchestrator ever writes `.rp.local.md` on a developer's behalf, it first shows the proposed
    content and asks for explicit confirmation, and never overwrites an existing `.rp.local.md` without
    explicit approval — a lighter mirror of the committed-file confirm-before-write discipline. A local
    override may be partial by design (it states only the units it changes), so no required/optional
    completeness check is applied to it.

### Setup-flow changes

23. The project setup flow adds the `.rp.local.md` entry to the committed `.gitignore` (alongside the
    worktree-folder entry) and updates any documentation that previously implied the worktree folder was
    the only required `.gitignore` entry.

### Effect-of-overrides notes

24. Overrides only take effect where the overridden convention is actually exercised. In assisted runs no
    agents or monitors are spawned, so Agent-models and Health-monitoring overrides have no effect, while
    the Issues access-mechanism override still applies (the orchestrator itself reads/writes the tracker).
    This expectation is stated in the documentation.

### Explicitly out of scope for v1 (recorded future work)

25. **Overriding the artifact-storage mode and its fork/remote configuration** (`artifacts-in-repo` vs
    `artifacts-in-fork`, upstream/fork remotes, upstream branch/commit formats) is explicitly out of scope
    for v1. It is the leading future-work item: the motivation is real (a solo contributor wanting a
    private fork on an in-repo project), but flipping the mode locally rewires where commits are pushed and
    how the upstream PR is produced — shared, observable effects that other contributors and the
    orchestrator's close-out depend on — so a safe local override for it needs more design than v1.
26. **A per-machine override location outside the repository** (e.g. `~/.config/...`) is explicitly out of
    scope for v1; the repo-root, git-ignored `.rp.local.md` is the only supported location.