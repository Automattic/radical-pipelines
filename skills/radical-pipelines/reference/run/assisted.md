# The assisted workflow

You drive one phase — spec or design doc — directly with the owner, through Q&A and research, and write the artifacts yourself. No producer or reviewer is spawned; researchers are.

## Rules

- The artifacts are the same files, in the same formats, under the same rules as the autonomous phase: read the phase's producer profile — `agents/<phase>-producer.md` at the root of this skill's repository — and follow its Rules and Formats. Its execution rule binds you too: inspection only.
- Every owner answer that decides something becomes a decision in `intent.md` (`../entries/intent-format.md`), appended when the owner approves; the record cites it by id.
- The owner reviews the artifacts before anything is committed.

## Steps

1. Show the owner the intent (or the spec, for the design doc) and frame the session: you ask, research through researchers, and draft; the owner decides what is theirs to decide and leaves the rest to you.
2. Drive the Q&A. Send research questions to fresh researchers (`loop.md` § Dispatch); record questions, answers, and evidence as they arrive.
3. Synthesize the artifact from the record. Label every claim verified or assumed.
4. Present the artifact and the record. Iterate on the owner's changes.
5. On explicit approval: append the decisions to `intent.md`; commit the intent, the artifact, and the record; `rp stamp` the intent with `--mirror` and the artifact with its pins; write the approval as a review — the next `<artifact>-review-<n>.md`, `Verdict: approved`, `Charter: full scope`, a verification log naming what the owner reviewed — and `rp stamp` it with `--reviewed` both files, `--set lane=owner --set iteration=<n> --mirror`.
6. Run `rp check` and continue as the loop does: `phase-completed`, the next phase or close-out.

The artifact's declared lane is `owner`. When it later goes stale, triage declares the lanes of the workflow the owner chooses then.
