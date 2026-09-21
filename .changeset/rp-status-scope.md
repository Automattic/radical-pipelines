---
"@automattic/radical-pipelines": minor
---

BREAKING: scope `rp_status` to one pipeline (`pipeline_slug`), one session (`session`), or every RP session (neither; the two exclude each other), reading the server only for the sessions in scope, narrowing `recentErrors` to the scope's recorded sessions plus the errors naming no session, and reading a transcript for `lastText` only in a session scope; drop `recentLoopTicks` and `skillActivations` from its payload and `updated` and `turns` from its rows; list each loop's `recentTicks` in `rp_loop_list`; rename `rp_spawn`'s `run` to `pipeline_slug`, validated as one segment, a valid git ref, without `_`, and the ledger row's `run` to `pipelineSlug`
