# rp script

Zero-dependency Node script (`rp.mjs`) shipped with the skill, versioned with it, invoked by path, orchestrator-only. The file format it computes over is specified in prose in `../reference/run/state.md` — the spec rules, the script serves: everything it does can be done with bare git.

Implemented:

- `node rp.mjs stamp <file> [--pin <path>]… [--reviewed <path>]… [--set key=value]…` — the only writer: derivation pins, review pins, scalar frontmatter keys (verdict, lane, iteration, target, adjudicates, origins).
- `node rp.mjs check <pipeline-folder>` — descriptive: per-file pin freshness, latest review per lane, pending `unsatisfiable` claims.

Pending: `status` — the discovery scan (pipelines, origin graph, per-issue state); until then, the manual procedure in `state.md` applies. Design record: [#273](https://github.com/Automattic/radical-pipelines/issues/273).
