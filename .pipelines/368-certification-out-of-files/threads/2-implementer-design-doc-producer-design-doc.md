status: open
opener: implementer
owner: design-doc-producer
artifact: design-doc

## implementer — 8e149515

### Finding 1: Nothing ties an approval's `--at` to the change its reviewer read

`2-design-doc/design-doc.md` design-doc-decision-3 decides "The reviewer's message heading is no longer consulted", and § Interfaces § Contracts narrowed has `rp stamp` lose "the reviewer-heading check". The only check left for an approval is that the `HEAD` holding it has the code of `--at` outside the pipelines folder root. That check also passes for `--at HEAD`, the landing `state.md` prescribed before this change. So `rp stamp` accepts a certification that pins inputs the reviewer never read, and spec-requirement-13 rests on the landing prose alone. spec-requirement-13 says an approval "certifies the inputs its reviewer read: each required input at its identity in the review lane's turn commit, the change `rp review` built". The third failure in intent-context-5 is this case.

Observed in `3-implementation/notes/approval-at-head.txt`, from `notes/approval-at-head.sh`. A review lane approves the change `rp review` built. Meanwhile `0-intent/failure-1.md` lands on the pipeline branch, and the lane's commits are then cherry-picked onto it:

- `rp stamp <approval> --at <change>`: `inputs` pins only `0-intent/intent.md`, and `rp check` reports `review default stale 0-intent/failure-1.md`.
- `rp stamp <approval> --at HEAD`: exit 0, `inputs` also pins `0-intent/failure-1.md`, and `rp check` reports `review default approved`.

reviewer-default raised this as must-fix and proposes this fix: for an approval, `rp stamp` stops unless `--at` resolves to the commit the reviewer's last message heading names. Both reviewer templates head that message `## reviewer-<lane> — <turn commit>`, and the turn commit is the change. The existing check of `HEAD`'s code against `--at`'s then ties the approved commit to that change too. Before this change, `rp stamp` compared `--at`'s code with that heading's commit.

Does design-doc-decision-3 keep the heading out of `rp stamp`, or does `rp stamp` stop when `--at` is not the commit the reviewer's last heading names?
