# Doc Plan: Rename the "Conventions" Concept to "Configuration"

**Issue:** [#113](https://github.com/Automattic/radical-pipelines/issues/113) — "Rename the conventions concept to configuration (conventions becomes a subsection)"

**Inputs:** approved [spec](../1-spec/spec.md), [design doc](../2-design-doc/design-doc.md), and [code plan](./code-plan.md) (all authoritative).

---

## Scope of this doc plan (read first)

This issue is a **documentation/terminology refactor of this repository (the skill itself)**. Because the artifacts being changed *are* the documentation, the **code phase (phase 4) already owns every primary doc surface**: `.rp.md`, `skills/radical-pipelines/SKILL.md`, `README.md`, and the four `reference/configuration/` files. The seven code-plan tasks fully cover those edits and their inbound links. **This doc plan does not duplicate any of them.**

The doc plan's job here is to catch documentation work that is genuinely **separate** from the code tasks and would otherwise be missed. After an end-to-end sweep of the worktree (see "Investigation findings" below), exactly **one** such item exists: the repository requires a **Changesets** entry for any change to a release-relevant path, and none of the code tasks create one. CI hard-enforces this gate, so omitting it would fail the PR.

**This doc plan is intentionally minimal — a single task.** That is correct and expected for this issue, not an oversight: the code phase already edits the entire conceptual/terminology documentation surface, and the only documentation artifact it leaves uncreated is the changeset.

### Investigation findings — categories checked, and why they need no task

These are recorded so a reviewer can confirm the minimal scope is deliberate and complete, not a gap:

- **Changelog / release-notes mechanism → ONE TASK (Task D1).** The repo uses [Changesets](https://github.com/changesets/changesets) (`.changeset/config.json`, `@changesets/cli` dev dependency, `release.yml` + `changeset-gate.yml` workflows). Its `changedFilePatterns` are `skills/**`, `agents/**`, `.claude-plugin/**`, root `package.json`, `README.md`. This rename edits `skills/**` and `README.md`, so it **is release-relevant** and a changeset is **required and CI-enforced** (`scripts/validate-changesets.mjs` shape check + `npx changeset status` presence check in `.github/workflows/changeset-gate.yml`). AGENTS.md states the standing rule ("every change to the repository records a changeset"). No code-plan task creates the changeset → **Task D1**.
- **Existing pending `.changeset/*.md` entries that mention "conventions" → NO TASK (out of scope, frozen history).** Three unreleased changesets describe *past* features in "conventions" prose: `local-convention-overrides.md`, `per-agent-model-config.md`, and `restructure-repository-layout.md` ("project conventions live in a single `.rp.md`"). These are **append-only historical records** of changes already made — they accumulate on `trunk` and are consumed verbatim into `CHANGELOG.md` at the next release (README "Changelog and versioning"). They are analogous to `.pipelines/**`: rewording them would rewrite the description of a *different, already-shipped* change and pollute the changelog. They are **not** umbrella-concept documentation of the current state; they are descriptions of historical deltas. **Do not edit them.**
- **Website (`website/`) → NO TASK.** `grep -rni "conventions" website` returns **zero** matches across `index.html`, `demo.js`, `styles.css`, and assets. Nothing to update.
- **`AGENTS.md` → NO TASK.** Contains no umbrella "conventions" wording. Its only relevant line ("conditionally depending on the tool") concerns per-tool loading generically; no occurrence of "conventions" as RP's umbrella concept. The standing changeset rule it states is satisfied by Task D1.
- **`CONTRIBUTING.md` → NO TASK.** Its two "convention(s)" uses are generic English: `### Summary format conventions` (changeset-summary style) and "the convention that surfaces the breaking nature" (the `BREAKING:` prefix). Neither names RP's per-project umbrella concept. Out of scope.
- **`agents/*.md` profiles → NO TASK.** Every "conventions" hit here ("host project's coding/documentation conventions", "project conventions", "internal conventions") is **generic/host-project English** — the conventions of whatever project a pipeline runs *against*, not RP's own configuration concept. This is the spec's explicitly out-of-scope third bucket (design §2, spec "Out of Scope"). Do not touch.
- **Glossaries / diagrams / architecture-overview docs → NONE EXIST as a separate surface.** The repository has no standalone glossary or architecture/terminology doc beyond `README.md` and the skill `reference/` files, all of which are owned by the code phase. The conceptual narrative that frames "configuration" as the umbrella and "conventions" as a section within it lives in `.rp.md` (Task 1), `README.md` (Task 3), and `reference/configuration/{load,setup}.md` (Tasks 4–5) — all code-phase tasks. There is no additional conceptual doc the code phase leaves stale.
- **Skill reference docs describing the configuration-loading concept → NO SEPARATE NARRATIVE TASK.** `reference/configuration/load.md` and `setup.md` are the narrative for the loading/setup concept, and code Tasks 4–5 already perform the narrative umbrella rewrite there (titles → "Load/Setup Configuration", umbrella prose → "configuration", plus the recommended one-line orienting note in `setup.md`). No narrative update beyond the code tasks is needed.

---

## Task D1 — Add a changeset for the conventions→configuration rename

**Goal:** Record the conventions→configuration terminology/structure rename as a committed `.changeset/*.md` entry so (a) the CI Changeset Gate passes and (b) the change is described in the next release's `CHANGELOG.md`. This is the only documentation artifact the code phase does not produce.

**Audience:** Maintainers and downstream skill consumers reading the generated `CHANGELOG.md` / GitHub Release notes — people who need to know the umbrella concept was renamed to "configuration", the `reference/conventions/` folder moved to `reference/configuration/`, and that **no existing `.rp.md` breaks**.

**Files:** one new file `.changeset/<slug>.md` (e.g. `.changeset/rename-conventions-to-configuration.md`). Use the repo's tooling (`npx changeset` from the worktree root) to generate it, or hand-author it to match the existing entries' shape (front-matter fence with `"@automattic/radical-pipelines": <bump>` then a one-paragraph imperative summary). Do **not** edit any existing `.changeset/*.md` file.

**Sections-scope:**
- Front matter: exactly one mapping line — `"@automattic/radical-pipelines": <bump>` — where `<bump>` is chosen per the rule below.
- Body: a single imperative-mood paragraph summarizing the rename. It must state: (1) "configuration" is now the umbrella concept (the `.rp.md` title) and "Conventions" is one flat section within it (with a future Guardrails sibling); (2) the skill docs folder moved `reference/conventions/` → `reference/configuration/` with inbound links updated; (3) **no breaking change** — existing project `.rp.md` files remain valid with zero modification, and there is no behavioral/loader change. Match the voice and density of `.changeset/rename-prompt-to-intent.md` and `.changeset/restructure-repository-layout.md` (concise, declarative).

**Bump-type decision (apply the repo's own policy — `CONTRIBUTING.md` "Bump types" + "Pre-1.0 policy"):**
- The project is pre-1.0 (`package.json` version `0.1.1`).
- This change is **not breaking** (spec R6/AC18) and adds **no feature** and fixes **no bug** — it is a terminology/structure refactor with zero behavioral change (spec R7/AC19–20). So `minor` (feature) and the `BREAKING:` prefix are **wrong**; `major` is forbidden pre-1.0.
- The defensible choices are **`patch`** (a backwards-compatible change that does not add a feature) or **`none`** (no version bump). The rename is a user-visible structural change to the skill surface (the `reference/configuration/` path others may reference, the `.rp.md` title and folder layout), so it is more than a typo-class "prose-only" edit. **Default recommendation: `patch`.** The doc-writer must make this call explicitly and **surface the `patch`-vs-`none` choice to the orchestrator/owner for confirmation** in assisted mode, since it determines whether this rename triggers a version bump. If `none` is chosen, use the canonical empty-changeset form per `CONTRIBUTING.md` "Empty changesets" only if the summary is intentionally omitted; otherwise keep `none` with a descriptive body.

**Depends on:** the code phase (phase 4) being complete — the changeset *describes* the landed rename, so author it after the code tasks are done (or at minimum after the final shape of the rename is fixed). Within the docs phase it has no intra-phase dependencies.

**Traces to:** repository standing rule (`AGENTS.md`), `CONTRIBUTING.md` "Adding a changeset" / "When a changeset is required" / "Bump types" / "Pre-1.0 policy", `.changeset/config.json` `changedFilePatterns`, and the CI `Changeset Gate` (`.github/workflows/changeset-gate.yml`). (No spec AC covers this — it is a repo-process requirement the code plan does not address, which is precisely why it lives here.)

**Acceptance** (run from the worktree root):
1. Exactly one new `.changeset/*.md` file exists for this change and no pre-existing `.changeset/*.md` file was modified: `git status --porcelain .changeset/` shows exactly one added file (`A`/`??`) and **no** modified (`M`) entries.
2. **Shape gate passes:** `node scripts/validate-changesets.mjs` exits 0 (well-formed fence, package name `@automattic/radical-pipelines`, valid bump, pre-1.0 policy respected — i.e. not `major`).
3. **Presence gate passes:** `npx changeset status --since=$(git merge-base HEAD trunk)` reports the package with a pending bump (or, for the `none`/empty choice, the gate is satisfied per `CONTRIBUTING.md` "Empty changesets") — i.e. the release-relevant change is no longer missing a changeset.
4. **Bump type is policy-correct:** the front-matter bump is `patch` or `none` (never `minor` with `BREAKING:`, never `major`); the chosen value was confirmed with the owner in assisted mode.
5. **Content check:** the body paragraph names the umbrella rename (conventions → configuration), the `reference/conventions/` → `reference/configuration/` folder move, and explicitly states there is **no breaking change** to existing `.rp.md` files. Verifiable by reading the file; e.g. `grep -i "configuration" .changeset/<slug>.md` and `grep -i "no breaking\|remain valid\|zero modification\|backwards-compatible" .changeset/<slug>.md` each return a match.
6. **No collateral edits:** the only file this task adds/changes is the new `.changeset/*.md`; `git diff --stat` for this task touches nothing else.

---

## Doc-phase verification summary

After Task D1:

1. `node scripts/validate-changesets.mjs` exits 0 and `npx changeset status --since=$(git merge-base HEAD trunk)` no longer reports a missing changeset — the CI Changeset Gate would pass.
2. No existing `.changeset/*.md` (including the "conventions"-mentioning historical entries) was modified.
3. No website, `AGENTS.md`, `CONTRIBUTING.md`, or `agents/*.md` file was edited by the docs phase (those surfaces have no umbrella-concept work, per the investigation findings).
4. All conceptual/terminology documentation of the new "configuration" umbrella lives in the code-phase-owned files (`.rp.md`, `README.md`, `SKILL.md`, `reference/configuration/{load,setup}.md`); the docs phase added only the changeset.
