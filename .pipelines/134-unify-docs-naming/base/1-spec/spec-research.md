# Spec Research

## Rough Idea

> Source: Automattic/radical-pipelines#134

### Goal

The documentation concept is named consistently across the skill and agent definitions — the same thing is never spelled singular `doc` in one place and plural `docs` in another.

### Constraints

- Standardize on the plural form `docs` for the documentation concept (phase 5 and the phase-3 documentation plan).
- Leave the phase-2 `design-doc` concept untouched — there "doc" means a single design *document*, a distinct concept, and keeping it singular preserves a useful distinction from "docs" = documentation.

### Context

- The agent layer is currently uniformly singular (`doc-plan-writer`, `doc-plan-reviewer`, `doc-writer`, `doc-reviewer`) and the phase-3 plan artifacts use singular (`doc-plan.md`, "Doc Plan"), while phase 5's outward identity is already plural ("Docs", `5-docs`, `docs-review-*`). The inconsistency is the singular stragglers; phase 2 (`design-doc`) is a separate concept.

## Q&A

### Q1: Complete inventory of singular `doc`/`Doc` identifiers for the documentation concept

What is the complete, exhaustive inventory of every place in the repository where the documentation concept (phase 5 docs, and the phase-3 documentation plan) is currently spelled with the singular `doc`/`Doc` and would need to become plural `docs`/`Docs`? Include: agent definition filenames; agent `name:` frontmatter values; in-prose references inside the skill files and agent files; artifact filenames (e.g. `doc-plan.md`); artifact directory names; section headings / display labels (e.g. "Doc Plan"); and any task-id or identifier patterns. For each, give the exact current string, the file path(s) where it appears, and whether it is an identifier (filename/name/path) vs. prose. Separately list every occurrence of the phase-2 `design-doc` concept that should be EXCLUDED from the rename, so we can be sure we don't accidentally touch it.

**A:** Phase 5's outward identity is already plural (folder `5-docs`, file `5 - docs.md`, "Docs Phase", `docs-review-*.md`, `docs-summary.md`, "Docs" in phase tables). The singular stragglers are all in (a) the four agent names and (b) the phase-3 documentation-plan artifacts and their prose. Inventory:

(A) Agent name tokens (`name:` frontmatter + every prose reference): `doc-plan-writer`, `doc-plan-reviewer`, `doc-writer`, `doc-reviewer`. Four agent definition files named correspondingly under `agents/`. Agents are addressed by their `name:` field via `SendMessage({to: "<agent-name>"})`; the skill never references agent *filenames*, so renaming the `.md` files is a downstream (design/code) decision, but the spec should state the desired final agent NAMES. `conventions/setup.md:183-186` also lists `doc-writer`/`doc-reviewer` in the Guardrails convention.

(B) Artifact/file identifiers: `doc-plan.md` (~42 references), `doc-plan-review-N-rejected.md` / `doc-plan-review-approved.md`. Appear in `pipeline-versioning.md` (completion predicate line 47), `autonomous-phases/3 - plan.md`, `assisted-phases/3 - plan.md`, `autonomous-phases/5 - docs.md` (input list line 9), `conventions/setup.md:48`, the 4 doc-agent files, and referenced by name in `code-plan-writer.md:65` / `code-plan-reviewer.md:29`.

(C) Title-case prose / template headings: `# Doc Plan: <feature name>` (`doc-plan-writer.md:27`, `assisted-phases/3 - plan.md:202`), `# Doc Plan Review` (`doc-plan-reviewer.md:44`, `assisted-phases/3 - plan.md:259`), `## Doc Plan Topics` (`assisted-phases/3 - plan.md:52,59,169`).

(D) Lowercase prose: "doc plan", "doc task", "doc-plan topic" — many in `assisted-phases/3 - plan.md`, plus `SKILL.md:38` ("Code plan and doc plan"), and prose in the doc agents.

(E) Mermaid diagram node labels: "Doc Writer", "Doc Reviewer" (`5 - docs.md:43,46`), "Doc Plan Writer", "Doc Plan Reviewer" (`3 - plan.md:48,49`).

