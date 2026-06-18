# Code phase summary — review-1-reconcile-trunk-merge

Covers the whole run, base-ref `b7a92d3927870f593fbdb8ccc1cea5894ea01512` → HEAD `4d23f42`.

## What

Pluralized the 10 remaining singular documentation-phase concept tokens (`doc` → `docs`) in
the two trunk-introduced skill reference files, and nothing else:

- `skills/radical-pipelines/reference/guardrails.md` (5 tokens): the agent roster
  `doc-writer, doc-reviewer`; the phrase `doc-run gates by the doc plan` (the compound
  `doc-run` and the spaced `doc plan`); and the artifact `doc-plan.md`.
- `skills/radical-pipelines/reference/conventions/passing.md` (5 tokens): the agent roster
  `` `doc-writer` ``/`` `doc-reviewer` ``; the planning agents `` `doc-plan-writer` `` and
  `` `doc-plan-reviewer` ``; and the backtick-bounded `` `doc` `` in "the scoped gates of
  `doc` agents", now parallel to the `` `code` `` line above it.

The diff base-ref→HEAD (excluding `.pipelines/`) touches exactly these two files: 5 changed
lines total. No file renames, no rewording, no `code-*` edits.

## Why

The base run unified the documentation-phase concept on the plural `docs` across the skill and
agents and opened a PR. The owner then merged trunk (104 commits), which introduced these two
new reference files — files the base run never saw — still spelling the concept in the
singular. They were the only surviving stragglers after the merge; this review brings them in
line so the concept is plural everywhere it is the leading noun.

## How

A single anchor-relaxed `perl` substitution that mirrors the acceptance oracle, applied over
exactly the two named files:

```sh
PAT='(?<![Dd]esign[- ])\b([Dd]oc)(?![Ss])(?!ument)\b'
for f in skills/radical-pipelines/reference/guardrails.md \
         skills/radical-pipelines/reference/conventions/passing.md; do
  perl -i -pe "s/$PAT/\${1}s/g" "$f"
done
```

The pattern anchors on the leading concept noun; its lookbehind/lookaheads protect every
non-concept form (`design-doc`, `document(ation)`, already-plural `docs`), so all compound and
phrase forms are covered without enumerating them.

## Key decisions

- **Trailing anchor dropped in lockstep.** The base run's pattern ended with a trailing
  `[- ]`/`(?=[- ])` anchor that was structurally blind to the backtick-bounded `` `doc` ``.
  Removing it from both the oracle and the substitution together keeps them mirror images and
  fixes all 10 tokens by construction — adding exactly one scope-wide match (the backtick) and
  zero elsewhere.
- **No manual one-off edit.** Hand-patching the lone backtick token while leaving both patterns
  anchored was rejected: it would void the "oracle ≡ substitution-minus-capture" mirror and
  re-introduce per-form enumeration fragility.

## Known limitations

None for this scope. `pr-description.md` (a frozen #122 PR body), `.pipelines/`, and
`CHANGELOG.md` are intentionally out of scope and excluded from the oracle; their two/other
singular forms are deliberately left as frozen historical records.
