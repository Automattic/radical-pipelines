status: open
opener: reviewer-default
owner: implementer
artifact: implementation

## reviewer-default — ce0eb7575924f3b196fa4e17aed0c0ff2acb1fee

Nice work overall. Moving the certification into `certification/<path>.json`, using the Git blob id of the whole file as identity, and moving the role-written values into a flat YAML frontmatter covers every intent constraint. I checked these:

- **Line endings.** `reading.test.mjs` shows the working tree and `--ref HEAD` agree under `*.md text eol=crlf` and under `core.autocrlf=true`. That covers the first failure in intent-context-5.
- **Squash merge and continuation.** `continuation.test.mjs` covers a clone with none of the pipeline's commits: the spec and the design doc are fresh, `notes.md` is stale on the failure, and the approval counts as none. It also covers a clone that holds those commits. That covers intent-context-2 and the second failure in intent-context-5. Ignoring merge-tree conflicts inside the pipelines folder root matches the diff, which already leaves that root out.
- **Parallel lanes.** Each landed file has its own certification path, so lane merges never conflict on one (intent-constraint-3).
- **The YAML subset.** I compared `frontmatterOf` with the `yaml` package on about 80 values: quotes, escapes, `#`, `: `, every indicator, flow collections, anchors, tags, block scalars, and text after a closing quote. Whenever `rp` accepts a value, YAML reads the same text. The one exception is typed scalars (`368`, `true`, `~`, an empty value), which `rp` deliberately reads as text, as the README says. Every other value YAML would read differently is `INVALID`, and the reason names the key and the construct.
- **The lane view.** `rp review` still keeps `certification/` out of the lane's change.

### 1. `stamp` no longer ties an approval to the change its reviewer read (must fix)

`cmdStamp` (`skills/radical-pipelines/scripts/rp.mjs:812-818`) checks only that `HEAD`'s code outside the pipelines folder root equals `--at`'s. Nothing checks that `--at` is the change the reviewer read. So `--at HEAD`, which `state.md` prescribed until this change, still passes. The approval then pins every later input that reached the pipeline branch while the lane reviewed, and it comes out fresh. That is the third failure in intent-context-5, now prevented only by what the prose tells the orchestrator. Before this change, `stamp` compared `--at` with the commit named in the reviewer's last heading; this change removed that comparison.

I reproduced it with the test fixture. A pipeline has a review lane `a`. `rp review` builds the change, and the reviewer approves in the lane. Then `0-intent/failure-1.md` lands on the pipeline branch, the lane's commits are cherry-picked onto it, and the approval is stamped:

- `--at <change>`: `inputs` is `["0-intent/intent.md@…"]`, and `rp check` reports `{"lane":"a","approved":false,"stale":["0-intent/failure-1.md"]}`.
- `--at HEAD`: exit 0, `inputs` is `["0-intent/failure-1.md@…","0-intent/intent.md@…"]`, and `rp check` reports `{"lane":"a","approved":true}`. The reviewer never read that failure.

The heading already names the change: both reviewer templates head the message `## reviewer-<lane> — <turn commit>`. So the script can make the wrong certification impossible to write. For an approval, stop unless `--at` resolves to the commit named in the reviewer's last heading; the existing check of `HEAD`'s code against `--at`'s then ties the approved commit to that change as well. Please add a refusal test for an approval stamped `--at` a commit other than the change.

### 2. The later-input template runs into the quoting rule (nit)

`intent-format.md` § Origins points to `state.md` § Frontmatter, where the quoting rule lives; § Later input does not. Its template line `origin: issue <canonical reference>` becomes `origin: issue #368` for a `#`-style reference, which is `INVALID` because ` #` starts a YAML comment. `rp check` names the problem, so the cost is one extra round. A pointer to § Frontmatter there, or a quoted form in the template, avoids the round.

### 3. Dropping `--pin` goes beyond the issue (non-blocking)

The intent doesn't ask to drop the candidate pins a consolidated root recorded. I'm fine with dropping them: nothing read them beyond their grammar, and the candidates stay in `<phase folder>/lanes/`. But the changeset says only that `rp stamp` "loses `--pin`". A clause saying why, for example that a certification holds required inputs only, would help someone reading the breaking change.

### Rules

- **tests**: `npm test` passes: 494 tests, 0 failures.
- **documentation**: Follows `AGENTS.md` and `docs/glossary.md`. The glossary adds **Certification** and **Frontmatter** and updates **Identity**, **Landing**, **Pin**, **Review thread**, and **Stamp**. The skill, the profiles, `README.md`, and `docs/` use the new terms consistently, and I found no leftover wording about status lines, header lines, `target:` lines, `--pin`, or leaving frontmatter untouched. A changeset is recorded, `minor` with `BREAKING`, as the pre-1.0 policy requires.
