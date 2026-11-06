---
{
  "inputs": [
    "0-intent/intent.md@278f3b3641b5"
  ],
  "reviewed": "0aae00201b718350734050613a8def81f702e8f1"
}
---
status: approved
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

## implementer — 8e149515

### Preserve Git's identity for already-committed CRLF files: changed in 224b16ef

Reproduced as you describe: in a clone made with `core.autocrlf=true` of a pipeline whose intent was committed with CRLF, `git status` is empty, yet `rp check` reported the spec stale on the intent while `--ref HEAD` reported it fresh (`3-implementation/notes/crlf-committed-before.txt`, from `notes/crlf-committed.sh`). `git hash-object` reads no index, so it converts a blob that `git add` keeps.

A working-tree identity is now the blob id `git update-index --add --info-only` records on a copy of the worktree's index, with the copy's timestamps kept. That is the id `git add` would store, including when an index entry already holds CRLF. It writes no object and leaves the index untouched: `rp check` left the index's hash and mtime and the object count unchanged. The same clone now reports the spec fresh from the working tree and at `--ref HEAD` (`notes/crlf-committed.txt`). For a modified intent whose index entry holds CRLF, the id matches what `git add` stores on a second copy of the index.

`reading.test.mjs` "judges freshness alike …" gains a row, "core.autocrlf true, set once the intent was committed with CRLF", beside the rows for LF blobs checked out as CRLF. The new row fails under the previous hashing (`actual: 'stale'`) and passes now. `scripts/README.md` § Identity states the rule.

### Reject malformed certification before stamping over it: changed in 552ff6ba

Reproduced: with `certification/1-spec/spec.md.json` replaced by `{`, `rp check` exited 1 naming the invalid JSON, while `rp stamp <spec> --at HEAD` exited 0 and rewrote the file. `stamp` now parses an existing certification with the same rule `check` applies before it writes, and stops with `rp: stamp: <path>: <reason>`, writing nothing. `stamp.test.mjs` "a certification it would replace that holds invalid JSON / a malformed pin, leaving its bytes unchanged" fails before the change (exit 0) and passes after. An absent certification is still created, as every landing test shows. `scripts/README.md` § `stamp` lists the refusal.

`npm test` passes.

## reviewer-astra — f7f7cb36c418491e242145b65380458804b124d2

Both findings are resolved. I would merge this change.

- **CRLF identity:** Re-ran the clean-clone reproduction with `core.autocrlf=true`. Working-tree and committed freshness now agree, with ordinary and split indexes; the real index's bytes and mtime stay unchanged. An uncommitted intent edit correctly makes the spec stale.
- **Malformed certification:** Invalid JSON and a malformed pin now stop `stamp` and preserve the existing bytes. The shared certification parser supplies the validation.
- **Other changes:** Reviewed the approval-heading check, its tests, and the documentation changes. No new finding.
- **tests:** `npm test` passed: 499 tests, 0 failures.
- **documentation:** Checked against `AGENTS.md` and `docs/glossary.md`. The updated script grammar, landing instructions, model, flowchart, and changeset agree with the implementation and use the canonical vocabulary.
