---
"@automattic/radical-pipelines": minor
---

BREAKING: Production lanes live under `<phase>/lanes/<lane>/` (was `<phase>/<lane>/`). Pipeline state is the files directly in a phase folder, its `tasks/`, and each `lanes/<lane>/`; `rp check` ignores every other folder and `rp stamp` refuses its files, so a folder holding Markdown beside an artifact, review, or report is no longer reported as an undeclared lane. Lane ids may now be `tasks`.

To migrate each pipeline with production lanes, in one commit on the pipeline branch, with no agent working and every open lane branch merged into it: `git mv <phase>/<lane> <phase>/lanes/<lane>` for each lane folder; then, in the frontmatter of every file in the pipeline folder, insert `lanes/` into each lane path under `pins`, `reviewed`, and `lane-packages` (`1-spec/a/spec.md@…` becomes `1-spec/lanes/a/spec.md@…`). Leave bodies and mirrored fields as they are: identities are unchanged, so no file needs re-stamping and `rp check` reports the same frontier with the new paths. The one exception is a constraint whose `origin:` names a claim inside a lane: rewrite that path, then `rp stamp <constraint> --mirror`; its targets reconverge on its new identity. Afterwards, merge the pipeline branch into each open lane branch.
