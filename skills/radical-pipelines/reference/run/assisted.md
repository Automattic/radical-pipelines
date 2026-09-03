# The assisted workflow

You drive one phase — spec or design doc — directly with the owner, through Q&A and research, and write the artifacts yourself. No producer or reviewer is spawned; researchers are.

## Rules

- The artifacts are the same files, in the same formats, under the same rules as the autonomous phase: read the phase's producer profile — `agents/<phase>-producer.md` at the root of this skill's repository — and follow its Rules and Formats. Its execution rule binds you too: inspection only.
- Every owner answer is recorded in the record verbatim, attributed `owner`. Your own synthesis and researcher answers are attributed to their author. Only quoted owner words become owner territory.
- The owner reviews the artifacts before anything is committed.

## Steps

1. Show the owner the intent (or the spec, for the design doc) and frame the session: you ask, research through researchers, and draft; the owner decides what is theirs to decide and leaves the rest to you.
2. Drive the Q&A. Send research questions to fresh researchers (`../run/loop.md` § Dispatch); record questions, answers, and evidence as they arrive.
3. Synthesize the artifact from the record. Label every claim verified or assumed.
4. Present the artifact and the record. Iterate on the owner's changes.
5. On explicit approval: commit both files, `rp stamp` the artifact with its pins, and write the approval as a review: `<artifact>-review-1.md` with `Verdict: approved` and a verification log naming what the owner reviewed; `rp stamp` it with `--reviewed` both files, `--set lane=owner --set iteration=1 --set head=<commit> --mirror`.

An `owner` lane approval satisfies any lane declaration. When the artifact later goes stale, the re-review runs in whichever workflow the owner chooses at triage.
