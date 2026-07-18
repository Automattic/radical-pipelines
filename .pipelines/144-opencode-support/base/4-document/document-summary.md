# Document Summary

## What

The Document phase brought RP's prose documentation in sync with the build phase's addition of opencode v2 as a second supported agentic coding tool. Four surfaces were updated:

- **`README.md`** — a new `## opencode plugin install` section under `# Project Usage` (sibling to `## Claude Code plugin install`) documenting install, update, and the version surface; the Project Usage opener and the Configuration paragraph reframed for two peer tools plus the standalone skill; and a tool-mismatch note added to the `.rp.md` paragraph.
- **`CONTRIBUTING.md`** — a "The opencode integration suite" subsection documenting `npm run test:opencode` (and `--network-smoke`); `opencode/**` added to the release-relevant changeset-path list; the distribution sentence updated to name the opencode plugin entry point; and "Integrating an agentic coding tool" extended to cite opencode as the second realized tool.
- **`website/index.html`** — meta description and keywords, the CLI count stat (1→2 CLIs), the "what it does" lede, and the Why-now card updated to present opencode alongside Claude Code; a new opencode "Install in one line" block; and the install-note caption split into per-tool Claude Code / opencode links to the README anchors.
- **`package.json`** — the `description` string now names RP as a Claude Code plugin, an opencode plugin, and a standalone agent skill.

## Why

The build phase deliberately deferred the owner-facing install/update/version-surface procedures and every prose documentation surface to this phase. Without it, the largest gap was a README that mentioned no opencode support at all — leaving `opencode.md`'s "the README's opencode section" pointer dangling — and CONTRIBUTING/website/package metadata that still framed RP as a Claude-Code-only distribution. The phase closes those gaps so an opencode owner has a documented install/update/version path and every public-facing description reflects the now-two-tool reality.

## How

Each surface was handled by one document-writer task (Tasks 1–5, README carrying two: install section then the two-tool reframing). Every documented value was grounded in shipped code rather than restated from the design: the install shape and `opencode2 service restart` from the design's "Install configuration"; `pin.json`'s `cli`/`plugin` fields; `rp_status`'s `pluginVersion`/`pin` fields and the three literal pin-comparison outcomes from `opencode/plugin.mjs`; the `~/.config/opencode/agents/` materialization target; the `test:opencode` script and its temp-dir version-keyed CLI cache and `--network-smoke` network requirements from `scripts/opencode-integration/`; and `opencode/**` from `.changeset/config.json`. The website install block and cross-repo links were kept consistent with the README procedure and its heading anchors.

## Key decisions

- The README opencode section sits at a stable heading/anchor (`## opencode plugin install`) so both `opencode.md`'s prose pointer and the website's `#opencode-plugin-install` link resolve to it.
- CONTRIBUTING and `website/**` are not release-relevant changeset paths, so the phase added no new changeset; the branch's existing `minor` changeset already covers the release-relevant `README.md` and `package.json` edits.
- The repository's own `.rp.md` was left carrying only the Claude Code section by design (a single `.rp.md` serving two tools is out of scope per the spec); the README instead documents the tool-mismatch guard.

## Known limitations

- The owner-conversational flows the README procedures assume (setup dialogue, mismatch dialogue, monitor-driven recovery, full five-phase run, resume) are composed of build-verified mechanics but were not driven as live LLM sessions; the procedures document the verified mechanics.
- The `--network-smoke` install/update channel and hosted-model turns run at release cadence (a `v<version>` release tag is a precondition), not in the default hermetic suite.
