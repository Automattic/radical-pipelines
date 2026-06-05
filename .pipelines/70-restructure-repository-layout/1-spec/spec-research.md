# Spec research — Restructure the repository layout (issue #70)

## Rough idea

Reorganize the Radical Pipelines repository so that three concerns are immediately legible at a glance:

1. **Shared distribution** — the methodology (skill) and the agent profiles, common to all agentic coding tools.
2. **Per-tool packaging** — what is specific to Claude Code, Pi, and future tools (e.g. Codex).
3. **Project-level Radical Pipelines state** — this repo's own conventions and pipeline artifacts (dogfooding).

The end state should make adding a new tool a mechanical change touching only that tool's folder plus a single conventions file — never the shared core. The project is v0.1, so the cleanup is cheap now and harder later once external users memorize install paths.

The owner sketched two candidate end states (treated as hypotheses, not requirements):

- A `providers/`-based layout (`skill/`, `agents/`, `providers/claude-code/`, `providers/pi/`, `.rp/` for consumer state).
- A flatter layout (raised by SantosGuillamot): root `agents/`, `skills/`, `.claude-plugin/plugin.json`, `package.json`, `.rp/` namespace, no `providers/` folder.

Hard constraints surfaced by the owner: the Pi root `package.json` must stay at the repo root (git install resolves there); `.claude-plugin/marketplace.json` must stay at the repo root (marketplace add looks for it there); the skill currently reads `.rp.md` from the project root (open whether the skill can be changed to read it from `.rp/`).

Several open questions about Pi packaging (whether `.pi-extension/` can be deleted, whether agents/teams.yaml need declaring) and about whether `.rp.md` can move are explicitly deferred to research.

### Verified facts about the current repository (gathered before Q&A)

- Current root contains: `.agents/` (canonical skill + agents), root symlinks `agents -> .agents/agents` and `skills/radical-pipelines -> ../.agents/skills/radical-pipelines`; `.claude/` (`.rp.md`, `skills/radical-pipelines` symlink); `.pi/` (`.rp.md`, `settings.json`, `skills/radical-pipelines` symlink); `.pi-extension/` (`package.json`, `package-lock.json`, `teams.yaml`, `README.md`, `skills/radical-pipelines` symlink, `agents -> ../.agents/agents` symlink); `.claude-plugin/` (`plugin.json`, `marketplace.json`); root `.rp.md`, `package.json`, `package-lock.json`, `CLAUDE.md` (`@AGENTS.md`), `AGENTS.md`, `README.md`, `LICENSE`, `assets/radical-pipelines.png`, `landing/`, `scripts/`, `.changeset/`, `.pipelines/`.
- `.claude-plugin/marketplace.json` has `plugins[0].source: "./"` — the plugin source is the repo root, so `plugin.json` is currently expected at root.
- Root `package.json` `pi.skills` points at `.pi-extension/skills`; `.pi-extension/package.json` `pi.skills` points at `skills` (its own subfolder). Both manifests are version `0.1.1` and duplicate the same `pi.extensions`/dependencies.
- `.pi/settings.json` = `{"packages": ["../.pi-extension"]}` (dogfood auto-install).
- The skill's `reference/conventions/load.md` (line 5) and `setup.md` hardcode reading `.rp.md` from the project root; both describe it as a SINGLE conventions file. `claude-code.md` and `pi.md` each describe a single canonical `.rp.md` content block — they do NOT describe the current root/`.claude`/`.pi` three-file split. (The skill docs are already not fully consistent with today's 3-file layout.)
- Both `.claude/.rp.md` and `.pi/.rp.md` reference `.agents/skills/radical-pipelines/reference/health-monitoring.md` and `.agents/agents/` by literal path — these break if `.agents/` is removed.
- `scripts/sync-version.mjs` hardcodes `TARGET_MANIFESTS = [".claude-plugin/plugin.json", ".pi-extension/package.json"]`; `scripts/test/sync-version.test.mjs` exercises these. The `release:version` npm script runs `npm --prefix .pi-extension install --package-lock-only`.
- `README.md` (~27 KB) documents all install paths, the symlink scheme, the dual-manifest scheme, and the version-sync targets in prose. `.pi-extension/README.md` documents `pi install ./.pi-extension -l`.
- `.changeset/changelog-and-version-sync.md` and the README changelog/versioning section describe the version-bearing files.
- `.gitignore` lists `.pi/npm/node_modules/`, `.pi/worktrees/`, `.pi-extension/node_modules/`.

## Q&A

### Q1 — Does `providers/` buy anything under the confirmed constraints?

**Asked:** Given that the Pi root `package.json` and `.claude-plugin/marketplace.json` are pinned to the repo root, can both tools be served from root-level real `skills/` + `agents/` directories plus root-level manifests, making `providers/` an aesthetic-only indirection? Sub-questions: (1) Can Claude Code load skills/agents from repo root with `source: "./"`? (2) Does either tool choke on the other tool's files sitting in the same root? (3) Does Pi's `teams.yaml`/discovery need a dedicated subfolder?

**Answer:** Hypothesis confirmed — `providers/` provides ZERO unique function under the constraints, and the owner explicitly killed it.

