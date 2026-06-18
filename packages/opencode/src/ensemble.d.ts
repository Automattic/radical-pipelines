// `@hueyexe/opencode-ensemble` ships no type declarations (no `types` field, no
// bundled `.d.ts`). Its default export is typed `Plugin` in its own source
// (`const plugin: Plugin = async (input) => {…}`), so we declare that contract
// locally rather than letting the import fall back to `any`.
declare module "@hueyexe/opencode-ensemble" {
  import type { Plugin } from "@opencode-ai/plugin"
  const plugin: Plugin
  export default plugin
}
