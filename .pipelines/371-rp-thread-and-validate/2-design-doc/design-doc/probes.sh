#!/bin/sh
# Probes of what the software and the shell do today, cited by the design doc. Run from the repository root:
#   sh .pipelines/371-rp-thread-and-validate/2-design-doc/design-doc/probes.sh
RP="$(pwd)/skills/radical-pipelines/scripts/rp.mjs"

echo "# 1. A quoted heredoc reaches a command's standard input byte for byte"
echo
echo "\$ node -e '<print stdin as JSON>' <<'EOF' (a body with backticks, \$HOME, and fenced code holding a ## line)"
node -e 'process.stdout.write(JSON.stringify(require("fs").readFileSync(0).toString()) + "\n")' <<'EOF'
### Finding 1: `x` costs $HOME
```js
## not a heading
```
EOF
echo

echo "# 2. Standard input of a command run by this role's shell tool with no input given"
echo
echo "\$ node -e '<read stdin to its end>'"
timeout 5 node -e 'console.log("read", require("fs").readFileSync(0).length, "bytes")'
echo "[exit $?]"
echo

echo "# 3. A fence a body leaves open hides every later message heading from the thread grammar"
echo
echo "\$ node -e '<parseThread on a thread whose first body opens a fence, followed by a second message heading>'"
node --input-type=module -e "
import { parseThread } from '$RP';
const header = '---\nstatus: open\nopener: reviewer-default\nowner: implementer\nartifact: implementation\n---\n\n';
const closed = header + '## reviewer-default — abc1234\n\n\`\`\`\ncode\n\`\`\`\n\n## implementer — def5678\n\nAnswered.\n';
const open = header + '## reviewer-default — abc1234\n\n\`\`\`\ncode\n\n## implementer — def5678\n\nAnswered.\n';
for (const [name, text] of [['fence closed', closed], ['fence left open', open]])
  console.log(name + ': messages by', parseThread('1-reviewer-default-implementer-implementation.md', text).messages.map((m) => m.author).join(', '));
"
echo

echo "# 4. A thread body line starting with '## ' outside fenced code that is no message heading"
echo
echo "\$ node -e '<parseThread on a thread whose body holds ## Summary>'"
node --input-type=module -e "
import { parseThread } from '$RP';
const text = '---\nstatus: open\nopener: reviewer-default\nowner: implementer\nartifact: implementation\n---\n\n## reviewer-default — abc1234\n\n## Summary\n';
try { parseThread('1-reviewer-default-implementer-implementation.md', text); } catch (error) { console.log('Invalid:', error.message); }
"
