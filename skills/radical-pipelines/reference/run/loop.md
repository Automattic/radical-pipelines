# The convergence loop

> v3 skeleton stub — content pending; the heart of v3, replacing v2's `autonomous-workflow.md` machinery. Design record: [#273](https://github.com/Automattic/radical-pipelines/issues/273) and its escalation-design comment.

Will contain:

- The loop: `check` → find the highest missing-or-stale artifact → dispatch (producer by mode / review wave / workers) → stamp on landing → repeat; complete through the target phase → close-out.
- Review waves: freeze, one branch + worktree per lane seeded at the same commit, parallel isolated reviews, mechanical merge of disjoint files, union adjudication, lockstep; unanimous-fresh approval.
- Stamps: on landing; stamp propagation for body-identical pointer refreshes.
- Escalation routing: detection signals after every rejection (`unsatisfiable` verdicts, consecutive same-root-cause recurrence), the inspection decision point, custody and the owner-territory gate, owner escalations carrying the full dossier, resolution mechanics (target blob change or same-blob re-approval with `adjudicates`).
- The non-convergence valve (wave-counter threshold → stop and report).
- The orchestrator's conduct: mechanical during the run — computes, dispatches, stamps, merges; judgment only at decision points.
