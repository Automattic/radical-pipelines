# The assisted workflow

You drive one phase — spec or design doc — directly with the owner, through Q&A and research, and write the artifacts yourself. No producer or reviewer is spawned; researchers are. Assisted runs have no named lanes: owner approval is the whole review. Production lanes and a pipeline whose next phase is build or document use the autonomous workflow: say so and offer `loop.md`.

## Rules

- The artifacts are the same files, in the same formats, under the same rules as the autonomous phase: read the phase's producer profile — `agents/<phase>-producer.md` at the root of this skill's repository — and follow its Synthesize mode, Rules, and Formats. Its execution rule binds you too: inspection only.
- One question, one topic at a time. Never answer your own questions or decide on the owner's behalf; suggest options when the owner is unsure, and read the codebase first when it would ground the question.
- During spec, propose no design or implementation choices.
- Record every question, answer, option, trade-off, and decision in the record as it happens, never in batches.
- Every owner answer that decides something becomes a decision in `intent.md` (`../entries/intent-format.md`), appended when the owner approves; the record cites it by id.
- Nothing passes a gate — the end of Q&A, out-of-scope confirmation, approval — without the owner's explicit confirmation.
- The guardrails naming the phase's profiles apply to your work: surface them to the owner and satisfy them.

## Steps

1. Address the pipeline worktree by absolute path. Create the phase folder, fire `phase-started`, show the owner the intent (or the spec, for the design doc), and frame the session: this is the assisted workflow for this phase; you ask, research through researchers, and draft; the owner decides what is theirs to decide and leaves the rest to you; nothing is committed until they approve.
2. Drive the Q&A. Spec: before asking, append the question; after the answer, append it, then choose the next question. Track every "no" and "not for now" as an out-of-scope candidate. Design doc: complete each topic's frame, options, trade-offs, decision, and rationale in the record before the next; a scope question is an open question or a spec revision, never a design decision. Send research questions to fresh researchers (`loop.md` § Dispatch).
3. Before synthesis, self-check: completeness of the areas above, clarity — two implementers would build the same thing — feasibility against the codebase by inspection, consistency between answers, explicit exclusions. Return to Q&A for any gap. Spec: surface the collected exclusions to the owner in one list and confirm them.
4. Synthesize the standalone artifact from the record. For a spec, be specific and size detail to its evidence. Label every claim verified or assumed.
5. Present the artifact and the record. Iterate on the owner's changes; the owner may send you back to Q&A.
6. On explicit approval: append the decisions to `intent.md`; write the approval as the implicit lane's review — the artifact's next `<artifact>-review-<wave>.md`, `Verdict: approved`, `Brief: owner approval`, a verification log naming what the owner reviewed and anything the owner wants recorded. Commit the intent, artifact, record, and review together. `rp stamp` the intent with `--mirror`, the artifact with its pins, and the review with `--reviewed` everything `state.md` says it names and `--mirror`; commit the stamps.
7. Run `rp check` and continue as the loop does: `phase-completed`, the next phase or close-out. Report the completed phase, artifact paths, and notes; state that the run ended. Continuing to a later phase happens in a separate session.

When the artifact later goes stale, the workflow the owner chooses at triage reviews it.
