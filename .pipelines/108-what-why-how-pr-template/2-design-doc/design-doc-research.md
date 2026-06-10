# Design research — Add a What/Why/How pull request template

Authoritative input: `../1-spec/spec.md` (9 requirements R1–R9, 10 acceptance
criteria AC1–AC10). This record captures the design decisions and rationale that
will feed the plan phase. Every decision traces to a spec requirement/AC; nothing
is designed that the spec did not ask for.

## Approach (summary)

The deliverable is a single new file, `.github/PULL_REQUEST_TEMPLATE.md`, written
as static GitHub-flavored Markdown. There is no code, no build step, no runtime,
and no CI change — GitHub auto-fills the PR description box from this path by
convention (R1/AC1). The design work is therefore entirely about the **content
and structure** of one Markdown file plus confirming the no-CI-impact claim
(R9/AC9). The template is adapted from the Gutenberg PR template, dropping all
Gutenberg/WordPress-specific content (R7) and adding a single visible changeset
reminder (R5) appropriate to this repo's Changeset Gate.

## Grounding findings (real codebase)

- **No template exists today.** `find .github -iname '*PULL_REQUEST*'` returns
  nothing; `.github/` already exists (holds `dependabot.yml` and `workflows/`).
  So this is a pure file-add at the standard location.
- **Changeset Gate is feasible to keep green (R9/AC9).**
  `.github/workflows/changeset-gate.yml` runs `npx changeset status --since=...`
  for "presence" and `node scripts/validate-changesets.mjs` for "shape".
  `.changeset/config.json` `changedFilePatterns` =
  `["skills/**", "agents/**", ".claude-plugin/**", "package.json", "README.md"]`.
  `.github/**` is **not** in that list, so a `.github/`-only change is not
  release-relevant and `changeset status` will not demand a changeset. Confirmed
  in `CONTRIBUTING.md` (".github/" is in the explicit "no changeset" list).
- **Changeset wording source (R5).** `CONTRIBUTING.md` uses the exact command
  `npx changeset`, names the same five release-relevant paths, and is the
  authoritative home for the version-bump rules — so the reminder should point to
  `CONTRIBUTING.md` rather than restate them. Terminology to match:
  "release-relevant", "changeset", "Changeset Gate".
- **Repo voice.** README/AGENTS are terse and minimalist. Template prose should
  be concise.
- **Real Gutenberg template (fetched via `gh api`).** Headings are question-form
  (`## What?`, `## Why?`, `## How?`). Hints are **HTML-comment-only** (no visible
  prose). Issue stub is `Closes <!-- #ISSUE-NUMBER or URL -->`. It also contains:
  a top Gutenberg CONTRIBUTING link comment, `## Testing Instructions` with
  block-editor example steps, `### Testing Instructions for Keyboard`, a
  `## Screenshots or screencast` Before/After table, and a `## Use of AI Tools`
  section linking the WordPress AI Guidelines — all of which R7 says to drop.

## Topics

(Worked top to bottom. Each: topic framing → spec trace → options/trade-offs →
decision + rationale. Findings from the design-researcher are appended in real
time.)

### Topic 1 — Author-guidance hint form (R3 / AC3; design-deferred)

**Frame.** Each of the three What/Why/How sections must carry a concise hint of
its intent. The spec allows the hint to be an HTML comment, visible prose, or
both, and explicitly states a comment-only hint is sufficient (visible in the PR
edit box, invisible in the render — consistent with R8/AC8).

**Options.**
- (a) HTML-comment-only per-section hints.
- (b) Visible-prose-only hints.
- (c) Both (comment + visible prose).

**Decision.** **(a) HTML-comment-only** for the three section hints.