**EXCLUDED (must NOT change):**
- All `design-doc` / `design doc` (phase 2: `design-doc-writer`, `design-doc-reviewer`, `design-doc-analyst`, `design-doc-researcher`, `design-doc.md`, `2-design-doc/`). Grep trap: `design-doc-writer`/`design-doc-reviewer` contain the substrings `doc-writer`/`doc-reviewer`; the researcher verified every such hit inside `agents/design-doc-*.md` and `…/2 - design-doc.md` is a substring of the design-doc agents, not a reference to the documentation agents.
- Generic English "docs"/"documentation" meaning the host project's existing documentation (e.g. `spec-researcher.md`/`design-doc-researcher.md` "read reference docs", `code-writer.md` "inline documentation", "host-project documentation"). Not the pipeline phase concept.
- Already-plural phase-5 names (`5-docs`, `docs-review-*`, `docs-summary.md`, "Docs phase") — already the target state.

**Reasoning:** Full sweep of the worktree; the asymmetry is exactly the singular stragglers in the agent layer and phase-3 plan artifacts versus the already-plural phase-5 outward identity.

**Sources:** Repo sweep of the worktree (skill files under `skills/radical-pipelines/`, agent files under `agents/`). Specific line numbers cited above; verified, not model knowledge.

### Q2: Exact target spelling derived from the established phase-5 convention

What does the established, already-plural phase-5 naming convention dictate as the exact target spelling for each singular straggler? Specifically, how does phase 5 form its compound identifiers — does the leading concept noun become `docs` and the rest of the compound stay as-is? Show the concrete phase-5 examples (the agent names and artifact names that the docs phase actually uses today) and from them derive the precise target string for every in-scope item from Q1: the four agent names, the plan artifact filename, the plan-review artifact filenames, and the title-case labels ("Doc Plan", "Doc Plan Review", "Doc Plan Topics", "Doc Writer", "Doc Reviewer", "Doc Plan Writer", "Doc Plan Reviewer"). I want the target naming to be *derived from* an existing convention, not invented.

**A:** Key finding: **phase 5's own agents are themselves singular stragglers.** The docs phase uses exactly two agents — `doc-writer` (`doc-writer.md:2`) and `doc-reviewer` (`doc-reviewer.md:2`), both SINGULAR. There is NO `docs-writer`/`docs-reviewer` today (`grep "^name: docs-"` returns nothing). So the singular-named `doc-reviewer` writes the plural-named `docs-review-approved.md`/`docs-summary.md` (`5 - docs.md:17`) — the inconsistency in its purest form. Phase-5 agents are in-scope stragglers too, not just the phase-3 plan ones.

**The rule (derived, not invented):** The leading concept noun for the documentation phase is `docs` (plural); every compound identifier is `docs-<role-or-suffix>`, with the role/suffix segment preserved exactly as the other phases use it — i.e. change only the leading `doc` → `docs`, leave the rest of each compound unchanged. This mirrors the parallel phases: code phase uses leading noun `code` (`code-writer`, `code-plan.md`, `code-plan-review-approved.md`, `code-review-approved.md`, `code-summary.md`); design-doc phase uses leading compound `design-doc`; docs-phase artifacts already use leading noun `docs` (`docs-review-approved.md`, `docs-summary.md`).

**Full derived target list:**
- Agent names: `doc-plan-writer`→`docs-plan-writer`, `doc-plan-reviewer`→`docs-plan-reviewer`, `doc-writer`→`docs-writer`, `doc-reviewer`→`docs-reviewer`.
- Plan artifact: `doc-plan.md`→`docs-plan.md`.
- Plan-review artifacts: `doc-plan-review-N-rejected.md`→`docs-plan-review-N-rejected.md`, `doc-plan-review-approved.md`→`docs-plan-review-approved.md`.
- Title-case labels: `Doc Plan`→`Docs Plan` (`# Doc Plan: <feature name>`→`# Docs Plan: <feature name>`), `Doc Plan Review`→`Docs Plan Review`, `Doc Plan Topics`→`Docs Plan Topics`, `Doc Writer`→`Docs Writer`, `Doc Reviewer`→`Docs Reviewer`, `Doc Plan Writer`→`Docs Plan Writer`, `Doc Plan Reviewer`→`Docs Plan Reviewer`.
- Lowercase prose: "doc plan"→"docs plan", "doc task"→"docs task", "doc-plan topic"→"docs-plan topic", "doc planning"→"docs planning", "doc-writers"/"Doc-writers"→"docs-writers"/"Docs-writers".

**Consistency cross-check (target state):** `docs-plan-writer` writes `docs-plan.md`; `docs-plan-reviewer` writes `docs-plan-review-approved.md` (mirrors `code-plan-writer`→`code-plan.md`). `docs-writer` writes docs; `docs-reviewer` writes `docs-review-approved.md`+`docs-summary.md` in `5-docs/` (mirrors `code-writer`/`code-reviewer`→`code-review-approved.md`/`code-summary.md` in `4-code/`). design-doc stays `design-doc-*` (different leading compound, untouched).

