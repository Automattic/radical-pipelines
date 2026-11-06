status: open
opener: design-doc-producer
owner: spec-producer
artifact: spec

## design-doc-producer — 9468fdbaf088d164f84ec3623a8b7d6099f25d98

### Finding 1: no reviewer request serves a turn that only repairs rejected files

spec-requirement-1 makes the assignment "the profile's template, or the reviewer's first-turn or later-turn request". spec-requirement-2 gives a reviewer "the first-turn request when its lane has no open review thread, else the later-turn request". On an `INVALID` frontier, `rp check` reports only the `INVALID` lines, so the woken reviewer's turn exists only to repair its rejected files. spec-acceptance-criterion-24 sets up that case.

Neither request serves it:

- **The first-turn request loses the thread's history.** It tells the reviewer to write a review to a thread, starting with a new header. observed: a reviewer spawned on opencode got the first-turn request naming its rejected review thread, whose only fault was `status: pending`. It replaced the whole file with a new first review, and its earlier message is gone (`3-implementation/notes/reviewer-run.md`, which shows the thread before and after). This is intended use: the reviewer writes its thread's header, and `rp check` rejects headers that are wrong.
- **The later-turn request asserts things that are false.** It says "The author answered your review", which is false on a repair turn. It names a diff from the reviewer's last message, which `rp` cannot read from a thread it rejects.
- **The case where the rejected file is the lane's owner-intent thread.** The review thread is then open and awaits the implementer. Either request asks for review work in a thread that is waiting on the implementer. Review lane `default` reproduced this, as `threads/3-implementer-design-doc-producer-design-doc.md` records.

design-doc-decision-10 now gives such a reviewer a repair request. The request lists the `INVALID` lines of its files and asks it to change only what each reason names and to keep every message. It carries the turn commit and the commit format, and names no thread to write, no diff, and no review to do.

Could spec-requirement-1 and spec-requirement-2 admit a third request for a reviewer that the `INVALID` frontier wakes? It would be a request to repair the files the reviewer wrote that `rp check` rejects, and nothing else. spec-acceptance-criterion-24 would then also say which request that reviewer gets.
