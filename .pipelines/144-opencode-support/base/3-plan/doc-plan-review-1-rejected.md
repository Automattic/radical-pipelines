# Doc Plan Review 1 — Rejected

## Verdict

**Rejected.**

## Summary

The plan is strong overall: traceability to spec/design/code-plan is thorough, the
surface inventory is mostly exhaustive, every referenced file/section/audience is real,
per-task acceptance is drift-resistant (oracle = shipped code; no function names or
verbatim wording baked in), there are no code tasks, and the granularity/ordering are
clean (all seven tasks are independent except the changeset/description timing notes).
The writer's explicit judgment call to **exclude the repo-root `.rp.md` line-3
statement is correct and I confirmed it against the actual files** (see Issue list,
item N0 — accepted, not a defect).

It is rejected for one concrete coverage gap: the single most explicit
"RP supports exactly two tools" claim on the public website — the hero stat
`<strong>2</strong><span>CLIs supported</span>` at `website/index.html:109` — is **not
listed** in Task 4's "Files to change" / "Sections-scope" / the "Surfaces in scope"
bullet for the website. It is left to be caught only by Task 4's catch-all acceptance
bullet. For a plan whose entire value is exhaustive, drift-resistant per-surface
enumeration (it even names the demo card label expressly to leave it untouched), an
omitted, currently-existing, hard "exactly two" surface inside a task's own file is a
real gap, not a nitpick. A doc-writer following the enumerated scope could update the
prose lines + meta tags, satisfy four of Task 4's five acceptance bullets, and ship
with line 109 still reading "2 CLIs supported" — directly contradicting the fifth.

## Issues

### Blocking

1. **Task 4 omits the website hero stat `2 / CLIs supported` (`website/index.html:109`)
   from its enumerated scope.**
   - The hero-stats block (`website/index.html:106–110`) contains
     `<li><strong>2</strong><span>CLIs supported</span></li>`. This is a hard,
     numeric, supported-tool-count claim that goes false the moment opencode is the
     third tool.
   - Task 4's "Files to change" enumerates only: `<meta name="description">`,
     `<meta name="keywords">`, the demo "runs in your CLI (Claude Code or Pi)" line
     (`:204`), the "Tooling caught up" line (`:279`), and the `install-grid` /
     `install-block`s / `install-note` (`:290–308`). The "Surfaces in scope" bullet
     (plan line 14) likewise omits the hero stats. The hero block is never named.
   - Task 4's acceptance does include "No marketing claim asserts RP supports exactly
     two tools after the change," which *would* cover line 109 — but the plan's whole
     method is to enumerate surfaces so the writer doesn't have to rediscover them, and
     this is the strongest counterexample to the "exactly two" framing on the entire
     site. Relying on the catch-all bullet to backfill a surface the scope omits is the
     drift risk the per-surface enumeration exists to prevent.
   - **Fix:** Add the hero-stats `2 / CLIs supported` line (`website/index.html:109`)
     to Task 4's Files-to-change and Sections-scope (and to the line-14 "Surfaces in
     scope" website bullet), instructing the writer to update the count to reflect
     three supported tools (consistent with how the shipped feature presents tool
     support), the same way the other "Claude Code or/and Pi" copy is updated.

### Non-blocking (fix opportunistically; not why this is rejected)

2. **`15 agents shipped` hero stat (`website/index.html:108`) — pre-existing
   inaccuracy, flag for the writer's judgment.** The repo ships 17 agents
   (`agents/*.md` count = 17; the README Pi-package list also enumerates 17), yet the
   hero says `15`. This is not caused by opencode and the plan need not own it, but
   since Task 4 is already editing the adjacent hero-stats block per Issue 1, the writer
   is in the exact place to notice it. Recommend the plan add a one-line note: while in
   the hero-stats block, the writer may correct the agent count if it judges the touch
   in-scope — or explicitly leave it as out-of-scope pre-existing drift. Either is fine;
   the plan should just say which, so the writer doesn't silently "fix" or silently
   "skip" an obviously-wrong adjacent number.

3. **Task 4 trace note vs. the demo "Run it yourself" link.** The demo caption links to
   `#claude-code-plugin-install` (`website/index.html:232`). That anchor stays valid
   (Task 1 keeps the Claude Code section), so no action is needed — but the plan's
   blanket "leave the reconstructed-demo-log content as-is" could read as covering the
   caption too. Optional: a half-sentence confirming the demo caption link target
   remains valid would remove any ambiguity. Not required.

### Accepted (verified, recorded so it is not re-raised)

- **N0 — `.rp.md` line-3 exclusion is correct.** Plan line 23 excludes the repo-root
  `.rp.md` line-3 statement ("the per-tool sections add conventions specific to Claude
  Code and Pi") on the grounds that it documents which per-tool sections *this repo*
  dogfoods, and the code plan adds no opencode block to this repo's own `.rp.md`. I
  confirmed: code-plan Tasks 1–7 touch `setup.md`, `health-monitoring.md`,
  `opencode.md`, `packages/opencode/**`, root `package.json`, `sync-version.mjs`, and
  `.changeset/config.json` — **none edits `.rp.md`**. So `.rp.md:3` stays literally true
  after phase 4 (this repo's `.rp.md` still carries only Claude Code + Pi per-tool
  sections). Exclusion accepted. (Aside, not the plan's concern: the README at line 159
  *describes* this repo's `.rp.md` as carrying both CC and Pi sections side-by-side,
  whereas the on-disk `.rp.md` per-tool conventions currently read as Claude-Code-only —
  `EnterWorktree`/`TeamCreate`/`/loop`. That is pre-existing repo state, unrelated to
  opencode, and correctly outside this plan.)

- Coverage of the other surfaces is complete and correctly located: README "Project
  Usage" intro + per-tool sections + dependency-bundling (Task 1), README Configuration
  per-tool summary (Task 2), README "Changelog and versioning" version-bearing-files +
  release flow (Task 3), `CONTRIBUTING.md` `changedFilePatterns` + version-sync + release
  prose (Task 5), the feature changeset (Task 6), and root `package.json` `description`
  (Task 7). I verified each named section/line exists and the `changedFilePatterns`
  the plan reconciles against (`.changeset/config.json`: `skills/**`, `agents/**`,
  `.claude-plugin/**`, `package.json`, `README.md`) matches CONTRIBUTING's list. The
  changeset shape/target (`@automattic/radical-pipelines`, `minor`) matches the existing
  `.changeset/*.md` examples. `CHANGELOG.md` correctly excluded (generated). Machine
  config (`marketplace.json`/`plugin.json`/`.pi/settings.json`) correctly excluded. The
  generic skill + convention files correctly ceded to the code plan. No code tasks; no
  scope creep into code-plan-owned files.
