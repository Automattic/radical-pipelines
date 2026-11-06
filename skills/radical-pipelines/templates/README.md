# Assignment templates

`rp assign` (`../scripts/README.md` § `assign`) fills one of these templates for each turn and writes it as the role's assignment: `<profile>.md` for a producer or the implementer, and for a reviewer `reviewer-first.md`, or `reviewer-later.md` when its lane's review thread is open and awaits it. They are the only source of an assignment's wording; the producers' and the implementer's headings and field names are those their profiles refer to by name.

## Syntax

- `{{<name>}}` is a slot, replaced by the value of `<name>`. A text reads as written. A list with no item reads `none`. A list alone on its line puts each item on its own line, with a blank line between items when one spans several lines. A list after other text ends its line: it holds its one item there, or starts a nested list of its items.
- A line `{{#<name>}}` opens a part and a line `{{/<name>}}` closes it. The lines between are kept when `<name>` has something: a true flag, a non-empty text, or a list with an item. A part opened with `{{^<name>}}` is kept when `<name>` has nothing.
- A value is inserted as written and never read as syntax. A template that breaks this syntax, or names something without a value, stops `rp assign` before it writes anything.

## Values

Every template may use:

- The vocabulary facts, `pipeline-slug`, `role`, `profile`, `lane`, `worktree`, `branch`, and `base` (`../scripts/README.md` § Placeholders).
- `turn-commit`: the `HEAD` of the role's worktree; a reviewer's is the change.
- `subagent-model`: the subagent model name the run gives the role, or empty.
- `brief`: the lane's brief, or empty.
- `intent`, `spec`, `design-doc`: their paths in the role's worktree.
- `later-inputs`: a list of the later inputs that target the role's artifact; a reviewer's lists every later input.
- `malformed-files`: a list of the frontier's `INVALID` lines naming a file the role writes, as `rp check` prints them.
- `guardrails`, `resources`: a list of the entries whose `profiles` include the role's profile, each `### <name>` over `- rule: <text>` or `- resource: <text>`, its placeholders expanded.
- `commit-format`: the commit format, its placeholders expanded, or `An imperative subject line.` when the project sets none.
- `vocabulary`: when a carried text keeps a placeholder, a list of each vocabulary fact as `` - `{<name>}`: <value> ``; otherwise no item.

A producer's and the implementer's templates also use:

- `mode`: `Produce`, `Respond`, `Consolidate`, or `Implement`; and the flags `produce`, `respond`, `consolidate`, and `implement`, true for the turn's mode.
- `supporting-folder`, `write-to`: the role's supporting folder and artifact, in its worktree.
- `changed-inputs`: a list of each changed input as `<path> — changed since <commit>`, `<commit>` the last one in the role's worktree that changed its artifact.
- `lane-candidates`: a list of each production lane of the phase as `<lane> — <candidate path>`, in the pipeline worktree.
- `threads`: a list of the threads awaiting the role.

A reviewer's templates also use `review-base`, `thread`, the lane's review thread, and on a later turn `diff`, the diff it reads.
