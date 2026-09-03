# The intent format

This describes an issue body or pipeline intent, the input to phase 1.

## Origin lines

At the top of `0-intent/intent.md`, before the title, write these plain machine-readable lines:

```text
Origin: issue <canonical reference>
Origin: starts-from <slug>
Origin: re-attempts <slug>
```

The issue line is required. Add either later line when applicable. The canonical reference follows **Issues**.

## Schema and rendering

Render these sections and **omit any that are empty** — no `N/A` placeholders:

- **Title** — concise.
- **Goal** — always present. State the desired outcome, not a solution. "Users can export their data as JSON," not "add a `format` parameter to `ExportController`."
- **Constraints** _(optional)_ — binding boundaries the owner owns. The comprehensive scope belongs to phase 1.
- **Context** _(optional)_ — links, prior decisions, and motivation only the owner holds.
- **Assumptions / directions to explore** _(optional)_ — owner hypotheses or proposed directions, labeled open so later research may confirm or overturn them.

A vague idea with only a Title and Goal is complete.

Items are addressed by section and position: `#goal`, `#constraint-<n>`, `#context-<n>`, `#assumption-<n>`, `#decision-<n>`, counting bullets from 1.

## Decisions

The intent is the only file that carries the owner's words. The issue's sections are never edited after creation; every decision the owner makes afterwards — an answer in an assisted session, an answer to an escalation — is appended under `## Decisions` as a numbered bullet: the words quoted verbatim, then what they answer (the question, or the claim's path). Records cite decisions by id.

## Authoring discipline

- **Capture, do not converge.** This is a short owner-led capture pass, not phase 1. Record what the owner already holds and stop when they have nothing more.
- **Lead with the goal, then invite.** A checklist of sections pressures the owner to manufacture answers and over-specify.
- **Keep requirements, design, and implementation in their phases.** Acceptance criteria belong to phase 1, architecture to phase 2, task breakdown to phase 3.
- **Reflect hypotheses as open.** Record beliefs about approach or current state under Assumptions, not as requirements.

## The amendment format

Write an external amendment to `0-intent/<n>-amendment.md`:

```markdown
# Amendment <n>

Target: <path>#<id>
Origin: <source>

## Request

<summary>
```

The owner's words, when the amendment carries any, are a decision in the intent; `Origin:` names it. Summarize the request in your own words.
