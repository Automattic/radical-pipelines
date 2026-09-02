# Intent format

The shared schema for issues, pipeline intents, and amendment records. An issue is authored in this format so it can travel as-is into `0-intent/intent.md`; an amendment record is an intent whose Origin is mandatory.

## Body

```markdown
# <Title>

## Goal

<!-- The outcome the owner wants — an outcome, not a solution. Required. -->

## Constraints

<!-- Binding must / must-not statements. -->

## Context

<!-- Links, prior decisions, motivation. -->

## Assumptions / directions to explore

<!-- The owner's hypotheses — to validate, not to obey. -->

## Origin

<!-- Amendments and non-issue-born work: the provenance, verbatim — the verdict or
     failure evidence that triggered this, the owner request, the PR feedback. -->
```

Omit empty sections.

## Frontmatter

Written by orchestration stamps, never by agents. Machine-readable provenance:

| Key | On | Value |
| --- | --- | --- |
| `issue` | `intent.md` | Canonical issue reference(s), per the Issues convention — opaque strings |
| `stacked-on` | `intent.md` | Pipeline label whose unmerged tip this pipeline starts from |
| `forked-from` | `intent.md` | `<pipeline label>@<commit>` this pipeline re-attempts from |
| `amends` | `amendment-<n>.md` | The pipeline label this amendment corrects |
| `origin` | `amendment-<n>.md` | Path of the originating record: the `unsatisfiable` review file, the failed task report, or a prior amendment (escalation chains cite the previous link) |

Amendment records are numbered `0-intent/amendment-<n>.md`, one counter across all triggers.
