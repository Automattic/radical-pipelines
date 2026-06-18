# Doc Plan Review 2 — Approved

## Verdict

**Approved.**

## Summary

The revision resolves the single blocking issue from review 1 and addresses both
non-blocking notes, introducing no new defects. The plan remains strong on every axis
the first review already credited: thorough traceability to spec/design/code-plan,
an exhaustive and correctly-located surface inventory, drift-resistant per-task
acceptance (oracle = shipped code; no function names or verbatim wording baked in),
no code tasks, and clean granularity/ordering (all seven tasks independent except the
changeset/description timing notes). The earlier-accepted surfaces (README Project
Usage / Configuration / versioning, CONTRIBUTING, the feature changeset, root
`package.json` description, and the `.rp.md` line-3 exclusion) are untouched by this
revision and remain correct.

I re-verified the three review-1 items against the revised Task 4 and the live
`website/index.html`:

1. **Blocking item resolved.** The hero stat `<strong>2</strong><span>CLIs
   supported</span>` (`website/index.html:109`) is now enumerated in Task 4's
   "Surfaces in scope" bullet (plan line 14), its Files-to-change (plan line 73), and
   its Sections-scope (plan line 74: "update the 'CLIs supported' stat so its count
   reflects the number of supported tools after this feature (three) … the count must
   not assert RP supports exactly two tools"), with a matching acceptance bullet (plan
   line 81). A writer following the enumerated scope can no longer ship with line 109
   still reading "2." The fix is drift-resistant: it pins the surface and pairs the
   concrete "three" with the standing "asserts no closed pair" guard, so it survives a
   framing shift. I confirmed all four closed-pair surfaces on the site are now in
   scope — :9 meta description, :109 hero stat, :204 demo "runs in your CLI" line, :279
   "Tooling caught up" line.

2. **Non-blocking note 2 (`15 agents shipped`, :108) — explicit decision made.** The
   plan now instructs the writer to correct the adjacent "agents shipped" stat to "the
   count the README enumerates" (plan line 74; acceptance line 82). This is exactly the
   "say which, don't silently fix or silently skip" the first review asked for, and the
   oracle is drift-resistant (the README enumeration, not a hardcoded number). I
   confirmed `agents/*.md` = 17 on disk, matching the README Pi-package list, so the
   stale `15` is genuinely wrong and the correction is warranted. Correcting an
   adjacent stat in a block the writer is already editing is not scope creep.

3. **Non-blocking note 3 (demo caption link, :232) — ambiguity removed.** Plan line 74
   now states the "Run it yourself →" link target (the README `#claude-code-plugin-
   install` anchor) stays valid because Task 1 keeps that section, and is explicitly
   left untouched (acceptance line 84). I verified the anchor is real: README:64
   `## Claude Code plugin install` slugifies to `claude-code-plugin-install`, and Task 1
   preserves that section. No action beyond "leave untouched" is needed, and the plan
   now says so.

## Issues

### Blocking

None.

### Non-blocking

None outstanding. Review-1 items 2 and 3 are addressed in the revision (see Summary);
item 1 is fully resolved.

### Accepted (verified, recorded so it is not re-raised)

- **Hero "agents shipped" correction is in-scope and drift-resistant.** Fixing the
  pre-existing `15` (true count 17, per `agents/*.md` and the README list) while the
  writer is already editing the hero-stats block is a low-cost, clearly-oracled
  in-block correction, not scope creep. The plan correctly defers to "the count the
  README enumerates" rather than baking `17` into the acceptance.
- **`.rp.md` line-3 exclusion remains correct** (re-confirmed: code-plan Tasks 1–7
  edit `setup.md`, `health-monitoring.md`, `opencode.md`, `packages/opencode/**`, root
  `package.json`, `sync-version.mjs`, `.changeset/config.json` — none edits `.rp.md`).
- **All other surfaces remain complete and correctly located**, and the revision
  changes only Task 4's website enumeration plus the caption-link clarification; it
  adds no code task, no scope creep into code-plan-owned files, and no contradiction
  with the surfaces the first review verified.