**Reasoning:** Target derived from the existing phase-5 artifact convention and confirmed by parallelism with the code and design-doc phases. The location set from Q1 is unchanged; this answer fixes the target STRING for each.

**Sources:** `agents/doc-writer.md:2`, `agents/doc-reviewer.md:2`, `5 - docs.md:15,16,17`, `SKILL.md` phase table; `grep "^name: docs-"` (empty). Verified, not model knowledge.

### Q3: Do agent `.md` filenames follow the `name:` convention (i.e. must they be renamed too)?

For every OTHER agent in the repo, does the `.md` filename match the `name:` frontmatter exactly (e.g. `agents/code-writer.md` has `name: code-writer`, `agents/design-doc-writer.md` has `name: design-doc-writer`)? In other words, is "filename equals agent name" an invariant the repo maintains for all agents? If it is, then leaving the four doc-agent files at their old singular filenames while their `name:` becomes plural would itself create a new inconsistency — making the filename rename in-scope for "named consistently". Please confirm whether the filename↔name match holds across all agents, and whether anything (the skill, any tooling, docs) relies on or asserts that match.

**A:** Filename==name IS a universal invariant AND the filename is functionally load-bearing. So the four `.md` files MUST be renamed; this is in-scope.

- **Invariant holds universally:** all 17 agent files have filename stem === `name:` frontmatter, zero mismatches. Flipping `name:` to plural while leaving the file singular would introduce the FIRST filename≠name mismatch in the repo — a new inconsistency, exactly what "named consistently" forbids.
- **Filename is read by Pi (not cosmetic):** Pi discovers agents by filename — `reference/conventions/pi.md:51-52` ("Repository-local: `.pi/agents/<agent-name>.md`...", "User-local/global: `~/.pi/agent/agents/<agent-name>.md`...") and the `pi.md:49` check substitutes the agent name into the filename. An agent named `docs-writer` is found only at `.pi/agents/docs-writer.md`; if `name:` is `docs-writer` but the source file stays `doc-writer.md`, Pi's "check existing agent installations" step (`pi.md:47-54`) reports the agent MISSING and it is not discoverable. Source files in `agents/` are installed (copied) to `<agent-name>.md` (`pi.md:45,56-63`), so the source filename must match the name too. (Under Claude Code, agents resolve by `name:` per `claude-code.md:29`; the earlier "cosmetic" characterization was Claude-Code-only and incomplete.)
- **Not explicitly documented as a rule:** no sentence in the skill/AGENTS.md asserts "filename must equal name". It is a 100%-upheld convention plus an operational Pi requirement; the closest documented dependency is the Pi discovery path itself.

Conclusion: rename `agents/doc-plan-writer.md`→`docs-plan-writer.md`, `doc-plan-reviewer.md`→`docs-plan-reviewer.md`, `doc-writer.md`→`docs-writer.md`, `doc-reviewer.md`→`docs-reviewer.md`. Two independent justifications: (a) preserves the universal filename==name invariant; (b) Pi discovers agents by filename, so the file must be renamed for discoverability.

**Reasoning:** Checked stem vs `name:` for all 17 agents; traced Pi discovery path in `conventions/pi.md`.

**Sources:** `agents/*.md` frontmatter (all 17 checked); `reference/conventions/pi.md:45,47-54,56-63`; `reference/conventions/claude-code.md:29`. Verified.

### Q4: Are there in-scope references OUTSIDE `skills/` and `agents/`?

The inventory so far covers `skills/radical-pipelines/` and `agents/`. Are there any OTHER tracked, non-artifact files in the repo that reference the documentation-concept singular names (the four agent names, `doc-plan.md`, `doc-plan-review-*.md`, "Doc Plan", etc.) and would therefore also need updating to keep the naming consistent? Specifically check: `AGENTS.md`, `CLAUDE.md`, `README*`, any top-level docs, any tests, and any config/manifest files. Conversely, the `.pipelines/` directory holds historical pipeline-run artifacts (output of past runs, including this very pipeline) — those are records of what happened, not the skill's source of truth; should they be treated as out-of-scope (frozen historical records) rather than rewritten? Please report what exists outside `skills/`+`agents/` and recommend the scope boundary.

**A:** The boundary is NOT exactly {skills + agents}; three in-scope files exist outside, and `.pipelines/` is confirmed historical (out of scope).

