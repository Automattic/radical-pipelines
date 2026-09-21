# Managing issues

This is for **creating or modifying an issue**. Drive a short Q&A directly with the owner and write the issue through **Issues**.

## The issue format

The issue is the source of phase-0 intent. Author it using the schema, rendering rules, and discipline in `intent-format.md`.

## Rules

- Every issue operation — reading, creating, modifying, commenting — goes through **Issues**.
- Write to the tracker only after the owner approves the rendered draft.

## Steps

### 1. Frame the conversation

Tell the owner this is a short Q&A to capture the request, and set expectations:

> Add directions only if you are confident or think they might be useful for exploration. Later phases do their own research, so beyond the goal you do not need to specify anything — under-specifying is safe; over-specifying narrows the work prematurely.

If modifying, read the current issue through **Issues** and show it to the owner first, so the Q&A concerns what to change.

### 2. Ask the goal

Ask one question: the outcome the owner wants. Press only until it is stated as an outcome rather than a solution. This is the one required section.

### 3. Invite extras once

Make one open invitation for anything else worth telling later agents — a hard constraint, a hunch worth exploring, or context they cannot discover. Go deeper only as the owner volunteers. Sort the answer:

- Binding must or must-not → **Constraints**.
- Links, prior decisions, motivation → **Context**.
- Beliefs about cause, current state, or approach → **Assumptions / directions to explore**.

### 4. Reflect hypotheses as open

When the owner offers a direction or belief, record it under Assumptions and say so plainly: "I'll note that as something to explore, not a requirement; later phases may confirm or correct it." The issue is the owner's best current understanding, not ground truth. Downstream phases must satisfy the intent or surface evidence against a premise, rather than silently substitute another goal.

### 5. Search for related issues

When creating, search through **Issues** for issues related to the draft goal. Present matches with the draft, distinguishing possible duplicates from useful links. The discovery scan (`../run/state.md` § Discovery) annotates each match with its existing pipelines and state. The owner chooses to proceed, modify an existing issue, or link one in Context.

### 6. Draft, confirm, write

Render the issue, omitting empty sections, and show it to the owner. On approval, create or modify it through **Issues**.

## Close out

Report the issue reference. To run pipelines, read `triage.md`.
