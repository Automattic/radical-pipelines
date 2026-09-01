# Lifecycle hooks

The Lifecycle hooks convention holds prose instructions the orchestrator runs at defined moments. A hook is fired by following its instructions verbatim; a hook the project does not define is skipped.

| Moment | Fires when |
| --- | --- |
| `pipeline-created` | Triage creates a pipeline's records |
| `amendment-opened` | An amendment record is written and stamped |
| `owner-escalated` | An owner escalation is presented |
| `before-opening-pr` / `after-opening-pr` | Around close-out's PR step |
| `before-merging-pr` / `after-merging-pr` | Around a PR merge the orchestrator performs |
| `run-ended` | The run stops — target reached, owner cancellation, failure, or the non-convergence valve |

A project's `.rp.md` may define any subset, keyed by these names.