- **`AGENTS.md`/`CLAUDE.md`** (CLAUDE.md is a symlink → AGENTS.md): no doc-agent references. Out of scope.
- **README.md / CONTRIBUTING.md / CHANGELOG.md**: clean — describe the Docs phase generically and Pi discovery as `.pi/agents/<agent>.md`, no singular doc-agent NAMES. No `docs/` dir.
- **Tests / `scripts/`**: zero references to any doc-agent name or artifact.
- **EXTRA #1 — `.rp.md` (root, git-tracked) — MANDATORY, load-bearing.** Its **Agent models** table lists every agent name verbatim, including the four singular doc agents (`.rp.md:90,91,94,95`). The Agent models convention (`setup.md:88-98`) keys each row by the exact agent name and the orchestrator resolves a spawned agent's model via this lookup. If agents become `docs-*` but `.rp.md` still says `doc-*`, the lookup misses and those agents fall back to the default model. MUST be updated in lockstep. IN SCOPE.
- **EXTRA #2 — `website/demo.js` — flag (user-facing, not skill-operational).** The marketing-site pipeline demo hard-codes the agent names and plan artifacts: `demo.js:75,77,85,86,87,118,128,148,149`. It already mirrors the same inconsistency (singular `doc-reviewer` writing plural `docs-review-approved.md`/`docs-summary.md`). It is product surface, not skill source; spec decision whether to mandate or list as follow-up. (No other website file has hits.)
- **EXTRA #3 — `.changeset/agent-scoped-guardrails.md:5` — flag (unreleased changeset).** A pending release-note fragment naming `code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer` in prose; it merges into CHANGELOG.md on next release. Updating it keeps the eventual changelog consistent; leaving it preserves the historical wording. Spec decision.
- Other manifests (`package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.pi/settings.json`, `.changeset/config.json`): clean, no agent names.

**`.pipelines/` — OUT OF SCOPE (confirmed historical).** Every tracked file under `.pipelines/` is a `.md` artifact (no source/config/loader). They are frozen records of past runs; many legitimately contain `doc-plan.md` etc. as the artifacts those runs produced — rewriting them would falsify history (and contradicts AGENTS.md:14 "describe the system only as it is designed to work, not transient or historical situations"). Nothing reads `.pipelines/` as a source of truth for the skill/agents. This pipeline's own in-flight artifacts under `.pipelines/134-unify-docs-naming/` will use the new `docs-*` names going forward, but past runs stay as-is.

**Changeset-gate note (release process, not the rename):** `.changeset/config.json:12` sets `changedFilePatterns: ["skills/**", "agents/**", ".claude-plugin/**", "package.json", "README.md"]` — editing `skills/` or `agents/` (which this change does) requires a changeset; `.rp.md`/`website/` are not in that list.

**Corrected complete change-set:** MUST change = `skills/radical-pipelines/**` + `agents/**` + `.rp.md`. Flag for spec decision = `website/demo.js`, `.changeset/agent-scoped-guardrails.md`. Excluded = `.pipelines/**` (historical), README/CONTRIBUTING/CHANGELOG/scripts/other manifests (no references).

**Reasoning:** Grepped all tracked files outside skills/agents for the doc-concept tokens; inspected each hit to classify load-bearing vs cosmetic vs historical.

**Sources:** `.rp.md:90,91,94,95`; `setup.md:88-98`; `website/demo.js:75,77,85,86,87,118,128,148,149`; `.changeset/agent-scoped-guardrails.md:5`; `.changeset/config.json:12`; `git ls-files .pipelines/` (all `.md`). Verified.

### Q5: Scope ruling on the two flagged files (website/demo.js, the changeset)

The issue's goal is "the documentation concept is named consistently across the skill and agent definitions." Two files reference the singular names but sit outside skill+agents: (1) `website/demo.js` hard-codes the agent names and plan artifacts and already reproduces the same `doc-reviewer`→`docs-review` inconsistency; (2) `.changeset/agent-scoped-guardrails.md` is an unreleased changelog fragment naming `doc-writer`/`doc-reviewer`. For each, what is the case for IN vs OUT, considering: the issue's wording ("across the skill and agent definitions"), whether the file is a derived/downstream copy of the agent names (so it would silently drift and re-introduce the inconsistency), the project rule about not describing historical situations, and the risk/blast-radius of editing it? Recommend a ruling for each so the spec can state it explicitly rather than leave it ambiguous.

**A:** Ruling: both IN.

