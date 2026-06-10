# Design-doc research — Adopt the prompt → intent rename in the reviews feature

## Scope of phase 2

The approved spec (`../1-spec/spec.md`) fully enumerates the per-file / per-occurrence rename
end-state. It explicitly **defers two wording calls** to this design phase, and only those two:

1. **create-pipeline.md** — whether to adopt trunk's added authoring-discipline bullet ("Do not add
   requirements, technical directions, or implementation details — agents do their own research in
   later phases.") OR rely on the `intent-format.md` reference (avoiding duplicated authoring
   discipline). (Spec req 12, create-pipeline bullet, tagged `[design]`.)
2. **manage-issues.md:14** — whether to keep #106's "`create-pipeline.md` turns the issue into…"
   agent clause OR adopt trunk's "When the pipeline is created, the orchestrator turns…" phrasing —
   while keeping #106's extracted-file structure and `base/0-intent/intent.md` path either way.
   (Spec req 8 / req 12, manage-issues:14, tagged `[design]`.)

Everything else in the spec is already settled and is NOT re-litigated here.

## Evidence gathered (analyst, direct file reads)

### Branch (#106) current state

- `skills/radical-pipelines/reference/create-pipeline.md:25` (only format-file pointer in the file):
  `- Adapt the issue content into the phase-0 prompt directed at the agents that will run subsequent
  phases, following the schema and authoring discipline in `prompt-format.md`.`
  Verified `git grep -nc prompt-format -- create-pipeline.md` → **1** (line 25 is the SOLE carrier of
  the pointer in this file).
- `skills/radical-pipelines/reference/manage-issues.md:14`:
  `The issue body _is_ the phase-0 prompt — `create-pipeline.md` turns the issue into
  `base/0-prompt/prompt.md`. Author the issue using the shared schema, rendering rules, and authoring
  discipline in `prompt-format.md`.`
