# The intent format

This describes an issue body or pipeline intent, the input to phase 1.

## Origin lines

At the top of `0-intent/intent.md`, before the title, write these plain machine-readable lines:

```text
origin: issue <canonical reference>
origin: starts-from <branch>
origin: re-attempts <pipeline slug>
```

The issue line is required. Add either later line when applicable. The canonical reference follows **Issues**.

## Synthesis from an issue

Read the body, every comment, cross-reference, external link, and attachment. When the body already follows this format and nothing else exists — no comments, references, links, or attachments — copy the body verbatim, adding the origin lines and the ids. Otherwise:

1. Follow references one level. Report unreadable links in the draft.
2. Fold every comment and linked page's substance into the latest agreed state; keep unsettled directions under Proposals.
3. Download referenced assets beside `intent.md` and use relative paths.
4. Make phase 0 self-contained.

A re-synthesis from a modified issue also reads the current intent: it preserves `origin`; kept issue-derived items retain their ids, withdrawn ones disappear, and additions take the next ids.

## Schema and rendering

Render these sections and **omit any that are empty** — no `N/A` placeholders:

- **Title** — concise.
- **Goal** — always present. State the desired outcome, not a solution. "Users can export their data as JSON," not "add a `format` parameter to `ExportController`."
- **Constraints** _(optional)_ — binding boundaries the owner owns. The comprehensive scope belongs to phase 1.
- **Context** _(optional)_ — links, prior decisions, and motivation only the owner holds.
- **Proposals** _(optional)_ — directions or hypotheses to investigate; the pipeline may adopt or refute them.

A vague idea with only a Title and Goal is complete.

In `intent.md`, every item other than the Goal is declared by its id (`../run/state.md` § Names), assigned in order of creation.

## Authoring discipline

- **Capture, do not converge.** This is a short owner-led capture pass, not phase 1. Record what the owner already holds and stop when they have nothing more.
- **Lead with the goal, then invite.** A checklist of sections pressures the owner to manufacture answers and over-specify.
- **Keep requirements, design, and implementation in their phases.** Acceptance criteria belong to phase 1, architecture to phase 2, task breakdown to phase 3.
- **Reflect hypotheses as open.** Capture what to investigate under Proposals, preserving its uncertainty.

## Later input

Write one `0-intent/constraint-<n>.md` per binding ruling, `0-intent/proposal-<n>.md` per request to investigate, or `0-intent/failure-<n>.md` per reported failure; the filename identifies its kind. Each file holds only what the owner gave — their statement, at the scope they gave it, and the evidence they pointed to — in the fewest words that carry it, and a reader understands it without the conversation it came from. A cause, a reading of the evidence, an affected artifact or clause, or a remedy the owner did not state is left to the target's producer and reviewer. Number each kind from 1, never reusing a number. One item may target several artifacts; independent items use separate files.

```markdown
# <Constraint | Proposal | Failure> <n>: <title>

target: <path>[#<id>][, …]
origin: <source>

<the owner's ruling, request, or failure>
```

A failure states what was run, where, and the result as the owner put it; the detail stays in its evidence. Save its evidence — the reported output and the logs and results folders it names — in `0-intent/failure-<n>/`, with secrets and personal data removed, and cite each item by relative path.

Set `target:` by what the statement concerns:

| Concerns         | Target        |
| ---------------- | ------------- |
| product behavior | build plan    |
| documentation    | document plan |
| requirements     | spec          |
| mechanisms       | design doc    |
| a named clause   | that clause   |

A target may name a whole artifact that does not exist yet. `origin:` names the source: `issue <canonical reference>`, or the URL or pipeline path it came from. For an owner escalation, record the answer defined in `../run/state.md` § Owner territory. When a research record raised the question this input answers, cite the input's path in that record next to the question.