- **`website/demo.js` → IN.** Same KIND of derived copy as `.rp.md`: it duplicates the agent names (`doc-plan-writer`, `doc-plan-reviewer`, `doc-writer`, `doc-reviewer`) and plan artifact names (`doc-plan.md`, `doc-plan-review-approved.md`) into JS data. It ALREADY contains the exact split the issue targets — the singular `doc-reviewer` `writes: ['docs-review-approved.md','docs-summary.md']` (plural). It is a live shipped surface (`index.html:329` loads `demo.js`; homepage animated pipeline demo). Leaving it singular re-introduces the doc-reviewer→docs-review mismatch on a shipped surface. Blast radius LOW: pure string literals in `task:`/`reads:`/`writes:`/`pendingTree` arrays, no logic; mechanical `doc-`→`docs-` anchored to avoid `design-doc`.

- **`.changeset/agent-scoped-guardrails.md` → IN.** Full text (line 5): "A code- or doc-phase guardrail can now name the agents that run it — one or more of `code-writer`, `code-reviewer`, `doc-writer`, and `doc-reviewer` — so a project can scope an expensive gate...". This is **live-concept, present-tense** voice ("can now name the agents ... `doc-writer`, `doc-reviewer`"), NOT a "we renamed X" event narration — it describes the system as it works. It is **unreleased** (not yet in CHANGELOG.md; the changeset tool consumes it into CHANGELOG.md on next release). Under AGENTS.md:14 ("describe the system only as it is designed to work, not transient or historical"), the forward-looking reading wins: update it so the eventual published changelog uses the new names. Only the two tokens `doc-writer`/`doc-reviewer` (no `doc-plan`). Sibling changeset `per-phase-summaries.md` already uses `docs-summary.md`, reinforcing plural target. (Contrast: once published to CHANGELOG.md it becomes historical and would be OUT — line is "pending vs published"; this is pending.)

**Net scope:** MUST change (load-bearing/source) = `skills/radical-pipelines/**`, `agents/**` (incl. 4 file renames), `.rp.md`. ALSO change (derived copies / live-surface consistency) = `website/demo.js`, `.changeset/agent-scoped-guardrails.md`. OUT = `.pipelines/**` (frozen historical run artifacts), already-published `CHANGELOG.md`, and files with no doc-concept references (README, CONTRIBUTING, scripts, package.json, plugin/marketplace manifests, `.pi/settings.json`, AGENTS.md).

**Reasoning:** Classified each derived copy by whether leaving it singular re-introduces the split on a live surface; read the changeset in full to confirm present-tense live-concept voice and unreleased status.

**Sources:** `website/demo.js` (string-literal arrays), `website/index.html:329`, `.changeset/agent-scoped-guardrails.md:5` (full read), `.changeset/per-phase-summaries.md`, AGENTS.md:14. Verified.

### Q6: Testable absence-check + the "documentation plan" wording question

Two things to make "done" testable. (a) Is there a precise, anchored grep/check expressing "no singular documentation-concept name remains" that does NOT false-positive on the protected `design-doc` concept or on generic English "document/documentation"? Give the concrete pattern(s) and confirm that, after the rename, that check returns clean across the whole repo (excluding `.pipelines/`). (b) Two `description:` lines (`doc-plan-writer.md:3`, `doc-plan-reviewer.md:3`) say "documentation plan" — a longer synonym, not a `doc`-vs-`docs` defect. Does the issue's goal (singular vs plural consistency of the concept NAME) require normalizing "documentation plan" → "docs plan", or is that an optional wording change outside the singular/plural defect? I want to state explicitly whether wording-normalization of "documentation plan" is in or out.

**A (a): Anchored absence-check, empirically validated.** A PCRE (`grep -P`) search over the in-scope trees (`skills agents .rp.md website .changeset`), EXCLUDING `.pipelines/`, that must return ZERO matches after the rename:
- P1 (singular identifiers, hyphenated): `(?<!design-)\bdoc-(plan-writer|plan-reviewer|plan-review|plan|writer|reviewer)\b`
- P2 (title-case + lowercase prose): `(?<!Design )\b[Dd]oc [Pp]lan\b` | `(?<!Design )\bDoc (Writer|Reviewer)\b` | `\bdoc task\b` | `\bdoc-plan topic\b` | `\bdoc planning\b`

Anchoring that makes it correct: negative lookbehind `(?<!design-)` prevents `design-doc-writer`/`design-doc-reviewer`/`design-doc.md` from matching (tested, not matched); `(?<!Design )` prevents mermaid "Design Doc Writer"/"Design Doc Reviewer" (`2 - design-doc.md:44,45`); word boundaries + explicit alternation mean generic "document"/"documentation" does NOT match (tested) and already-plural `docs-writer`/`docs-review-approved.md` does NOT match (tested). Run today: P1 = 85 matches, P2 = 28 matches — corresponding exactly to the catalogued occurrences (count is per-match; identifiers recur many times per line).

