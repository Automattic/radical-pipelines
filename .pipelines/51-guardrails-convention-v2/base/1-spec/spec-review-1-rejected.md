# Spec Review 1 — REJECTED

_Spec under review: `1-spec/spec.md` (pipeline `51-guardrails-convention-v2`, issue #51)._
_Reviewer: spec-reviewer. Iteration: N=1._

## Verdict

**REJECTED** — one load-bearing defect. Requirement 24 (Local overrides) and Acceptance
Criterion 11 instruct the implementer to edit guidance text that **does not exist in the
shipped product surface**, and rest on a "for free / no new mechanism" claim that is false
at the level of the files this spec actually ships. Everything else in the spec is accurate,
well-grounded, and verified — this is a single targeted fix, not a structural rework.

---

## What I verified as correct (so the fix stays surgical)

I checked the spec adversarially against the live codebase and reproduced every empirical
claim. All of the following hold:

- **Grep-negative scope (req 23, AC 10).** `"verification convention"` appears in exactly the
  four phase agents (`code-writer.md`, `code-reviewer.md`, `doc-writer.md`, `doc-reviewer.md`)
  and nowhere else outside `.pipelines/`. The four-agent rewrite is the complete code surface.
- **Agent rewrite grounding (req 18–22).** The line-level targets match: `code-writer.md` step 3
  behavior verification (line 36) and step 5 "missing or unrunnable = blocker" (line 51); the
  leave-alone references (UI conventions :38, testing convention :42) are correctly distinguished.
  `doc-writer.md` step 4 "documentation gates" (:40) vs the leave-alone "documentation convention"
  (:27) and the straggler "if the verification convention supports doc tests" (:35) are all real
  and correctly characterized. The three-way blocker split (absent=proceed / unrunnable=blocker /
  runs-but-fails=work) is coherent and matches the agents' current structure.
- **Loader + `.rp.md` shape (req 7–10).** `load.md`'s `## Conventions` table (cols
  `Convention | What it covers | Required?`) and `## Missing conventions` keying off **required**
  conventions both exist as described; an optional `No` row correctly never blocks. `.rp.md` has
  `###`-level convention subsections under `## Shared conventions` and **no** `## Guardrails`
  sibling — the no-retitle / no-sibling constraint is correctly grounded.
- **Empirical validation claims (req 12–16, 25, AC 5/12) — reproduced live in this worktree:**
  `npm test` → exit **1** (Node-20 quoted-`**`-glob "unrunnable"); `node --test scripts/test/` →
  exit **0**; `node scripts/validate-changesets.mjs` → exit **0**; `npx changeset status
  --since=origin/trunk` → exit **0**; a nonexistent command → exit **127**. The three-way outcome
  split (127 unrunnable / 1 runs-but-fails / 0 passes) is real. This env is Node **v20.19.4**; CI
  is Node **22** (`changeset-gate.yml:26`) — the environment-parity lesson the spec builds on is
  genuine.
- **Changeset (req 27, AC 14).** `.changeset/config.json` `changedFilePatterns` =
  `["skills/**","agents/**",".claude-plugin/**","package.json","README.md"]`; the agents/skills
  edits are release-relevant → a changeset is required, as the spec says.
- **Out-of-scope grounding.** The phase-reference docs (`reference/autonomous-phases/...`)
  reference neither "verification convention" nor "guardrails" — OOS item 5 is correct.

---

## Blocking defect

### B1 — Req 24 / AC 11 edit a "loader overridable-vs-shared guidance" that does not exist; the "for-free / no-new-mechanism" claim is false against the shipped surface

**Requirement 24** states (emphasis added):

