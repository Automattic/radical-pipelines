# Docs Summary — opencode support

## What

Documentation for adding **opencode** as a third supported agentic coding tool, at parity with Claude Code and Pi. Updated five owner/contributor-facing prose surfaces so every place that named the supported set as a closed pair, described installation/packaging, or enumerated release-relevant and version-bearing paths now reflects the shipped opencode sub-package and the third install path:

- **`README.md`** — "Project Usage" intro now names all three tools + the standalone skill; new `## opencode package install` and `## opencode usage` sections; "Dependency bundling" now describes two publishable packages and the shared-source build step; "Configuration" gains an opencode per-tool convention clause; "Changelog and versioning" lists the opencode sub-package manifest as a version-synced target.
- **`website/index.html`** — meta description + keywords include opencode; hero stats corrected to 17 agents / 3 CLIs; the "which CLI" demo copy and "Tooling caught up" line name the trio; the Install grid gains an opencode block and the install-note covers opencode destinations + the Node/Bun prerequisite.
- **`CONTRIBUTING.md`** — `changedFilePatterns` adds `packages/**`; version-sync prose names `packages/opencode/package.json`; the "private / no npm publish" framing is reconciled with the publishable sub-package.
- **`.changeset/opencode-support.md`** — a new feature changeset (`@automattic/radical-pipelines: minor`).
- **Root `package.json` `description`** — reworded from "Pi package" to a workspace root shipping across Claude Code, Pi, and opencode.

## Why

The code phase makes opencode a third supported tool, a third install path, and the repo's second publishable package (a workspace root). Every doc statement that fixed the tool set at two, called the repo solely a Pi package, or enumerated the version-sync targets and release-relevant paths went stale at that moment. These edits keep the owner- and contributor-facing prose true for all three tools and record the feature for the next release.

## How

Each opencode addition mirrors the existing Pi documentation in shape: the README opencode sections sit parallel to the Pi sections and link out to `reference/conventions/opencode.md` rather than restating it; the Configuration clause matches the Claude Code/Pi clauses; the website install block matches the existing per-tool blocks. Concrete claims were written from the shipped code, not invented: package name `@automattic/radical-pipelines-opencode`, the single-`plugin:[]` meta-plugin re-exporting pinned `@hueyexe/opencode-ensemble`, the Node ≥ 24 / Bun ≥ 1.0 prerequisite, the "meta-plugin only, never ensemble alongside" rule, the artifact-storage-keyed install destinations, the `build.mjs` `prepack` shared-source step, the `sync-version.mjs` target list, and the `changedFilePatterns` set. The feature changeset uses `minor` per the CONTRIBUTING bump table (new feature, pre-1.0).

## Key decisions

- **Hero-stat correction.** While editing the website hero-stats block for the CLI count (2 → 3), the adjacent "agents shipped" stat was corrected from the stale 15 to the real 17 (verified against `agents/*.md` and the README's enumerated profiles) rather than leaving a known-false number in a block already being touched.
- **Demo artifact left untouched.** The reconstructed demo terminal card label (`terminal · claude-code`), its log, and the "Run it yourself →" caption link target depict one real captured run, not the supported-tool list, so they were left as-is per the doc plan.

## Known limitations

- The release flow does not publish the `packages/opencode/` sub-package to npm even though its manifest is npm-publishable; the docs state this explicitly so the publishable manifest is not mistaken for an active registry release.
