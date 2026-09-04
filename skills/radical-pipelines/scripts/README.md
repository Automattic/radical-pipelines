# `rp`

`rp` reports and stamps body-identity state for Radical Pipelines. Run it with Node from any path inside the repository.

## `stamp`

```text
node rp.mjs stamp <file> [--pin <path>]... [--reviewed <path>]... [--set <key=value>]... [--mirror] [--force]
```

- `--pin` records an artifact input.
- `--reviewed` records a review input.
- `--set` writes a scalar frontmatter value.
- `--mirror` copies supported body declarations into frontmatter.
- `--force` replaces immutable review pins.

```sh
node skills/radical-pipelines/scripts/rp.mjs stamp .pipelines/demo/1-spec/spec.md --pin .pipelines/demo/0-intent/intent.md
```

## `check`

```text
node rp.mjs check <pipeline-folder> --base <ref> [--lanes <declaration>] [--json]
```

- `--base` names the artifact base branch: the pipeline's own commits — those a task report must claim — follow its merge-base with the inspected ref. The branch the intent `starts-from` prevails when it declares one; otherwise `--base` is required. A base that does not resolve is an error.
- `--lanes` declares review lanes.
- `--target-phase <n>` is an integer from 1 (spec) to 4 (document); default 4. `--audit` and `--valve` are positive integers. Any other value, a missing value, or an unknown option is an error.
- `--json` emits machine-readable state.

```sh
node skills/radical-pipelines/scripts/rp.mjs check .pipelines/demo --base main --lanes "spec=r1,r2"
```

See the [state specification](../reference/run/state.md).

Production lanes (`<phase>/<lane>/`) are reported as sub-pipelines before their root artifact; their reviews never count toward the root, and they are closed once the root exists.

`check` also takes `--lanes` per artifact (`spec=r1,r2;build-plan=r1`) and `--target-phase <n>`, and prints `complete through phase <m>` against it. Every stamp records `head`, the commit it observed.
