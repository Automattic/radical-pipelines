status: open
opener: implementer
owner: design-doc-producer
artifact: design-doc

## implementer — 54487fd763a80f9ec20da10494d7a219f786eb86

### Finding 1: on an INVALID turn, the first-turn request has a reviewer write a fresh review over its own review thread

design-doc-decision-9 gives a review lane the later-turn request only when its review thread is open and awaits the reviewer, and the first-turn request "otherwise, naming that thread". design-doc-decision-10 gives a reviewer on an `INVALID` frontier "the request design-doc-decision-9 gives". `rp assign` implements both as written. An `INVALID` frontier then sends the first-turn request, "Write your review … to `<thread>`, starting with these lines", with a new header and turn commit, to a thread that already holds the reviewer's messages. Two cases:

1. **The malformed file is another of the lane's threads.** Here the review thread is open and awaits the implementer, and the malformed file is, for example, the lane's `owner-intent` thread. Review lane `default` reproduced this. The request asks for a new review in the thread that holds its findings awaiting the implementer's answer.
2. **The malformed file is the review thread itself.** design-doc-assumption-1 is refuted for this case. It held that the reviewer "repairs that thread in place and opens no second one". observed: a reviewer spawned on opencode got this request, for a review thread whose only fault was `status: pending`. It opened no second thread. It did not repair the header either: it replaced the whole file with a new first review, and its earlier message is gone. Its report: "I overwrote it with `status: approved` and the current commit hash." Evidence: `3-implementation/notes/reviewer-run.md`, with the thread before and after.

The design's Risks expected the reviewer "may append another review message". The observed outcome is worse: the thread's history is lost. The review lane proposes that a turn which only repairs files ask for the repair and leave the review thread as it is, so that the first-turn request applies only when the review thread is new.

The design rejected a fix-only request, citing spec-requirement-1. spec-requirement-2 reads "the first-turn request when its lane has no open review thread, else the later-turn request". That differs from design-doc-decision-9 for an open thread awaiting the implementer. The later-turn request's "The author answered your review" would be false there too.

Which request does the design give a reviewer whose turn exists only to fix rejected files?

## design-doc-producer — 5cfad2ce9f8503caf6e907b23a255dd261335578

### Finding 1: changed in 5cfad2ce9f8503caf6e907b23a255dd261335578

The design now gives a reviewer whose turn exists only to repair rejected files a repair request, a template of its own (design-doc-decision-10). The request lists the `INVALID` lines of the reviewer's files. It tells the reviewer to change in each file only what its reason names and to keep every message, and it carries the turn commit and the commit format. It names no thread to write, no diff, and no review to do. Both of your cases get it, so the review thread is left as it is in each.

- **Why neither existing request fits.** Your evidence shows the first-turn request naming the rejected thread loses the thread's history (`3-implementation/notes/reviewer-run.md`). The later-turn request would tell the reviewer that the author answered, which is false on a repair turn. Its diff also starts at the reviewer's last message, which `rp` cannot read from a thread it rejects. design-doc-assumption-1 is gone, and the risk that rested on it is replaced.
- **design-doc-decision-9 now follows spec-requirement-2.** Off an `INVALID` frontier, the request is the later-turn one when the lane has an open review thread, else the first-turn one naming a new thread. On such a frontier, a woken reviewer's open thread always awaits it: a thread awaiting the implementer gives phase 3 work, which the frontier reaches before review (`rp.mjs`'s `phaseActions` and `frontier`). The rule that read the lane's thread by file name, so that a rejected thread counted, has no purpose left.
- **Landing.** A repair can turn a rejected review thread into an approval without a new heading. So landing now stamps an approval `--at` the commit its reviewer's last heading names, which `rp stamp` already requires, instead of `--at` the change. On a review turn the two are the same commit. This is in `state.md` § Certification.
- **The first-turn and later-turn requests.** They lose their part for rejected files, because no frontier other than `INVALID` has any.

spec-requirement-1 and spec-requirement-2 name only the first-turn and later-turn requests. The request set is the spec-producer's, so I opened `threads/4-design-doc-producer-spec-producer-spec.md` with your evidence.
