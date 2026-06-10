import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

/**
 * Absolute path to the reference file under test, resolved relative to this
 * test file so the suite is location-independent.
 */
const CREATE_PIPELINE_PATH = fileURLToPath(
  new URL(
    "../../skills/radical-pipelines/reference/create-pipeline.md",
    import.meta.url,
  ),
);

const doc = readFileSync(CREATE_PIPELINE_PATH, "utf8");

/**
 * Slice out the body of the `### 4. Generate the initial intent` step: from its
 * heading up to (but not including) the next `### ` step heading. The Task 1
 * invariants are all asserted against this slice so neighbouring steps cannot
 * accidentally satisfy them.
 *
 * @returns {string} The text of step 4 (heading included), trimmed.
 */
function step4() {
  const start = doc.indexOf("### 4. Generate the initial intent");
  assert.notEqual(start, -1, "step 4 heading must exist");
  const rest = doc.slice(start + "### 4. Generate the initial intent".length);
  const nextHeading = rest.indexOf("\n### ");
  const body = nextHeading === -1 ? rest : rest.slice(0, nextHeading);
  return body.trim();
}

describe("create-pipeline.md step 4 — Task 1 framing and scaffolding", () => {
  test("opening states intent.md is always written in the canonical intent format", () => {
    const s = step4();
    // "always" + "canonical" + "intent format" must co-occur in the framing.
    assert.match(s, /always/i);
    assert.match(s, /canonical[\s\S]*intent format|intent format[\s\S]*canonical/i);
  });

  test("delegates the format to manage-issues.md rather than re-listing it", () => {
    const s = step4();
    // The first cross-reference from a reference file to manage-issues.md.
    assert.match(s, /manage-issues\.md/);
    assert.match(doc, /manage-issues\.md/);
  });

  test("specifies an H1 equal to the issue title", () => {
    const s = step4();
    // H1 is the issue title, stated explicitly.
    assert.match(s, /H1/);
    assert.match(s, /issue title/i);
  });

  test("never instructs a phase-name H1 (# Intent / # Prompt)", () => {
    const s = step4();
    // No legacy phase-name top-level heading appears as an actual H1 line.
    assert.doesNotMatch(s, /(^|\n)#\s+Intent\b/i);
    assert.doesNotMatch(s, /(^|\n)#\s+Prompt\b/i);
    // The step actively forbids a phase-name H1 rather than leaving it open:
    // the only place a phase name may be named is inside such a prohibition.
    assert.match(s, /never a phase name/i);
  });

  test("specifies a > Source: attribution blockquote that makes the file self-contained", () => {
    const s = step4();
    assert.match(s, /`?>\s*Source:/);
    // States the artifact is self-contained — agents need not open the issue.
    assert.match(s, /do not need to open the issue|need not open the issue|self-contained/i);
  });

  test("names the four body sections in the prescribed order", () => {
    const s = step4();
    const goal = s.indexOf("## Goal");
    const constraints = s.indexOf("## Constraints");
    const context = s.indexOf("## Context");
    const assumptions = s.indexOf("## Assumptions / directions to explore");

    assert.notEqual(goal, -1, "## Goal must be named");
    assert.notEqual(constraints, -1, "## Constraints must be named");
    assert.notEqual(context, -1, "## Context must be named");
    assert.notEqual(
      assumptions,
      -1,
      "## Assumptions / directions to explore must be named",
    );

    // Prescribed order: Goal → Constraints → Context → Assumptions.
    assert.ok(goal < constraints, "Goal must precede Constraints");
    assert.ok(constraints < context, "Constraints must precede Context");
    assert.ok(context < assumptions, "Context must precede Assumptions");
  });

  test("states Goal is required and the optional sections may be omitted", () => {
    const s = step4();
    assert.match(s, /required/i);
    // Empty sections are omitted.
    assert.match(s, /omit/i);
  });

  test("forbids N/A placeholders", () => {
    const s = step4();
    assert.match(s, /no `?N\/A`? placeholders?|no `?N\/A`?\b/i);
  });

  test("states a Goal-only body is a complete, valid intent", () => {
    const s = step4();
    assert.match(s, /Goal alone|only[\s\S]*Goal|Goal[\s\S]*alone/i);
    assert.match(s, /complete[\s\S]*valid|valid[\s\S]*intent/i);
  });

  test("the old open-ended 'Adapt the issue content' bullet is gone", () => {
    assert.doesNotMatch(doc, /Adapt the issue content/i);
  });
});

describe("create-pipeline.md step 4 — Task 2 hoisted asset/screenshot download", () => {
  /**
   * Lines of step 4 that mention downloading screenshots/assets. The asset
   * download is identified by the act of downloading screenshots/assets — the
   * wording deliberately avoids anchoring on later tasks' gate/branch text.
   *
   * @returns {string[]} Matching lines from step 4.
   */
  function assetLines() {
    return step4()
      .split("\n")
      .filter((line) => /download/i.test(line) && /screenshot|asset/i.test(line));
  }

  test("the asset-download instruction appears exactly once in step 4", () => {
    assert.equal(
      assetLines().length,
      1,
      "expected exactly one screenshot/asset download instruction in step 4",
    );
  });

  test("the asset-download instruction is stated to apply on both paths", () => {
    const [line] = assetLines();
    assert.ok(line, "asset-download instruction must exist");
    // Hoisted as a shared, path-independent concern: it must say it covers
    // both downstream paths rather than living inside one branch.
    assert.match(line, /both paths/i);
  });

  test("the asset-download mechanism is unchanged", () => {
    const [line] = assetLines();
    assert.ok(line, "asset-download instruction must exist");
    // Access via the Issues convention.
    assert.match(line, /\*\*Issues\*\*/);
    // Downloaded into the phase-0 subfolder.
    assert.match(line, /0-intent\//);
    // Referenced by relative path in intent.md.
    assert.match(line, /relative path/i);
    assert.match(line, /intent\.md/);
  });

  test("the asset-download instruction is positioned after the canonical-format framing", () => {
    const s = step4();
    const lines = s.split("\n");
    const framing = lines.findIndex((line) =>
      /canonical intent format/i.test(line),
    );
    const asset = lines.findIndex(
      (line) => /download/i.test(line) && /screenshot|asset/i.test(line),
    );
    assert.notEqual(framing, -1, "canonical-format framing must exist");
    assert.notEqual(asset, -1, "asset-download instruction must exist");
    assert.ok(
      framing < asset,
      "asset download must come after the canonical-format template framing",
    );
  });
});

describe("create-pipeline.md step 4 — Task 3 three-clause skip gate", () => {
  /**
   * The skip gate's introductory line — the declarative conjunction that opens
   * the gate. Identified by the act of skipping owner confirmation only when
   * all three conditions hold, so the matcher does not anchor on later tasks'
   * branch text.
   *
   * @returns {string | undefined} The gate's lead-in line, if present.
   */
  function gateIntro() {
    return step4()
      .split("\n")
      .find(
        (line) =>
          /skip/i.test(line) &&
          /confirmation/i.test(line) &&
          /all three/i.test(line),
      );
  }

  test("the gate is phrased as an all-three-hold conjunction over owner confirmation", () => {
    const intro = gateIntro();
    assert.ok(
      intro,
      "step 4 must introduce a skip-owner-confirmation-when-all-three-hold gate",
    );
    // Skipping is the only thing the conjunction governs; confirmation is owner
    // confirmation, gated on all three clauses holding together.
    assert.match(intro, /owner confirmation/i);
    assert.match(intro, /all three/i);
  });

  test("the gate sits after the hoisted asset-download step", () => {
    const s = step4();
    const lines = s.split("\n");
    const asset = lines.findIndex(
      (line) => /download/i.test(line) && /screenshot|asset/i.test(line),
    );
    const gate = lines.findIndex(
      (line) =>
        /skip/i.test(line) &&
        /confirmation/i.test(line) &&
        /all three/i.test(line),
    );
    assert.notEqual(asset, -1, "asset-download instruction must exist");
    assert.notEqual(gate, -1, "skip gate must exist");
    assert.ok(
      asset < gate,
      "the skip gate must come after the hoisted asset-download step",
    );
  });

  test("there is exactly one skip gate", () => {
    const intros = step4()
      .split("\n")
      .filter(
        (line) =>
          /skip/i.test(line) &&
          /confirmation/i.test(line) &&
          /all three/i.test(line),
      );
    assert.equal(intros.length, 1, "expected exactly one all-three skip gate");
  });

  test("all-three-holding is stated as the definition of 'no transformation', with no separate transform check", () => {
    const s = step4();
    // All three holding *is* the definition of no transformation: the gate must
    // tie the conjunction to the "no transformation" notion itself.
    assert.match(s, /transformation|transform/i);
    // And it must explicitly disclaim a *second*, independently-checked notion
    // of whether the result transforms the source — the conjunction is the only
    // gate. The disclaimer ("no separate check … transforms the source") is the
    // only place transformation-of-the-source may be mentioned, so it must be
    // framed as something NOT done.
    assert.match(
      s,
      /(no|not|never)[^.]*\b(separate|second|additional|independent(?:ly)?)\b[^.]*transform|do(?:es)?\s+not[^.]*transform[^.]*source/i,
      "the separate 'transforms the source' notion must be explicitly disclaimed, not asserted as a real check",
    );
  });

  test("the gate prescribes no evaluation order over the three clauses", () => {
    const s = step4();
    // A declarative, unordered conjunction: no first/then/short-circuit ordering
    // language tying one clause's evaluation to another.
    assert.doesNotMatch(
      s,
      /evaluate[d]?\s+(the\s+clauses\s+)?in\s+order/i,
      "the clauses must not be ordered for evaluation",
    );
    assert.doesNotMatch(
      s,
      /short[\s-]?circuit/i,
      "the gate must not short-circuit clause evaluation",
    );
  });

  // --- Clause A — body is structurally canonical -------------------------------

  test("clause A is a purely structural canonical-body check", () => {
    const s = step4();
    // The canonical body is described as structural; the orchestrator does not
    // judge whether the Goal reads as an outcome.
    assert.match(s, /structural/i);
    assert.match(
      s,
      /not\s+judge|does\s+not\s+(judge|assess)|purely\s+structural/i,
    );
    // The semantic "reads / sounds like an outcome" judgment is explicitly NOT made.
    assert.match(s, /outcome/i);
  });

  test("clause A requires a non-empty Goal", () => {
    const s = step4();
    assert.match(s, /non-empty[\s\S]*## Goal|## Goal[\s\S]*non-empty/i);
  });

  test("clause A admits only the four recognized headings via manage-issues.md", () => {
    const s = step4();
    // The heading taxonomy is delegated to manage-issues.md, not re-listed; the
    // gate references the four recognized headings spelled exactly as there.
    assert.match(s, /manage-issues\.md/);
    assert.match(s, /four/i);
    assert.match(s, /recognized|recognised/i);
  });

  test("clause A requires the prescribed order and nothing outside the sections", () => {
    const s = step4();
    // (iii) prescribed order.
    assert.match(s, /order/i);
    // (iv) nothing outside the sections — no preamble prose, no extra/unrecognized headings.
    assert.match(s, /nothing\s+outside|outside\s+(those\s+|these\s+)?sections/i);
    assert.match(s, /preamble|prose/i);
    assert.match(s, /extra|unrecognized|unrecognised/i);
  });

  test("clause A excludes the issue title (metadata) and lets a Goal-only body pass", () => {
    const s = step4();
    // Title is metadata mapped to the H1 and does not participate in the check.
    assert.match(s, /title/i);
    assert.match(s, /metadata|does not (participate|count)|not part of/i);
    // A Goal-only body passes the canonical check.
    assert.match(s, /Goal[\s-]?only|(only\s+(a\s+)?)?`?## ?Goal`?\s+(alone|only)|(a\s+)?body\s+of\s+`?## ?Goal`?\s+alone/i);
  });

  test("clause A allows no tolerant matching of near-miss headings", () => {
    const s = step4();
    // Strict, no tolerance: a near-miss like `## Directions to explore` fails.
    assert.match(s, /Directions to explore/);
    assert.match(s, /fail/i);
  });

  // --- Clause B — issue has no comments ----------------------------------------

  test("clause B is a strict zero-count comment read via the Issues convention", () => {
    const s = step4();
    // Read through the abstract Issues convention — no gh/--json in the prose.
    assert.match(s, /\*\*Issues\*\*/);
    assert.doesNotMatch(s, /\bgh\b/);
    assert.doesNotMatch(s, /--json/);
    // Any comment at all fails the clause; this is about comments.
    assert.match(s, /comment/i);
    assert.match(s, /any comment/i);
  });

  test("clause B does not assess comment author or substance", () => {
    const s = step4();
    // From any author, for any reason — author/substance unassessed.
    assert.match(s, /any author|from any (author|one)/i);
    assert.match(s, /substance|reason/i);
  });

  test("clause B counts only the source-of-truth issue, not mirrored comments", () => {
    const s = step4();
    // Comments mirrored elsewhere (e.g. Linear) are not considered.
    assert.match(s, /mirror/i);
  });

  // --- Clause C — body contains no references ----------------------------------

  test("clause C is a body-only reference scan", () => {
    const s = step4();
    // Evaluated against the body only.
    assert.match(s, /body[\s\S]*reference|reference[\s\S]*body/i);
    assert.match(s, /body only|only the body|against the body/i);
  });

  test("clause C counts external URLs and GitHub issue/PR cross-references", () => {
    const s = step4();
    // External URL.
    assert.match(s, /http\(s\)|https?:\/\/|external URL/i);
    // GitHub cross-reference forms: short `#N`, long `owner/repo#N`, full URL.
    assert.match(s, /#N|#\d|#42/);
    assert.match(s, /owner\/repo#/);
    assert.match(s, /cross-reference/i);
  });

  test("clause C excludes @-mentions, embedded assets, and repo-file links", () => {
    const s = step4();
    // @-mentions do not count.
    assert.match(s, /@-?mention/i);
    // Embedded images / attached assets (the `![…]` form) do not count.
    assert.match(s, /!\[/);
    // Links to files in the repository do not count.
    assert.match(s, /repo|repository/i);
    assert.match(s, /file/i);
  });

  test("clause C is stated as prose, not a literal regex", () => {
    const s = step4();
    // Design-altitude prose — no literal regex delimiters introduced for the scan.
    assert.doesNotMatch(s, /\/\^|\$\/|\\b.*\\b/);
  });
});

describe("create-pipeline.md step 4 — Task 4 skip branch (`**If all three hold**`)", () => {
  /**
   * The skip arm's lead-in line — the bolded inline `**If all three hold**`
   * bullet that opens the first branch of the two-branch block. Matched by the
   * bolded conjunction phrase so the assertion does not depend on the prose that
   * follows it.
   *
   * @returns {string | undefined} The arm's lead-in line, if present.
   */
  function skipArm() {
    return step4()
      .split("\n")
      .find((line) => /\*\*If all three hold\*\*/.test(line));
  }

  test("a bolded `**If all three hold**` arm exists", () => {
    assert.ok(
      skipArm(),
      "step 4 must contain a bolded `**If all three hold**` skip arm",
    );
  });

  test("the skip arm sits after the three-clause skip gate", () => {
    const s = step4();
    const lines = s.split("\n");
    const gate = lines.findIndex(
      (line) =>
        /skip/i.test(line) &&
        /confirmation/i.test(line) &&
        /all three/i.test(line),
    );
    const arm = lines.findIndex((line) =>
      /\*\*If all three hold\*\*/.test(line),
    );
    assert.notEqual(gate, -1, "skip gate must exist");
    assert.notEqual(arm, -1, "skip arm must exist");
    assert.ok(gate < arm, "the skip arm must come after the skip gate");
  });

  test("the skip arm maps the body's sections to intent.md unchanged", () => {
    const arm = skipArm();
    assert.ok(arm, "skip arm must exist");
    // Maps the body's sections; verbatim/unchanged (no rewording of the source).
    assert.match(arm, /body/i);
    assert.match(arm, /map/i);
    assert.match(arm, /unchanged|verbatim/i);
  });

  test("the skip arm writes under the H1/Source attribution scaffolding", () => {
    const arm = skipArm();
    assert.ok(arm, "skip arm must exist");
    // The scaffolding from Task 1 — the title (H1) and the source attribution
    // above — is what the body sits under on this path.
    assert.match(arm, /title|H1/i);
    assert.match(arm, /attribution|Source|above/i);
  });

  test("the skip arm performs no synthesis", () => {
    const arm = skipArm();
    assert.ok(arm, "skip arm must exist");
    assert.match(arm, /(do not|don't|no)\s+synthe/i);
  });

  test("the skip arm proceeds to commit without confirmation", () => {
    const arm = skipArm();
    assert.ok(arm, "skip arm must exist");
    assert.match(arm, /commit/i);
    assert.match(arm, /without confirmation|no confirmation|skip(?:ping)? confirmation/i);
  });

  test("the skip arm does not duplicate the step 5 commit instruction", () => {
    // The only `### 5. Commit` step is reached via the existing unconditional
    // step — the skip arm proceeds to it, it does not restate the commit
    // mechanics (the **Commit format** convention lives only in step 5).
    const start = doc.indexOf("### 4. Generate the initial intent");
    const rest = doc.slice(
      start + "### 4. Generate the initial intent".length,
    );
    const nextHeading = rest.indexOf("\n### ");
    const step4Body = nextHeading === -1 ? rest : rest.slice(0, nextHeading);
    assert.doesNotMatch(
      step4Body,
      /\*\*Commit format\*\*/,
      "step 4 must not restate the Commit format convention — that lives in step 5",
    );
  });

  test("the skip arm writes no approval or review file", () => {
    const s = step4();
    // No phases-1–5 companion approval/review artifact filename appears.
    assert.doesNotMatch(s, /intent-review-approved/i);
    // No instruction to *write/create* an approval or review file. A statement
    // that none is written ("write no approval or review file") is allowed and
    // expected; only an instruction producing one is forbidden.
    assert.doesNotMatch(
      s,
      /(write|create|save|produce)\s+(an?\s+)?(approval|review)\s+(file|artifact)/i,
      "the skip arm must not instruct writing an approval/review file",
    );
  });

  test("the incidental-formatting-is-not-a-transformation point is present in step 4", () => {
    const s = step4();
    // A reader on the skip path must see that the format-level differences are
    // expected, not a violation of "map unchanged": the title becoming the H1,
    // the added attribution, whitespace / a trailing newline.
    assert.match(s, /incidental|format-level/i);
    assert.match(s, /transformation|transform/i);
    // The H1/attribution/whitespace differences are named as the incidental set.
    assert.match(s, /H1|title/i);
    assert.match(s, /whitespace|trailing newline/i);
  });
});

describe("create-pipeline.md step 4 — Task 5 synthesis branch (`**If any fails**`)", () => {
  /**
   * The synthesis arm — the bolded inline `**If any fails**` bullet that opens
   * the second branch of the two-branch block, captured as a *block* running
   * from its lead-in line to the end of step 4 (it is the last arm, so the
   * block extends to the step's end). Capturing the whole block — not just the
   * lead-in line — lets the assertions reach the multi-bullet detail the arm
   * carries (full-picture read, section-mapping, confirmation loop, etc.).
   *
   * @returns {string} The text of the synthesis arm, from `**If any fails**`
   *   to the end of step 4.
   */
  function synthArm() {
    const s = step4();
    const start = s.search(/\*\*If any fails\*\*/);
    assert.notEqual(start, -1, "step 4 must contain a `**If any fails**` arm");
    return s.slice(start);
  }

  test("a bolded `**If any fails**` arm exists", () => {
    const s = step4();
    assert.match(
      s,
      /\*\*If any fails\*\*/,
      "step 4 must contain a bolded `**If any fails**` synthesis arm",
    );
  });

  test("the synthesis arm sits after the `**If all three hold**` skip arm", () => {
    const s = step4();
    const skip = s.search(/\*\*If all three hold\*\*/);
    const synth = s.search(/\*\*If any fails\*\*/);
    assert.notEqual(skip, -1, "skip arm must exist");
    assert.notEqual(synth, -1, "synthesis arm must exist");
    assert.ok(
      skip < synth,
      "the synthesis arm must come after the skip arm (it is the paired second arm)",
    );
  });

  test("the arm synthesizes from the full picture: body + all comments + referenced content", () => {
    const arm = synthArm();
    // The whole picture: the issue body, ALL of its comments, and the content
    // its references point to.
    assert.match(arm, /body/i);
    assert.match(arm, /all[\s\S]*comments|comments/i);
    assert.match(arm, /all\b[^.]*comments/i);
    // It synthesizes — this is the path that does the judgment work.
    assert.match(arm, /synthe/i);
    // References are read for their content, not treated as a bare link.
    assert.match(arm, /reference/i);
  });

  test("comments are read via the Issues convention; external URLs via a web-fetch capability naming no tool", () => {
    const arm = synthArm();
    // Comments read through the abstract Issues convention.
    assert.match(arm, /\*\*Issues\*\*/);
    // External URLs read via a web-fetch capability — at capability altitude,
    // naming no concrete tool (no gh, no --json, no named fetch tool).
    assert.match(arm, /web[\s-]?fetch/i);
    assert.doesNotMatch(arm, /\bgh\b/);
    assert.doesNotMatch(arm, /--json/);
    assert.doesNotMatch(arm, /WebFetch|web_fetch/);
  });

  test("the one-level boundary is stated positively (read body/comment refs; do not follow refs inside fetched sources)", () => {
    const arm = synthArm();
    // The boundary is one level: references in the body or comments ARE read…
    assert.match(arm, /(in|found in|from)[\s\S]*(body|comments)/i);
    // …but references found INSIDE the fetched sources are NOT followed further.
    assert.match(arm, /inside/i);
    assert.match(arm, /(not\s+followed|never\s+followed|do(?:es)?\s+not\s+follow|not\s+further)/i);
  });

  test("section-mapping is delegated to manage-issues.md, not re-listed", () => {
    const arm = synthArm();
    // The classification rule and content guardrails live in manage-issues.md;
    // the arm points there rather than copying the input→section table.
    assert.match(arm, /manage-issues\.md/);
    // No re-listed classification table: the arm must not enumerate the
    // input→section mapping (e.g. "binding must/must-not → Constraints").
    assert.doesNotMatch(arm, /must\/must-not[\s\S]*Constraints/i);
    assert.doesNotMatch(arm, /prior decisions[\s\S]*Context/i);
  });

  test("the not-more-authoritative-than-the-body note is stated explicitly", () => {
    const arm = synthArm();
    // The synthesis-specific note absent from manage-issues.md: comment- or
    // reference-sourced material is sorted the same way and is NOT more
    // authoritative than the body merely because it appears later.
    assert.match(arm, /authoritative/i);
    assert.match(arm, /(comments|referenced|later)/i);
    // Framed as a negation: it is NOT more authoritative. Tolerate markdown
    // emphasis on the negation/qualifier (`**not** more authoritative`) and a
    // short intervening qualifier ("treated as", "be") between the two.
    assert.match(
      arm,
      /(not|never)[*\s]+(?:treated\s+as\s+|be\s+)?more[*\s]+authoritative/i,
    );
  });

  test("the faithfulness guardrail is kept (no added requirements/technical directions/implementation details)", () => {
    const arm = synthArm();
    // Do not add what the source did not contain.
    assert.match(arm, /(do not|don't|never)\s+add/i);
    assert.match(arm, /requirements?/i);
    assert.match(arm, /technical direction|implementation/i);
    // Goal stays an outcome; hypotheses stay labeled open.
    assert.match(arm, /Goal[\s\S]*outcome|outcome/i);
    assert.match(arm, /hypothes[ie]s|assumption/i);
    assert.match(arm, /open/i);
  });

  test("the confirmation loop shows the full proposed intent.md as the primary review surface (never a diff-only review)", () => {
    const arm = synthArm();
    // The primary review surface is the FULL proposed intent.md.
    assert.match(arm, /full[\s\S]*proposed[\s\S]*intent\.md|proposed[\s\S]*intent\.md/i);
    assert.match(arm, /full/i);
    // It is never a diff or a bare change-list standing in for the artifact.
    assert.match(arm, /diff|change[\s-]?list|list of changes/i);
    // The diff/summary is framed as NOT the review surface (optional at most).
    assert.match(arm, /(not|never|rather than|instead of)[\s\S]*(diff|change[\s-]?list|list of changes)|(diff|change[\s-]?list|list of changes)[\s\S]*(not|never|does not replace|may accompany|optional)/i);
  });

  test("an optional accompanying summary may be offered but never replaces the full artifact", () => {
    const arm = synthArm();
    // A brief optional note/summary MAY accompany the full artifact…
    assert.match(arm, /optional|brief|may\b/i);
    assert.match(arm, /summary|note|what (was )?drawn|what changed/i);
    // …but never replaces showing the full proposed intent.md.
    assert.match(arm, /(never|not)\s+(?:a\s+)?replace|does not replace|never replaces/i);
  });

  test("the loop iterates until approved: revise and re-show on a correction request", () => {
    const arm = synthArm();
    // On a correction request the orchestrator revises the proposal and shows
    // it again; this repeats until approval.
    assert.match(arm, /correction|revis(e|ion)/i);
    assert.match(arm, /(again|re-?show|show.*again|repeat)/i);
    assert.match(arm, /until[\s\S]*approv/i);
  });

  test("commit happens only on explicit owner approval", () => {
    const arm = synthArm();
    assert.match(arm, /commit/i);
    assert.match(arm, /explicit(?:ly)?[\s\S]*approv|approv[\s\S]*explicit/i);
    // The commit is gated on approval — "only on" / "only after" approval.
    assert.match(arm, /only\s+(on|after|once|upon)/i);
  });

  test("the arm follows the render→show→approve idiom by delegating to manage-issues.md", () => {
    const arm = synthArm();
    // The confirmation interaction mirrors manage-issues.md's draft/show/approve
    // step rather than inventing a new ceremony — the arm references it.
    assert.match(arm, /manage-issues\.md/);
  });

  test("the synthesis arm writes no approval or review file", () => {
    const s = step4();
    // No phases-1–5 companion approval/review artifact filename appears.
    assert.doesNotMatch(s, /intent-review-approved/i);
    // No instruction to *write/create* an approval or review file. The arm may
    // legitimately STATE that none is written ("writes no approval or review
    // file"); only an instruction producing one is forbidden (Task-4 lesson).
    assert.doesNotMatch(
      s,
      /(write|create|save|produce)\s+(an?\s+)?(approval|review)\s+(file|artifact)/i,
      "the synthesis arm must not instruct writing an approval/review file",
    );
    // And the arm explicitly states it gates the single commit, writing none.
    const arm = synthArm();
    assert.match(arm, /no approval or review file|writes no (approval|review)|no (approval|review) (file|artifact)/i);
  });

  test("the gate is triggered by a failing skip clause, not by a post-synthesis resemblance check", () => {
    const arm = synthArm();
    // The trigger is a FAILING clause/condition — the orchestrator looked beyond
    // the bare body and exercised judgment, and that judgment is confirmed.
    assert.match(arm, /fail/i);
    // The arm must speak to resemblance at all, framing it as the no-escape-hatch
    // case (the gate is still owed when the result resembles the body).
    assert.match(arm, /resembl/i, "the arm must address the resemblance case");
    assert.match(
      arm,
      /resembl[^.]*(no escape|even if|still|owed)|(no escape|even if|still|owed)[^.]*resembl/i,
      "the resemblance case must be framed as NOT bypassing the gate (no escape hatch)",
    );
    // There must be no instruction to perform a resemblance/comparison test that
    // SKIPS confirmation post-synthesis. The forbidden shape is a *positive*
    // directive — resemblance → skip/bypass — within a single clause (no
    // sentence break) and not introduced by a negation (never/do not/no). A
    // negated statement ("Never … resemblance … to skip") is the correct framing
    // and must NOT trip this guard (Task-4 lesson: forbid the directive, not the
    // word). Anchor on the bolded "If any fails" lead-in clause only, where a
    // stray "if … resembles … skip" conditional would actually live.
    const sentences = arm.split(/(?<=[.;])\s+/);
    for (const sentence of sentences) {
      if (/\bresembl/i.test(sentence) && /\b(skip|bypass|without confirmation)\b/i.test(sentence)) {
        assert.doesNotMatch(
          sentence,
          /\b(if|when|whenever)\b[^.;]*\bresembl[^.;]*\b(skip|bypass|without confirmation)\b/i,
          `a post-synthesis resemblance test that skips confirmation is forbidden, found in: ${sentence}`,
        );
      }
    }
  });
});
