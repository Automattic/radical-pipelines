import type { Plugin } from "@opencode-ai/plugin"
import ensemble from "@hueyexe/opencode-ensemble"

/**
 * Radical Pipelines meta-plugin for opencode.
 *
 * The single `plugin:[]` entry an owner lists to obtain the team layer. It
 * re-exports the third-party `@hueyexe/opencode-ensemble` coordination layer:
 * it initializes ensemble exactly once with the plugin input and exposes its
 * hooks (spawn-by-name, peer-to-peer messaging, the shared task board, per-agent
 * model selection, and always-on supervision) as its own.
 *
 * ensemble must be listed ONLY through this meta-plugin, never alongside it in
 * `plugin:[]`: a second initialization arms a second watchdog interval and
 * collides on the dashboard port (EADDRINUSE on 4747).
 *
 * RP additions are merged after ensemble's hooks (`{ ...ensembleHooks, ...RP }`)
 * so the merge order is the documented extension point; none are needed today.
 */
const RP = {}

const plugin: Plugin = async (input) => {
  const ensembleHooks = await ensemble(input)
  return { ...ensembleHooks, ...RP }
}

export default plugin