**CRITICAL for the implementer/test author: COUNT MATCHES, NOT LINES.** Use `grep -roP` (only-matching). Two lines contain BOTH an in-scope token AND a protected `design-doc` token on the same line — `setup.md:48` (`design-doc.md` + `doc-plan.md`) and `doc-reviewer.md:115` (`doc-plan.md`, `spec.md`, `design-doc.md`). The regex correctly matches only the `doc-plan.md` part and leaves `design-doc.md` alone; a line-based "does this line contain design-doc?" filter would wrongly drop these real hits. Check = `grep -roP '<P1>|<P2>' skills agents .rp.md website .changeset` returns empty after the rename (`-r` recursive, `-o` only-matching, `-P` PCRE; exclude `.pipelines/` by not listing it). Pair with a POSITIVE check that the new names exist (e.g. `agents/docs-writer.md` exists with `name: docs-writer`) so "absence" can't be satisfied by deletion.

**A (b): "documentation plan" is OUT.** `doc-plan-writer.md:3` and `doc-plan-reviewer.md:3` contain NO singular `doc` short-form token — "documentation" is the full English word, not the `doc`/`docs` short form, so there is no singular/plural defect and the absence-check does not (and should not) flag them. Leaving "documentation plan" is NOT a naming inconsistency: the repo uses the long English word "documentation" deliberately in many out-of-scope places (`SKILL.md:40` "Documentation (both internal and external)", `code-plan-writer.md:65`, docs-phase prose in `5 - docs.md` "documentation tasks"/"the documentation"). The word "documentation" and the short identifier "docs" coexist by design — analogous to how "the design document" coexists with `design-doc.md`. The issue is specifically about the short form spelled `doc` vs `docs`, not about banning the long word. Forcing "documentation plan"→"docs plan" would be style, not required by "named consistently," and would risk violating the minimalism rule by over-specifying.

**Nuance to record:** the absence-check is deliberately scoped to the SHORT-FORM token `doc` with hyphen/space anchors; it must NOT be written as bare `\bdoc` or it would catch "document"/"documentation" and create false failures. The patterns above handle this.

**Reasoning:** Built and ran the regex against the repo to confirm it matches exactly the catalogued in-scope hits and excludes the protected/generic forms; inspected the "documentation" usages to confirm long-word/short-identifier coexistence is by design.

**Sources:** Live `grep -roP` runs over `skills agents .rp.md website .changeset`; `setup.md:48`, `doc-reviewer.md:115` (mixed lines); `2 - design-doc.md:44,45`; `doc-plan-writer.md:3`, `doc-plan-reviewer.md:3`, `SKILL.md:40`, `code-plan-writer.md:65`. Verified.

## Research

### Detailed line-numbered change-set (Q1, verified by grep across the worktree)

A grep sweep confirmed every singular documentation-concept occurrence falls into the categories below; a `\bdoc\b` sweep excluding the catalogued forms returned empty (no bare/ambiguous "doc" stragglers).

**A. Agent definition filenames (IDENTIFIER, 4 files):** `agents/doc-plan-writer.md`, `agents/doc-plan-reviewer.md`, `agents/doc-writer.md`, `agents/doc-reviewer.md`. Agents are resolved by `name:` frontmatter, not filename (`reference/conventions/claude-code.md` Team spawning); renaming files is conventional/cosmetic, only `name:` is functional.

**B. Agent `name:` frontmatter (IDENTIFIER, 4):** `doc-plan-writer.md:2`, `doc-plan-reviewer.md:2`, `doc-writer.md:2`, `doc-reviewer.md:2`.

**C. Agent `description:` frontmatter (PROSE):** `doc-writer.md:3` ("one task from the doc plan"), `doc-reviewer.md:3` ("completed doc-writer tasks against the doc plan"). `doc-plan-reviewer.md:3` and `doc-plan-writer.md:3` say "documentation plan" (no singular token; wording-normalization only).

**D. Artifact filenames `doc-plan.md`, `doc-plan-review-N-rejected.md`, `doc-plan-review-approved.md` (IDENTIFIER):** `pipeline-versioning.md:47` (completion predicate `3-plan/doc-plan-review-approved.md`); `conventions/setup.md:48`; `autonomous-phases/5 - docs.md:9,32,33` (phase-5 input); `autonomous-phases/3 - plan.md:3,15,16,17,29,30,37,38,39,40,49,50`; `assisted-phases/3 - plan.md:3,14,16,36,197,199,232,234,256,272`; `doc-plan-writer.md:6,22`; `doc-plan-reviewer.md:6,12,38,39`; `doc-writer.md:6`; `doc-reviewer.md:15,31,32,115`; `code-plan-writer.md:65`; `code-plan-reviewer.md:29`.

