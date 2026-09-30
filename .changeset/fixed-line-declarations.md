---
"@automattic/radical-pipelines": minor
---

BREAKING: Every declaration `rp` reads is a fixed line, `<key>: <value>` at the start of a line with no formatting marks. Keys are lowercase and match their frontmatter mirrors: `verdict`, `brief`, `target`, `origin`, `outcome`, `prior-finding` (was `Prior finding:`, mirrored as `recurs`), `depends-on` (was `Depends on:`, mirrored as `depends`), and `commit`, one line per commit (was a report's `## Commits` section, mirrored as `commits`). An id is declared by the line `<id>: <text>`, with its content following until the next declaration or heading; bullets, numbering, headings, and emphasis no longer declare it. At its stamp, a line opening with an id the file declares in any other form, or an id the file originates that occurs without being declared, is `INVALID IDS` for its author to fix, so an artifact can no longer leave its items silently undeclared. Artifact reviewers check that every item the artifact states is listed in its frontmatter `ids`.

To migrate each open pipeline, in one commit: rewrite every fixed line with its lowercase key, each report's `## Commits` entries as `commit: <hash>` lines, and every id declaration as `<id>: <text>`; rename `recurs`, `depends`, and `commits` in frontmatter to `prior-finding`, `depends-on`, and `commit`; then re-stamp each changed file with `rp stamp <file> --mirror`.
