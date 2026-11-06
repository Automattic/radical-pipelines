// Compares rp's frontmatter reader with a YAML parser on a corpus of single values.
// Usage: node yaml-agreement.mjs <path to rp.mjs> <folder holding node_modules/yaml>
// For each value: what rp reads (or the reason it rejects it) and what YAML reads. A disagreement is a value rp
// accepts as text T while YAML reads it as structure, or as a string other than T, or rejects it.
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const [rpPath, yamlRoot] = process.argv.slice(2);
const { frontmatterOf, Invalid } = await import(pathToFileURL(rpPath).href);
const YAML = createRequire(`${yamlRoot}/`)("yaml");

const values = [
  "open", "in progress", "reviewer-default", "threads/3-reviewer-default-implementer-implementation.md",
  "1-spec/spec.md#spec-requirement-3, 2-design-doc/design-doc.md", "issue 368", "https://example.com/issues/368#comment-2",
  "368", "0368", "0x1F", "1e3", ".inf", "true", "no", "null", "~", "", "2026-11-06", "owner/repo#368", "LIN-123",
  "feature/x", "a#b", "a: b", "a:b", "a :b", "a:", "#368", "368 # c", "368\t# c", "[368]", "{a: 1}", "&a 368", "*a",
  "!!str 368", "!tag x", "|", ">", "%x", "@x", "`x", ",x", "]x", "}x", "- x", "-", "-x", "? x", "?x", ": x", ":x",
  "'#368'", "\"#368\"", "'it''s'", "\"a\\tb\"", "\"a\"", "'a'", "\"a\" # c", "'a' b", "\"unclosed", "'unclosed",
  "it's", "say \"hi\"", "a [b]", "a {b}", "a, b", "a & b", "a * b", "a ! b", "a | b", "a > b", "  padded  ",
  "--- x", "...", "a\tb", "émoji ✓",
];

let disagreements = 0;
for (const value of values) {
  const text = `---\nkey: ${value}\n---\n`;
  let rp;
  try { rp = { value: frontmatterOf(text).values.get("key") }; }
  catch (error) { if (!(error instanceof Invalid)) throw error; rp = { rejected: error.message }; }
  let yaml;
  try {
    const doc = YAML.parseDocument(`key: ${value}\n`, { uniqueKeys: true });
    if (doc.errors.length) yaml = { error: doc.errors[0].message.split("\n")[0] };
    else {
      const node = doc.contents.get("key", true);
      const scalar = YAML.isScalar(node) ? node : null;
      yaml = scalar ? { value: scalar.value, source: scalar.source ?? null, type: scalar.type, comment: Boolean(scalar.comment || doc.comment), anchor: scalar.anchor ?? null, tag: scalar.tag ?? null } : { structure: JSON.stringify(doc.toJS().key) };
    }
  } catch (error) { yaml = { error: error.message.split("\n")[0] }; }
  // Agreement: rp rejects, or YAML reads the scalar rp read, as text: the same string, or a non-string whose source
  // text is what rp read, with no comment, anchor, or tag.
  const agrees = "rejected" in rp || ("value" in yaml && !yaml.comment && !yaml.anchor && !(yaml.tag && !yaml.tag.startsWith("tag:yaml.org,2002:"))
    && (yaml.value === rp.value || (yaml.value === null && rp.value === "") || String(yaml.source ?? yaml.value) === rp.value || (typeof yaml.value !== "string" && value.trim() === rp.value)));
  if (!agrees) disagreements++;
  console.log(`${agrees ? "ok  " : "DIFF"} ${JSON.stringify(value).padEnd(66)} rp ${JSON.stringify(rp).padEnd(64)} yaml ${JSON.stringify(yaml)}`);
}
console.log(`\n${values.length} values, ${disagreements} disagreements`);
process.exitCode = disagreements ? 1 : 0;
