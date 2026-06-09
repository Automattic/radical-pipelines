# Managing Issues

This is the entry point for **creating or modifying an issue**. You drive a short Q&A directly with the owner and write the issue yourself, through the **Issues** convention. This is the front door: it is upstream of `work-on-an-issue.md` and stops once the issue exists — it does **not** create or run pipelines.

Before executing these steps, make sure project conventions are loaded (see `conventions/load.md`). Every tracker operation — reading, creating, modifying an issue — goes through the **Issues** convention.

## What this covers

- **Create** a new issue.
- **Modify** an existing issue.

## The issue format

The issue body _is_ the phase-0 prompt — `create-pipeline.md` turns the issue into `base/0-prompt/prompt.md`. Author the issue using the shared schema, rendering rules, and authoring discipline in `prompt-format.md`.

## Constraints

The authoring discipline in `prompt-format.md` applies across all steps below. In addition:

- **Do not write to the tracker until the owner approves the rendered draft.**

## Steps

### 1. Frame the conversation

Tell the owner this is a short Q&A to capture the request, and set expectations up front:

> Add directions only if you are confident, or think they might be useful for exploration. The agents do their own research in later phases, so beyond the goal you don't _need_ to specify anything — under-specifying is safe; over-specifying narrows the work prematurely.

If **modifying**, read the current issue through the **Issues** convention and show it to the owner first, so the Q&A is about what to change.

### 2. Ask the goal

Ask one question: the outcome the owner wants. Keep pressing only until it is stated as an outcome rather than a solution. This is the one required section.

### 3. Invite extras (once, open-ended)

Make a single open invitation for anything else worth telling the agents — a hard constraint the owner is sure about, a hunch worth exploring, or context the agents couldn't discover on their own. Go deeper only as the owner volunteers. Sort what they give you:

- Binding must/must-not → **Constraints**.
- Links, prior decisions, motivation → **Context**.
- Beliefs about cause, current state, or approach → **Assumptions / directions to explore**.

### 4. Reflect hypotheses back as open

When the owner offers a direction or belief, record it under Assumptions and say so plainly — for example: "I'll note that as something to explore, not a requirement; the agents may confirm or revise it." This keeps the issue as the owner's _best current understanding, not ground truth_: downstream phases must either satisfy the stated intent or surface evidence that a premise is false, never silently substitute a different goal.

### 5. Draft, confirm, write

Render the issue in the format above (omitting empty sections) and show it to the owner. Do not write to the tracker until the owner explicitly approves. On approval, create the new issue — or apply the modification — through the **Issues** convention.

## Close out

Report the issue reference to the owner. The issue now exists; advancing it into a pipeline happens separately through `work-on-an-issue.md`.
