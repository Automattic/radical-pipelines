status: approved
opener: implementer
owner: spec-producer
artifact: spec

## implementer — 54487fd763a80f9ec20da10494d7a219f786eb86

Two review findings question what spec-requirement-10 demands. I carry them here as the review raised them; the implementation follows the spec as written.

### Finding 1: a lane's brief is not among the texts whose placeholders are expanded

- **The spec's scope.** spec-requirement-10 expands placeholders "in every guardrail, resource, and commit-format text an assignment carries". spec-requirement-11 lists the vocabulary only for a placeholder left in "a carried text". The spec's Considered and not required rules out briefs: "A placeholder in a lane's brief or a model name — no intended use produces one: observed: no brief or model name in `.rp.md` or this pipeline's `run-config.md` holds braces."
- **The review's reading.** The review lane `default` reads intent-constraint-3, "A convention's text may contain variables", as covering a brief. A brief is a text of the Agents convention, which its lane's assignment carries verbatim (`skills/radical-pipelines/reference/conventions/agents.md` § Fields). For a review lane it is the whole review request.
- **The behavior.** The reviewer reproduced it: a `default` reviewer lane with the brief `Review {branch} for {agent}.`, `agent` declared as a variable, got the brief unchanged. When no other carried text kept a placeholder, the assignment listed no vocabulary. observed: reading `skills/radical-pipelines/scripts/rp.mjs`, whose `cmdAssign` fills `brief` from the run configuration without `expand`.
- **The general rule the review proposes.** Every convention text an assignment carries is expanded, and a placeholder kept in it brings the vocabulary listing.

Does intent-constraint-3 demand that a lane's brief be expanded like the other carried texts? If it does, design-doc-decision-7's **Where** follows.

### Finding 2: the vocabulary fact `base` contradicts the canonical term Base

- **The spec's definition.** spec-requirement-10 values the vocabulary fact as "the base, `run-config.md`'s `base`": a branch name. The Considered line "The vocabulary's base as the merge-base commit" was not taken.
- **The canonical term.** `docs/glossary.md` and `skills/radical-pipelines/reference/run/state.md` § Terms define **Base** as "the merge-base of the inspected tip with the branch its run configuration's `base` names": a commit. The project's documentation guardrail binds the glossary as the canonical vocabulary.
- **The behavior.** observed: in a review lane's request written by `rp assign`, the request reads "against `<the review base commit>`" while its vocabulary lists `` `{base}`: main `` (`3-implementation/notes/reviewer-run.md`).
- **The review's options.** Value the fact as the defined Base, or name it after what it holds.

Which does the spec demand? spec-acceptance-criterion-15 and the design's vocabulary table name the fact, and change with it.

## spec-producer — fb199c79a7314d1483f274dfb45a63b314902e28

### Finding 1: changed in fb199c79a7314d1483f274dfb45a63b314902e28

Yes, it does. intent-constraint-3 says "A convention's text may contain variables" with no narrower scope, and a lane's brief is a text of the Agents convention that its lane's assignment carries (`skills/radical-pipelines/reference/conventions/agents.md` § Fields). The spec had narrowed the scope to three kinds of text, and the intent's words do not support that. spec-requirement-10 now expands placeholders in every convention text an assignment carries: each guardrail's and resource's text, the commit format, and the lane's brief. spec-requirement-11's vocabulary listing follows, because a brief is now a carried text. spec-requirement-4 now has the brief reach the assignment as written, with its placeholders expanded. spec-requirement-15 now offers to declare a placeholder that a brief uses, and spec-acceptance-criterion-15 now covers a brief. The Considered line that excluded briefs is gone. Model names stay as written under spec-requirement-5 and intent-constraint-2.

### Finding 2: changed in fb199c79a7314d1483f274dfb45a63b314902e28

The spec now values the fact as the defined Base. The intent says "the base", and the skill's canonical vocabulary defines **Base** as the merge-base of the inspected tip with the branch `run-config.md`'s `base` names (`skills/radical-pipelines/reference/run/state.md` § Terms; `docs/glossary.md`). No convention text in any source uses the fact, so no intended use favors the branch. The spec's reason for the branch was the implementer's Base branch slot, which keeps naming that branch. spec-requirement-10 now defines the fact as the merge-base of the role's turn commit with the branch `run-config.md`'s `base` names. For a reviewer, the turn commit is the change `rp review` printed. The Considered line now records the branch reading as the one not taken. spec-acceptance-criterion-15 keeps its wording: it checks each role's value for its turn.

## implementer — fc2642bf12e14bad7bbca5f94f532f43d969b81a

Both findings are resolved. A lane's brief is now expanded like the other carried texts, and a placeholder it keeps brings the vocabulary listing (f7f5dea8). The vocabulary's `base` is the Base of the role's turn commit, while the implementer's Base branch keeps the branch name. The glossary's Vocabulary entry now defines every fact (ef161976).
