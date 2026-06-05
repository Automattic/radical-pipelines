---
"@automattic/radical-pipelines": minor
---

The Docs phase (phase 5) now produces a `pr-description.md` artifact: a self-contained Markdown file, written against everything the pipeline shipped and reviewed for accuracy under the phase's existing approval gate, that can be used verbatim as the body of the pull request. It follows the host project's PR conventions and links the originating issue tracker-agnostically. Phase 5 cannot complete without it, and the pipeline's descriptions of what phase 5 produces now enumerate it.
