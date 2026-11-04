# Report

Read-only. The owner wants to know where things stand: one pipeline, or everything for an issue.

1. `git fetch`.
2. One pipeline: `rp check <pipeline folder> --json`. An issue: `rp pipelines <repo path> --base <artifact base branch> --issue <canonical issue reference>` (`../run/state.md` § Discovery), then the same check on each live pipeline of the current format. Report a merged pipeline as `rp pipelines` lists it, reading its files from the base branch's tree, and a pipeline of an earlier format as listed.
3. Render, per pipeline, from the check and the tree:
   - pipeline slug, branch, live or merged;
   - `origin`: issue; starts-from or re-attempts;
   - configuration: target phase, lanes;
   - per phase: missing · stale · current, with each production lane's candidate;
   - open threads and the role each awaits; pending escalations;
   - each review lane: approved and fresh, or not;
   - the frontier.
4. For an issue, render it as the root of a plain-text tree (`├`, `└`, `│`, `─`) whose pipeline nodes follow their `origin` links. Append `[merged]` to every merged pipeline.

Answer questions about history from the files and their Git history: threads in number order, later inputs, and the commits that changed each artifact.
