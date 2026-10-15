// Entrypoint for the opencode plugin loader.
// Since opencode v2 (2026-08-30, #46105), configured plugin paths must be
// directories resolved to an index.js/index.ts entrypoint; plain file paths
// are dropped with "configured plugin path must be a directory".
// opencode resolves this directory's server entry as `server.*` before
// `index.*`, and also loads `tui.*` and `rpc.*`: no module here takes those names.
export { default } from "./plugin.mjs"
