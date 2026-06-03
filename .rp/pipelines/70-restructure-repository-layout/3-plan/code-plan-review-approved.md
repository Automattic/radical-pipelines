# Code plan review — APPROVED

Reviewed `3-plan/code-plan.md` (19 tasks) adversarially against
`2-design-doc/design-doc.md`, `1-spec/spec.md`, and the live repository worktree.
Verdict: **Approved.**

## What was verified against the live repository

Every concrete claim the plan makes about the on-disk state was checked and matches:

- **The six tracked symlinks** the plan names exist exactly as `120000`-mode entries:
  `agents`, `skills/radical-pipelines`, `.claude/skills/radical-pipelines`,
  `.pi/skills/radical-pipelines`, `.pi-extension/agents`,
  `.pi-extension/skills/radical-pipelines`. Tasks 1–3 remove all six; Task 19 asserts
  `git ls-files -s | grep '^120000'` is empty.
- **The real source trees** under `.agents/skills/radical-pipelines/` (SKILL.md +
  full `reference/` subtree) and `.agents/agents/` (exactly the 17 named profile
  files) exist and match the plan's enumeration for Tasks 1–2.
- **Task 9 conventions cluster (OD1) — 12 occurrences / 4 files — confirmed
  line-exact:** `load.md:5`, `setup.md` ×9 (lines 100, 108, 115, 167, 169, 176, 185,
  193, 194), `claude-code.md:7`, `pi.md:5`. A `grep -rn '\.rp\.md'` across the skill
  returns exactly these 12 and no others, so the blast radius is bounded as the plan
  claims. Each setup.md line was inspected individually and is a genuine
  conventions-file-location reference (read path, write path at 176, headings,
  read-back reminder at 194) — no false positives that would be over-edited.
- **Task 8** — `health-monitoring.md:65` contains the absolute
  `.agents/skills/radical-pipelines/reference/health-monitoring.md` path exactly as
  described; it is the only `.agents/` reference under `skills/`.
- **Task 10 (OD3)** — `setup.md:52` is exactly
  `` Suggested default: `.pipelines/<pipeline-slug>/`. ``, distinct from the Task 9
  cluster. The OD1 cluster and the OD3 single-line edit are kept properly separate.
- **Tasks 4/6/7** — `package.json` has `pi.skills[0] == ".pi-extension/skills"`,
  `release:version` ends with `&& npm --prefix .pi-extension install --package-lock-only`,
  and `scripts/sync-version.mjs` `TARGET_MANIFESTS` is exactly
  `[".claude-plugin/plugin.json", ".pi-extension/package.json"]`. All three edits land
  as described.
- **Task 5** — `.pi-extension/` holds `package.json`, `package-lock.json`,
  `README.md`, `teams.yaml`, and the two symlinks; `teams.yaml` is preserved by
  `git mv` before deletion. The `.pi-extension/package.json` `files:` array lists
  `teams.yaml`, confirming KD9's "no programmatic consumer beyond the dead publish
  array" reasoning.
- **Task 13 stale-content list verified against the live `.rp.md` files:** root
  `.rp.md` carries the per-tool-file pointer (Claude→`.claude/.rp.md`, Pi→`.pi/.rp.md`)
  and the `.pipelines/<pipeline-slug>` artifact line; `.pi/.rp.md` carries the
  "Pi prerequisites … declared in `.pi/settings.json` … installs automatically"
  auto-install paragraph, the `pi install ./.pi-extension -l` instruction, and the
  "live in `.agents/agents/` and are exposed … through symlinks" claim. Every stale
  item the plan says must NOT survive is real and is named.
- **Task 14** — `.gitignore` is exactly the four lines the plan describes; the result
  (only `node_modules/`) is correct.
