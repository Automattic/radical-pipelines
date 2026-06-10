# Design Doc: Bring the reviews-feature prose into AGENTS.md compliance

## Overview

PR #106 added the reviews feature: new and edited prose across the skill (`skills/radical-pipelines/reference/`), a `README.md` paragraph, and a changeset entry. A whole-diff check against `AGENTS.md` found the structural rules already satisfied — the feature is generic and tool-agnostic, and cross-path duplication is handled through the shared `intent-format.md` file and the single canonical **Reviewer base ref** definition. What remains are local prose violations of the minimalism and no-repeat rules: the same fact stated three times within one reading path, a cited rule's substance re-derived next to its own pointer, a defensive negative whose content is already implied, a no-information trailing sentence, and a near-verbatim sentence shared between the README and the changeset.

This is a prose-quality pass only. No reviews-feature behavior changes — the run-folder model, the base-ref rule, and every procedure keep their substance; only their wording is deduplicated and tightened. The work is a set of nine precise text edits across six files, each one removing a redundant or non-minimal statement while leaving every distinct fact still reachable — stated once at a canonical location or via an explicit same-path reference. There is no automated prose oracle in the repository, so the design also specifies how the edits are verified: a manual passage-by-passage re-check plus the existing Changeset Gate CI staying green.

## Approach

The five `AGENTS.md` rules that govern the skill (`AGENTS.md:5–11`) are: (1) minimalism — every word must serve a purpose; (2) no duplicate information within a reading path; (3) no negative phrasing unless strictly necessary for operation; (4) stay generic and tool-agnostic; (5) no cross-path duplication — a repeated instruction moves to a shared file the others reference. The edits target violations of rules 1, 2, and 3. Rules 4 and 5 are already satisfied across the PR #106 diff and are not touched.

The implementer works from a list of nine edit sites, each with an exact replacement wording fixed by the design research. The governing principle is **apply the decided wording verbatim, do not re-paraphrase**: every wording below was settled against the minimalism and duplication rules, and a fresh paraphrase would reopen the questions each decision already closed. Because the compliance bar is judgment-based (no linter exists), the exact-wording decisions are themselves the mitigation — they are the contract the implementer executes.

The nine sites fall into four kinds of fix:

- **Within-path deduplication (sites 1, 2, 3, 8).** A fact stated more than once in a single file collapses to one statement at the most natural home, while the other occurrences keep only their distinct operational content. The surviving statement is always the one carrying the conceptual framing or the causal rationale; the deleted occurrences are restated consequences that an operational reader can re-derive from instructions that remain.
- **Cross-pointer de-restatement (site 6).** Two steps that cite the **Reviewer base ref** rule but re-derive its substance are reduced to a bare reference. The rule's substance (value, capture timing, hold-constant clause) lives only at its canonical home and is reached by following the citation.
- **Pure deletion (sites 4, 7).** A defensive negative and a no-information trailing sentence are removed outright; the surrounding sentences already convey or imply their content.
- **Differentiation (site 9).** The README and the changeset share a run-model sentence near-verbatim; the changeset body is reworded so the two no longer match, with both still reading naturally for their own context.

Two facts about the reading-path structure shape several of these fixes and must be understood before applying them:

- **`fork-pipeline.md` is the canonical home for the "fork seeds only from `base/`" fact.** Four references route a reader into `fork-pipeline.md` (`work-on-an-issue.md`'s menu, `review-pipeline.md`'s precondition-fail steer and fork-vs-review advisory, `resume-pipeline.md`'s decline-rollback fallback), and none of them conveys the fact earlier in the path. So the deduplication for site 1 is purely within that one file. The `pipeline-versioning.md:65` statement that "forks inherit from `base/`" is on a different reading path (the lineage section), reached by neither the fork-running flow nor site 3's other occurrences, so sites 1 and 3 do not interact.
- **`pipeline-versioning.md`'s "Reconstructing the pipeline tree" section has external entry points that bypass the canonical statement at line 65.** `work-on-an-issue.md` and `fork-pipeline.md` cite the tree-reconstruction section directly, while the "Deriving lineage from artifact content" section (home of the canonical statement) is cited by no external file. A reader can therefore enter the tree section and read forward through "Rendering" without ever passing the canonical statement. This is why site 3's meaning-preservation argument is **operational sufficiency, not path coverage**: the bypassing reader is not guaranteed to see the surviving canonical statement, so the occurrences at the downstream sites must each retain enough positive operational instruction to build and render the tree correctly on their own.

## Components

All affected files are prose. No code, schema, or interface changes.

**Edited files (six):**

- `skills/radical-pipelines/reference/fork-pipeline.md` — site 1 (within-path dedup of "fork seeds only from `base/`; reviews not inherited").
- `skills/radical-pipelines/reference/review-pipeline.md` — sites 2 (advisories-non-gating dedup), 6 (base-ref step de-restatement), and 8 (opener/step-6 overlap). Three independent edits land in this file.
- `skills/radical-pipelines/reference/pipeline-versioning.md` — sites 3 (tree-node dedup), 4 (defensive-negative deletion), and 7 (no-information-sentence deletion). Three independent edits land in this file. The canonical **Reviewer base ref** rule (`pipeline-versioning.md:21–28`) is the dedup target for site 6 and stays intact.
- `skills/radical-pipelines/reference/work-on-an-issue.md` — site 5 (delete the "sharpest discriminator" bullet).
- `skills/radical-pipelines/reference/autonomous-workflow.md` — site 6 (base-ref step de-restatement, the second of the two base-ref sites).
- `.changeset/pipeline-reviews.md` — site 9 (reword the body so it no longer matches `README.md:157`); the front matter is unchanged.

**Untouched-but-relevant files (already compliant; must stay byte-identical):**

- `README.md` — site 9 lives here too (`README.md:157`), but the differentiation is done entirely on the changeset side. The README sentence is load-bearing connective tissue mid-paragraph and is left exactly as is.
- `skills/radical-pipelines/reference/autonomous-phases/4 - code.md:35` and `5 - docs.md:36` — the two **Reviewer base ref** reference parentheticals. Each reads "(the start of the current run — see the **Reviewer base ref** rule in `pipeline-versioning.md`)": a reference plus the rule's own keying phrase, not a restatement of value/timing/hold-constant. They are the closest existing model for site 6's target and must not change.
- `skills/radical-pipelines/reference/intent-format.md` — the shared file that handles cross-path duplication of intent-schema content. Untouched.

## Interfaces and Data Flow

There are no programmatic interfaces in scope. The only "interface" is the changeset front matter, which the Changeset Gate CI parses, and the cross-file references between skill documents, which form the reading paths.

**Changeset front matter (must stay shape-valid and byte-identical):**

```
---
"@automattic/radical-pipelines": minor
---
```

`scripts/validate-changesets.mjs` validates only front-matter shape (fences, a quoted package key, a known package name, a valid bump type, the pre-1.0 major guard) and that the body is non-empty; it never inspects body prose. `changeset status` reads only front matter. So rewording the body cannot break either gate as long as the fences and front matter are preserved exactly and the body stays non-empty.

**Cross-file reference (must stay resolvable after site 6):**

Both base-ref steps end up citing the **Reviewer base ref** rule by name in `pipeline-versioning.md`. The reader who needs the value, the capture timing, or the hold-constant clause follows that citation to `pipeline-versioning.md:21–28`, which carries all three. The data flow the rule documents — base ref captured once at run start, held constant, passed unchanged to every code/docs reviewer invocation, diff always `base-ref → current HEAD` — is unchanged; only the two citing steps stop repeating it.

## Key Decisions

Each decision below fixes the surviving wording at one site. Line numbers are pre-edit and shift as edits land; the implementer should re-anchor on the quoted text, not the line numbers, especially in `review-pipeline.md` and `pipeline-versioning.md`, which each take three edits.

### Decision 1: fork-pipeline.md — fold the "seeds only from `base/`" fact into step 4, positively

- **Choice:** State the fact once at step 4 (the conceptual point where the fork's run layout is introduced), worded positively, and strip the two restatements.
  - **Step 4** — replace the second sentence with: "The fork's phases live under its own fresh `base/` run, seeded only from the parent's `base/` run in the next step (see **Runs within a pipeline** in `pipeline-versioning.md`)." This merges the two facts (fresh `base/`; nothing but the parent's `base/` is inherited) into one positive clause via "fresh" and "only".
  - **Step 5** — delete the second sentence "Only `base/` is copied; the parent's `review-*` runs (if any) are never inherited." The lead sentence ("Copy only the phase folders being inherited, from the parent's `base/` run into the new pipeline's `base/` run — `base/0-intent` up to and including the inherited phase agreed in step 1.") and the `cp -r` bullets stay verbatim as the operational copy instructions.
  - **Line 43** — delete the parenthetical "(from the parent's `base/` run)", leaving "…create a temporary worktree of the parent branch per the **Worktrees** convention, copy as above, then remove it." The in-line "in the parent's `base/` run" at line 42 and the `cp -r …/base/<phase>` source path remain the operational anchor in both bullets.
- **Alternatives:** Carry the survivor in step 5's operational copy sentence and trim step 4 to a forward-pointer. Both alternatives pass the meaning and no-new-violation checks.
- **Trade-offs:** The chosen option keeps the fact at the conceptual point (step 4, where the fork's run model is introduced) and leaves step 5 purely operational. The alternative is marginally more minimalist but leaves step 4 a forward-pointer rather than a stated fact, burying the fact inside an operational sentence. The positive "fresh … seeded only from" wording conveys "reviews are not inherited" without a negative clause, which is safe under rule 3 because no fork step ever reaches `review-*` folders by default — every copy operation is scoped to `base/`, and no step enumerates or walks the parent's runs.
- **Traces to:** Requirement 1 / Acceptance criterion 1.

### Decision 2: review-pipeline.md — keep the advisories-non-gating fact at step 1, delete the step-2 restatement

- **Choice:** The fact survives at step 1's existing sentence; the heading is de-labeled; the step-2 body sentence is deleted.
  - **Step 1 (line 14)** — unchanged. Both sentences stay: "These two are the ONLY preconditions." (independent content, closing the hard-gate set) and "The fork-vs-review and split advisories (next step) never gate a review the owner chooses." (the single surviving statement). Its negative form is load-bearing under rule 3: without it, a reader reaching step 2's accepted-fork divert could mistake the advisory for a third gate.
  - **Heading (line 16)** — becomes "### 2. Advisories" (drop "(non-gating)").
  - **Step 2 body (line 18)** — delete the sentence "Both advisories are recommendations only — the owner decides, and the orchestrator never unilaterally redirects." entirely, no replacement. Step 2 opens directly on its two bullets.
- **Alternatives:** (a) Survivor at the trimmed line-18 sentence, line 14 loses its second sentence, heading de-labeled — moves the fact from pre-announcement to point-of-use, losing the forward-defusing "(next step)" pointer. (b) Survivor = the heading's "(non-gating)" label, line 18 replaced with an owner-decides sentence — fails because a heading parenthetical is the weakest carrier and the replacement would restate the fact, leaving two sites.
- **Trade-offs:** The chosen option keeps the fact in its most defusing position (announced before the reader meets the advisories) and removes a sentence that both duplicates the fact and carries a needless negative ("the orchestrator never unilaterally redirects" is already encoded by the bullets' "MAY recommend"/"MAY suggest" optionality and the owner-acceptance gating). Its only cost is step 2 opening directly on its bullets, which are self-explanatory. No neutral lead-in is added, to avoid overlap with line 23's "BEFORE creating any run folder".
- **Traces to:** Requirement 2 / Acceptance criterion 2.

### Decision 3: pipeline-versioning.md — keep the tree-node fact (with its rationale) at line 65, leave operational instructions at the downstream sites

- **Choice:** The bare tree-membership assertion plus its causal rationale survive only at line 65; the downstream occurrences keep their distinct positive operational instructions.
  - **Line 65** — unchanged. "Tree SHAs are always computed over the pipeline's `base/` run; reviews are not part of the cross-pipeline tree, because lineage is a cross-fork comparison and forks inherit from `base/`, so only base phases are comparable." is the single surviving statement, with its WHY.
  - **Tree-building step 3 (line 87)** — delete the trailing clause "; a pipeline's reviews are not nodes", leaving "Each pipeline contributes one path through the tree from its `base/` run." Step 2 (line 82) already scopes SHA computation to `base/` phase folders, so a trie built from those sequences structurally cannot contain review nodes; the clause was a restated consequence.
  - **Rendering bullet (line 115)** — delete sentence 2, "The tree positions a pipeline by its `base/` run only; reviews never add or move nodes." Sentence 1 stays verbatim, including its "not as tree nodes" contrast gloss (this gloss is NOT one of the named edit sites and stripping it would exceed scope): "A pipeline's runs are reported as a linear chain annotated on the pipeline, not as tree nodes: `base → review-1-<short-description> → review-2-<short-description> …`, each annotated with its own state."
- **Alternatives:** Put the survivor at line 87 (the externally-entered section) and trim line 65 — orphans the causal rationale, which belongs with the tree-SHA derivation at line 65 and would bloat an operational step if moved.
- **Trade-offs:** Line 65 is the only site carrying the WHY, making it the natural canonical home; the downstream sites retain only operational HOW content. Because the tree section has external entry points that bypass line 65, meaning preservation rests on **operational sufficiency, not path coverage**: a bypassing reader still gets "one path … from its `base/` run" (87), "annotated on the pipeline … not as tree nodes" (115 sentence 1), and the example tree at lines 95–105 (which renders four pipelines with no run chains), which together fully determine correct construction and rendering.
- **Traces to:** Requirement 3 / Acceptance criterion 3.

### Decision 4: pipeline-versioning.md — delete the defensive negative about review-less pipelines

- **Choice:** Delete the final sentence of the line-115 rendering bullet, "A pipeline with no reviews shows no run chain.", with no replacement. After the Decision 3 edit to the same bullet, it ends on "…each annotated with its own state." — the last line of the file, no dangling connective.
- **Alternatives:** None — the spec mandates the deletion. The only design question was context integrity, which is verified: the surrounding text stands alone.
- **Trade-offs:** Pure deletion. The empty run-chain case is derivable from the chain format (nothing after `base` means no `→` links) and the example tree at lines 95–105, which already renders pipelines with no run chains. Under rule 3, the orchestrator has no default reason to render a chain for a review-less pipeline, so it need not be told none appears.
- **Traces to:** Requirements 4 and 11 / Acceptance criterion 4.

### Decision 5: work-on-an-issue.md — delete the "sharpest discriminator" bullet

- **Choice:** Delete line 40 ("The sharpest discriminator is same-branch-build-on-existing (review) vs. new-branch-from-main-diverge (fork); resume is the option when the latest run is incomplete.") outright, no replacement. The three definition bullets at lines 37–39 (Resume / Review / Fork, each naming its selecting condition) stay verbatim under the line-36 lead-in "When the owner is unsure which same-issue action to take, apply this rule:".
- **Alternatives:** Replace the bullet with a two-step decision procedure (completeness first, then build-on-existing vs. diverge). Rejected: its only candidate-additive content is the completeness-first ordering, which is thin — the three definitions each name their selecting condition, so the lookup is already mechanical; a procedure would re-encode the same three conditions (drifting back into restatement) and brush against the existing completeness-gate steer at `review-pipeline.md:11`. No other file carries a whole resume/review/fork decision procedure, so nothing is lost by not adding one.
- **Trade-offs:** The lead-in's "apply this rule" is fully satisfied by three labeled options each naming its condition — no procedural gap remains. Removal also restores list parallelism: the surviving sub-list is three parallel "**Label** — condition" bullets, where the deleted fourth was a non-parallel prose sentence.
- **Traces to:** Requirement 5 / Acceptance criterion 5.

### Decision 6: review-pipeline.md and autonomous-workflow.md — reduce both base-ref steps to bare references

- **Choice:** Both steps cite the **Reviewer base ref** rule with no restatement of its substance (no value, no capture timing, no hold-constant clause).
  - **`review-pipeline.md` step 3 (line 31)** → "Capture the run's base ref per the **Reviewer base ref** rule in `pipeline-versioning.md`." ("review's" → "run's" to match the sibling site; the value clause "= the prior-run tip" and the timing clause are dropped.)
  - **`autonomous-workflow.md` step 5 (line 37)** → "At run start, capture the run's base ref per the **Reviewer base ref** rule in `pipeline-versioning.md`." ("At run start" stays — it is this workflow's own scheduling imperative for when to act, not a description of the ref, so it is operational, not restatement.)
  - **`pipeline-versioning.md:21–28`** and the **`4 - code.md:35` / `5 - docs.md:36` parentheticals** — untouched.
- **Alternatives:** Use the 4/5-style parenthetical-with-gloss at the autonomous-workflow site, keeping its trailing purpose clause ("so it is fixed before launching the phase-4/5 reviewers"). Rejected: the workflow sentence already opens with "At run start", so adding "(the start of the current run — see …)" echoes the same keying phrase two words later — a new minimalism wrinkle the 4/5 parentheticals avoid only because their sentences do not say "at run start". The trailing purpose clause is reconstructible from the rule's own "captured once at run start … passed unchanged to every code/docs reviewer invocation", so it leans redundant.
- **Trade-offs:** Dropping the timing clause from `review-pipeline.md:31` is safe because the procedure's step order enforces it: step 3 re-attaches without committing, step 4 only creates a folder, and step 5's intent commit is the first HEAD-moving action — so a step-follower necessarily captures while HEAD is still the prior-run tip. The timing, value, and hold-constant substance all remain reachable at the cited rule. A minimal orienting gloss naming only the rule's keying phrase (as the 4/5 parentheticals do) would also pass the acceptance criterion; the bare reference is chosen here to avoid the "at run start" echo and keep both workflow sites in the same style.
- **Traces to:** Requirement 6 / Acceptance criterion 6.

### Decision 7: pipeline-versioning.md — delete the no-information per-phase-completion sentence

- **Choice:** Delete the trailing sentence of line 51, "The rows are unchanged; only their root is the run folder.", with no replacement. The sentence keeps: "The artifact paths above are relative to a run folder: a phase's predicate is evaluated at `<artifacts-folder>/<run>/<phase>` (for the base run, `<artifacts-folder>/base/<phase>`)." The following paragraph (latest-run selection) opens a new topic and does not connect back.
- **Alternatives:** None — the spec mandates the deletion; the only design question was context integrity, which is verified.
- **Trade-offs:** Pure deletion. The preceding sentence already states the predicate is evaluated at `<artifacts-folder>/<run>/<phase>`, which is the same fact; the trailing sentence adds nothing. The per-run predicate application across review runs is carried by `<run>`'s canonical definition at line 15 ("`base`, `review-1-<short-description>`, `review-2-<short-description>`, …"), which precedes line 51 on the reading path, so review runs are covered by substitution and no review-run example is needed.
- **Traces to:** Requirement 7 / Acceptance criterion 7.

### Decision 8: review-pipeline.md — keep the "review reuses branch/pipeline, version unchanged" assertion at the opener, trim step 6 to its imperative

- **Choice:** The assertion survives at the opener; step 6's second sentence is deleted.
  - **Opener (line 3)** — unchanged, including "it never creates a new pipeline": the negative is load-bearing fork-contrast at the procedure-selection point (a fork DOES create a new pipeline) — the same rule-3 "strictly necessary" pattern as Decision 2's line 14 — and finding 8 is a dedup finding, not a negative-phrasing one, so trimming the opener would exceed scope.
  - **Step 6 (line 48)** — delete the second sentence "Same branch, same pipeline, so the version is unchanged." The step becomes the bare imperative: "Re-assert (confirm, do not change) the existing `v<N>` version label per `pipeline-versioning.md` ("Model")." The "Model" citation is left as-is.
  - **Line 29's two step-3 overrides** — "and NEVER create a new branch" and "Do NOT perform resume's rollback step" — are both operational overrides of the cited resume procedure (branch-creation override; rollback override), out of this cluster, and stay in place. They do not count against the once-stated assertion.
- **Alternatives:** Trim the opener to pure procedure framing and keep step 6's "Same branch, same pipeline, so the version is unchanged." as the single assertion. Rejected: it relocates the what-a-review-is fact away from the procedure-selection point (the opener, where a skimming reader decides review-vs-fork) to a versioning step reached only after committing to the procedure — a real regression for that reader.
- **Trade-offs:** The duplication is exactly {opener "reuses the existing branch and worktree" ≈ step 6 "Same branch"} and {opener "never creates a new pipeline" ≈ step 6 "same pipeline"}; step 6's "so the version is unchanged" is a conclusion the opener never states, but the trimmed imperative already encodes version-unchanged ("confirm, do not change" plus "the existing `v<N>`"). The WHY lives canonically at `pipeline-versioning.md:19` ("A run carries no `-v<N>` suffix … does not change the pipeline version").
- **Traces to:** Requirement 8 / Acceptance criterion 8.

### Decision 9: changeset — reword the body to differentiate it from the README

- **Choice:** Edit the changeset body only; leave `README.md:157` untouched. The `.changeset/pipeline-reviews.md` body becomes:
  > Add pipeline reviews: layer an incremental change onto a complete, unmerged pipeline by re-running the phases as an additional run on the same branch. Phase folders now live under run folders: the original run is recorded as `base/` at pipeline creation and is never rewritten, and each review adds a sibling `review-N-<short-description>/` run.

  The front matter (`"@automattic/radical-pipelines": minor`) and the `---` fences stay byte-identical.
- **Alternatives:** Edit the README only, or edit both. Rejected: the README sentence is load-bearing connective tissue mid-paragraph (between "they live under a **run** folder" and the pointer to `pipeline-versioning.md`), so re-voicing it risks degrading the durable doc; the changeset is frozen-in-time release prose consumed once into `CHANGELOG.md` at `changeset version`, with nothing downstream depending on its wording. Editing both is unnecessary churn.
- **Trade-offs:** Three checks hold. (i) Standalone — a changelog reader with no README still learns the feature, its mechanics, and the run-folder model (a changelog entry must stand alone and cannot be reduced to a pointer to the README). (ii) Differentiated — the sentences now differ in subject, verb, and structure ("Every pipeline carries…" vs. "Phase folders now live under run folders: the original run is recorded as `base/`…"); the one residual shared clause, "each review adds a sibling `review-N-<short-description>/` run", is forced by the feature's literal folder-name syntax and sits below the "sentence near-verbatim" bar. (iii) CI-safe — the validator and `changeset status` read only front matter, which is byte-identical, so the Changeset Gate stays green. This pair is in scope on the owner's explicit request to cover all findings in one review, not by the literal `AGENTS.md` rules (nothing in `AGENTS.md` names `README.md` or `.changeset/`).
- **Traces to:** Requirement 9 / Acceptance criterion 9.

## Dependencies

- **No new dependencies.** No libraries, services, or modules are added.
- **`AGENTS.md:5–11`** — the five rules the edits bring the prose into compliance with. Already present; the rules are the standard the edits are measured against, scoped by their own wording to "the skill" (`skills/radical-pipelines/`).
- **Existing Changeset Gate CI** (`npm ci`, `npm test`, `scripts/validate-changesets.mjs`, `changeset status`) — the only PR-time gate. The design depends on it staying green, which holds structurally: `scripts/test/**` is untouched and the changeset front matter is byte-identical.
- **The canonical `pipeline-versioning.md:21–28` (Reviewer base ref) rule** — Decision 6's de-restatement depends on this rule remaining intact and complete, because both citing steps now reach the value, timing, and hold-constant substance only through it.

## Failure Modes and Observability

This is a prose change, so "failure" means a compliance regression or a CI break, not a runtime fault.

- **A fact is lost (meaning regression).** Detected by the cross-cutting re-read (verification layer 2): every fact in the spec's requirement-10 enumeration must still be reachable, each stated once or via an in-path reference. Mitigated by the operational-sufficiency argument for the bypass-prone sites (Decision 3) and the explicit per-site meaning checks above.
- **A new violation is introduced (compliance regression).** The chief risk, because the bar is judgment-based with no automated oracle. Mitigated by applying the decided wordings verbatim — each was settled against the rules, so re-paraphrasing is what would reopen them. The re-read also confirms the untouchable already-compliant patterns (the 4/5 parentheticals, the `intent-format.md` dedup structure, the canonical base-ref rule) stay byte-identical.
- **Line numbers drift mid-edit.** `review-pipeline.md` (Decisions 2, 6, 8) and `pipeline-versioning.md` (Decisions 3, 4, 7) each take three independent edits, so cited line numbers shift as edits land. Mitigated by re-anchoring on the quoted text rather than line numbers, and by batching per-file edits.
- **CI break from the changeset edit.** Would surface as a red Changeset Gate. Prevented by keeping the front matter and fences byte-identical and the body non-empty; the validator and `changeset status` never inspect body prose.

**Observability:** verification is a three-layer manual check run after all edits land — (1) **per-site checks**, one per acceptance criterion 1–9, each confirming at the edited file that the flagged fact now appears exactly once (or the flagged sentence is gone) and that the surviving wording matches the decision above; (2) the **cross-cutting re-read** for meaning preservation and no-new-violations across the full PR #106 prose, with the untouchable patterns confirmed byte-identical; (3) **CI** — commit on PR #106's existing branch (a review reuses the branch, so no new pipeline, branch, or changeset) and confirm the Changeset Gate passes. The per-site half of this checklist is mechanically derivable from the nine decisions above.

## Risks and Open Questions

**Open questions:** none. Two optional refinements surfaced during research — widening step 6's "Model" citation to also name "Runs within a pipeline", and further reducing the residual `review-N-<short-description>` clause overlap in the changeset — and were deliberately declined as out of scope, since the spec bars edits beyond the nine named sites.

**Risks:**

- **Step 6's "Model" citation does not reach the version-unchanged justification.** After Decision 8 deletes step 6's second sentence, the "Model" citation leads only to the v1/v2/v<N> labeling scheme (`pipeline-versioning.md:5–11`); the "a run does not change the pipeline version" fact lives at `pipeline-versioning.md:19` ("Runs within a pipeline"). Accepted because the imperative ("Re-assert (confirm, do not change) the existing `v<N>`") is executable without the why. Flagged so it is understood as weighed, not missed; widening the citation was declined as an unrequested edit.
- **The compliance bar is judgment-based.** With no automated prose oracle, the no-new-violations check rests on a manual re-read. The mitigation is the per-site exact-wording decisions: the implementer should apply them verbatim rather than re-paraphrasing, since fresh paraphrases would reopen the minimalism and duplication questions each decision already settled.
- **Two files receive edits from multiple decisions.** `review-pipeline.md` (Decisions 2, 6, 8) and `pipeline-versioning.md` (Decisions 3, 4, 7) accumulate several independent edits; the line numbers cited here are pre-edit and will shift as edits land. The implementer should sequence or batch the per-file edits and re-anchor on the quoted text, not the line numbers.
