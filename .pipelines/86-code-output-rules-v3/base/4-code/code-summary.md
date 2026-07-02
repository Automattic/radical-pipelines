# Code Summary

## What

A single, always-on rule was added to five agent profiles under `agents/`: host-project output — everything an agent writes outside the artifacts folder — must not point back at the specific run that produced it. The three producers (`code-writer-tdd`, `code-writer-e2e`, `docs-writer`) each gained one `## Guidelines` disposition bullet; the two reviewers (`code-reviewer`, `docs-reviewer`) each gained one detection item in their `### 2. Review the changes` checklist. `code-writer-tdd` additionally had one line removed — the pre-existing narrower "Comments must be self-contained — never reference the spec, the plan, or any other artifact." — which the new broad disposition supersedes. The change is entirely prose in five Markdown files: no source code, no tests, no scanner, no new files.

## Why

Previously the run owner had to restate "don't reference the run" every time, and pointers still leaked into host-project output — a comment "// per R5", an identifier `task3Helper`, a doc line "as the design doc specifies", or a commit subject "Add parser per R9". Promoting the rule into the profiles makes it a default that applies to every run automatically. Output should read as if written by hand, carrying no trace of the specific run that produced it, so that host projects receive clean deliverables.

## How

The rule is realized as duplicated prose, not a shared referenced file, because the project forbids agent profiles from referencing shared skill or config files. It is stated in two role-appropriate voices: producers carry it as a writing-voice disposition ("everything you write … reads as if written by hand and points at nothing behind this change"), reviewers as a finding-voice detection predicate ("does anything the batch writes … point at this run? … a real pointer is a must-fix that blocks approval"). Detection is referent-based human judgment applied by the reviewer per batch — the reviewer items explicitly say "Judge by the referent, not a token scan" — never a token, keyword, or path scan. Scope is defined by exclusion: everything written outside the artifacts folder is governed; the artifacts folder is the one place references to the run are allowed. Enforcement rides entirely on the existing per-phase review gate and the reviewers' standing must-fix / reject-liberally posture; no new gate, script, or tool was introduced.

The discriminator — shared across all five bullets — names three pointer forms: (a) a number tying output to the agent's task or to a requirement/review (`task3Helper`, "per R9"); (b) a named artifact behind the change (the spec, plan, design doc, or review) cited as its authority ("as the design doc specifies"); (c) another agent credited as author. The not-a-violation cases are named too: the domain's own vocabulary used as subject matter, and illustrative or example artifact references. A commit message's descriptive content is in scope; the commit format's agent-name tag is exempt and stays.

## Key decisions

- **Prose-only, duplicated into each profile.** No shared file (the project forbids profiles from referencing shared files) and no scanner (the spec forbids new enforcement machinery and token/keyword/path scanning). The cost — the same idea in five places kept aligned by hand — is the project's stated model for shared agent instructions.
- **Referent-based detection, not a token scan.** The same literal token (`design doc`, `spec`, `phase-2`) lands on opposite sides of the line depending on whether it points back at this run or names the product's own subject matter, so only referent judgment can separate the cases. This is what makes the rule un-greppable and lets it survive the self-hosting case with no carve-out.
- **Wording names only concrete referents and never "pipeline."** An agent reads only its own profile and its launch prompt, so the rule names only referents it already holds — its task, the spec/plan/design doc/review it followed, and the other agents — and expresses scope relative to the artifacts folder. No added bullet uses "pipeline."
- **Distinct role-appropriate forms.** Producers get a disposition in the writing voice within `## Guidelines`; reviewers get a detection predicate in the finding voice within the review checklist. They share discriminator vocabulary but are not the same block — different mood, section, and label ("No back-pointers…" for producers vs. "No run-pointers…" for reviewers).
- **Scope boundary from the `<artifacts-folder>` convention.** The three profiles that already use the placeholder express the boundary with it; the two code-writers that do not use it express the boundary in referent terms ("your task's own artifacts"). No profile hardcodes a path or carries a tool-specific reference.
- **Removed the superseded narrower line in `code-writer-tdd`.** Keeping it would duplicate the idea, keep the rule inside a numbered workflow step (against the placement requirement), and risk drift between the narrow and broad statements.

## Known limitations

- **No deterministic backstop.** Detection is human judgment at the review gate; the spec explicitly forbids a scanner, so a leak that a reviewer misses can still ship. The standing checklist item and the must-fix posture are the only guardrails.
- **Drift across the five copies.** The discriminator text is duplicated into five profiles and may diverge as they are edited independently over time; this is inherent to the project's duplication-over-extraction model. Keeping the shared discriminator clause aligned is a manual discipline.
