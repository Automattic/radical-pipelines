/**
 * The plugin's id, read from the package manifest.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Absolute path to this package's `package.json`, resolved relative to this
 * module's location.
 *
 * Serves as `readPackageVersion`'s default `packageJsonPath`.
 */
const DEFAULT_PACKAGE_JSON_PATH = fileURLToPath(new URL("../package.json", import.meta.url));

/**
 * Read this package's version, as declared in `package.json`.
 *
 * @param {string} [packageJsonPath] Absolute path to the manifest. Defaults
 *   to this repository's own `package.json`.
 * @returns {string} The manifest's `version` field.
 */
function readPackageVersion(packageJsonPath = DEFAULT_PACKAGE_JSON_PATH) {
  return JSON.parse(readFileSync(packageJsonPath, "utf8")).version;
}

/**
 * The plugin's free-form id, surfaced verbatim by `GET /api/plugin` and by
 * `rp_status`. Read once at module load from `package.json` — never from a
 * network call — so it never goes stale relative to the installed package.
 */
const PLUGIN_ID = `radical-pipelines@${readPackageVersion()}`;

export {
  PLUGIN_ID,
  readPackageVersion,
};
