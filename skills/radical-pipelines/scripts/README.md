# `rp`

`rp` reports and stamps body-identity state for Radical Pipelines. Run it with Node from any path inside the repository. The [state specification](../reference/run/state.md) defines everything it computes.

## `stamp`

```text
node rp.mjs stamp <file> [--pin <path>]... [--reviewed <path>]... [--set <key=value>]... [--mirror]
```

- `--pin` records the inputs an artifact consumed; the set replaces the previous one.
- `--reviewed` records what a review or task report names; immutable — a changed review is a new file. A task report must name exactly its task and the tasks it depends on.
- `--set` writes a landing fact (`audited-<series>`, `episode-start-<series>`, `lane`). Pins, mirrors, `head`, and `target-identity` are never written by `--set`.
- `--mirror` rewrites every mirror from the body's declarations — `Verdict:`, `Brief:`, `Target:`, `Origin:`, `Outcome:` (`completed` | `failed` | `blocked`), `Prior finding:`, `Depends on:`, a report's `## Commits` — replacing the previous set: a declaration the body lost leaves the frontmatter. It may run again on a stamped file. Every commit `## Commits` names must exist and resolve unambiguously; it is stored as its full hash. Frontmatter lists are read in block form and in inline form (`key: [a, b]`); the stamp writes block form.
- `head`, the commit the stamp observed, is recorded only when the stamp carries `--pin` or `--reviewed`.
- Identity is the hash of the body, byte for byte: stamping never changes it. Symlinked paths are refused.

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
node rp.mjs check <pipeline-folder> --base <ref> [--lanes <declaration>] [--target-phase <n>] [--ref <ref>] [--audit <n>] [--valve <n>] [--json]
```

- `--base` names the artifact base branch: the pipeline's own commits — those a task report must claim — follow its merge-base with the inspected ref. The branch the intent `starts-from` prevails when it declares one; otherwise `--base` is required. A base that does not resolve is an error.
- `--lanes` declares, per artifact, the named review lanes and, after `|`, the production lanes with their `after` dependencies: `"spec=security@<fingerprint>|event-driven@<fingerprint>,contrarian@<fingerprint><event-driven;build=fresh"`. A fingerprint, when given, must match the `lane` its reviews or lane artifact were stamped with. A lane folder or review the declaration lacks is reported, never treated as a lane; `tasks` is reserved.
- `--target-phase <n>` is an integer from 1 (spec) to 4 (document); default 4. The report ends with `complete through phase <m>` against it.
- `--ref` reads the pipeline from a commit instead of the working tree; the commit range is the same.
- `--audit` and `--valve` are positive integers overriding the thresholds (defaults 3 and 6).
- `--json` emits machine-readable state.
- Any other value, a missing value, or an unknown option is an error.

```sh
node skills/radical-pipelines/scripts/rp.mjs check .pipelines/demo --base main --lanes "spec=security@b01a76f7504a" --target-phase 3
```

The report lists contradictions first — a file whose mirrors differ from its body, an undeclared lane, a symlink — then triggers, claims, and every phase up to the target: production lanes (sub-pipelines closed once the root pins each lane's artifact, record, and approving reviews), artifacts, tasks with their latest reports, phase reviews, audit and valve gates, unclaimed commits — and names the frontier.
