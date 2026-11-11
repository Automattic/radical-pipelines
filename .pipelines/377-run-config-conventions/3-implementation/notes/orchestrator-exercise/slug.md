# New-pipeline slug exercise

A subagent on `claude-agent/sonnet`, acting as the orchestrator with the changed skill (read-only), took new work on issue 371, "rp thread and validate", as a new pipeline from `v4`, and chose its slug per `state.md` § Names. Its report, in brief:

```
$ node <worktree>/skills/radical-pipelines/scripts/rp.mjs pipelines <main>/.pipelines --base v4 --issue 371 --json
[]
$ git ls-tree --name-only v4 .pipelines/371-rp-thread-and-validate/
0-intent  1-spec  2-design-doc  3-implementation  run-config.md  threads
$ git ls-tree --name-only v4 .pipelines/ | grep '/371'
.pipelines/371-rp-thread-and-validate
$ git check-ref-format --branch 371-rp-thread-and-validate-2
371-rp-thread-and-validate-2
```

- Route: new intent, a new pipeline from the base branch (no pipeline of the issue is listed).
- Candidate slug from the Pipeline slug convention: `371-rp-thread-and-validate`. It names a folder of `v4`'s pipelines folder root, so it took `-2`: slug and branch `371-rp-thread-and-validate-2`, a folder no ref holds.