**Rationale.**
- *Rendered-PR cleanliness (decisive).* HTML comments are invisible in rendered
  GitHub Markdown, and in practice authors delete/replace the comment scaffolding
  when filling the template, so they leave **zero residue** in the merged PR body
  (which becomes changelog/commit context). The design-researcher verified this
  empirically against two real merged Gutenberg PRs (#79039, #79034): the saved
  bodies contain only the author's filled prose — every `<!-- … -->` hint is gone.
  Visible-prose hints have the opposite failure mode (authors forget to delete
  them, leaving permanent noise).
- *Ergonomics.* The PR edit box shows raw Markdown, so comments are visible to the
  author exactly when guidance is needed, then vanish on preview/submit. Comment-
  only loses nothing ergonomically.
- *Convention.* Comment-only per-section hints are the dominant idiom in well-run
  repos (WordPress/gutenberg — our source, facebook/react, nodejs/node, vitejs/
  vite, vercel/next.js). The changesets-using repo withastro/astro independently
  validates our spec's exact split: comment-only section hints **plus one visible
  changeset reminder** ("Don't forget a changeset! Run `pnpm changeset`."). This
  is the closest analogue to radical-pipelines. (electron/electron uses a visible
  `- [ ]` checklist — a counter-example of what R6/AC6 forbids us to copy.)

**Scope guard (do not let the default leak):**
- The single **changeset reminder (R5/AC5) is the deliberate exception** — it MUST
  be **visible prose**, not a comment. The comment-only default applies only to
  the three section hints.
- The **"Closes #" line (R4/AC4) stays visible text** (a fill-in stub), not a
  comment. (Resolved in detail in Topic 4.)

**Gotchas to carry into AC8 rendering review (Topic 6) and the stub design (Topic
4):**
- *Malformed comments leak.* The only realistic way a comment shows in the render
  is a malformed one — an unterminated `<!--` or a stray `-->` can swallow or
  expose following content. Mitigation: every comment well-formed and self-
  contained per section; never span a comment across a heading.
- *Closing-keyword auto-link.* GitHub's auto-close fires only when the keyword is
  directly followed by `#<number>` (`Closes #108`); an unfilled `Closes #` does
  not fire, which is the expected initial state (R4/AC4). Do **not** put the `#`
  inside/adjacent to a comment (can leave a stray bare `#` in the render). Safe
  forms: bare `Closes #` on its own line, or Gutenberg's `Closes <!-- #123 -->`.

*Verification note from researcher:* the comment-residue claim (the decisive one)
is empirically verified against real merged PRs. The closing-keyword behavior is
from documented GitHub behavior + live templates, not a test PR opened in this
repo — acceptable, as it's well-established GitHub behavior.

### Topic 2 — Heading punctuation (R2 / AC2; design-deferred)

**Frame.** Spec fixes three level-2 headings and the order What → Why → How. Only
the punctuation is open: question-form `## What?` / `## Why?` / `## How?` vs bare
`## What` / `## Why` / `## How`.

**Options.** (a) Question-form. (b) Bare.

**Decision.** **(a) Question-form: `## What?` / `## Why?` / `## How?`**.

**Rationale.**
- *Source fidelity.* Gutenberg (the stated inspiration) uses exactly these three
  question-form headings; matching it is the natural default where the spec leaves
  punctuation open.
- *Guidance reinforcement (pairs with Topic 1).* Because the section hints are
  HTML-comment-only, the heading is the **only always-visible prompt** in the edit
  box. `## What?` is a question addressed to the author and reinforces R3's
  guidance intent at zero cost; a bare `## What` is just a label.
- *Not awkward when merged.* The heading stays a section label and the author's
  filled prose answers it (verified: Gutenberg PR #79034 renders `## What?` above
  filled prose and reads fine). Question-as-section-header is a well-understood
  idiom.
- *No tooling/render objection.* GitHub's heading slugger strips `?`, so
  `## What?` → anchor `#what` (no anchor breakage). markdownlint MD026 would flag
  trailing `?`, **but this repo has no linter** — verified: no markdownlint/
  prettier config anywhere; `package.json` has only `test` + `release:version`
  scripts; `CONTRIBUTING.md:19` states "There is no `lint` or `typecheck` step —
  this repo has none"; the test suite (`node --test scripts/test/**`) does not
  touch `.github/**`. So MD026 cannot fire.
- *Convention survey is mixed and does not override.* What/Why/How specifically is
  question-form in the only repos that use those exact words (Gutenberg, vercel/
  next.js); facebook/react is mixed; withastro/astro uses bare *noun* labels
  (Changes/Testing/Docs), which is not a vote against question-form for these
  words.

### Topic 3 — Section hint wording (R3 / AC3)

**Frame.** The three hints are HTML comments (Topic 1). The spec fixes the intent
each must convey (What = what the change does; Why = problem/motivation; How =
implementation approach), requires them concise and free of Gutenberg/WordPress
wording (R7). The relevant voice yardstick is `AGENTS.md:5-11` — the authoring
rule for terse instructional text in this repo ("minimum amount of information
possible", "every word must serve a purpose", avoid cross-path duplication and
negative phrasing). (README prose is fuller, but that's explanatory product copy,
not the right yardstick for one-line hints.)

**Decision — final comment contents:**
- What: `What does this change do?`
- Why:  `What problem does it solve, or why is it needed?`
- How:  `How does it work? Key implementation details or approach.`

**Rationale.**
- *What.* Dropped Gutenberg's "In a few words," filler (AGENTS.md:7) and replaced
  "the PR actually doing" with the generic, merged-context-friendly "this change
  do" — clean de-Gutenberging, no WP residue.
- *Why.* Maps 1:1 to the spec's "problem or motivation." **Removed** the original
  "Link any related issues or PRs." clause: it duplicated the issue-linking
  affordance that the `Closes #` stub already provides in the What section (Topic
  4), splitting one concern across two sections — the cross-path duplication
  AGENTS.md:8/:11 tells this repo to avoid. The `Closes #` stub is the single
  issue-linking affordance; Gutenberg's "reference related issues" idea is better
  served by the closing keyword than by prose in a comment.
- *How.* Dropped "Note the" filler; kept "or approach" because some changes have
  an approach rather than discrete details. Faithful to R3, generic, terse.

**Sub-questions resolved.** (1) "what does this change do?" is a clean, faithful,
WP-free equivalent of Gutenberg's "what is the PR actually doing?" — and "this
change" reads better than "the PR" for a merged-context reader. (2) Folding "link
related issues/PRs" into Why *does* collide with the `Closes #` stub; removed.

*No unverified claims — this is a voice/wording judgment grounded in AGENTS.md and
the spec.*

### Topic 4 — "Closes #" stub: syntax and placement (R4 / AC4; design-deferred)

**Frame.** The stub sits within/near the What section; it is a fill-in affordance
(author supplies the issue number); an un-filled stub is the expected initial
state and must not read as broken (AC8). Two safe candidate forms from Topic 1:
(i) bare `Closes #` on its own line, (ii) Gutenberg's `Closes <!-- #ISSUE-NUMBER
or URL -->`.

**Decision — syntax.** Ship the bare literal **`Closes #`** on its own line (no
trailing comment, no trailing whitespace).