**E. Artifact directory names:** NONE to change. Phase-3 plan artifacts live in `3-plan/` (no "doc" in dir); phase-5 dir is already `5-docs/`.

**F. Agent-name references in prose/tables/mermaid (IDENTIFIER-in-prose):** doc-plan-writer/doc-plan-reviewer at `autonomous-phases/3 - plan.md:29,30,37,38,39`, `assisted-phases/3 - plan.md:238`, `doc-plan-reviewer.md:6,70`, `doc-plan-writer.md:6`. doc-writer/doc-reviewer (incl. plural "doc-writers"/"Doc-writers") at `autonomous-phases/5 - docs.md:3,17,27,28,35,36,37`, `conventions/setup.md:183,186` (Guardrails), `assisted-phases/3 - plan.md:25,59,226`, `doc-plan-reviewer.md:27,32`, `doc-writer.md:6`, `doc-plan-writer.md:6,8,35,61,65,68`, `doc-reviewer.md:6,8,103`.

**G. Lowercase prose concept ("doc plan"/"doc task"/"doc-plan topic"/"doc planning") (PROSE):** `SKILL.md:38` ("Code plan and doc plan"); `autonomous-phases/3 - plan.md:30`; `assisted-phases/3 - plan.md:22,24,31,59,118,160,162,164,177,180,195,234`; `doc-plan-reviewer.md:28,81`; `doc-plan-writer.md:56,70`; `doc-writer.md:3`; `doc-reviewer.md:3`.

**H. Title-case headings / template titles (literal artifact section titles):** "# Doc Plan: <feature name>" at `doc-plan-writer.md:27`, `assisted-phases/3 - plan.md:202`; "# Doc Plan Review" at `doc-plan-reviewer.md:44`, `assisted-phases/3 - plan.md:259`; "## Doc Plan Topics" (plan-notes.md template heading) at `assisted-phases/3 - plan.md:52,169` (referenced :59).

**I. Mermaid node labels (display):** "Doc Writer" `5 - docs.md:43`, "Doc Reviewer" `5 - docs.md:46`, "Doc Plan Writer" `3 - plan.md:48`, "Doc Plan Reviewer" `3 - plan.md:49` (the latter embeds `writes doc-plan.md`).

**J. Task-id patterns:** NONE. Tasks are referenced generically ("Task N"); no `doc-1`-style id embeds the singular concept.

**Already-plural (target state, leave as-is):** folder `5-docs/`, `reference/autonomous-phases/5 - docs.md`, "Docs Phase"/"Docs" (`SKILL.md:3,40`, workflow tables), `docs-review-N-rejected.md`/`docs-review-approved.md`, `docs-summary.md`, "# Docs Review" (`doc-reviewer.md:59`). No singular `doc-summary`/`doc-review` exists.

**Exclusion list — phase-2 `design-doc` (MUST NOT CHANGE):** files `agents/design-doc-{analyst,researcher,reviewer,writer}.md`, `autonomous-phases/2 - design-doc.md`, `assisted-phases/2 - design-doc.md`, dir `2-design-doc/`; frontmatter names design-doc-{analyst,researcher,reviewer,writer}; artifacts `design-doc.md`, `design-doc-review-N-rejected.md`, `design-doc-review-approved.md`; mermaid "Design Doc Writer"/"Design Doc Reviewer" (`2 - design-doc.md:44,45`); all prose "design doc".

**Grep trap (critical for implementer):** `design-doc-writer`/`design-doc-reviewer` literally contain substrings `doc-writer`/`doc-reviewer`. A naive `s/doc-writer/docs-writer/` would corrupt them into `design-docs-writer`. Verified: every `doc-writer`/`doc-reviewer`/`doc plan` hit inside all `2 - design-doc.md` files and all `agents/design-doc-*.md` files is a design-doc substring — ZERO real documentation-concept references inside any design-doc file. The two concepts never co-occur ambiguously; any rename must be anchored to avoid the `design-` prefix.

**No ambiguous bare "doc":** a `\bdoc\b` sweep excluding catalogued forms returned empty. Standalone "document"/"documentation" all mean the host project's existing docs or the generic act of documenting; none are the singular spelling of the phase concept.

