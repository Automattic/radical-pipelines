# Design-doc review — APPROVED

**Verdict:** Approved (iteration 1)
**Design doc reviewed:** `2-design-doc/design-doc.md` (commit `5183d0e`)
**Reviewed against:** `1-spec/spec.md`, `2-design-doc/design-doc-research.md`, and the actual repository
state (trunk, branch `worktree-95-pipeline-reviews`, merge-base `3f39bee`).

## Summary

The design doc correctly scopes phase 2 to the two wording calls the spec deferred — the
`create-pipeline.md` authoring-discipline bullet and the `manage-issues.md:14` agent clause — and
resolves both with evidence I independently verified in the repo. Both decisions preserve #106's
reviewed architecture (the `base/` run-folder model and the extracted shared format file) while taking
#109's intent naming, and neither re-litigates anything the spec already settled. The doc maps each
decision back to the spec's acceptance criteria and is internally consistent with the research record.

## What I verified against the actual repo (not just the research record)

Every load-bearing fact the design doc relies on was checked against the repository, and all held:

1. **Merge-base is `3f39bee`** (`git merge-base trunk HEAD`), and it is an ancestor of both trunk and
   HEAD. At that merge-base, `manage-issues.md:14` already read "`create-pipeline.md` turns the issue
   into `0-prompt/prompt.md`" — confirming the filename-as-actor phrasing **predates #106** and was
   inherited by inertia, never a defended #106 convention. This is the decisive provenance fact behind
   Decision 2.
2. **Trunk's `create-pipeline.md` step 4 has two bullets**, the first ("Adapt the issue content into
   the intent that seeds the subsequent phases.") with **no** format-file clause (trunk has no format
   file). This confirms the pointer-orphan risk Decision 1 flags: taking trunk's sentence verbatim
   would strip the file's sole pointer to the discipline.
3. **#106 deliberately deleted trunk's "Do not add requirements…" bullet** — the branch's
   `create-pipeline.md` now carries only the single "Adapt…" bullet with the `prompt-format.md`
   pointer. The base code-plan (Task 3 items 3 & 4) records this verbatim: KEEP the transform bullet
   pointing at the shared format, REMOVE the discipline restatement as "now covered by the
   `prompt-format.md` pointer." The base code-review marks the no-duplication criterion **PASS** and
   names `create-pipeline.md` as pointer-only. So adopting trunk's bullet would regress a verified-PASS
   MUST (R13) — Decision 1's rejection of it is correct.
4. **Trunk's `manage-issues.md:14`** reads "When the pipeline is created, the orchestrator turns the
   issue into `0-intent/intent.md`. So this is both the issue template and the intent format. Render
   these sections…" — confirming both the agent-clause rewording Decision 2 adopts and the inlined
   schema it correctly rejects (re-inlining is the settled, out-of-scope part #106 deliberately
   extracted).
5. **`prompt-format.md` exists only on the branch, not trunk** — confirming the Group E by-hand-rename
   premise and that the shared-file architecture is a #106 addition with no trunk counterpart.
6. **`review-pipeline.md:39`** confirms #106's own orchestrator-as-actor vocabulary ("the base prompt
   is orchestrator-authored (the `create-pipeline.md` step-4 pattern)"), corroborating that Decision 2
   *aligns* line 14 with #106's design rather than overriding it.
7. **The two decided wordings are byte-consistent** across the design doc and the research record.

## The one subtlety I scrutinized — and why it is not a defect

Trunk's reworded clause reads "intent — **When** the pipeline is created" (capital W, since trunk
quotes it standalone); the design doc decides on "intent — **when** the pipeline is created"
(lowercase w). This is the correct splice, not an error: the clause sits **after an em-dash** in
#106's sentence (which previously continued lowercase, "prompt — `create-pipeline.md` turns…"), so
lowercasing the spliced clause is the grammatically correct continuation. The spec's own *target
wording* for line 14 embeds the clause after the em-dash, and its capital-W rendering (req 9, line 62)
is a standalone quotation of trunk's sentence, not the embedded form. Decision 2's "matches trunk's
clause / reduces merge divergence" rationale refers to adopting trunk's orchestrator-as-actor wording
over #106's filename-as-actor wording — which it does — and the one-character casing normalization is a
correct consequence of the em-dash context. Not a blocker.

## Spec coverage and scope discipline

- **Scope is correct.** The doc resolves only the two deferred calls, explicitly does not restate the
  spec's per-occurrence enumeration, and correctly defers the frozen-artifact and `.rp.md` boundaries
  to the spec's out-of-scope section. It does not re-litigate the settled extracted-file architecture,
  the `base/` path precedence, or the generic-vs-phase-0 sense boundary.
- **Decision 1 reconciles a genuine spec-text inconsistency.** Spec req 12 quotes a create-pipeline.md
  target ("…that seeds the subsequent phases.") that drops the pointer clause, yet the same requirement
  instructs "plus keep the reference to the shared format file as `intent-format.md`." These conflict.
  The design doc identifies this exactly, labels it a spec-text wrinkle, and resolves it by re-attaching
  the pointer clause — the only resolution satisfying both R13 (verified-PASS MUST) and the spec's
  "keep the reference" instruction (req 10/12) and acceptance criteria 4, 5, 7. This is the right call
  and is documented so the plan phase implements the pointer-bearing form.
- **Acceptance criteria are mapped.** The Failure Modes section ties each risk (stale token, wrongly
  renamed generic prompt, dangling format reference, architecture regression) to the specific spec
  acceptance criteria that serve as the verification procedure.

## No open questions

The design doc's "No open questions remain" claim is accurate: both deferred calls are decided, each
grounded in #106's binding requirements (R11, R13) and verified against trunk, the merge-base, and the
branch. No prior-phase artifact needs revision.

## Verdict

**Approved.** The design doc is trunk-consistent without regressing a #106 design decision, internally
consistent with the spec and research record, and grounded in repository facts I independently
confirmed. The plan phase can proceed with both wording calls as decided.
