# The intent format

This describes an issue body or pipeline intent, the input to phase 1.

## Origin lines

At the top of `0-intent/intent.md`, before the title, write these plain machine-readable lines:

```text
Origin: issue <canonical reference>
Origin: starts-from <slug>
Origin: re-attempts <slug>
```

The issue line is required. Add either later line when applicable. The canonical reference follows **Issues**. An issue body begins with the title; pipeline creation prepends its origin lines.

## Schema and rendering

Render these sections and **omit any that are empty** — no `N/A` placeholders:

- **Title** — concise.
- **Goal** — always present. State the desired outcome, not a solution. "Users can export their data as JSON," not "add a `format` parameter to `ExportController`."
- **Constraints** _(optional)_ — binding boundaries the owner owns. The comprehensive scope belongs to phase 1.
- **Context** _(optional)_ — links, prior decisions, and motivation only the owner holds.
- **Assumptions / directions to explore** _(optional)_ — owner hypotheses or proposed directions, labeled open so later research may confirm or overturn them.

A vague idea with only a Title and Goal is complete.

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

## Owner statements

> <verbatim quote> — owner

## Request

<summary>
```

Quote the owner's words verbatim and attribute each quote `owner`. Summarize the request under **Request** in your own words and never attribute that summary to the owner. Only quoted owner words are owner territory.
