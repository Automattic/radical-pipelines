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
