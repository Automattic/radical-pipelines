---
"@automattic/radical-pipelines": minor
---

BREAKING: Keep `rp`'s certification out of the files roles and the orchestrator write.

Landing a turn writes `certification/<path>.json` in the pipeline folder: each required input pinned at its identity, and on an approval its approved commit. `rp stamp` never changes the landed file, and loses `--pin`: a certification holds only a file's required inputs and an approval's approved commit, so a consolidated root no longer records the candidates it merged, which stay in `<phase folder>/lanes/`. A file's identity is the Git blob id of the whole file, so `rp check` judges freshness alike from the working tree and from a commit, also under line-ending conversion, and in a clone that lacks the pipeline's history after a squash merge.

The values `rp` reads — a thread's header, `notes.md`'s status, a later input's `target` and `origin`, the intent's origins `issue`, `starts-from`, and `re-attempts` — move to a flat YAML frontmatter on the files that carry them, which `rp` reads with Node alone. Anything outside that subset is `INVALID`, naming the key or the construct; quote a value such as `"#368"`. Every `INVALID` line goes to the file's author, and a certification `rp` cannot read stops `rp check`.

An approval is certified at the change its reviewer read, so a later input that lands while the lane reviews leaves it stale; `rp stamp` stops on an approval stamped `--at` any commit other than the change its reviewer's last heading names. An approval whose approved commit the clone lacks counts as not approved instead of stopping `rp check`, and a merge conflict confined to the pipelines folder root no longer makes it stale on code.

`rp pipelines` still lists a pipeline of an earlier format with its origins, read from its intent's leading `origin:` lines.
