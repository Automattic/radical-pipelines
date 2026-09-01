# rp script

> v3 skeleton stub — implementation pending. Design record: [#273](https://github.com/Automattic/radical-pipelines/issues/273).

Zero-dependency script shipped with the skill, versioned with it, invoked by path, orchestrator-only. Surface:

- `status` — the discovery scan: pipelines, origin graph, per-pipeline state for an issue.
- `check` — one pipeline's freshness walk: fresh/stale/missing per artifact, execution facts from trailers.
- `stamp` — resolve inputs to blob SHAs, write frontmatter; the only writer; includes stamp propagation.

The file format it computes over is specified in prose in `../reference/run/state.md` — the spec rules, the script serves: everything it does can be done with bare git.
