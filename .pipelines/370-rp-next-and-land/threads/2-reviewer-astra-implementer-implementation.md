status: approved
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

## implementer — d632eda2

### 1. Validate the resulting pipeline before moving its branch: changed in 7d936ff2

`rp land` now reads the pipeline as `rp check` will read it after the landing, from the landing's last commit, before it fast-forwards the pipeline branch. Whatever stops `rp check` there now stops landing with nothing moved. The new test "on a landing after which rp check could not read the pipeline" (`scripts/test/rp/land.test.mjs`) is your reproduction: a lane commits a candidate and a `run-config.md` whose `base` is `missing-base`. `rp land` exits 1 with `base does not resolve to a commit: missing-base`, and the refs, the pipeline worktree, and every certification stay as they were. The test failed on that assertion before the change. `scripts/README.md` § `land` step 3 states it.

### 2. Remove an old certification when a changed approval cannot be certified: changed in 9b66f80f

An approval among the files a turn brings that cannot be certified now lands uncertified whatever its path held: its named commit does not resolve, or the pipeline commit's code is not that commit's. A certification already at its path is removed in the landing's certification commit, `Remove the certification of review lane <lane> approval`.

The new test "uncertified when its reviewer's last heading names no commit, removing the certification its path held" (`scripts/test/rp/review-lanes.test.mjs`) follows your reproduction:

1. A certified approval is made `pending`.
2. The repair step wakes the reviewer.
3. The reviewer repairs the thread to `approved` with its heading naming `deadbeef`.
4. The landing reports phases 1 to 3 but not 4, leaves no certification, and `rp check` reports the lane not approved.

Before the change, the old certification survived and the landing reported phase 4. The absent-certification case stays covered by "uncertified when the pipeline commit holding it has code other than the change's, and the lane is not approved".

### 3. Make every planned landing executable when continuing a pipeline: owned by design-doc-producer

The behavior you reproduced is design-doc-decision-6's stated trade-off: "A role the loop woke before this change has no recorded turn, and `rp land` stops for it." Whether a planned landing must have a recoverable turn is the design doc's call. I carried your finding there as finding 3 of `threads/3-implementer-design-doc-producer-design-doc.md`. With it goes the evidence that a run which stops removes its lane branches at close-out (`close-out.md` step 2), so the case needs the skill updated mid-run while a lane holds unlanded commits. The proposal there to wake a lane that holds unlanded commits in its worktree would also record such a lane's turn.

## reviewer-astra — 2541fc6f4b2cec7ec8b7aa2f58ac94b911e9c4f9

Approved.

1. **Resolved.** Reran the missing-base reproduction: landing fails with the pipeline HEAD unchanged and no candidate certification written. The resulting-state inspection now precedes the fast-forward.
2. **Resolved.** Reran the approval-repair reproduction: the old certification is removed, phase 4 is not reported complete, and the lane is not approved.
3. **Withdrawn as a compatibility requirement.** I checked `close-out.md` step 2: normal close-out lands and pushes the commits and removes the lane branches. My reproduction instead carries an unlanded turn assigned by the old commands across an upgrade mid-run. That does not establish a defect in continuation after the documented close-out, and the intent does not require compatibility for an in-flight turn across that command replacement. No owner ruling is needed for my finding.

Reviewed the remaining changes, including step-record validation and the updated recovery instructions; no additional blocking findings.

- **tests — passed:** `npm test`: 578 passed, 0 failed.
- **documentation — passed:** checked `AGENTS.md`, `docs/glossary.md`, and the documentation changes. The corrected landing behavior matches its documented contract; the step-record terminology is aligned.
