---
"@automattic/radical-pipelines": minor
---

Add `rp metrics <pipeline folder>`, which measures the README's success metrics from a pipeline's tree and history: elapsed time from the intent's commit to the last touching the pipeline; each later input with the waves its target artifacts took to accept it, through the first valid wave carrying it; which phases ran autonomously, were intervened by later input, or ran assisted, with their waves, tasks, and attempts; the autonomy ratio; and whether the target was reached autonomously. Human intervention is later input — a constraint or proposal recorded after the intent — and the assisted workflow, read per phase from the run configuration of the commits that touched it. `--ref` and `--json` work as in `check`; a contradiction in the tree stops the command. The Report entry answers performance questions with it.
