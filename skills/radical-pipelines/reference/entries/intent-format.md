# The intent format

This describes an issue body or pipeline intent, the input to phase 1.

## Origin lines

At the top of `0-intent/intent.md`, before the title, write these plain machine-readable lines:

```text
Origin: issue <canonical reference>
Origin: starts-from <branch>
Origin: re-attempts <pipeline slug>
```

The issue line is required. Add either later line when applicable. The canonical reference follows **Issues**.

## Synthesis from an issue

Read the body, every comment, cross-reference, external link, and attachment. When the body already follows this format and nothing else exists — no comments, references, links, or attachments — copy the body verbatim, adding the Origin lines and the ids. Otherwise:

1. Follow references one level. Report unreadable links in the draft.
2. Fold every comment and linked page's substance into the latest agreed state; keep unsettled directions under Proposals.
3. Download referenced assets beside `intent.md` and use relative paths.
4. Make phase 0 self-contained.

A re-synthesis from a modified issue also consumes the current intent: it preserves `Origin`; kept issue-derived items retain their ids, withdrawn ones disappear, and additions take the next ids.

## Schema and rendering

Render these sections and **omit any that are empty** — no `N/A` placeholders:

- **Title** — concise.
- **Goal** — always present. State the desired outcome, not a solution. "Users can export their data as JSON," not "add a `format` parameter to `ExportController`."
- **Constraints** _(optional)_ — binding boundaries the owner owns. The comprehensive scope belongs to phase 1.
- **Context** _(optional)_ — links, prior decisions, and motivation only the owner holds.
- **Proposals** _(optional)_ — directions or hypotheses to investigate; the pipeline may adopt or refute them.

A vague idea with only a Title and Goal is complete.

Every item other than the Goal is a bullet opening with its id (`../run/state.md` § Names), assigned in order of creation.

## Authoring discipline

- **Capture, do not converge.** This is a short owner-led capture pass, not phase 1. Record what the owner already holds and stop when they have nothing more.
- **Lead with the goal, then invite.** A checklist of sections pressures the owner to manufacture answers and over-specify.
- **Keep requirements, design, and implementation in their phases.** Acceptance criteria belong to phase 1, architecture to phase 2, task breakdown to phase 3.
- **Reflect hypotheses as open.** Capture what to investigate under Proposals, preserving its uncertainty.

## Later input

Write one `0-intent/constraint-<n>.md` per binding ruling, or `0-intent/proposal-<n>.md` per request to investigate. Each states its substance without needing the exchange it came from; the filename identifies its kind. Number each kind from 1, never reusing a number. One item may target several artifacts; independent items use separate files.

```markdown
# <Constraint | Proposal> <n>: <title>

Target: <path>[#<id>][, …]
Origin: <source>

<ruling or request, including its evidence>
```

Set `Target:` by what the statement concerns: product behavior → build plan; documentation → document plan; requirements → spec; mechanisms → design doc; a named clause → that clause. A whole-artifact target may precede the artifact. `Origin:` names the source. For an owner escalation, record the answer defined in `../run/state.md` § Owner territory. Records cite the input's path beside the question it answers.
