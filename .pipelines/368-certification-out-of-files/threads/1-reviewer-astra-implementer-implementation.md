status: open
opener: reviewer-astra
owner: implementer
artifact: implementation

## reviewer-astra — ce0eb7575924f3b196fa4e17aed0c0ff2acb1fee

### [P2] Preserve Git's identity for already-committed CRLF files

`skills/radical-pipelines/scripts/rp.mjs:282–286`

`git hash-object --stdin-paths` does not always produce the blob that `git add` would store. With `core.autocrlf=true`, Git preserves an existing CRLF blob rather than automatically renormalizing it; this hashing call normalizes it. Consequently a clean clone can still disagree with `check --ref HEAD`, contrary to the Goal and the documented Identity rule.

Reproduced in a temporary repository:

1. With `core.autocrlf=false`, commit a format-7 pipeline with CRLF `0-intent/intent.md` and a spec. Stamp the spec at `HEAD` and commit its certification.
2. Clone with `git clone -c core.autocrlf=true <source> <clone>`.
3. `git status --porcelain` is empty. `rp check` reports `respond 1-spec/spec.md`, stale on the intent; `rp check --ref HEAD` reports `complete`, with the spec fresh.
4. The committed intent's blob is `a06354258b843a71984bbf888782f9ad5348bccf`; `hash-object` returns `228ab31fdee6bedc7bb52b8d702170fbfbd31be7`. Running `git add` on the intent retains the former blob and leaves status empty.

Make working-tree identity follow Git's index-aware conversion semantics, without changing the real index. Extend the line-ending tests to cover already-committed CRLF blobs as well as LF blobs checked out as CRLF.

### [P2] Reject malformed certification before stamping over it

`skills/radical-pipelines/scripts/rp.mjs:827–831`

The existing certification is read for byte comparison but never parsed. If it is malformed, `stamp` silently replaces it and succeeds. This bypasses intent-constraint-2: a malformed certification stops the command. It also erases the evidence of the failure instead of surfacing it.

Reproduced by replacing a stamped spec's `certification/1-spec/spec.md.json` with `{`. `rp check` exits 1 and names the invalid JSON, but `rp stamp <spec> --at HEAD` exits 0 and overwrites it with valid certification.

Apply the existing certification-validation rule whenever certification is read, including this read before replacement. Test that stamping malformed JSON and malformed certification fields fails and leaves the bytes unchanged; an absent certification should still be created normally.

### Required checks

- **tests:** `npm test` passed: 494 tests, 0 failures. Both findings were reproduced separately in temporary repositories.
- **documentation:** Reviewed against `AGENTS.md` and `docs/glossary.md`. README, model, flowcharts, profiles, skill instructions, script grammar, and the breaking-change changeset are updated consistently in terminology. The Identity guarantee remains unmet as described above. No additional documentation or scope finding.
