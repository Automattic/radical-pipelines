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
