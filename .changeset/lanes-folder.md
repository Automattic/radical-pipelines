---
"@automattic/radical-pipelines": minor
---

BREAKING: Move production lanes under `<phase>/lanes/<lane>/` (was `<phase>/<lane>/`), and read only pipeline state: the files at the pipeline folder root, directly in a phase folder, in its `tasks/`, and in each `lanes/<lane>/`. `rp` neither reads nor descends into any other folder, and `rp stamp` refuses files outside it, to stamp or to pin, so a folder of Markdown beside an artifact, review, or report is no longer an undeclared lane, and an unreadable one no longer stops `rp check`. Lane ids may now be `tasks`.

To migrate a pipeline with production lanes, with no agent working and every open lane branch merged into the pipeline branch, in one commit on that branch:

1. In each phase folder holding lane folders, create `.lanes/`, `git mv <phase>/<lane> <phase>/.lanes/<lane>` for each lane, then `git mv <phase>/.lanes <phase>/lanes`.
2. Rewrite every path under a declared production lane, `<phase>/<lane>/…`, to `<phase>/lanes/<lane>/…` wherever `rp` reads it: the frontmatter of every file, `run-config.md` included, and every fixed line.
3. `rp stamp <file> --mirror` each file whose body changed.

A changed body is a new identity, and a changed lane declaration — a review lane's `materials` — a new fingerprint: `rp check` then reconverges whatever consumed them, reopening a closed lane whose waves they invalidate. A pipeline whose bodies and declarations name no lane path keeps its frontier. Afterwards, merge the pipeline branch into each open lane branch.
