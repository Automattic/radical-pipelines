---
"@automattic/radical-pipelines": patch
---

Mirrors are a projection of the body: `rp stamp --mirror` rewrites the whole mirror set from the body (a declaration the body lost leaves the frontmatter) and may run again on a stamped file; `rp check` recomputes the projection and names a file whose frontmatter differs as a contradiction to stamp again, never as an approval. Every report attempt is validated: a stamped report without `Outcome:` — or a review without `Verdict:` — is `INVALID REPORT`/`INVALID REVIEW <path>: <reason>`, an unfinished attempt its agent completes.
