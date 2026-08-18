---
"@automattic/radical-pipelines": minor
---

Converge review loops: a first review still rejects for any real issue, and a re-review rejects only for a prior finding whose resolution fails or for a must-fix issue — one that leaves the artifact unable to do its job, defined per reviewer. A new re-review finding that is not must-fix joins the rejection's issues when the review rejects anyway and is recorded under a new `## Non-blocking findings` approval section otherwise, findings that are instances of one defect are reported once as the defect covering every instance, and the reviewers drop the "Reject liberally", "A first-pass approval should be rare", and "no severity ladder" bars in favor of the shared "Never manufacture findings" one.