> A guardrail placed in `.rp.local.md` is **ignored, the committed value is used, and the run
> output warns** — the behavior the local-overrides mechanism (pipeline #91) **already provides**
> for shared / non-overridable conventions; **no new mechanism is added**. The loader's
> **overridable-vs-shared guidance gains a one-line note** placing guardrails on the shared /
> non-overridable side.

**Acceptance Criterion 11** mirrors it:

> `load.md`'s overridable-vs-shared guidance notes guardrails sits on the shared / non-overridable
> side; no new override mechanism is added.

**What is actually shipped.** The shipped `load.md` `## Local overrides` section (lines 31–37) is
a **generic three-sentence stub**:

> A developer may place a git-ignored `.rp.local.md` alongside the committed `.rp.md` to override
> a restricted subset of conventions for their own working copy. … merge the local file over them
> in memory: where it names a convention its value wins, where it is silent the committed value is
> inherited.

It contains **none** of the machinery the requirement leans on:

- It does **not** enumerate the overridable subset.
- It contains **no** "ignored, committed value used, run output warns" behavior — that string and
  concept are absent.
- It contains **no** "overridable-versus-shared guidance" for the note to attach to.

I grepped the **entire** shipped `skills/` tree plus `README.md` for `overridable`,
`ignored, the committed`, `not locally overridable`, `shared across collaborators`, and
`local runtime` — **zero matches**. The only shipped file that mentions `.rp.local.md` is
`load.md`, in the stub form above.

**Why the "for free" framing is wrong.** The detailed overridable-vs-shared guidance, the
enumerated subset, and the ignore-and-warn behavior (#91 requirements 12–16, 20) live **only in
the #91 pipeline artifacts** (`.pipelines/91-local-convention-overrides/1-spec/spec.md`), which
are **not shipped product surface**. Git history confirms this was deliberate: commit `c243245`
"Update load.md with local overrides instructions and **remove local-overrides.md**" stripped the
detailed reference file and collapsed the loader section to the present stub. So the mechanism the
spec says guardrails "inherits for free" was **removed before #91 merged**. The spec-research
itself flagged the loader section is "GENERIC … does NOT enumerate which conventions are
overridable" (spec-research.md:404–412), but the spec then wrote req 24 as though the detailed
guidance is present and only needs a one-line addition.

**Consequence for the implementer.** As written, req 24 / AC 11 are unsatisfiable as a "one-line
note," and an implementer has two bad options, neither matching the spec:

1. Add a literal one line to the stub. But the stub has no overridable-vs-shared framing, so a lone
   "guardrails is not overridable" sentence dangles with nothing to anchor it, and the promised
   observable behavior ("ignored, committed value used, run output warns") **still does not exist
   anywhere in the shipped loader** — so AC 13's "no warning anywhere for zero guardrails" can be
   checked, but the req-24 warn-on-override behavior **cannot** be exhibited from shipped text.
2. Author the missing overridable-vs-shared guidance and ignore-and-warn behavior into `load.md`.
   That is a real new mechanism in the shipped surface — directly contradicting "**no new mechanism
   is added**" and "**one-line note**," and arguably re-opening #91 scope.

This is exactly the kind of mis-grounding a spec must resolve before code: the requirement points at
a file region that isn't there and asserts an inheritance that doesn't hold on the shipped surface.

**What the fix needs to decide and state explicitly (pick one and ground it):**

- **(a) Documentation-only, honest about the stub.** Keep guardrails non-overridable purely by *not*
  adding it to any overridable subset (there is no enumerated subset in the shipped loader to add it
  to — so it is non-overridable by omission), and add at most a short sentence to the existing
  `## Local overrides` stub noting guardrails is shared/committed-only. Then **drop** the claims that
  the loader "already provides" ignore-and-warn and that there is an "overridable-vs-shared guidance"
  to amend — because the shipped loader provides neither. AC 11 must be reworded to assert only what
  shipped text can actually exhibit. This keeps the feature minimal and truthful.
- **(b) Explicitly bring the #91 guidance into scope.** If the team wants the warn-on-override
  behavior to actually exist for guardrails, the spec must own authoring the overridable-vs-shared
  guidance + ignore-and-warn text into the shipped `load.md` (porting it from the #91 artifacts),
  and stop calling it "no new mechanism / one-line note." This is larger and risks #91 scope-creep —
  the kind of bundling that closed #112 — so it likely belongs in option (a) instead, but the spec
  must make the call rather than assume a non-existent inheritance.

Either way: the spec currently asserts a factual inheritance ("already provides … for free") that
the shipped product surface contradicts. That must be corrected before the implementer is sent at it.

---

## Non-blocking observation (for the spec-writer's awareness; do not gate on it)

- **`claude-code.md` says "three" tool-forced conventions but documents four blocks** (Worktrees,
  Branch names, Team spawning, **Health monitoring**). This is a pre-existing inconsistency in a
  file this spec does **not** touch, and the spec-research's parenthetical mis-counted it too. It
  has no bearing on the guardrails feature (guardrails is explicitly tool-agnostic, req 4) and is
  correctly out of scope. Flagging only so it isn't mistaken for a guardrails-introduced error
  later. No spec change required.

---

## Summary

The spec is excellent on its core surface: the four-agent rewrite, the loader row, the setup
command-validation model, the three-way blocker/outcome split, the dogfood gates, and the changeset
are all precisely grounded, and I reproduced every empirical claim live (exit codes 127/1/0, Node
20 vs CI 22, changeset patterns, `.rp.md` structure). It is rejected for a single load-bearing
defect: **requirement 24 and acceptance criterion 11 instruct an edit to a "loader
overridable-vs-shared guidance" that does not exist in the shipped `load.md` (a generic stub since
#91's `c243245`), and rely on a "guardrails inherits ignore-and-warn for free / no new mechanism /
one-line note" claim that is false against the shipped product surface** — the detailed mechanism
lives only in unshipped `.pipelines/` artifacts. The spec must either (a) make the local-overrides
treatment documentation-only and honest about the stub, dropping the false-inheritance and
"already provides" wording and reanchoring AC 11 to what shipped text can exhibit, or (b)
explicitly take authoring that guidance into scope and stop calling it a one-line, no-new-mechanism
change. Fixing this one requirement is the only thing standing between this spec and approval.
