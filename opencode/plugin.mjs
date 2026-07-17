/**
 * RP's opencode v2 plugin.
 *
 * Zero-dependency ESM module supplying the coordination layer opencode lacks
 * natively (team spawning, directed messaging, health monitoring, status).
 * Every pure helper is named-exported so it can be unit-tested offline,
 * without a running opencode daemon.
 */

/**
 * Parse an Agent-models convention string into the `Model.Ref` object
 * opencode's `session.create` requires.
 *
 * The convention string has the form `provider/model[#variant]`. Only the
 * first `/` splits the provider segment from the model id, so a model id
 * that itself contains slashes (e.g. `openrouter/anthropic/claude-3-opus`)
 * is preserved verbatim as `id`. opencode's API rejects this raw string form
 * outright (`session.create` expects the parsed object), so callers must
 * always parse the convention string before calling `create`.
 *
 * @param {string} modelString Convention string, e.g. `"anthropic/claude-3-opus"`
 *   or `"anthropic/claude-3-opus#thinking"`.
 * @returns {{ providerID: string, id: string, variant: string }} The parsed
 *   `Model.Ref`. `variant` defaults to `"default"` when the string omits
 *   `#variant`.
 * @throws {Error} If the provider segment or the model segment is missing.
 */
function parseModelString(modelString) {
  const hashIndex = modelString.indexOf("#");
  const withoutVariant =
    hashIndex === -1 ? modelString : modelString.slice(0, hashIndex);
  const variant = hashIndex === -1 ? "default" : modelString.slice(hashIndex + 1);

  const slashIndex = withoutVariant.indexOf("/");
  const providerID = slashIndex === -1 ? "" : withoutVariant.slice(0, slashIndex);
  const id = slashIndex === -1 ? "" : withoutVariant.slice(slashIndex + 1);

  if (!providerID || !id) {
    throw new Error(
      `Invalid model string "${modelString}": expected "provider/model[#variant]"`,
    );
  }

  return { providerID, id, variant };
}

export { parseModelString };
