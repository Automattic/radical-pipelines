# `rp`

`rp` reports and stamps body-identity state for Radical Pipelines. The file or folder argument selects its repository and worktree, independent of the process directory. The [state specification](../reference/run/state.md) defines everything it computes.

## `stamp`

```text
node rp.mjs stamp <file> [--pin <path>]... [--reviewed <path>]... [--set lane=<fingerprint>] [--mirror]
```

- `--pin` records the inputs an artifact consumed; the set replaces the previous one. An artifact cannot pin its sibling record.
- `--reviewed` validates and fixes the package a review or task report names. An unfiltered review must equal the artifact's complete package. `check` verifies it again from the tree. Later stamps preserve it. A task report's package is exactly its task and dependencies; its attempt follows the last report with a valid landed package and metadata.
- `--set` accepts only `lane=<fingerprint>`.
- `--mirror` rewrites every mirror from the body's declarations outside Markdown code fences — `Verdict:`, `Brief:`, `Target:`, `Origin:`, `Outcome:` (`completed` | `failed` | `blocked`), `Prior finding:`, `Depends on:`, a report's `## Commits` — replacing the previous set. It may repair an already-pinned review or report without consuming its package again. Every commit `## Commits` names must exist and resolve unambiguously; it is stored as its full hash. Frontmatter lists are read in block or inline form (`key: [a, b]`); scalars may be plain, JSON double-quoted, or YAML single-quoted. Malformed syntax or field types are invalid. The stamp writes block lists and quotes scalars when required. Every fixed line is accepted whole in its grammar or rejected as `INVALID <field>`; `Verdict`, `Brief`, `Target`, and `Outcome` occur once.
- A trigger's target is validated when first stamped. `check` then computes only its resolution.
- `head`, the commit the stamp observed, is recorded only when the stamp carries `--pin` or `--reviewed`.
- Identity is the first 12 hexadecimal characters of the body's git blob hash, byte for byte, for every pinnable file. Stamping preserves it. Paths with a symlinked component are refused.

```sh
node skills/radical-pipelines/scripts/rp.mjs stamp .pipelines/demo/1-spec/spec.md --pin .pipelines/demo/0-intent/intent.md
```

## `fingerprint`

```text
node rp.mjs fingerprint <lane id> [--brief <text>] [--materials <a,b>] [--after <lane+lane>]
```

The identity of a lane's whole declaration, for `--lanes`. A named lane's artifact and reviews carry it as `lane` (`--set lane=<fingerprint>`).

## `check`

```text
node rp.mjs check <pipeline-folder> --base <ref> [--lanes <declaration>] [--target-phase <n>] [--ref <ref>] [--json]
```

- `--base` names the artifact base branch: the pipeline's own commits — those a task report must claim — follow its merge-base with the inspected ref. The branch the intent `starts-from` prevails when it declares one; otherwise `--base` is required. A base that does not resolve is an error.
- `--lanes` declares, per artifact, the named review lanes and, after `|`, production lanes with their `after` dependencies: `"spec=security@<fingerprint>[materials=1-spec/spec.md+0-intent/intent.md]|event-driven@<fingerprint>,contrarian@<fingerprint><event-driven;build=fresh@<fingerprint>"`. Every named lane is `<id>@<fingerprint>`, matching the stamped `lane`; optional `materials=` selects package members a filtered review lane receives and reviews. Other materials are always supplied. Without it, the lane reviews the full package. Components, paths, and delimiters are exact; artifacts, lane ids, material paths, and expanded auxiliary branch names are unique. A lane folder or review the declaration lacks is reported; `tasks` is reserved.
- `--target-phase <n>` is an integer from 1 (spec) to 4 (document); default 4. The report ends with `complete through phase <m>` against it.
- `--ref` reads the pipeline's exact paths and identities from a commit instead of the working tree; the commit range is the same.
- `--json` emits machine-readable state.
- Each command accepts only its documented options and one positional argument. Any other value, missing value, duplicate single option, or unknown option is an error.

```sh
node skills/radical-pipelines/scripts/rp.mjs check .pipelines/demo --base main --lanes "spec=security@b01a76f7504a" --target-phase 3
```

The report lists contradictions first — malformed files, mirror drift, undeclared lanes, symlinks — and stops before facts whose representation is invalid. Otherwise it lists triggers, claims, and every phase up to the target: production lanes, artifacts, tasks with their latest reports, phase reviews, unclaimed commits — and names the frontier. Live waves use their artifact package; closed lanes use the package recorded by the root.
