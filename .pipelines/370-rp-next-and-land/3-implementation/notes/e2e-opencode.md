# One lane step on opencode, run from the plan alone

Scratch repository `<repo>`: `.rp.md` at conventions 9 with `worktree-folder-root` `.worktrees`, `landing-commit` `{subject} (orchestrator)`, and an `after-creating-worktree` hook writing the worktree's role to `.hook-role`; pipeline `demo` with one `spec-producer` lane `a` on `claude-agent/sonnet#xhigh`. The orchestrator steps follow `reference/run/loop.md` and `tools/opencode.md`.

```
$ rp next <repo>/.pipelines/demo
frontier lane 1-spec/spec.md a
hook before-creating-worktree spec-producer-a <repo>/.worktrees/demo-spec-a
create-branch demo-spec-a d587bc72bf4b01a3959d76912ec837dc2174f98d
create-worktree spec-producer-a demo-spec-a <repo>/.worktrees/demo-spec-a
hook after-creating-worktree spec-producer-a <repo>/.worktrees/demo-spec-a
hook phase-started 1
hook before-spawning-agent spec-producer-a
wake spec-producer-a profile spec-producer
wake spec-producer-a lane a
wake spec-producer-a model claude-agent/sonnet#xhigh
wake spec-producer-a phase 1
wake spec-producer-a worktree <repo>/.worktrees/demo-spec-a
wake spec-producer-a assignment <repo>/.git/worktrees/demo-spec-a/rp/spec-producer.md
hook after-spawning-agent spec-producer-a
hook before-merging-lanes spec-producer-a
hook after-merging-lanes spec-producer-a

$ rp next <repo>/.pipelines/demo --apply   (prints the same plan; exit 0)
# after-creating-worktree, from the plan line: echo spec-producer-a > <repo>/.worktrees/demo-spec-a/.hook-role
$ opencode api POST /api/session -d {"parentID": <orchestrator>, "title": "demo spec-producer a", "agent": "radical-pipelines/spec-producer"}
$ opencode api POST /api/session/<id>/move -d {"directory": "<repo>/.worktrees/demo-spec-a"}
  GET /api/session/<id> → "location": {"directory": "<repo>/.worktrees/demo-spec-a"}
subagent agent=radical-pipelines/spec-producer sessionID=<id> model=claude-agent/sonnet#xhigh background=true
  prompt: Read your assignment: <repo>/.git/worktrees/demo-spec-a/rp/spec-producer.md.
  → completed; the report ends "Completion declared: no work remains." (candidate committed on demo-spec-a)

$ rp land <repo>/.pipelines/demo --role spec-producer-a   (exit 0, no phase completed)
$ git log --first-parent --format="%h %s" -4
df896c5 Certify spec lane a candidate (orchestrator)
5122291 Merge spec lane a (orchestrator)
d587bc7 Add intent (orchestrator)
9765c94 base
$ rp check <repo>/.pipelines/demo
frontier consolidate 1-spec/spec.md
lane 1-spec/spec.md a fresh
artifact 1-spec/spec.md missing
$ rp next <repo>/.pipelines/demo
frontier consolidate 1-spec/spec.md
hook before-terminating-agent spec-producer-a
terminate spec-producer-a profile spec-producer
terminate spec-producer-a lane a
hook after-terminating-agent spec-producer-a
hook before-removing-worktree spec-producer-a <repo>/.worktrees/demo-spec-a
remove-worktree spec-producer-a <repo>/.worktrees/demo-spec-a
delete-branch demo-spec-a
hook after-removing-worktree spec-producer-a <repo>/.worktrees/demo-spec-a
hook before-spawning-agent spec-producer
wake spec-producer profile spec-producer
wake spec-producer phase 1
wake spec-producer worktree <repo>
wake spec-producer assignment <repo>/.git/rp/spec-producer.md
wake spec-producer fresh
hook after-spawning-agent spec-producer
```
