# The intent format

This describes an issue body or pipeline intent, the input to phase 1.

## Origin lines

At the top of `0-intent/intent.md`, before the title, write these plain machine-readable lines:

```text
Origin: issue <canonical reference>
Origin: starts-from <branch>
Origin: re-attempts <slug>
```

The issue line is required. Add either later line when applicable. The canonical reference follows **Issues**.

## Synthesis from an issue

Read the body, every comment, cross-reference, external link, and attachment. When the body already follows this format and nothing else exists — no comments, references, links, or attachments — copy the body verbatim, adding the Origin lines and the ids. Otherwise:

1. Follow references one level. Report unreadable links in the draft.
2. Fold every comment and linked page's substance into the latest agreed state; label unsettled proposals from any participant as Assumptions.
3. Download referenced assets beside `intent.md` and use relative paths.
4. Make phase 0 self-contained, show the owner the rendered draft, and write it on approval.

A re-synthesis from a modified issue also consumes the current intent: it preserves `Origin` and every decision; kept issue-derived items retain their ids, withdrawn ones disappear, and additions take the next ids.

## Schema and rendering

Render these sections and **omit any that are empty** — no `N/A` placeholders:

- **Title** — concise.
- **Goal** — always present. State the desired outcome, not a solution. "Users can export their data as JSON," not "add a `format` parameter to `ExportController`."
- **Constraints** _(optional)_ — binding boundaries the owner owns. The comprehensive scope belongs to phase 1.
- **Context** _(optional)_ — links, prior decisions, and motivation only the owner holds.
- **Assumptions / directions to explore** _(optional)_ — owner hypotheses or proposed directions, labeled open so later research may confirm or overturn them.

A vague idea with only a Title and Goal is complete.

Every item other than the Goal is a bullet. In `intent.md`, `#goal` addresses the Goal section and each bullet opens with its id — `constraint-<n>`, `context-<n>`, `assumption-<n>`, `decision-<n>` — assigned in order of creation and never reused.

## Decisions

The intent is the only file that carries the owner's words. The issue's sections change only by synthesis from the issue; every decision the owner makes afterwards — a direction about the work at triage, an answer in an assisted session, an answer to an escalation — is appended when approved under `## Decisions` with the next `decision-<n>`: the words quoted verbatim, then what they answer (the run, the question, or the claim's path). Records cite each decision by id beside the question it answers.

## Authoring discipline

- **Capture, do not converge.** This is a short owner-led capture pass, not phase 1. Record what the owner already holds and stop when they have nothing more.
- **Lead with the goal, then invite.** A checklist of sections pressures the owner to manufacture answers and over-specify.
- **Keep requirements, design, and implementation in their phases.** Acceptance criteria belong to phase 1, architecture to phase 2, task breakdown to phase 3.
- **Reflect hypotheses as open.** Record beliefs about approach or current state under Assumptions, not as requirements.

## The correction format

Write a correction to `0-intent/correction-<n>.md`:

```markdown
# Correction <n>

Target: <path>[#<id>][, …]
Origin: <source>

## Request

<summary>
```

The owner's words, when the correction carries any, are a decision in the intent; `Origin:` names it. Summarize the request in your own words.