**Decision — placement / What-block line order:**
```
## What?
Closes #
<!-- What does this change do? -->

```
Heading, then `Closes #` directly on the next line (no blank line between heading
and stub — matches Gutenberg, lets the only visible affordance hug its heading),
then the What hint comment, then a blank line where the author writes prose.

**Rationale (empirically render-tested this session against GitHub's GFM API,
`POST /markdown` mode=gfm, context=`Automattic/radical-pipelines`):**
- Unfilled `Closes #` → renders as `<p>Closes #</p>`: pure literal text, **no
  autolink attempt, no broken/empty link** — satisfies AC8's "un-filled stub is
  the expected initial state, not a broken render". (GitHub autolinks `#<digits>`
  only; a digit-less `#` has nothing to reference.)
- Filled `Closes #108` → renders a **working issue autolink** to this repo's
  issue #108, so the closing keyword activates the instant the author appends the
  number (no space: `#108`).
- The Gutenberg comment form `Closes <!-- … -->` renders as a dangling
  `<p>Closes </p>` (trailing space, no `#`) — reads *more* like an unfinished
  fragment than bare `Closes #`, and forces the author to replace a comment rather
  than just type a number. Bare form wins on both render-cleanliness and
  ergonomics.
- Full What-block layout render-tested → `<h2>What?</h2><p>Closes #</p>` and the
  comment stays invisible. AC8 holds for the whole block.
