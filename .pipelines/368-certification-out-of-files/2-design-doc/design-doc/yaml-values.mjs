// How a YAML parser reads the frontmatter values intended use writes. Run from the repository root:
// node .pipelines/368-certification-out-of-files/2-design-doc/design-doc/yaml-values.mjs
import { createRequire } from "node:module";
const require = createRequire(`${process.cwd()}/package.json`);
const YAML = require("yaml");
const lines = [
  "status: open",
  "status: in progress",
  "opener: reviewer-default",
  "cites: threads/3-reviewer-default-implementer-implementation.md",
  "target: 1-spec/spec.md#spec-requirement-3, 2-design-doc/design-doc.md",
  "origin: issue 368",
  "origin: https://example.com/issues/368#comment-2",
  "issue: 368",
  "issue: 0368",
  "issue: #368",
  "issue: \"#368\"",
  "issue: owner/repo#368",
  "issue: LIN-123",
  "starts-from: 368-certification-out-of-files",
  "origin: see thread: x",
  "status: done # finished",
  "status: [open]",
  "status: &a open",
  "status: !tag open",
  "status: 'it''s'",
  "status: \"a\\tb\"",
  "status:",
  "status: true",
];
for (const line of lines) {
  let out;
  try { out = JSON.stringify(YAML.parse(line, { strict: true })); } catch (e) { out = `error: ${e.message.split("\n")[0]}`; }
  console.log(`${line}  =>  ${out}`);
}
