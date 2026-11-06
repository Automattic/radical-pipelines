status: in progress

# Implementation notes

## Done

- `rp.mjs` and its tests, `skills/radical-pipelines/scripts/README.md` (ec521084): certification in `certification/<path>.json`, identity as the Git blob id (working tree through `git hash-object --stdin-paths`), the YAML-subset frontmatter reader, thread/notes/later-input/intent values from frontmatter, approvals certified at the change with `HEAD` as `reviewed`, an absent approved commit as `unapproved`, conflicts inside the pipelines folder root ignored, format 7, `--pin` removed.
- Earlier-format discovery by `origin:` body lines (7269247b, spec-requirement-17).
- Lane merge-back proof (06f251ea, spec-requirement-12).

## Remaining

- Conventions version 7 and changelog entry (spec-requirement-18).
- The skill's references, profiles, templates, `README.md`, `docs/`, and a changeset (spec-requirement-20).

## Decisions

- `stamp` reads `run-config.md` from the working tree, so an approval stamped `--at` the change (which holds no `run-config.md`) works; the format check moves with it.
- Frontmatter reasons have the form `frontmatter <key>: <construct>` or `frontmatter line <n> …`; thread keys missing are `frontmatter has no <key>`.
- `notes.md` without `status` is missing, not `INVALID`, as a first line other than `status: done` was before.
- `ORIGINS_IN_FRONTMATTER = 7` fixes the format from which discovery reads origins from frontmatter, independent of `FORMAT`.

## Failed approaches

## Assumptions

- design-doc-decision-1 (`rp stamp` changes no byte of a landed file): observed: `stamp.test.mjs` "landing … changes no byte of the files its turn committed, and writes only its certification", for an artifact, a candidate, and an approval.
- design-doc-decision-2 (check, check after commit, and check --ref HEAD agree under eol=crlf and autocrlf): observed: `reading.test.mjs` "judges freshness alike …"; with `--no-filters` hashing both cases fail (`actual: 'stale'`).
- design-doc-decision-3 (an approval landed after a later input is stale on it): observed: `review.test.mjs` "leaves an approval stale on a later input that reached the pipeline branch after its change was built".
- design-doc-decision-4 (both clones behave as spec-acceptance-criterion-15 and -16): observed: `continuation.test.mjs`; the conflict rule: `approval.test.mjs` "stays fresh when merging the approved commit with the base conflicts only inside the pipelines folder root" fails under "any conflict changes the code".
- design-doc-decision-5 (the subset is read and rejected as stated): observed: `frontier.test.mjs` subset rows; and the reader agrees with yaml 2.9.1 on 75 values (`3-implementation/notes/yaml-agreement.txt`, from `notes/yaml-agreement.mjs`).
- design-doc-decision-6 (each malformed certification stops check with no frontier): observed: `certification.test.mjs`.
- design-doc-decision-7 (format-6 and format-7 pipelines both listed with their origins): observed: `pipelines.test.mjs` "lists the pipelines of an issue in format 6 and format 7 …".