- `review-pipeline.md:39` (the #106 third authoring site):
  `Author the review prompt … the same way the base prompt is **orchestrator-authored** (the
  `create-pipeline.md` step-4 pattern), following the schema and authoring discipline in
  `prompt-format.md`.` → orchestrator-as-actor, create-pipeline.md-as-pattern.

### Trunk (post-#109) state

- Trunk `create-pipeline.md` step 4 has TWO bullets (no format file exists on trunk; discipline is
  inline):
  - `- Adapt the issue content into the intent that seeds the subsequent phases.`
  - `- Do not add requirements, technical directions, or implementation details — agents do their own
    research in later phases.`
  Trunk's first bullet **has no "following … in <format-file>" clause** (trunk has no format file).
- Trunk `manage-issues.md` line 14 (schema inlined): `The issue body _is_ the phase-0 intent — When
  the pipeline is created, the orchestrator turns the issue into `0-intent/intent.md`. So this is both
  the issue template and the intent format. Render these sections …` (flat `0-intent/intent.md`, no
  `base/` prefix).

### #106 base artifacts (design rationale — load-bearing)

- **R11 (MUST — orchestrator authors the prompt)** — `base/1-spec/spec.md:136`: "The orchestrator
  authors and …". #106's own design names the **orchestrator** as the authoring actor.
- **R13 (single-sourced prompt format)** — `base/4-code/code-review-approved.md:44` ("No
  prompt-format duplication"): the schema, omit-empty rule, the "vague idea" sentence, the example,
  and **the four discipline points appear in exactly one place — `prompt-format.md`**;
  `manage-issues.md`, `create-pipeline.md`, and `review-pipeline.md` each only point to it. PASS.
- **Named decision "Single-source the prompt format into a new `prompt-format.md`"** —
  `base/2-design-doc/design-doc.md:158-161`: rejects inline-in-manage-issues ("buries the canonical
  format … host/borrow asymmetry inviting drift"); driver is the THIRD authoring site (review prompt)
  the reviews feature adds.
- **code-plan Task 3 (create-pipeline.md), items 3 & 4** — `base/3-plan/code-plan.md:215-223`:
  item 3 KEEPS the issue→prompt transform bullet and **points its authoring at the shared format**
  ("… following the schema and authoring discipline in `prompt-format.md`."); item 4 **REMOVES** the
  exact trunk bullet ("Do not add requirements, technical directions, or implementation details…")
  calling it "the authoring discipline restated and is now covered by the `prompt-format.md` pointer."
  → #106 *deliberately deleted* trunk's discipline bullet as a duplication, replacing it with a
  pointer in the transform bullet. Confirmed acceptance `code-review-approved.md:22`.
- **The three-sites table** — `base/2-design-doc/design-doc.md:103-112`: the BASE-prompt site's
  "Trigger" is the EVENT "a new pipeline is created (phase 0)" (event framing, not "create-pipeline.md
  does it").
- **code-plan Task 4 (manage-issues.md), item 1** — `base/3-plan/code-plan.md:243-275`: line 14 keeps
  the issue↔prompt relationship sentence with the path updated; the surrounding rationale is purely
  about removing duplicated schema/discipline prose, NOT about who the actor is. The
  "`create-pipeline.md` turns the issue into…" filename-as-actor phrasing is incidental, inherited
  from the pre-#106 wording — it is not a defended convention.

## Preliminary resolutions (pending researcher confirmation)

### Decision 1 — create-pipeline.md: rely on the intent-format.md reference (DO NOT add trunk's bullet)

**Resolution: Option B — omit trunk's "Do not add requirements…" bullet; keep the `intent-format.md`
reference.** Refinement: the spec's req-12 target bullet text ("Adapt the issue content into the
intent that seeds the subsequent phases.") is taken from trunk, which has NO format-file clause.
Taking it *verbatim* would strip line 25's "following … in `intent-format.md`" clause — the SOLE
pointer from create-pipeline.md to the discipline — orphaning the file from the format. So the
correct end-state APPENDS #106's pointer to trunk's rephrased sentence:
`- Adapt the issue content into the intent that seeds the subsequent phases, following the schema and
authoring discipline in `intent-format.md`.`

Rationale: R13 ("appears in exactly one place — `intent-format.md`") and the named single-source
decision (`design-doc.md:158-161`) make adding trunk's bullet a *direct re-introduction* of the very
duplication #106 removed in code-plan Task 3 item 4. The spec itself instructs to KEEP the
`intent-format.md` reference (req 12), which is incompatible with simultaneously re-adding the inline
discipline restatement. Option A (add the bullet) would regress #106's reviewed architecture.

### Decision 2 — manage-issues.md:14: adopt trunk's "the orchestrator turns" clause (Option B)

**Resolution: Option B — "… when the pipeline is created, the orchestrator turns the issue into
`base/0-intent/intent.md`. Author the issue using the shared schema, rendering rules, and authoring
discipline in `intent-format.md`."** (Keeps #106's extracted-file + `base/` path; only the agent
clause changes.)

Rationale: (1) orchestrator-as-actor matches #106's OWN dominant vocabulary — R11
(`spec.md:136`), the three-sites Trigger event framing (`design-doc.md:103-112`), and
review-pipeline.md:39's "orchestrator-authored (the create-pipeline.md step-4 pattern)". The
filename-as-actor in manage-issues.md:14 is the lone outlier, incidental rather than a defended
convention (code-plan Task 4 never argues for it). (2) It is factually accurate on the branch (the
orchestrator, following create-pipeline.md step 4, performs the transform). (3) It reduces eventual
human-merge divergence (matches trunk's clause) at zero cost to #106's design, since the
extracted-file architecture and `base/0-intent/intent.md` path are preserved regardless.

## Researcher confirmation

### Decision 1 — CONFIRMED (Option B, pointer clause re-attached)

`design-doc-researcher` confirmed Option B with the same refinement and supplied stronger grounding:

- **R13 is a binding MUST, not a style preference** — `base/1-spec/spec.md:154-169`: "each element of
  the schema, rendering rules, and authoring discipline lives in exactly one location … No two sites
  restate the same format prose." Trunk's "Do not add requirements…" bullet is a *restatement* of
  intent-format.md's "No requirements, design, or implementation." discipline bullet — same discipline,
  different words — so adding it puts the discipline in two locations, violating R13.
- **The no-duplication acceptance criterion names create-pipeline.md as pointer-only and is marked
  PASS** — `base/4-code/code-review-approved.md:46` (and `code-plan.md:652-655`): "the four discipline
  points appear in exactly one place — `prompt-format.md`. manage-issues.md, create-pipeline.md, and
  review-pipeline.md each only point to it." Adopting trunk's bullet regresses a verified-PASS MUST.
- **The single-source decision's rejected alternative** — `design-doc.md:158-162`: hosting the format
  where one site states it and others borrow was rejected for "host/borrow asymmetry inviting drift";
  the trade-off line records that "the base-site discipline gloss is trimmed to a pure pointer." An
  inline bullet at create-pipeline.md re-creates exactly that rejected asymmetry.
- **The pointer-orphan risk is real and must be fixed** — create-pipeline.md:25 is the SOLE format-file
  pointer in the file (line 31's "Commit format" is the unrelated commit convention). Taking trunk's
  sentence verbatim (no clause) would leave the file with ZERO pointer and fail the R13 criterion in
  the other direction ("create-pipeline.md … only points to it" — pointing nowhere fails it). The
  spec's INTENT is unambiguous that the pointer stays (req 10 / group D: "keep #106's reference …
  reference `intent-format.md`"; req 12: "while keeping #106's reference to the shared format file as
  `intent-format.md`"); only the spec's *quoted target sentence* omits the clause — a spec-text
  inconsistency to reconcile in the design doc, not an intended drop.

**Final create-pipeline.md step-4 transform bullet (decided):**
`- Adapt the issue content into the intent that seeds the subsequent phases, following the schema and
authoring discipline in `intent-format.md`.`
(Trunk's verb phrasing + #106's retained pointer clause. Trunk's separate "Do not add requirements…"
bullet is NOT added.)

### Decision 2 — CONFIRMED (Option B: adopt trunk's orchestrator clause)

`design-doc-researcher` confirmed Option B and supplied a decisive provenance fact I then verified
directly:

- **The filename-as-actor phrasing PREDATES #106** — verified `git show 3f39bee` (the merge-base
  before both #106 and #109): manage-issues.md:14 already read "`create-pipeline.md` turns the issue
  into `0-prompt/prompt.md`." #106 inherited that clause by inertia and only (a) path-edited it to
  `base/0-prompt/prompt.md` and (b) replaced the inlined schema with the `prompt-format.md` pointer;
  #106 never authored or defended the filename-as-actor verb. #109, from the same merge-base,
  deliberately copy-edited the clause to "When the pipeline is created, the orchestrator turns the
  issue into…". So this is a genuine #109 improvement to a sentence #106 left in its old form — there
  is NO #106 rationale to protect.
- **manage-issues.md:14 is the lone file-as-actor outlier** — verified by repo-wide grep over
  `skills/` and `agents/`. The only other apparent hits are not counter-examples: `spec-consolidator.md:27`
  has `spec-research.md` as the subject of "does not give you enough material" (a file being read, not
  acting on an issue), and `assisted-workflow.md:28` is "the same way an autonomous reviewer's
  `-approved.md` does" (a file being *compared*, not performing an action). The house style is
  orchestrator-as-actor / file-as-procedure (health-monitoring.md:13; work-on-an-issue.md:51;
  review-pipeline.md:18/20/21 "the orchestrator MAY recommend a fork via `fork-pipeline.md`").
- **#106's own vocabulary is orchestrator-as-actor** — R11 (`base/1-spec/spec.md:136-141` "orchestrator
  authors the prompt"), the three-sites table BASE Trigger "a new pipeline is created (phase 0)"
  (`design-doc.md:106`, event framing matching trunk's "when the pipeline is created"), and #106's own
  review-pipeline.md:39 "orchestrator-authored (the `create-pipeline.md` step-4 pattern)". So Option B
  *aligns* line 14 with #106's design; it does not override any reviewed #106 decision.
- **Factually accurate** — phase 0 is orchestrator-authored (no agent is spawned for it); the
  orchestrator, executing create-pipeline.md step 4, performs the transform. "the orchestrator turns
  the issue into `base/0-intent/intent.md`" is exactly what happens; "create-pipeline.md turns…" was a
  metonym for the same thing.
- **Reduces merge divergence at zero design cost** — #109 reworded this exact clause to B's phrasing,
  so adopting B makes line 14 match trunk on the agent clause, leaving divergence ONLY where #106's
  design genuinely differs (the extracted-file pointer + `base/` path). Option A would leave a
  gratuitous wording diff carrying no #106 intent — pure merge-time noise.

**Final manage-issues.md:14 wording (decided):**
"The issue body _is_ the phase-0 intent — when the pipeline is created, the orchestrator turns the
issue into `base/0-intent/intent.md`. Author the issue using the shared schema, rendering rules, and
authoring discipline in `intent-format.md`."

Caveat for the design doc / plan: B adopts ONLY trunk's first-clause verb rewording, then continues
with #106's pointer sentence. Line 14 must NOT pick up trunk's inlined-schema continuation ("So this
is both the issue template and the intent format. Render these sections…") — that is the inlined
schema #106 deliberately extracted (the settled, not-in-question part). Net target: trunk's agent
clause + #106's `base/` path + #106's extracted-file pointer.

## Summary of both deferred wording calls (FINAL)

1. **create-pipeline.md** — **OMIT** trunk's "Do not add requirements…" bullet; rely on the
   `intent-format.md` reference. Keep trunk's verb phrasing WITH #106's pointer clause re-attached:
   `- Adapt the issue content into the intent that seeds the subsequent phases, following the schema
   and authoring discipline in `intent-format.md`.` (Reconciles the spec's req-12 quoted-sentence
   inconsistency, which had dropped the pointer; honors R13 MUST + the verified-PASS no-duplication
   acceptance criterion.)
2. **manage-issues.md:14** — **ADOPT** trunk's orchestrator clause: "The issue body _is_ the phase-0
   intent — when the pipeline is created, the orchestrator turns the issue into
   `base/0-intent/intent.md`. Author the issue using the shared schema, rendering rules, and authoring
   discipline in `intent-format.md`." (Keeps #106's extracted-file architecture + `base/` path; does
   NOT take trunk's inlined schema.)

Both decisions are evidence-grounded, agreed with `design-doc-researcher`, and consistent with the
spec's binding requirements (R11, R13) and the spec's stated intent (req 8, 10, 12). No prior-phase
artifact needs revision; the only spec wrinkle (req-12's quoted create-pipeline.md sentence omitting
the pointer clause) is reconciled in favor of the spec's own surrounding intent (req 10/12 "keep the
reference"), not treated as a blocker.
