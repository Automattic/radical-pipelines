# Docs Plan Review

## Verdict: rejected

## Summary

The plan is well-built on almost every axis. Its two tasks (the release changeset and the README value-proposition addition) are correctly traced to the spec and code plan, name concrete audiences, stay at the right what/where/for-whom altitude, and carry drift-resistant acceptance criteria that explicitly forbid copying the canonical profile wording or naming agent profiles. I verified the load-bearing infrastructure claims against the repo and they hold: the Changeset Gate is real and `agents/**` plus `README.md` are in `changedFilePatterns`; the `minor`/no-`BREAKING:` bump matches the pre-1.0 feature policy in `CONTRIBUTING.md`; `0.4.0` is pre-1.0; the README "What this unlocks" section with "Compounding quality" and "Consistent assets" exists exactly as described; the narrower Rule 2 line is at `code-writer-tdd.md:33` and is correctly the code phase's concern; the `.rp.md` commit-format convention (lines 49–59) and `index.html`'s artifact-only commit log are correctly excluded; and with no guardrails defined the `None`/`None` Guardrail scopes rendering is valid. The plan is rejected for one concrete coverage failure: it excludes the marketing website on a factually false premise, leaving a depicted product commit that contradicts the feature's own Requirement 7 out of sync and unexamined.

## Issues

### Issue 1: The website is excluded on a false claim — `demo.js` depicts a product commit carrying a provenance tag, the exact thing the feature forbids

**What's wrong:** The "Surfaces deliberately out of scope" note (plan line 58) excludes the marketing website with this justification:

> "its illustrative commit-log entries are all artifact-only commits, which legitimately keep the agent-name tag (Requirement 8)."

That claim is false. The website has exactly one commit-message string that carries a provenance tag, and it is **not** an artifact-only commit. In `website/demo.js` the phase-4 `code-writer-tdd` entry is:

- `writes: ['src/orchestrator.ts (+218)', 'src/orchestrator.test.ts (+162)']` (lines 98) — these are **product** files (source code and tests), not artifacts under `.pipelines/`.
- `bash: ['npm test', 'git commit -m "Add orchestrator (code-writer-tdd)"']` (line 103) — an illustrative commit message for that product, carrying the `(code-writer-tdd)` agent-name provenance tag.

By the design's own changed-path test, a commit with at least one changed path outside the artifacts folder is a **product commit**, and by spec Requirement 7 a product commit "carries no pipeline-naming provenance in its message — including no agent-name provenance tag." So `demo.js:103` depicts precisely the behavior this feature removes from the tool. After the feature ships, the public website illustrates the tool producing a product commit (`src/orchestrator.ts`) tagged `(code-writer-tdd)` — a state the tool will no longer reach.

(For contrast, the `index.html` commit log at lines 127–130 — "Add code plan (code-plan-writer)", "Add design doc (design-writer)", etc. — *is* all artifact-only and legitimately keeps the tag per Requirement 8. The plan's reasoning is correct there; the defect is that it generalized "all artifact-only" across the whole website and missed the one product-commit entry in `demo.js`.)

**Where in plan:** "Surfaces deliberately out of scope", second bullet ("The marketing website (`website/index.html`, `website/demo.js`)"), plan line 58.

**Suggestion:** Either (a) add a docs task that updates the illustrated product commit in `website/demo.js` (line 103) so the shown product commit message carries no agent-name provenance tag, consistent with Requirement 7 — for an audience of website visitors evaluating the tool; or (b) keep the website out of scope but re-justify the exclusion on accurate grounds. The plan cannot retain the current sentence, because it asserts the commit is artifact-only when it commits `src/orchestrator.ts`. If the writer judges the demo to be aspirational/illustrative and out of scope, the exclusion note must say so explicitly and acknowledge that `demo.js:103` shows a product commit, rather than mis-describing it as artifact-only. Note the website is not release-relevant (`changedFilePatterns` excludes `website/`), so any such edit needs no changeset of its own — the plan already states this correctly.

**Why it matters:** This is the feature's most self-referential surface: the host project is the self-hosting Radical Pipelines repo, and the website is its public face. Shipping a feature that guarantees product commits drop the provenance tag while the marketing demo continues to show a tagged product commit is exactly the kind of left-behind, now-contradicted reference the docs phase exists to catch. Equally important, the plan's stated reason for excluding the surface is wrong, so a docs-writer reading the exclusion note would trust a false premise and never look — the surface would silently stay out of sync.
