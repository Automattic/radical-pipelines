/**
 * Minimal pass/fail check runner for the integration suite.
 *
 * Not `node:test`: this suite runs against one shared, expensive-to-set-up
 * sandbox (one `serve` process, one stub provider), so checks run
 * sequentially against that shared fixture rather than in per-file
 * isolation. Each check gets an explicit pass/fail outcome and a clear
 * failure message; one check's failure never stops the rest from running,
 * so a single invocation reports every mechanic's status.
 */

/**
 * Run a named async check, recording whether it passed.
 *
 * @param {Array<{ name: string, pass: boolean, error?: Error, durationMs: number }>} results
 *   Mutated in place: the outcome is pushed here.
 * @param {string} name Human-readable mechanic name, printed in the report.
 * @param {() => Promise<void>} fn The check body; throws (e.g. via
 *   `node:assert/strict`) to report a failure.
 * @returns {Promise<void>}
 */
export async function runCheck(results, name, fn) {
  const start = Date.now();
  process.stdout.write(`  - ${name} ... `);
  try {
    await fn();
    results.push({ name, pass: true, durationMs: Date.now() - start });
    process.stdout.write(`ok (${Date.now() - start}ms)\n`);
  } catch (error) {
    results.push({ name, pass: false, error, durationMs: Date.now() - start });
    process.stdout.write(`FAIL (${Date.now() - start}ms)\n`);
    process.stdout.write(`    ${error?.stack ?? error}\n`.replace(/\n/g, "\n    ").trimEnd() + "\n");
  }
}

/**
 * Print the final summary and return the process exit code.
 *
 * @param {Array<{ name: string, pass: boolean }>} results
 * @returns {number} `0` when every check passed, else `1`.
 */
export function reportSummary(results) {
  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  console.log("");
  console.log(`${passed}/${results.length} checks passed.`);
  if (failed > 0) {
    console.log("Failed:");
    for (const result of results.filter((r) => !r.pass)) {
      console.log(`  - ${result.name}`);
    }
  }
  return failed > 0 ? 1 : 0;
}
