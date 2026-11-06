status: done

# Implementation notes

## Done

- `rp.mjs`, its tests, and `skills/radical-pipelines/scripts/README.md` (ec521084): certification in `certification/<path>.json`, written by `rp stamp` alone; identity as the Git blob id (working tree through `git hash-object --stdin-paths`); the YAML-subset frontmatter reader; thread, `notes.md`, later-input, and intent values from frontmatter; approvals certified `--at` the change with `HEAD` as `reviewed`; an absent approved commit as `unapproved`; conflicts inside the pipelines folder root ignored; a malformed certification stops the command; format 7; `--pin` removed.
- Earlier-format discovery by `origin:` body lines (7269247b, spec-requirement-17).
- Lane merge-back proof (06f251ea, spec-requirement-12).
- Conventions and pipeline format 7, changelog entry 7 (1fcf1d52, spec-requirement-18).
- The skill's references, profiles, templates, `README.md`, `docs/`, and the changeset (abde1991, a3e11af3, spec-requirement-20).
- End-to-end walkthrough of the CLI as the orchestrator drives it: line-ending agreement, landing at the change with a later input mid-review, squash continuation in a fresh clone and in the original one (`3-implementation/notes/e2e.txt`, from `notes/e2e.sh`).
- `npm test`: 494 of 494 pass.

## Remaining

## Decisions

- `stamp` reads `run-config.md` from the working tree, so an approval stamped `--at` the change (which holds no `run-config.md`) works; the format check moves with it.
- Frontmatter reasons have the form `frontmatter <key>: <construct>` or `frontmatter line <n> …`; a missing required key is `frontmatter has no <key>`.
- `notes.md` without `status` is missing, not `INVALID`, as a first line other than `status: done` was before.
- `ORIGINS_IN_FRONTMATTER = 7` fixes the format from which discovery reads origins from frontmatter, independent of `FORMAT`.
- Content malformations of a certification are tested from the working tree, with one row at `--ref`: both read through the same parser. Structural ones run both ways, as the readers differ.
- This repository's `.rp.md` stays at conventions 6: per the design doc, it reaches 7 through the skill's migration.
- This pipeline is format 6: this branch's `rp` stops on it as an earlier format (design doc § Risks).

## Failed approaches

## Assumptions

- design-doc-decision-1 (`rp stamp` changes no byte of a landed file): observed: `stamp.test.mjs` "landing … changes no byte of the files its turn committed, and writes only its certification", for an artifact, a candidate, and an approval; the approval's blob is unchanged by landing in `notes/e2e.txt` § 2.
- design-doc-decision-2 (check, check after commit, and check --ref HEAD agree under eol=crlf and autocrlf): observed: `reading.test.mjs` "judges freshness alike …" and `notes/e2e.txt` § 1; with `--no-filters` hashing both test cases fail (`actual: 'stale'`).
- design-doc-decision-3 (an approval landed after a later input is stale on it): observed: `review.test.mjs` "leaves an approval stale on a later input that reached the pipeline branch after its change was built"; `notes/e2e.txt` § 2.
- design-doc-decision-4 (both clones behave as spec-acceptance-criterion-15 and -16 state): observed: `continuation.test.mjs`, `notes/e2e.txt` § 3; the conflict rule: `approval.test.mjs` "stays fresh when merging the approved commit with the base conflicts only inside the pipelines folder root" fails under "any conflict changes the code".
- design-doc-decision-5 (the subset is read and rejected as stated): observed: `frontier.test.mjs` subset rows; the reader agrees with yaml 2.9.1 on 75 values (`notes/yaml-agreement.txt`, from `notes/yaml-agreement.mjs`).
- design-doc-decision-6 (each malformed certification stops check with no frontier): observed: `certification.test.mjs`.
- design-doc-decision-7 (format-6 and format-7 pipelines both listed with their origins): observed: `pipelines.test.mjs` "lists the pipelines of an issue in format 6 and format 7 …".
