status: open
opener: reviewer-astra
owner: implementer
artifact: implementation

## reviewer-astra — bde66a6b9753e19d6960b9bc61f4970cd2efd30a

Request changes. I reproduced three gaps:

### 1. [P2] Validate the resulting pipeline before moving its branch

`skills/radical-pipelines/scripts/rp.mjs:1682–1687`

The full `inspect()` runs after the fast-forward. Preflight `landingOf()` only reads the state, so checks performed by `inspect()` can reject a landing after its merge and certifications have already landed.

Reproduction: apply a spec-lane step, then commit a candidate and a syntactically valid `run-config.md` whose `base` is `missing-base` in that lane. `rp land --role spec-producer-a` exits 1 with `base does not resolve to a commit: missing-base`, but the pipeline HEAD has advanced and the candidate's certification exists. Retrying fails immediately on the newly landed configuration.

The general rule is that validation of the resulting pipeline precedes moving the branch. This violates the documented “a stop lands nothing” contract and makes the loop suppress `after-merging-lanes` even though the merge happened. Cover failures of the full resulting-state validation, not just malformed file syntax.

### 2. [P2] Remove an old certification when a changed approval cannot be certified

`skills/radical-pipelines/scripts/rp.mjs:1675–1681`

Skipping `subjects.push()` does not make an approval uncertified when its path already has a certification. The previous certification survives and can still approve the lane.

Reproduction: start with a certified approval; change its status to invalid `pending`; apply the repair step; have the reviewer repair it to `approved` with its heading naming nonexistent commit `deadbeef`; land that turn. Landing succeeds, retains the old certification byte-for-byte, prints `hook phase-completed 4`, and `rp check --json` reports `"approved": true`.

The general rule is that certification must describe the approval being landed. When that approval cannot be certified, its resulting state must be uncertified regardless of whether a previous certification exists. Test both existing and absent certifications against the certification eligibility conditions.

### 3. [P2] Make every planned landing executable when continuing a pipeline

`skills/radical-pipelines/scripts/rp.mjs:1523–1532, 1660`

`next` always schedules a valid unlanded lane to land, but `land` requires a turn in the new private step record. Applying such a plan deliberately does nothing, so neither command can repair a missing record.

I reproduced this using the base revision's actual `rp assign`: assign a format-8 spec lane, commit its candidate, then migrate the conventions to version 9. Both `next` and `next --apply` print `land spec-producer-a`; `land` fails with `no turn of spec-producer-a is recorded: rp next --apply records each role it wakes`. Repeating the suggested command gives the same plan and failure. The old assignment, including its turn commit, still exists.

The general rule is that a planned landing needs a recoverable turn commit. Provide a continuation path that preserves the original turn and unlanded commits. The conventions changelog explicitly promises that format-8 pipelines continue; currently an ordinary in-flight lane cannot.

### Required checks

- **tests — passed:** `npm test`: 576 passed, 0 failed. The additional isolated reproductions above confirmed gaps outside that suite.
- **documentation — not fully satisfied:** reviewed `AGENTS.md` and `docs/glossary.md`. The change includes a changeset and updates README/docs using the canonical vocabulary, but the landing and continuation behavior contradicts the documented contracts above. No separate vocabulary or scope objection.