- **Task 15** — the pending changeset body matches verbatim ("propagates … to
  `.claude-plugin/plugin.json` and `.pi-extension/package.json` and regenerates the
  extension lockfile"); front matter `"@automattic/radical-pipelines": minor`.
- **Task 17** — `.pipelines/` is tracked and contains exactly the four slugs named
  (including this running pipeline).
- **Task 18 (OD4)** — both PNGs exist and differ in size (root 326 KB vs landing
  246 KB → non-identical, matching KD11); the four `landing/` references all use the
  same `radical-pipelines.png` filename, confirming the plan's note that keeping the
  filename leaves those four refs intact. `README.md:3` references
  `./assets/radical-pipelines.png` as stated.
- **Anchors not moved:** `.claude-plugin/marketplace.json`, `.claude-plugin/plugin.json`,
  root `package.json`, `CLAUDE.md` (`@AGENTS.md`), and `AGENTS.md` all present and
  untouched by any task. AC9 retention is a correct no-op, verified in Task 19.

## Coverage matrix (all green)

- **Spec ACs:** AC1→T1,2,3,5,11,12,13,17; AC2→T19 (deferred-empirical, enabled by
  T1–3); AC3→T4,5; AC4→T6,7; AC5→T8; AC6→T9,13; AC7→T17; AC8→**phase-5 docs (correctly
  out of scope)**; AC9→retain + T19 verify; AC10→T16. All covered.
- **Design KDs:** KD1→T1,2,3; KD2→T4,5; KD3→T9,13; KD4→T9 (single-tool model
  preserved); KD5→T10; KD6→T8; KD7→T13,17; KD8→T6,7; KD9→T5; KD10→retain; KD11→T18;
  KD12→T16. All covered.

## Dead-path-reference sweep (the decisive check)

A repo-wide `git grep` for `.pi-extension`, `.agents/`, and `.pipelines` outside the
artifact folder confirms **every non-doc dead reference is covered by a task and no
doc edit leaked in**:

- `.pi-extension`: `.gitignore` (T14), `package.json:12` (T6), `package.json:33`
  (T4), `sync-version.mjs:39` (T7), `.pi/settings.json` and `.pi-extension/README.md`
  (deleted whole by T11 / T5). ✓
- `.agents/`: `.claude/.rp.md` and `.pi/.rp.md` (folded into T13 merge); the only
  remaining occurrences are in `README.md` (4×) and `landing/` — **phase-5
  documentation, correctly excluded**. ✓
- `.pipelines`: setup.md:52 (T10), root `.rp.md` artifact line (T13),
  `.pi-extension/README.md` (deleted by T5). ✓

No non-README reference fix was dropped; no documentation edit leaked into the code
plan. The README/landing/PNG-repoint edits are all correctly deferred to phase 5.

## Ordering / dependency soundness

- **Promote real sources + remove symlinks before reference rewrites** (sequencing
  principle 1): Tasks 1–3 precede every reference-rewrite task (4, 6–10, 13–15). ✓
- **Atomic OD1 conventions group**: Task 9 explicitly commits all 12 occurrences
  together so read path / write path / dogfood file never disagree at a boundary
  (R6/AC6). ✓
- **`.pipelines/`→`.rp/pipelines/` self-move sequenced LAST among moves**: Task 17
  depends on Task 13 (`.rp/` exists) and is ordered after Tasks 1–16; Task 19 runs
  after 17 so checks see the final layout. The post-move artifact path
  (`.rp/pipelines/<slug>/`) is explicitly called out for all later writes. No later
  task writes into the pipeline artifact folder, so the relocation is safe. ✓
- **Task 13 ↔ Tasks 11/12 content-capture dependency** is coherent, not circular:
  the plan instructs the writer to read `.claude/.rp.md` / `.pi/.rp.md`, build
  `.rp/CONVENTIONS.md`, then delete the sources — sequenced so no conventions content
  is lost. ✓
- **OD4 (Task 18) is genuinely optional / owner-gated / deferred and not a hidden
  hard dependency:** nothing else depends on it; the default (decline) leaves
  `README.md:3` and root `assets/` untouched, so no broken image reference is left
  between phases. The README repoint is correctly flagged as phase-5 work. ✓

## Other adversarial checks

- **Granularity / no hidden decisions:** OD1 (relocate to `.rp/CONVENTIONS.md`), OD3
  (align default), naming, and bump type are all settled in the design doc; the plan
  carries them as fixed inputs, not as choices made inside a task. The one piece of
  latitude in Task 13 — what to do with the Pi `worktreeRoot .pi/worktrees`
  one-time-setup line whose dotdir is removed — is a content-merge nuance the design
  also left to the writer ("keep only genuine runtime guidance; do not reference
  deleted paths"); this is acceptable plan-level latitude, not a smuggled
  architectural decision. The genuine Pi agent-discovery paths (`.pi/agents/`,
  `~/.pi/agent/agents/`) are correctly preserved as consumer-side runtime conventions,
  not confused with this repo's removed dotdir.
- **Per-task acceptance** is observable and what-not-which-test throughout (file
  existence, symlink absence, exact string presence/absence, grep-empty, the
  pre-existing sync-version test staying green). No task prescribes a specific new
  test.
- **No test planning** beyond keeping the one generic, unedited
  `scripts/test/sync-version.test.mjs` green — correct per process.
- **No documentation planning** — README/landing/PNG-repoint are explicitly phase 5.
- **Scope** is exactly the spec's; `providers/`, multi-tool emission, and CLAUDE.md
  deletion stay out of scope as the spec requires.
- **AC2/AC3 deferred-empirical handling** (Task 19) is honest: attempt the CLI check,
  record pass-or-not-runnable, fall back to documented-resolution-rule confirmation,
  flag for a later phase. Matches the design's Observability caveat.

No blocking issues found. Approved for the code phase.
