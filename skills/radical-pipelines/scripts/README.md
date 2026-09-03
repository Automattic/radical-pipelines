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
node rp.mjs check <pipeline-folder> [--lanes <r1,r2>] [--json]
```

- `--lanes` declares review lanes.
- `--json` emits machine-readable state.

```sh
node skills/radical-pipelines/scripts/rp.mjs check .pipelines/demo --lanes r1,r2
```

See the [state specification](../reference/run/state.md).

Production lanes (`<phase>/lane-<k>/`) are reported as sub-pipelines before their root artifact; their reviews never count toward the root, and they are closed once the root exists.

`check` also takes `--lanes` per artifact (`spec=r1,r2;build-plan=r1`) and `--target-phase <n>`, and prints `complete through phase <m>` against it. Every stamp records `head`, the commit it observed.