- Placement above the hint mirrors Gutenberg and puts the single visible element
  right under the heading where the author's eye lands (link the issue, then
  describe). Putting the comment hint first would bury the visible affordance below
  an invisible line.

**Implementation notes for the plan:** literal is exactly `Closes #` (no trailing
space); author completes as `Closes #108` (no space between `#` and number) for the
auto-close to fire.

*Verification: the autolink/render behavior is empirically tested against the real
repo context this session — not merely reasoned from docs.*

### Topic 5 — Single visible changeset reminder (R5 / AC5; wording & placement deferred)

**Frame.** Hard constraints: exactly one **visible** (not commented) reminder that
(a) says run `npx changeset` for release-relevant changes, (b) names the five
release-relevant paths, (c) points to `CONTRIBUTING.md` for detail without
restating bump/version rules, (d) uses CONTRIBUTING.md-consistent terminology.
Deferred: exact wording and placement.

**Decision — final block (a dedicated footer section after How):**
```
## Changeset
If this PR changes a release-relevant path (`skills/**`, `agents/**`, `.claude-plugin/**`, root `package.json`, or `README.md`), run `npx changeset` and commit it. See [CONTRIBUTING.md](https://github.com/Automattic/radical-pipelines/blob/trunk/CONTRIBUTING.md) for details.
```

**Rationale — wording (satisfies R5 a–d).**
- (a) "run `npx changeset`" — exact command (CONTRIBUTING.md:114-116).
- (b) all five paths, matching `.changeset/config.json` `changedFilePatterns` and
  CONTRIBUTING.md:59-65.
- (c) points to CONTRIBUTING.md and does **not** restate bump-type/version rules.
- (d) "release-relevant" and "changeset" are CONTRIBUTING.md's own terms.
- "root `package.json`" is **kept** (not expanded): it mirrors CONTRIBUTING.md:64's
  own one-word qualifier for the anchored pattern; adding "(nested ones don't
  match)" would restate the rule, which (c) forbids.
- "commit it" (tightened from "commit the result") per AGENTS.md:7 voice;
  consistent with CONTRIBUTING.md:120 ("commit that `.changeset/*.md` file
  together with your change").

**Rationale — link target (this was a real bug in the first draft).** Use the
**full blob URL** `https://github.com/Automattic/radical-pipelines/blob/trunk/CONTRIBUTING.md`,
**not** a relative or root-absolute path. The template content is copied into the
**PR description**, which renders on the pull page (no file base). Relative
`../CONTRIBUTING.md` resolves against `.github/` only when viewed as a file; in a
PR description it resolves against the pull URL and does not reliably reach the
root file. Root-absolute `/CONTRIBUTING.md` resolves against the site host
(→ 404). The full blob URL resolves correctly in **both** contexts. Verified:
default branch is `trunk` (`gh repo view … --json defaultBranchRef`) and
CONTRIBUTING.md exists at repo root, so the URL is valid. Do not pattern-match off
README's relative `./CONTRIBUTING.md` links — those work only because README
renders from repo root. Hard-coding `trunk` is fine (stable default branch;
tracks latest).

**Rationale — placement & heading.** A dedicated `## Changeset` footer section
after How: visible (R5), separated from the What/Why/How narrative so it reads as
a process reminder, and unmistakably "exactly one" reminder for AC5. Heading
`## Changeset` (singular) matches CONTRIBUTING.md's section nouns; `## Changeset
reminder` adds the filler "reminder" (AGENTS.md:7), `## Release` is too broad/
misleading — rejected.

**AC2 note (for reviewers).** AC2 constrains only the three What/Why/How headings'
presence and order. A fourth `## Changeset` footer heading does not violate AC2 —
it is not one of the three concepts being reordered.

*Verification note.* GitHub's GFM API passes link hrefs through verbatim (tested
this session), so relative-link resolution is a display-time function of the
page's base URL — the claim that relative `../CONTRIBUTING.md` fails in a PR
description is documented GitHub behavior, not a live test-PR observation. The
full-blob-URL recommendation is robust either way, so it is the safe call
regardless.

### Topic 6 — Optional `## Testing` and AI-disclosure sections (Out of Scope; design-deferred)

**Frame.** The spec leaves both to the design phase (not requirements). If
included: `## Testing` must be repo-appropriate and free of Gutenberg block-editor
steps (R7); the AI-disclosure note must not link the WordPress AI Guidelines (R7).

**Decision.** **OMIT both.**

**Rationale — `## Testing` (omit).**
- *No UI / manual test surface.* Changes are skills/agents/docs (Markdown prompt
  artifacts) plus minor tooling. The only objective check, `npm test` (`node
  --test scripts/test/**`), already runs in CI on every PR via the Changeset Gate
  — a reviewer sees it green/red without the author pasting "I ran npm test." A
  "how did you test?" prompt mostly elicits "CI" or empty.
- *Duplication.* It would restate CONTRIBUTING.md:12-21 ("Running tests and checks
  locally"), already reachable via the `## Changeset` footer link — the cross-path
  duplication AGENTS.md:8/:11 tells this repo to avoid. A change needing a
  verification note can put it in How.
- *Voice / spirit.* A usually-unfilled fourth section is the low-value scaffolding
  AGENTS.md:7 cuts, adjacent in spirit to the checkbox checklist R6/AC6 already
  forbids.
- *Convention does not transfer.* Testing prompts appear (react, astro, vite,
  node) only in repos with a substantial manual/UI/repro surface; none is a no-UI,
  CI-runs-the-only-test repo like this one — so the convention argues *against* a
  Testing section here.

**Rationale — AI-disclosure note (omit, the stronger omit).**
- *Discloses the assumed default.* The repo *is* an autonomous AI-agent pipeline
  (README.md:1-5, :21-38); AI authorship is the norm, not an exception. A note
  flagging "AI may have been involved" against a repo whose thesis is autonomous AI
  authorship is contentless.
- *Nothing to anchor it.* Gutenberg's "Use of AI Tools" note points at the WP AI
  Guidelines (R7-banned) and assigns review responsibility in a large human-
  contributor project. This repo has no in-repo AI policy doc to link instead, so a
  de-Gutenberged version would be a bare, policy-less sentence.
- *Convention.* Where AI notes appear (gutenberg, electron) they are tethered to an
  external governance policy and a large human base; the majority of peer tooling
  repos (react, vite, node, astro, next.js) have none. Strong signal to omit. If
  AI accountability were ever wanted, the vehicle is a CONTRIBUTING.md policy
  section — out of scope for #108.

**Resulting template structure (final):** optional top intro comment (resolved in
Topic 7) + `## What?` (with `Closes #`) + `## Why?` + `## How?` + `## Changeset`
footer. Lean; every element maps to a spec requirement.

### Topic 7 — Top intro comment (design-deferred adornment)

**Frame.** Gutenberg opens with `<!-- Thanks for contributing to Gutenberg! …
CONTRIBUTING.md -->`. R7/AC7 explicitly ban the Gutenberg CONTRIBUTING link. No
spec requirement mandates any intro.

**Decision.** **DROP the top intro comment entirely.** The file starts at the
`## What?` heading on line 1 (no leading blank line).

**Rationale.**
- *Maps to no requirement.* The fixed structure is the three W/W/H headings (R2) +
  changeset reminder (R5) + Closes-# stub (R4). An intro is pure adornment.
- *Duplication.* The only useful payload an intro could carry is a CONTRIBUTING
  pointer, which the `## Changeset` footer already provides — a second pointer is
  the cross-path duplication AGENTS.md:8/:11 forbids. One CONTRIBUTING link, where
  it's contextually relevant, beats two.
- *Filler.* A link-less "Thanks for contributing!" comment is contentless
  (AGENTS.md:7) and adds a line to scroll past before the first real prompt.
- *Convention argues against a greeting.* In the survey, intros are payload-bearing
  workhorses (contributing links, DCO/sign-off, "PRs not following this template
  will be closed", checklists), never bare greetings. Our payload is relocated
  (CONTRIBUTING link → footer) or excluded (no DCO, no auto-close bot, no checklist
  per R6). A stripped intro would be a content-free "thanks" that no surveyed repo
  does. (electron's intro carries a checklist + close-warning — the boilerplate R6
  and the repo voice reject.)
- *R7/AC7.* R7 bans the *Gutenberg* link specifically; a de-Gutenberged self-link
  wouldn't violate R7 but would re-introduce duplication. Dropping sidesteps even
  the appearance of carrying over the Gutenberg intro pattern, and strictly helps
  AC7 (removes the banned-form element) and AC8 (fewer comments = fewer render
  risks).

**AC coverage if dropped:** all ACs remain served (no AC depends on an intro);
verified element-by-element against AC1–AC10.

## Final assembled template (the concrete deliverable content)

The single file to add is `.github/PULL_REQUEST_TEMPLATE.md` (standard GitHub
location — R1/AC1). Exact content, end to end:

```markdown
## What?
Closes #
<!-- What does this change do? -->

## Why?
<!-- What problem does it solve, or why is it needed? -->

## How?
<!-- How does it work? Key implementation details or approach. -->

## Changeset
If this PR changes a release-relevant path (`skills/**`, `agents/**`, `.claude-plugin/**`, root `package.json`, or `README.md`), run `npx changeset` and commit it. See [CONTRIBUTING.md](https://github.com/Automattic/radical-pipelines/blob/trunk/CONTRIBUTING.md) for details.
```

**Layout notes for the plan/code phase (load-bearing):**
- File starts at `## What?` on line 1 — no intro comment, no leading blank line
  (Topic 7).
- In the What block, `Closes #` is on the line directly under `## What?` (no blank
  line between them), then the What hint comment, then a blank line (Topic 4).
- One blank line separates each section block.
- The changeset reminder is a single physical line of prose (it may soft-wrap in
  source for readability, but it is one Markdown paragraph). `Closes #` has no
  trailing whitespace.
- The CONTRIBUTING link is the full blob URL, not a relative path (Topic 5).
- A trailing newline at end of file (POSIX text-file convention; cosmetic).

**Whole-file render verified (AC8).** The assembled template was rendered through
GitHub's GFM API (`POST /markdown`, mode=gfm, context=`Automattic/radical-pipelines`)
this session. Result: four `<h2>` headings (`What?`, `Why?`, `How?`, `Changeset`)
render with the `?` shown; all three section-hint HTML comments are **invisible**
in the render; `Closes #` renders as plain literal text (no broken/empty link);
the changeset paragraph shows the five paths and `npx changeset` as inline code
and a working link to the correct CONTRIBUTING.md blob URL. No `- [ ]` items, no
Gutenberg/WP content. End-to-end AC8 confirmed, not merely reasoned.

## Requirement / AC traceability matrix

Every shipped element traces to a requirement/AC; nothing extra is designed.

| Req / AC | Served by (design decision) |
|---|---|
| R1 / AC1 — exists & auto-fills | File at `.github/PULL_REQUEST_TEMPLATE.md`; GitHub auto-fills the PR body by convention. Pure file-add (Approach; grounding: no template exists today). |
| R2 / AC2 — W/W/H present & ordered | Exactly three l2 headings `## What?` → `## Why?` → `## How?` in fixed order (Topic 2). The fourth `## Changeset` heading does not violate AC2 (it is not one of the three concepts; Topic 5 AC2 note). |
| R3 / AC3 — author-guidance hints | One HTML-comment hint per section (Topic 1), wording per Topic 3, all Gutenberg/WP-free. Visible in the edit box; comment-only is sufficient per spec. |
| R4 / AC4 — issue-linking stub | Bare `Closes #` directly under `## What?` (Topic 4); fill-in affordance, unfilled is expected initial state. |
| R5 / AC5 — one visible changeset reminder | Single visible `## Changeset` footer paragraph (Topic 5): `npx changeset`, all five release-relevant paths, points to CONTRIBUTING.md, CONTRIBUTING-consistent terms, no bump-rule restatement. Exactly one; not in a comment. |
| R6 / AC6 — no checkbox checklist | No `- [ ]` items anywhere; verified in the assembled render. |
| R7 / AC7 — no Gutenberg/WP content | Dropped: Gutenberg CONTRIBUTING link (Topic 7), block-editor testing steps + Testing-for-Keyboard (Topic 6 omit Testing), Screenshots Before/After table (not carried), WP AI Guidelines link (Topic 6 omit AI note). Hints de-Gutenberged (Topic 3). |
| R8 / AC8 — clean GFM render | Whole-file render verified via GitHub GFM API: headings + visible reminder display; all comments invisible; unfilled `Closes #` is literal text, not a broken render. Well-formed self-contained comments (Topic 1 gotcha). |
| R9 / AC9 — Changeset Gate stays green | Change is confined to `.github/**`, which is **not** in `.changeset/config.json` `changedFilePatterns`; `npx changeset status` will not demand a changeset. Confirmed against the real `changeset-gate.yml`, config, and CONTRIBUTING.md (grounding). |
| R10-scope / AC10 — repo's own template only | Single added file is `.github/PULL_REQUEST_TEMPLATE.md`; no downstream/generated template, no CI/workflow change (Out of Scope; Approach). |

## Open questions

None. All seven design topics resolved; every requirement and AC is served by a
decision; the approach is feasible against the real codebase (verified); the
assembled template renders cleanly (verified). The design is complete.

## Risks

- **R-1 (low): CONTRIBUTING link hard-codes `trunk`.** The full blob URL pins the
  `trunk` branch. Mitigation/accepted: `trunk` is the stable default branch
  (verified via `gh repo view`), CONTRIBUTING.md is not moving, and branch-linking
  (not a commit SHA) tracks the latest. This is the standard approach for template
  links rendered in PR descriptions, and the robust choice given the dual render
  context (Topic 5).
- **R-2 (low): relative-link resolution behavior not live-tested in a PR.** The
  decision to use the full blob URL instead of `../CONTRIBUTING.md` rests on
  documented GitHub relative-link resolution (the GFM API passes hrefs verbatim;
  resolution is display-time). Mitigation: the full-blob-URL choice is robust
  regardless of how relative links resolve, so this risk is already neutralized by
  the decision (Topic 5).
- **R-3 (very low): author leaves the unfilled `Closes #` in a merged PR.** By
  design this is the expected initial state and renders as harmless literal text
  (AC4/AC8); it is not a broken render. Real-merged-PR behavior shows authors
  typically fill or delete it (Topic 4). No mitigation needed; called out for
  reviewer awareness.
- **R-4 (very low): future maintainer adds markdownlint and trips MD026** on the
  `?` headings. Today there is no linter (verified). If one is ever added, MD026's
  `punctuation` option or a PR-template exception covers it; not a concern for this
  change (Topic 2).

No high or medium risks. The change is a single static Markdown file with no code,
no runtime, and no CI impact.