- **Claude Code with `source: "./"` already serves skills/agents from the repo root today.** The root `skills/` and `agents/` are symlinks ONLY because the canonical source was hidden in `.agents/`. Once `.agents/` is removed and these become real directories at root, the plugin (source `"./"`) reads them directly — no symlink, no `providers/`. Owner comment 1: "if we keep `.claude-plugin/plugin.json` at the root, we don't need to make any symlink, the `skills` and `agents` folders are fine."
- **Pi reads root `skills/` directly via the root `package.json` `pi` manifest.** `pi.skills` is just relative path strings; repointing the first entry from `.pi-extension/skills` to `"skills"` is a one-line edit. `package.json` is pinned to root anyway, so no `providers/pi/` home is needed.
- **No conflict from both tools reading the same root `skills/` + `agents/`.** Neither tool scans the repo root; each reads only named subpaths (Claude Code) or explicit listed paths (Pi). Sibling files (other tool's manifest, README, landing/) are inert to both. They already share canonical `.agents/` content today via different symlink paths with no conflict.
- **Pi `teams.yaml` needs no package subfolder.** pi-teams does not read package-local team files; it reads the global `~/.pi/teams.yaml`. So `teams.yaml`'s tree location is functionally irrelevant to discovery. Pi agents are likewise discovered from `.pi/agents/` or `~/.pi/agent/agents/`, not a package subfolder; the `.pi-extension/agents` symlink is in the `files:` array (npm-publish convention) which is effectively dead for git/local installs.
- **DECISIVE — owner explicitly killed `providers/`.** Issue #70 comment 1 (luisherranz): "we can get rid of the `providers` folder entirely." SantosGuillamot's reply redraws the target WITHOUT `providers/`. The `providers/` layout was the original strawman in the issue body, now superseded by the comments.

**Important nuance (not a blocker):** There are TWO Pi manifests today — root `package.json` (consumed by `pi install git:`) and `.pi-extension/package.json` (the `@automattic/radical-pipelines-pi` package, consumed by the dogfood path via `.pi/settings.json`). The owner's open question 1 is whether `.pi-extension/` can be DELETED entirely (folding to root `package.json` only) once `.pi/` is dropped and `pi.skills` repointed to root `skills/`. This is the subject of Q2 below.

**Verification caveat:** spec-researcher verified file contents, manifest fields, symlink targets, and issue/comment text directly, but did NOT execute a live `pi install`/`claude --plugin-dir` this turn. The resolution claims rest on the repo's documented verified installs plus the fact that the current root-served-via-symlink setup already works.

**Decision: drop `providers/`. Adopt the flat root-served layout.**

### Q2 — Can `.pi-extension/` be deleted entirely (single Pi manifest at root)?

**Asked:** Can `.pi-extension/` be deleted, leaving the root `package.json` as the single Pi manifest? Validate: (a) dependency bundling — does deleting `.pi-extension/` lose dep delivery the git-install path relied on? (b) the `release:version` script + sync tooling blast radius. (c) does the dogfood path still work via `pi install . -l` on the root manifest?

**Answer:** Yes — `.pi-extension/` can be deleted entirely without losing end-user dependency delivery.

**(a) Dependency bundling — no break.** The git-install path (`pi install git:`) resolves at the cloned repo root and reads the ROOT manifest, which has plain `dependencies` + `peerDependencies` and NO `bundledDependencies`. After cloning, Pi runs `npm install` at the root (per Pi's package docs: "pi resets and cleans the clone, then runs `npm install` if `package.json` exists"; "git packages install dependencies with `npm install --omit=dev` ... runtime deps must be listed under `dependencies`"), which populates root `node_modules/`. So dep delivery comes from `dependencies` + Pi's post-clone `npm install`, NOT from `.pi-extension/`'s `bundledDependencies`. `bundledDependencies` only matters for tarball/`npm pack` delivery, which this repo does not do. The git-install path never consumed `.pi-extension/`'s bundling.
- **DOC BUG to fix:** README's "Dependency bundling" section currently claims "The root manifest declares the same bundled dependencies directly." This is FALSE today — the root manifest has no `bundledDependencies` (verified). The section must be corrected/rewritten when `.pi-extension/` is deleted, not carried forward.

**(b) `release:version` + sync tooling — fully enumerated blast radius (no other live references exist):**
1. `package.json` `scripts.release:version` — drop the trailing ` && npm --prefix .pi-extension install --package-lock-only` step.
2. `scripts/sync-version.mjs` `TARGET_MANIFESTS` — remove `.pi-extension/package.json`, leaving only `.claude-plugin/plugin.json`. (Root `package.json` is the SOURCE, never a target — untouched. plugin.json remains the one sync target since it mirrors `version`.)
3. `scripts/test/sync-version.test.mjs` — loops generically over `TARGET_MANIFESTS` (no hardcoded `.pi-extension` string), so it auto-adjusts to one entry. Re-run `node --test` to confirm green.
4. `.gitignore` — remove `.pi-extension/node_modules/`, `.pi/npm/node_modules/`, `.pi/worktrees/` (dead after deletion). Root `node_modules/` stays covered by the existing `node_modules/` line.
5. README + `.changeset/changelog-and-version-sync.md` — docs describing the sync touching `.pi-extension/package.json`/lockfile and the dogfood `cd .pi-extension && npm install`. README sections "Dependency bundling", "Single source of truth", "Cutting a version", "Pi package install" all need updating. The changeset markdown is a consumed historical entry — editing it is an editorial call.
- No references in `.github/workflows/` (only `deploy-landing.yml`, landing-only). No changeset config reference.

**(c) Dogfood path — works, with one changed manual step the owner already accepted.** After deleting `.pi/settings.json` and `.pi-extension/`, dogfood becomes `pi install . -l` on the root manifest. Same as before except the package root is the repo root vs `.pi-extension/`. The `node_modules/...` entries in `pi.skills`/`pi.extensions` require deps present first: old dogfood needed `cd .pi-extension && npm install`; new dogfood needs `npm install` at the repo ROOT before `pi install . -l` (local-path install does not auto-`npm install` the way git-source does). This is exactly the "one-time `pi install . -l` after cloning" tradeoff the owner explicitly accepted. The root manifest serves BOTH the git-install and dogfood paths.

**Verification caveat:** `pi` CLI is NOT installed in this environment, so a live `pi install . -l && pi list` could not be run. Mechanics rest on Pi's official package docs (quoted), the repo's README describing previously-verified local installs, manifest contents read directly, and git history (commit a99a390 introduced the root manifest with deps-only).

**Decision: delete `.pi-extension/` entirely; root `package.json` becomes the single Pi manifest. `pi.skills` entry 0 repoints to `"skills"`. Apply the (b) blast-radius edits.**

### Q3 — Can the conventions file move into `.rp/`, and what does it cost? (Layer 1 = skill / Layer 2 = dogfood)

**Asked:** Can the conventions file move from root `.rp.md` into `.rp/` (e.g. `.rp/CONVENTIONS.md`)? Is the location a free choice or tool-forced? Does the SHARED skill have to change? Does the skill support a single merged file with per-tool sections, or assume the split? Naming preference?

**Answer:** Location IS a free choice (skill-instructed, not tool-forced), so `.rp/CONVENTIONS.md` is viable — BUT relocating/renaming it is a SHARED SKILL change, and the three-file split is a dogfood-only divergence from the skill's already-single-file model.

**Layer 1 — the skill (shared distribution):**
- No HARD technical reason forces project-root. Neither Claude Code nor Pi auto-reads `.rp.md`; the tool-native files are AGENTS.md/CLAUDE.md. `.rp.md` is a Radical-Pipelines-invented filename with no special harness status — the orchestrator opens it via an explicit Read because the skill INSTRUCTS it (`load.md:5` "Read it at the start of any workflow"). The skill is generic and the path is whatever the skill says, as long as the WRITE path (setup.md) and READ path (load.md) agree.
- **Full inventory — 11 occurrences across exactly 4 files, all under `reference/conventions/`:** `load.md:5` (the read instruction); `claude-code.md:7` ("canonical content for `.rp.md`"); `pi.md:5` ("Canonical `.rp.md` content for Pi"); `setup.md` lines 100, 108, 115, 167, 169, 176 (write), 185, 193–194. ZERO `.rp.md` references in SKILL.md, the phase references, create-pipeline.md, work-on-an-issue.md, resume-pipeline.md, fork-pipeline.md, manage-issues.md, pipeline-versioning.md, health-monitoring.md. Conventions are loaded once via load.md and passed down; phase refs never re-read the path.
- **Binary choice:** (A) keep `.rp.md` at project root → skill untouched (Layer 1 out of scope); or (B) move/rename it → must update those 4 skill files consistently (Layer 1 in scope, ships to ALL consumers). You CANNOT keep the skill reading project-root while this repo uses `.rp/CONVENTIONS.md`, because the repo dogfoods against the skill — they MUST agree or the repo's own pipelines fail to load conventions.
- Owner already recognizes this: issue #70 comment 2 asks "we could make the skill read it from the `.rp/` folder, right?" — i.e. he treats it as a skill change. **This EXCEEDS the prompt's "merge three repo-local files" framing and must be flagged to spec-writer as a distinct, consumer-facing scope item.**

**Layer 2 — the merge (single vs. three) — direction is the OPPOSITE of the prompt's mental model:**
- **The skill ALREADY encodes a SINGLE-file model.** `load.md:5` (singular "the project-root `.rp.md` file"), `setup.md:176` (writes ONE file), `claude-code.md`/`pi.md` each emit ONE canonical block for the active tool. The skill NEVER mentions `.claude/.rp.md` or `.pi/.rp.md` (grep → zero hits). A normal consumer uses ONE CLI and gets ONE `.rp.md`.
- **The three-file split is a DOGFOOD-ONLY invention** this repo added because it uniquely documents BOTH Claude Code AND Pi side-by-side (it's the source repo, not a single-CLI consumer). README "Configuration" admits it: "Most projects use a single CLI and keep all of their conventions in one project-root `.rp.md`." The dogfood files even drifted: `.claude/.rp.md` references `.agents/.../health-monitoring.md` (literal path #70 deletes) whereas the skill's `claude-code.md` block uses skill-relative `reference/health-monitoring.md`.
- **Therefore:** for a normal consumer, "merge to one" is a no-op (skill already produces one). For THIS repo, it's a repo-local consolidation (3→1) that realigns the dogfood WITH the skill's existing model — not fighting the skill, the repo catching up. The merge itself is mostly repo-local; the RELOCATION/RENAME is what drags in Layer 1.
- **One genuinely-new skill capability** would arise ONLY if we want the SKILL (not just this repo) to emit a multi-tool `## When using <tool>` file: setup.md/claude-code.md/pi.md would need to learn that pattern. If the multi-tool file is needed only in THIS repo and hand-maintained, that capability is not required of the skill. (This is a sub-decision for the design phase — see Open Decisions.)

**Naming:** No hard constraint. setup.md (shared) WRITES the name for every consumer, so it's a methodology-wide decision. `.rp/CONVENTIONS.md` matches the skill's established vocabulary ("Load Conventions", "Setup Conventions", the conventions table) better than `.rp/RP.md`; lean `.rp/CONVENTIONS.md` on terminology grounds, but owner left it explicitly open (#70 comment 2: `.rp/RP.md` "It could use another name"). Either is fine alongside `.rp/pipelines/`.

**Verification caveat:** All skill-file lines, dogfood files, and greps verified directly. The "no tool auto-reads `.rp.md`" claim is grounded in the skill's explicit-Read design (it wouldn't instruct a Read if the tool auto-loaded it) plus AGENTS.md/CLAUDE.md being the tool-native files; no live harness probe was run.

**Provisional decision (owner's call — see Open Decisions): the layout adopts `.rp/` as the namespace. Whether the conventions file moves INTO `.rp/` (Layer 1 skill change) vs. stays as root `.rp.md` is the one decision that materially changes scope. Pending owner confirmation, treat "move into `.rp/CONVENTIONS.md` + update the 4 skill files" as the intended direction, since the owner raised it and the `.rp/`-houses-everything goal motivates it.**

### Q4 — `.agents/` removal + symlink-elimination mechanics + small moves

**Asked:** Validate: (a) canonical content destination/name (`skill/` vs `skills/radical-pipelines/`); (b) any dangling `.agents/` absolute paths inside SHIPPED skill content; (c) assets merge — MD5s, refs, scope; (d) delete vs keep `CLAUDE.md`.

**Answer (four corrections to the prompt surfaced):**

**(a) Canonical home MUST be `skills/radical-pipelines/SKILL.md` (plural container + named subdir) and a real `agents/` dir of 17 files. The prompt's singular `skill/` option is WRONG.**
- The skill's name is `radical-pipelines` (SKILL.md frontmatter). A skill is identified by a DIRECTORY named after the skill, containing `SKILL.md`. Claude Code resolves `skills/<skill-name>/SKILL.md` (invocation `/radical-pipelines:radical-pipelines`); Pi's `pi.skills` entries are dirs that CONTAIN skill subdirs. Both require a `skills/` container holding `radical-pipelines/`.
- The providers strawman's singular `skill/` only worked because a symlink RE-NAMED it to `skills/radical-pipelines`. Dropping symlinks (the whole point of #70) means the REAL dir must already be named `skills/radical-pipelines/`. SantosGuillamot's flat layout (`skills/` plural) is correct; the issue-body `skill/` is the superseded strawman.
- Root `agents/` becomes a real dir of the **17** agent `.md` files (spec-analyst/researcher/writer/reviewer/consolidator, design-doc analyst/researcher/writer/reviewer, code-plan writer/reviewer, doc-plan writer/reviewer, code-writer, code-reviewer, doc-writer, doc-reviewer). Claude Code reads plugin `agents/` as a flat dir; Pi discovers agents from `.pi/agents/`/`~/.pi/agent/agents/` (not this dir — the `.pi-extension/agents` symlink was in the dead `files:` field, referenced by neither `pi` manifest, per Q2).

**(b) EXACTLY ONE dangling `.agents/` absolute path inside SHIPPED skill content — a required edit.**
- `reference/health-monitoring.md:65` (inside the `/loop` monitor PROMPT TEMPLATE) self-references the recovery table as `.agents/skills/radical-pipelines/reference/health-monitoring.md`. After the canonical move, this absolute path dangles. MUST be updated to `skills/radical-pipelines/reference/health-monitoring.md` (or made skill-relative). This is a real correctness bug the move introduces if missed.
- All other shipped-skill cross-references are skill-relative (`reference/...`) and survive the move. The other `.agents/.../health-monitoring.md` references the analyst saw were in the DOGFOOD `.claude/.rp.md`/`.pi/.rp.md` (being merged anyway per Q3) — distinct from this shipped one.

**(c) Assets merge — OPTIONAL; if done, requires a deliberate PNG choice.**
- The two PNGs are NOT byte-identical: `assets/radical-pipelines.png` = MD5 `040725524e1c028fec264c9cda05b205`, 326692 bytes; `landing/assets/radical-pipelines.png` = MD5 `d627566a94a36cfd14e4428e4cf6f3d2`, 246316 bytes. Different content AND size — not interchangeable. ("Same artwork at different export settings" is an unverified assumption — not visually diffed.)
- Refs: root asset referenced ONCE — `README.md:3` `src="./assets/radical-pipelines.png"`. Landing asset referenced in `landing/index.html` lines 22 (og:image), 32 (twitter:image), 42 (icon), 58 (JSON-LD image) — all already using the landing path. Landing's svg assets unaffected.
- Merge mechanics: pick ONE png → land at `landing/assets/radical-pipelines.png` → delete root `assets/` → update `README.md:3` to `./landing/assets/radical-pipelines.png`. The README currently uses the larger 326KB image; landing uses the 246KB one — editorial call which wins.
- **Scope: OPTIONAL.** Owner said assets "CAN be merged" (a CAN, not a MUST). Recommend the spec treat it as optional/secondary, explicitly noting the "pick one PNG + update README ref" decision so it isn't done blindly.

**(d) KEEP `CLAUDE.md` (one-line `@AGENTS.md`). The prompt's "delete it" is WRONG.**
- Claude Code does NOT read AGENTS.md natively as of mid-2026. It reads CLAUDE.md; a repo with only AGENTS.md loads ZERO project instructions silently (no error). Native AGENTS.md support is an open feature request (anthropics/claude-code#34235), not shipped. The supported bridge is exactly the `@AGENTS.md` import in CLAUDE.md.
- Today root `CLAUDE.md` = `@AGENTS.md` (one line); `AGENTS.md` holds the real instructions. Deleting CLAUDE.md → silent loss of all project instructions for Claude Code = regression. The repo's own README "Configuration" deliberately preserves the `@AGENTS.md` pointer.
- SantosGuillamot's flat layout correctly marks `CLAUDE.md` "required". The issue-body claim "Modern Claude Code reads AGENTS.md natively" is factually outdated — do not carry it forward.

**Verification caveat:** File structures, agent count (17), the single dangling path + context, MD5s/sizes, all asset refs, CLAUDE.md/AGENTS.md contents verified directly. Claude Code's native-AGENTS.md behavior verified via mid-2026 web reporting + corroborated by the repo's own pointer-preservation guidance; no live Claude Code session run.

**Decisions:** canonical → real `skills/radical-pipelines/` + real `agents/` (17 files); fix `health-monitoring.md:65` dangling path; assets merge OPTIONAL (pick-one-PNG noted); KEEP `CLAUDE.md`.

### Q5 — Marketplace `source` field + complete reference/break master list + README scope

**Asked:** (a) Does marketplace `source: "./"` need changing? (b) Exhaustive deduplicated reference inventory (Layer 1 vs Layer 2). (c) README scope + `.pi-extension/README.md` fate. (d) Anything else that dangles beyond health-monitoring.md:65.

**Answer:**

**(a) `marketplace.json` is UNTOUCHED.** `source: "./"` stays; plugin root stays = repo root; `skills/`+`agents/` become real dirs at root. Two facts from Claude Code plugin docs worth capturing: (1) marketplace install COPIES the whole plugin dir to `~/.claude/plugins/cache` — with `source: "./"` that's the whole repo root, but only declared components (skills/agents/commands/hooks/mcp) LOAD; landing/scripts/etc. are copied-but-inert. This is NOT new — `source: "./"` has always been the value; #70 SHRINKS the copy by deleting `.agents/`/`.pi-extension/`/`.pi/`/`.claude/`. Not a regression, not a blocker. (2) "Paths referencing files outside the plugin directory won't work" in an installed plugin — so the health-monitoring.md:65 absolute path was ALREADY broken for installed plugins, not just dangling after #70. **The fix must make it skill-RELATIVE (`reference/health-monitoring.md`), not merely repoint `.agents/`→`skills/`.**

**(b) Complete deduplicated reference master list:**

_LAYER 1 — shipped skill (`.agents/skills/radical-pipelines/`, ships to every consumer):_
- `reference/health-monitoring.md:65` — `.agents/skills/.../health-monitoring.md` in the `/loop` prompt template. **FORCED fix regardless of other decisions; make skill-relative.**
- `reference/conventions/load.md:5` — "project-root `.rp.md`". Change ONLY if Q3 relocate chosen.
- `reference/conventions/setup.md:100,108,115,167,169,176,185,193,194` — `.rp.md` write-path/lifecycle (9 mentions). Change ONLY if Q3 relocate/rename.
- `reference/conventions/setup.md:52` — "Suggested default: `.pipelines/<pipeline-slug>/`" — the shipped artifact-folder DEFAULT. Judgment call whether the shipped default should become `.rp/pipelines/` too (it's a suggestion; consumers pick their own). Flag for writer.
- `reference/conventions/pi.md:5` / `claude-code.md:7` — "canonical content for `.rp.md`" headings. Change if Q3 relocate/rename.
- **Runtime conventions — DO NOT TOUCH:** `pi.md:12` (`.pi/worktrees`), `pi.md:51,52,62,63` (`.pi/agents/`, `~/.pi/agent/agents/` Pi discovery), `claude-code.md:14,15` (`.claude/worktrees/` EnterWorktree path). These are tool runtime behaviors, NOT canonical-source moves. (Note: `.claude/worktrees/` is Claude-managed, unrelated to the deleted dogfood `.claude/.rp.md`.)
- **Layer-1 summary:** exactly ONE forced edit (health-monitoring.md:65); the `.rp.md` cluster (load.md + setup.md + pi.md + claude-code.md headings) is forced ONLY if Q3 relocate/rename is chosen; setup.md:52 default is a judgment call.

_LAYER 2 — dogfood + docs + tooling (this repo only):_
- Dogfood `.rp.md` trio (merged per Q3, then deleted in current form): `.rp.md:7,8` (pointer to per-tool files — dies), `.rp.md:49` (`.pipelines/` → `.rp/pipelines/`), `.claude/.rp.md:19` + `.pi/.rp.md:53` (`.agents/.../health-monitoring.md` literal — die on merge), `.pi/.rp.md:3,6` (`.pi/settings.json` auto-install + `pi install ./.pi-extension -l` → `pi install . -l` after root `npm install`), `.pi/.rp.md:47` ("canonical agents in `.agents/agents/` via symlinks" — REWRITE: real `agents/`, no symlinks). Keep in merged file as conventions: `.pi/.rp.md:16` (`.pi/worktrees`), `.pi/.rp.md:45` (`.pi/agents/`), `.claude/.rp.md:3` (`.claude/worktrees/`).
- Tooling (live): `package.json:12` (`release:version` drop npm --prefix step), `package.json:33` (`pi.skills[0]` → `"skills"`), `scripts/sync-version.mjs:39` (drop `.pi-extension/package.json` target), `scripts/test/sync-version.test.mjs` (generic — re-run only), `.gitignore:2,3,4` (drop `.pi/npm/node_modules/`, `.pi/worktrees/`, `.pi-extension/node_modules/`; root `node_modules/` still covered by line 1), `.pi/settings.json` (deleted with `.pi/`).
- `.changeset/changelog-and-version-sync.md:5` — consumed historical entry describing the sync; editing is editorial, not a live break.

**(c) README MUST be updated (repo standing rule). ~6 sections need rewriting:**
- "Claude Code plugin install" (drop symlink explanation, describe real `skills/radical-pipelines/`+`agents/`); "Pi package install" (single root manifest, `npm install`+`pi install . -l`, remove `cd .pi-extension`); "Pi usage" (drop `.pi-extension` validation); "Dependency bundling" (LARGEST rewrite — single manifest, fix the false "bundled dependencies directly" sentence, remove dual-layer/symlink/`.agents/` description); "Fallback skill install" (re-validate symlink caveat wording, line 151); "Configuration" (single `.rp.md`/`.rp/CONVENTIONS.md`, drop three-file per-CLI paragraph at line 169); "Changelog and versioning" / "single source of truth" + "Cutting a version" (drop `.pi-extension/package.json` + lockfile as version-bearing, single sync target, drop npm --prefix); README header line 3 (asset path if merged — optional); "Current status and limitations" (re-validate line 248 pi-teams wording).
- **`.pi-extension/README.md`:** DELETED with the folder. Its content mostly duplicates the root README's Pi sections (kept in sync). Only minor verification-note provenance (print-mode `/skill:radical-pipelines` check; Node engine/audit caveats) is a nice-to-have to fold into root README. No unique architectural content lost.

**(d) Complete runtime/correctness break list (beyond docs):** (1) health-monitoring.md:65 dangling+outside-relative path — FORCED fix; (2) `package.json:33` `pi.skills[0]` points at deleted `.pi-extension/skills` — breaks Pi skill resolution unless repointed; (3) `package.json:12` npm --prefix step — would `npm install` a non-existent dir, breaks release script; (4) `scripts/sync-version.mjs:39` target — would write a deleted file, breaks the script; (5) `.pi/settings.json` auto-install of deleted package — self-resolves (file deleted); (6) `.pi/.rp.md:47` symlink claim — stale, merges away.
- **Confirmed SAFE (no break):** `.changeset/config.json` (no moved-path refs), `.github/workflows/deploy-landing.yml` (references only `landing/` — and the asset merge into `landing/assets/` would actually be auto-deployed, IMPROVING correctness since only `landing/` is deployed), `scripts/test/sync-version.test.mjs` (generic loop), the 17 agent files + skill `reference/` tree (internal links are skill-relative, survive the move — only the ONE absolute path breaks).

**Verification caveat:** All file:line entries, README section map, tooling/CI/changeset/test contents, workflow scope verified directly. Plugin cache-copy + outside-directory-paths behavior from official Claude Code docs (quoted), not a live `/plugin marketplace add` run.

**Decisions:** marketplace.json untouched; the only Layer-1 forced edit is health-monitoring.md:65 (make skill-relative); must-fix runtime breaks are items 1–4; README update is a required deliverable (~6 sections); `.pi-extension/README.md` dies with the folder.

## Consolidated Requirements

This restructure reorganizes the Radical Pipelines repository so three concerns are immediately legible — shared distribution, per-tool packaging, and project-level Radical Pipelines (dogfood) state — while keeping both install paths working. Research resolved every open question in the prompt and corrected several premises (the singular `skill/` name, deleting `CLAUDE.md`, the README "bundled dependencies" claim, and the framing of `.rp.md` relocation as repo-local).

### Target layout (flat — `providers/` is dropped)

```
radical-pipelines/
├── .claude-plugin/
│   ├── plugin.json                 # stays at root; source "./" plugin
│   └── marketplace.json            # stays at root; source: "./" UNCHANGED
├── .rp/                            # consumer/dogfood Radical Pipelines state
│   ├── CONVENTIONS.md              # merged conventions (name + location: see Open Decision 1)
│   └── pipelines/                  # renamed from .pipelines/
├── skills/
│   └── radical-pipelines/          # REAL dir (canonical skill; was .agents/skills/...)
│       ├── SKILL.md
│       └── reference/...
├── agents/                         # REAL dir of 17 agent .md files (was .agents/agents/)
├── landing/                        # root assets/ optionally merged into landing/assets/
├── scripts/                        # sync-version.mjs (targets reduced to plugin.json)
├── package.json                    # single Pi manifest; pi.skills[0] = "skills"
├── package-lock.json
├── AGENTS.md                       # source of truth for project instructions
├── CLAUDE.md                       # KEPT — one-line @AGENTS.md (Claude Code needs it)
├── README.md                       # MUST be updated (~6 sections)
└── LICENSE
```

**Deleted:** `.agents/` (canonical contents promoted to real root `skills/radical-pipelines/` + `agents/`); all mirror symlinks (root `agents`, root `skills/radical-pipelines`, `.claude/skills/...`, `.pi/skills/...`, `.pi-extension/skills/...`, `.pi-extension/agents`); `.claude/` (dogfood dir — its `.rp.md` merges); `.pi/` (incl. `settings.json` — its `.rp.md` merges; dogfood install becomes one-time `pi install . -l`); `.pi-extension/` (entire folder incl. second manifest, lockfile, `teams.yaml`, `README.md`, symlinks); root `.rp.md` (merged); `.pipelines/` (renamed to `.rp/pipelines/`). **NOT deleted:** `CLAUDE.md`, `package.json`, `.claude-plugin/` (both files stay at root).

### Functional requirements

**FR1 — Promote canonical sources to real root directories.** Move `.agents/skills/radical-pipelines/` → `skills/radical-pipelines/` (plural container + named subdir; `SKILL.md` + `reference/` tree) and `.agents/agents/` (17 files) → `agents/`, as REAL directories. Delete `.agents/` and every mirror symlink. Singular `skill/` is invalid (breaks discovery for both tools under a no-symlink layout).

**FR2 — Claude Code plugin install keeps working.** `/plugin marketplace add Automattic/radical-pipelines` resolves via root `.claude-plugin/marketplace.json` (`source: "./"`, UNCHANGED) and root `.claude-plugin/plugin.json`; the plugin loads the skill and agents from real root `skills/radical-pipelines/` + `agents/`. Local dogfood uses `claude --plugin-dir ./` (replacing `.claude/`).

**FR3 — Consolidate to a single Pi manifest at root.** Delete `.pi-extension/` entirely; the root `package.json` is the sole Pi manifest. Repoint `pi.skills[0]` from `.pi-extension/skills` to `"skills"`. `pi install git:github.com/Automattic/radical-pipelines` (deps delivered via root `dependencies` + Pi's post-clone `npm install` — NOT via `bundledDependencies`) and dogfood `pi install . -l` (after a one-time root `npm install`) both keep working.

**FR4 — Merge the three `.rp.md` files into one conventions file.** Root `.rp.md` + `.claude/.rp.md` + `.pi/.rp.md` merge into a single file with a shared top section and per-tool sections. The merged file must drop the per-tool pointer, replace `pi install ./.pi-extension -l` with `pi install . -l`, drop the `.pi/settings.json` auto-install language, and rewrite the `.pi/.rp.md:47` "canonical agents in `.agents/agents/` via symlinks" sentence to reflect real `agents/`. Keep runtime conventions (`.claude/worktrees/`, `.pi/worktrees`, `.pi/agents/`).

**FR5 — Fix the one forced shipped-skill correctness bug.** `reference/health-monitoring.md:65` references `.agents/skills/.../health-monitoring.md` (absolute) inside the `/loop` prompt template. Make it skill-RELATIVE (`reference/health-monitoring.md`) — this both removes the post-move dangle AND fixes a pre-existing break in installed plugins (outside-directory paths don't resolve in the plugin cache). This is required REGARDLESS of any other decision.

**FR6 — Update the version-sync tooling.** In `package.json`, drop the trailing `&& npm --prefix .pi-extension install --package-lock-only` from `scripts.release:version`. In `scripts/sync-version.mjs`, remove `.pi-extension/package.json` from `TARGET_MANIFESTS` (leaving only `.claude-plugin/plugin.json`; root `package.json` remains the SOURCE). Re-run `scripts/test/sync-version.test.mjs` (generic over `TARGET_MANIFESTS`; no code edit needed, must stay green).

**FR7 — Clean `.gitignore`.** Remove `.pi/npm/node_modules/`, `.pi/worktrees/`, `.pi-extension/node_modules/`. Root `node_modules/` stays covered by the existing `node_modules/` line.

**FR8 — Rename pipeline artifacts namespace.** `.pipelines/<slug>/` → `.rp/pipelines/<slug>/` (this repo's own dogfood artifacts).

**FR9 — Update README.md (required by the repo's standing rule).** Rewrite the sections: Claude Code plugin install (drop symlink scheme), Pi package install (single root manifest, `npm install` + `pi install . -l`), Pi usage, Dependency bundling (largest — fix the false "root manifest declares the same bundled dependencies directly" sentence; remove dual-manifest/symlink/`.agents/` description), Fallback skill install (re-check symlink caveat), Configuration (single conventions file; drop the three-file per-CLI paragraph), Changelog and versioning + Cutting a version (single sync target, drop npm --prefix and `.pi-extension` lockfile as version-bearing). Update header image ref if assets merged. `.pi-extension/README.md` is deleted with the folder; fold only minor verification-note provenance into the root README.

**FR10 — Record a changeset.** Per AGENTS.md, this change requires a committed `.changeset/*.md`. It is a breaking change to install/layout (paths external users would have memorized) → choose bump type by semver (likely minor at v0.1, but the writer/owner decides per the changelog guidance).

### Acceptance criteria

- AC1: `.agents/`, `.pi-extension/`, `.pi/`, `.claude/` (dogfood dir), root `.rp.md`, root `assets/` (if merged), and ALL mirror symlinks no longer exist. `skills/radical-pipelines/SKILL.md` and `agents/*.md` (17) exist as real files.
- AC2: `/plugin marketplace add Automattic/radical-pipelines` then plugin load exposes the `radical-pipelines` skill and the agents (verified, or at minimum the layout matches Claude Code's documented `skills/<name>/SKILL.md` + flat `agents/` plugin resolution with `source: "./"`).
- AC3: `pi install . -l` (after root `npm install`) succeeds and `pi list` shows the package + `radical-pipelines` skill; `pi.skills[0]` = `"skills"` resolves. (Empirical run requires the `pi` CLI, absent in the spec environment — design/code phase must verify.)
- AC4: `node scripts/sync-version.mjs` runs clean with only `.claude-plugin/plugin.json` as target; `node --test scripts/test/sync-version.test.mjs` passes; `release:version` script contains no `.pi-extension` reference.
- AC5: No file under shipped `skills/radical-pipelines/` contains an absolute `.agents/...` path; health-monitoring.md's `/loop` template uses a skill-relative reference.
- AC6: The single merged conventions file exists at the chosen location, contains shared + per-tool sections, and the skill's read path (load.md) + write path (setup.md) agree with that location.
- AC7: README.md contains no stale references to `.agents/`, `.pi-extension/`, the symlink scheme, the dual manifest, or "bundled dependencies declared directly"; documents the new flat layout and install paths.
- AC8: `.github/workflows/deploy-landing.yml` still deploys `landing/` (unchanged); if assets merged, the README image points at the surviving `landing/assets/radical-pipelines.png`.
- AC9: A `.changeset/*.md` accompanies the change.

### Open decisions (carry into design phase)

**OD1 — Does the conventions file relocate into `.rp/` (and what is it named)? [OWNER'S CALL — materially changes scope]**
This is the single decision that determines whether the SHARED SKILL changes. Two branches, both fully specified:
- **Branch A — relocate (recommended; owner raised it in #70 comment 2, and the `.rp/`-houses-everything goal motivates it):** merged file lives at `.rp/CONVENTIONS.md` (name matches the skill's "conventions" vocabulary; `RP.md` also viable, owner left it open). Requires editing 4 shipped skill files (`load.md`, `setup.md`, `pi.md`, `claude-code.md`, 11 occurrences) so the read path + write path + canonical-content headings all point at the new location. **This ships to every consumer** — a methodology-wide change, not repo-local.
- **Branch B — keep at project root:** merged file stays root `.rp.md`; the skill is untouched (Layer 1 out of scope). Smaller blast radius; `.rp/` then holds only `pipelines/`.
Recommendation: Branch A, because the owner proposed it and it realizes the "everything Radical-Pipelines under `.rp/`" goal. If the owner prefers to minimize shared-skill churn, Branch B is clean and the rest of the spec is unaffected.

**OD2 — Should the shipped skill learn a multi-tool `## When using <tool>` conventions format?** The skill currently emits ONE tool's block (single-CLI consumers). This repo is the only multi-CLI consumer. If the merged dogfood file is hand-maintained, no skill change is needed beyond OD1. If the methodology should be able to PRODUCE a multi-tool file for any future multi-CLI consumer, setup.md/claude-code.md/pi.md must learn the pattern. Recommendation: hand-maintain the repo's merged file; defer teaching the skill multi-tool emission unless the owner wants it (out of scope for #70).

**OD3 — Should the shipped artifact-folder DEFAULT (`setup.md:52` `.pipelines/<slug>/`) change to `.rp/pipelines/`?** This repo adopts `.rp/pipelines/` (FR8), but the shipped suggested default is a separate methodology choice. Recommendation: align the shipped default with `.rp/pipelines/` for consistency, but it's a judgment call (consumers pick their own); design phase decides.

**OD4 — Asset merge (OPTIONAL).** Merge root `assets/radical-pipelines.png` (326 KB) into `landing/assets/` (currently a different 246 KB PNG). Requires picking ONE image (not byte-identical; "same artwork at different export settings" unverified) and updating `README.md:3`. Recommendation: optional/secondary; if done, the writer/owner picks which PNG wins and the README ref is updated. Bonus: merging into `landing/assets/` puts the README image on the deployed Pages site.

### Notes / corrections to the prompt the design phase should not carry forward

- `providers/` is dropped (owner-confirmed); the flat layout is the agreed direction.
- Canonical skill dir is `skills/radical-pipelines/` (plural + named subdir), NOT singular `skill/`.
- `CLAUDE.md` is KEPT — Claude Code does NOT read AGENTS.md natively (mid-2026); deleting it silently loses all project instructions. The issue-body "Removed" row for CLAUDE.md is outdated.
- The README's "Dependency bundling" section currently FALSELY states "The root manifest declares the same bundled dependencies directly" — the root manifest has no `bundledDependencies`. Must be corrected, not carried forward.
- The three-file `.rp.md` split is a dogfood-only divergence; the skill already models a single conventions file. "Merging" realigns the dogfood with the skill, it doesn't fight it.

### Verification caveats (environment limits during spec research)

- The `pi` CLI is NOT installed in this environment; no live `pi install . -l && pi list` was run. Pi mechanics rest on Pi's official package docs (post-clone `npm install`; deps under `dependencies`), the repo's documented prior verified installs, manifest contents, and git history. Design/code phases must empirically verify Pi install.
- No live `claude --plugin-dir`/`/plugin marketplace add` was run. Claude Code resolution + plugin cache-copy behavior rests on official docs (quoted) plus the fact that the current root-served-via-symlink setup already works. Design/code phases must empirically verify the plugin load.
- The two `radical-pipelines.png` files were confirmed non-identical by MD5/size but NOT visually diffed.