## Consolidated Requirements

Each requirement is an observable outcome of the renamed system. The naming rule throughout: the documentation phase's leading concept noun is `docs` (plural); every compound identifier is `docs-<role-or-suffix>`, changing only the leading `doc`→`docs` and preserving the rest of each compound exactly. The phase-2 `design-doc` concept and the long English word "documentation" are unaffected.

1. **Agent names are plural.** The four documentation-concept agents are named `docs-plan-writer`, `docs-plan-reviewer`, `docs-writer`, `docs-reviewer` — both in their `name:` frontmatter and in every prose, table, and Mermaid-label reference across the skill and agent definitions. No agent is named with the singular `doc-` form for this concept.

2. **Agent definition filenames match their names.** The four agent files are `agents/docs-plan-writer.md`, `agents/docs-plan-reviewer.md`, `agents/docs-writer.md`, `agents/docs-reviewer.md`, preserving the repo-wide invariant that every agent's filename stem equals its `name:` (so the agents remain discoverable under Pi's filename-keyed lookup).

3. **Plan artifact identifiers are plural.** The phase-3 documentation-plan artifact is `docs-plan.md`, and its review artifacts are `docs-plan-review-N-rejected.md` / `docs-plan-review-approved.md`, in every place the skill and agents read or write them (including the pipeline completion predicate and the phase-5 input list).

4. **Display labels and headings are plural.** Title-case labels and template headings for the concept read `Docs Plan`, `Docs Plan Review`, `Docs Plan Topics`, `Docs Writer`, `Docs Reviewer`, `Docs Plan Writer`, `Docs Plan Reviewer` (e.g. the plan template title `# Docs Plan: <feature name>`).

5. **Lowercase prose is plural.** Running-text forms read "docs plan", "docs task", "docs-plan topic", "docs planning", "docs-writers"/"Docs-writers" — no singular "doc plan"/"doc task" remains for the concept.

6. **Derived copies of the names stay in sync.** The `.rp.md` Agent models table lists the four agents under their plural names (so the orchestrator resolves their models correctly), and the `website/demo.js` pipeline demo uses the plural agent names and plural plan-artifact names (so the shipped homepage demo no longer spells the same concept singular and plural at once).

7. **The pending changeset uses the plural names.** `.changeset/agent-scoped-guardrails.md` refers to `docs-writer` and `docs-reviewer`, so the eventually published changelog is consistent with the renamed agents.

8. **The phase-2 `design-doc` concept is unchanged.** All `design-doc` identifiers, files, frontmatter names, artifacts, Mermaid labels, and "design doc" prose remain exactly as they are.

9. **Consistency is verifiable (absence + presence).** After the change, searching the in-scope trees (`skills agents .rp.md website .changeset`, excluding `.pipelines/`) for the singular documentation-concept token returns zero matches, using a design-doc-anchored match-count search: `grep -roP '(?<!design-)\bdoc-(plan-writer|plan-reviewer|plan-review|plan|writer|reviewer)\b' skills agents .rp.md website .changeset` plus the title-case/prose pattern `(?<!Design )\b[Dd]oc [Pp]lan\b`, `(?<!Design )\bDoc (Writer|Reviewer)\b`, `\bdoc task\b`, `\bdoc-plan topic\b`, `\bdoc planning\b`. The same searches return the catalogued hits before the change. Counting matches (not lines) is required, because two lines (`setup.md:48`, `doc-reviewer.md:115`) carry both an in-scope `doc-plan.md` token and a protected `design-doc.md` token. A positive check confirms the new names exist (e.g. `agents/docs-writer.md` exists with `name: docs-writer`).

## Out of Scope

- **The phase-2 `design-doc` concept** — singular by design (a single design *document*); untouched.
- **The long English word "documentation"** — coexists with the `docs` identifier by design (e.g. the two `description:` lines "documentation plan", `SKILL.md` "Documentation (both internal and external)", docs-phase prose "documentation tasks"). Not a `doc`-vs-`docs` defect; not normalized.
- **`.pipelines/**`** — frozen historical pipeline-run artifacts (records of past runs); rewriting them would falsify history and is not the skill's source of truth.
- **Already-published `CHANGELOG.md`** — historical release record.
- **Files with no documentation-concept references** — README, CONTRIBUTING, scripts/tests, `package.json`, plugin/marketplace manifests, `.pi/settings.json`, AGENTS.md/CLAUDE.md.
- **Generic English "document"/"documentation" and host-project documentation references** (e.g. "inline documentation", "read reference docs") — not the pipeline phase concept.
