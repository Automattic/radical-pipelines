# State

> v3 skeleton stub — content pending; the spec the script serves. Design record: [#273](https://github.com/Automattic/radical-pipelines/issues/273).

Will contain:

- The working-tree invariant: the tree records the past; policy is supplied in the present; nothing records the future. Git history may optimize, never be required.
- Frontmatter keys (the machine's lane): origins, derivation pins (one blob SHA per consumed file), verdicts (`approved` / `rejected` / `unsatisfiable: <artifact>@<blob>#<clause>`), `adjudicates`, lane and iteration counters.
- Freshness computation: staleness as pin mismatch; per-file pins; two-tier record (tree = artifact facts; branch commits = execution facts via task trailers).
- Branch grammar (slug-rooted) and the naming convention (labels, not semantics).
- Discovery scan semantics: tree-OID prefilter batched against main's historical set; origin-graph walk; O(live pipelines).
