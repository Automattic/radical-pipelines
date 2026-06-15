# Doc Plan Review — review-1 (plan-completed guardrail commands)

**Verdict: APPROVED**

## Scope of review

Adversarial review of `3-plan/doc-plan.md` for completeness, drift-resistance, and
alignment with `1-spec/spec.md` (R1–R10), `2-design-doc/design-doc.md`, and
`3-plan/code-plan.md`. Verified against the live repo and judged against the
CLAUDE.md skill-authoring rules.

## Verified against the live repo

- **The D1 target exists exactly as described.** `.changeset/plan-driven-test-selection.md`
  carries the offending summary text "the code plan sets a **required-test-commands
  floor**" — the precise framing this review removes — and is `@automattic/radical-pipelines` / `minor`.
- **Floor-token sweep confirms D1 is the only real user-facing match.** A sweep of
  `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `website/`, and `.changeset/` for
  "required test command" / "required-test-commands" / "floor" / "two command set"
  returns the changeset summary as the sole vocabulary match. The only other hit is
  `website/demo.js:176` `Math.floor(sec / 60)` — JS code, not floor vocabulary —
  correctly not a doc-plan target.
- **README is genuinely untouched.** The roster (line 112) already lists
  `code-writer-tdd` and `code-writer-e2e`; the guardrail prose (line 147) is generic
  ("exact commands judged pass/fail by exit code") with no floor token and no agent
  roster this change alters.
- **Website is genuinely untouched.** `index.html:108` reads "18 agents shipped"
  (unchanged count — no agent added or removed); `demo.js:96` names only
  `code-writer-tdd` with a generic `npm test` gate. No floor or plan-completed
  vocabulary.
- **Sibling changeset is accurate as-is.** `.changeset/agent-scoped-guardrails.md`
  describes #121's per-agent guardrail machinery (the mechanism this change reuses),
  carries no floor token, and is correctly left untouched.
- **No user-facing doc describes the new behavior.** No "plan-completed" /
  "marked gate" / "guardrails to complete" vocabulary appears anywhere in the
  user-facing surface, and no README/website/CONTRIBUTING text describes code-plan
  test-command authoring. So D1 (the single changeset) plus D2 (no-op verification)
  is the complete docs-phase surface — nothing is missed.
- **D1's acceptance gate is real.** `scripts/validate-changesets.mjs` exists.

## D1 altitude and front-matter — sound

- **Feature altitude is correct and enforced.** D1's acceptance bullets forbid
  implementation detail (no `plan-completed-for` field name, no resolution-step
  mechanics, no spawn fields) and require the feature-altitude framing ("the code plan
  completing the project's declared guardrails per pipeline") — the right register for
  changelog readers.
- **Front-matter `minor` / no `BREAKING:` is correct.** CONTRIBUTING's authoritative
  bump table (lines 95–96) establishes that pre-1.0, `minor` covers both new features
  and breaking changes while `major` is forbidden until the deliberate 1.0.0 cut. A
  `BREAKING:` prefix would be inert pre-1.0, and `minor` matches the sibling
  `agent-scoped-guardrails` precedent. Keeping the bump unchanged is right.
- **Amend-in-place (not a second changeset) is correct.** The changeset is the same
  v2 unit of work; supplementing it would fragment one feature's description.
- **The other two v2 shifts are explicitly preserved.** D1 requires the code-reviewer
  behavior-verification shift and the `code-writer` split to remain intact and
  unchanged in substance.

## Considered and correctly out of scope

The sibling `agent-scoped-guardrails.md` changeset lists `code-writer` (singular,
pre-split) in its agent enumeration. This is a pre-existing v2 condition from #121's
machinery description, not made stale by removing floor framing. Spec R10 scopes this
change to floor / required-test-command / two-command-set retargeting and explicitly
leaves the README roster and other surfaces alone, so the doc plan correctly does not
touch it.

## CLAUDE.md authoring-rule check — passes

The plan is concise, states each untouched-surface judgment once, adds no back-compat
or migration prose, reuses the spec/design vocabulary rather than coining new terms,
and confines itself to the durable design. No negative restatements of general rules.

## Conclusion

Every claim in the doc plan verifies against the live repo. D1's target, altitude, and
front-matter decisions are sound; D2's verification tokens align with R10; and the
complete user-facing surface is accounted for. No defects found.

**APPROVED.**
