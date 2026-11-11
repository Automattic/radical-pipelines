# Orchestrator exercise

A subagent on `claude-agent/sonnet`, acting as the orchestrator with the changed skill, loaded this repository's `.rp.md` and the sample `rp.local.md` (copied here; it was `.rp.local.md` in the scenario's main checkout), and recorded a new pipeline's run configuration for this request: "work on issue 999, through review; run the implementer on `fable` for this run; keep the pipeline branch local: do not push it."

- `confirmation.md`: the configuration part of its triage step 4 message.
- `run-config.json`, `run-config.local.json`: what it recorded.
- `compare.txt`: each recorded value and text against `git show 1a43fc61:.rp.md`'s conventions data.
- `rp-run.txt`: `rp check`, `rp pipelines`, and `rp next` on a scratch repository holding the recorded files, and the reviewer-astra assignment `rp next --apply` wrote.
