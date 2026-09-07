# `rp`

`rp` reports and stamps body-identity state for Radical Pipelines. Run it with Node from any path inside the repository. The [state specification](../reference/run/state.md) defines everything it computes.

## `stamp`

```text
node rp.mjs stamp <file> [--pin <path>]... [--reviewed <path>]... [--set lane=<fingerprint>] [--mirror]
```

- `--pin` records the inputs an artifact consumed; the set replaces the previous one.
- `--reviewed` records what a review or task report names; immutable after the initial stamp. A task report names exactly its task and dependencies.
- `--set` accepts only `lane=<fingerprint>`.
- `--mirror` rewrites every mirror from the body's declarations — `Verdict:`, `Brief:`, `Target:`, `Origin:`, `Outcome:` (`completed` | `failed` | `blocked`), `Prior finding:`, `Depends on:`, a report's `## Commits` — replacing the previous set. It may repair an already-pinned review or report without `--reviewed`; a task report's dependency schema is checked only on its initial stamp. Every commit `## Commits` names must exist and resolve unambiguously; it is stored as its full hash. Frontmatter lists are read in block or inline form (`key: [a, b]`); malformed syntax or field types are invalid. The stamp writes block form. Every fixed line is accepted whole in its grammar or rejected as `INVALID <field>`; `Verdict`, `Brief`, `Target`, and `Outcome` occur once.
- `head`, the commit the stamp observed, is recorded only when the stamp carries `--pin` or `--reviewed`.
- Identity is the first 12 hexadecimal characters of the body's git blob hash, byte for byte. Stamping preserves it. Symlinked paths are refused.

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
- `--lanes` declares, per artifact, the named review lanes and, after `|`, production lanes with their `after` dependencies: `"spec=security@<fingerprint>|event-driven@<fingerprint>,contrarian@<fingerprint><event-driven;build=fresh@<fingerprint>"`. Components and delimiters are exact; artifacts and lane ids appear once. Every named lane is `<id>@<fingerprint>`, matching the stamped `lane`. A lane folder or review the declaration lacks is reported; `tasks` is reserved.
- `--target-phase <n>` is an integer from 1 (spec) to 4 (document); default 4. The report ends with `complete through phase <m>` against it.
- `--ref` reads the pipeline from a commit instead of the working tree; the commit range is the same.
- `--json` emits machine-readable state.
- Each command accepts only its documented options and one positional argument. Any other value, missing value, duplicate single option, or unknown option is an error.

```sh
node skills/radical-pipelines/scripts/rp.mjs check .pipelines/demo --base main --lanes "spec=security@b01a76f7504a" --target-phase 3
```

The report lists contradictions first — malformed files, mirror drift, undeclared lanes, symlinks — then triggers, claims, and every phase up to the target: production lanes, artifacts, tasks with their latest reports, phase reviews, unclaimed commits — and names the frontier.
