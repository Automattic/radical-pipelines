---
"@automattic/radical-pipelines": patch
---

Identity is the body's exact bytes as git hashes them: `rp` no longer normalizes CRLF, tolerates a `\r` only on frontmatter delimiter lines, and recognizes a closing `---` that ends the file. The pipeline tree holds no symlinks: `rp check` reports one as `symlink <path>` without following it — a cyclic link no longer aborts the walk — as `rp stamp` already refused them.
