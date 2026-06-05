# Doc Plan Review — APPROVED

**Artifact reviewed:** `3-plan/doc-plan.md` (tasks D1–D5)
**Reviewed against:** `3-plan/code-plan.md`, `2-design-doc/design-doc.md`, `1-spec/spec.md`,
and an independent sweep of the live repository.
**Verdict:** Approved.

## Independent repository sweep (redone, not trusted from the plan)

I grepped the whole repo for the restructure's stale tokens (`.agents/`,
`.pi-extension`, `.rp.md`, `.pipelines`, `.claude/.rp.md`, `.pi/.rp.md`,
`symlink`, "bundled dependencies directly") across all doc/narrative files,
and inspected every living-doc surface (README.md, landing/index.html,
landing/demo.js, AGENTS.md, CLAUDE.md, .changeset/README.md). Findings:

### Every stale living-doc occurrence is covered by a doc task

README.md stale occurrences mapped to tasks:

- L90, L94, L95 (`.agents/`, symlink, Claude Code plugin install) → **D1**.
- L107 (`.pi-extension/` content, Pi package install) → **D1**.
- L119, L122 (`cd .pi-extension`, `pi install ./.pi-extension -l`) → **D1**.
- L133 (`pi install ./.pi-extension -l`, Pi usage) → **D1** (names "Pi usage").
- L137, L139 (Dependency bundling + the false "declares the same bundled
  dependencies directly" claim) → **D1** (Dependency bundling, rewrite).
- L141 (`.agents/` canonical + symlinks) → **D1** (Dependency bundling final para).
- L151 (Fallback skill install — generic symlink caveat) → **D1** (swept; caveat
  is CLI-general and correctly judged able to stay).
- L155, L157 (single project-root `.rp.md`) → **D2**.
- L169 (three-file split + the three broken in-README links
  `./.rp.md`, `./.claude/.rp.md`, `./.pi/.rp.md`) → **D2**.
- L192, L193, L208, L209, L211 (`.pi-extension/package.json`, lockfile, dual
  version-sync) → **D4**.
- teams.yaml "register globally" prose (L113, L130, L248) → **D3**.
- L3 header image `src="./assets/radical-pipelines.png"` → **D5** (conditional).

landing/index.html: the only OD4-relevant surface (header → README image, and the
hardcoded `og:image:width`/`height`) is in **D5**; the demo/hero terminals using a
fictional `.pipelines/issue-1234/` and a fictional `requirements.md` are correctly a
recorded non-finding (illustrative props, issue #70 excludes the demo).

No stale living-doc occurrence is left uncovered.

### Code-phase / excluded surfaces correctly NOT made into doc tasks

The remaining grep hits live in: the four shipped-skill conventions files and
`health-monitoring.md` (code Tasks 8–10/13 output), the three `.rp.md` dogfood files
and `.pi/settings.json` (deleted by code), `.pi-extension/README.md` (deleted),
`.changeset/changelog-and-version-sync.md` (code Task 15), and the immutable
`.pipelines/<slug>/` artifact records (relocated wholesale by code Task 17). The plan
correctly classifies all of these as code-phase output or non-living records. The
merged `.rp/CONVENTIONS.md` functional content is correctly treated as code Task 13;
only the README narrative ABOUT conventions location is a doc task (D2). Good.

## Spot-verified facts

- Root `package.json` has **no** `bundledDependencies` → the README's "declares the
  same bundled dependencies directly … single source of truth" (L139) is genuinely
  false. D1's "rewrite, not trim" treatment is correct.
- Asset dimensions on disk: root `assets/radical-pipelines.png` = **2508×627**;
  `landing/assets/radical-pipelines.png` = **2791×308**. `landing/index.html:24-25`
  hardcodes `og:image:width=2508`/`height=627` — i.e. the ROOT image's dimensions on
  the LANDING image. D5's flagged cross-reference (which the code plan under-specified)
  is real and exactly stated, and D5 requires on-disk dimension verification after the
  OD4 merge either-way.
- landing `og:image`/`twitter:image`/JSON-LD/favicon refs all target the deployed
  `…/radical-pipelines/assets/…` URL or the `assets/`-relative landing path — never the
  root `assets/`. D5's claim that deleting root `assets/` leaves them unaffected is
  correct.
- README sections D1–D4 name all exist: Dependency bundling (L135), Configuration
  (L153), Changelog and versioning (L171), The single source of truth (L187), Cutting a
  version (L197); the three in-README `.rp.md` links exist at L169.
- AGENTS.md / CLAUDE.md / `.changeset/README.md` carry no layout/path references — the
  plan's three non-findings are accurate.
- `.pi/agents/` and `~/.pi/agent/agents/` in README/landing are a CONSUMER repo's Pi
  agent-discovery locations, distinct from this repo's deleted dogfood `.pi/` dotdir;
  D1/D2 correctly keep them.

## Adversarial checks that passed

- **Traceability:** D1→R12/AC8; D2→R5,R6,R12/AC6,AC8 + KD3; D3→KD9/R4; D4→R9/AC4,AC8 +
  KD8; D5→OD4/KD11. All correct.
- **Drift-resistant acceptance:** every task states acceptance as "no reference to X
  remains" / "reader learns Y," with explicit "verify against the shipped file" steps
  (root `package.json`, `load.md`/`setup.md`, `TARGET_MANIFESTS`, on-disk image) rather
  than hard-coded replacement wording, paths, or return shapes.
- **OD4 conditionality (D5):** sound. Under the default decline it is an explicit,
  documented no-op (README L3 + `assets/` untouched, landing untouched) leaving nothing
  broken; under approval it covers both image-wins branches and forces on-disk dimension
  verification, so the landing metadata cannot be left inconsistent either way. The
  pre-existing og dimension mismatch is captured so the OD4 decision resolves rather
  than perpetuates it.
- **No code task leaked in:** D-tasks touch only README.md and landing/index.html.
- **Audience / granularity / ordering:** each task names audience; D1–D4 independent,
  D5 correctly gated on OD4 + code Task 18 to avoid a between-phase broken image ref.
  Granularity is reasonable (one task per coherent README concern + one conditional
  asset task).

## Minor, non-blocking observations (no revision required)

- D3 targets README text whose in-repo teams.yaml source location is only *implicit*
  via surrounding `.pi-extension/` context (the README never spells out
  `.pi-extension/teams.yaml`). D1 removes that surrounding context, so D3 may reduce to
  a verification that no stale implication remains — but D3's acceptance is phrased
  exactly that way ("No README text implies the template source lives under
  `.pi-extension/`"), so it is correct and satisfiable, not a phantom.
- The landing footer/demo link `…#claude-code-plugin-install` relies on D1 keeping the
  "Claude Code plugin install" heading text unchanged. D1 rewrites only the body
  mechanism, not the heading, so the anchor stays valid; worth the phase-5 writer's
  awareness but not a plan defect.

These do not affect approval.
