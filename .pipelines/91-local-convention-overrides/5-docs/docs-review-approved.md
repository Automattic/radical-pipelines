# Docs Review

## Verdict: approved

## Batch scope

Tasks reviewed:

- **Task 1: Reconcile the README "Configuration" narrative with the local-override overlay** — a light prose pass over the two `## Configuration` paragraphs that previously framed the committed `.rp.md` as the project's *single/only/whole* convention source, so the section reads coherently alongside the standalone `.rp.local.md` paragraph the code phase (code-plan Task 5) already landed.

## Summary

The batch is a single, tightly-scoped narrative-coherence pass and it lands cleanly. The diff (`git diff d568184..HEAD`) touches `README.md` only — 2 insertions, 2 deletions — and exactly the two paragraphs the doc-plan named: the section's opening paragraph (line 153) and the later "single merged" paragraph (line 169). The old source-singularity framing ("Conventions live in a single merged `.rp.md` file" and "A single project keeps everything in one merged `.rp.md`") has been softened to a committed-shared-source-optionally-layered-by-a-local-overlay framing, with a forward "(see below)" pointer to the standalone `.rp.local.md` paragraph. The mechanism remains described in exactly one place (the code-phase standalone paragraph at line 159), which carries the single link to the canonical `local-overrides.md`; the reconciled paragraphs add only a one-clause mention and a forward pointer, introducing no new normative override detail. Every concrete claim retained or introduced in the edited paragraphs checks out against the shipped code. All four per-task Acceptance criteria are met, scope was respected, and the audience (a developer/team forming an accurate mental model of where conventions come from) is well served.

## Checks

| Check | Command | Result |
| ----- | ------- | ------ |
| Batch diff is README-only and minimal | `git diff d568184..HEAD --stat` | PASS — `README.md \| 4 ++--`, 1 file, 2 insertions / 2 deletions |
| Only the two doc-plan-scoped paragraphs changed | `git diff d568184..HEAD -- README.md` | PASS — only line 153 (opening) and line 169 ("single merged") changed; standalone `.rp.local.md` paragraph (159), setup paragraph (155), agent-models paragraph (157), and all sections outside `## Configuration` untouched |
| No residual sentence implies `.rp.md` is the *only/whole* convention source | `grep -niE "single\|only\|whole\|everything in one\|sole source" README.md` | PASS — remaining hits in the section are write-timing ("writes `.rp.md` only after the owner confirms", 155) and CLI-count ("single-CLI consumer" / "only multi-CLI consumer", 169), not source-singularity |
| Mechanism described once; single canonical-doc pointer | `awk 'NR>=151 && NR<=170' README.md \| grep -niE "local-overrides\|rp\.local\|see below\|local override"` | PASS — full mechanism + the lone `local-overrides.md` link live only in the standalone paragraph (159); reconciled paragraphs add a one-clause mention + a "(see below)" forward pointer, no duplication or competing link |
| Cross-link / dogfood-file targets resolve | `test -f .rp.md && test -f skills/radical-pipelines/reference/conventions/local-overrides.md && test -f skills/radical-pipelines/reference/conventions/setup.md` | PASS — all exist |
| Dogfood `.rp.md` matches the retained structural claim in line 169 | `grep -nE "^## \|^# \|### " .rp.md` | PASS — `## Shared conventions` (managing tasks, pipeline slugs, artifact folders, commit format) followed by per-tool conventions (worktrees, branch names, team spawning, health monitoring); `.rp.md:3` states "the per-tool sections add conventions specific to Claude Code and Pi" |
| `.rp.local.md` git-ignored (supports the overlay framing) | `grep -n "rp.local" .gitignore` | PASS — `.rp.local.md` entry present |

Documentation-as-code; the host project enumerates no doc test runner or doc gates, so the accuracy spot-check below is the sole verification gate per the doc-plan's stated nature of the work.

## Accuracy spot-check

Verified concrete claims in the two edited paragraphs (the doc-writer's responsibility) against the shipped code:

- **Line 153 — "A project's shared conventions live in a committed `.rp.md` file ... an individual developer can optionally layer a restricted subset of local overrides on top of it (see below)."** Accurate against spec req 12 (the overridable set is a restricted subset) and against the canonical `local-overrides.md:9` ("adjust a restricted subset of conventions for their own working copy or machine without touching the committed `.rp.md`"). "Committed `.rp.md`" matches `local-overrides.md:12` ("the same directory as the committed `.rp.md`"). The "(see below)" pointer resolves correctly to the standalone `.rp.local.md` paragraph immediately below at line 159 — no broken or competing pointer introduced.
- **Line 169 — "A project's committed `.rp.md` is organized as a shared section (issue tracking, pipeline slug format, artifact folder, commit format, Linear updates, push behavior) followed by a per-tool section ... (worktrees, branch names, team spawning, agent models, health monitoring)."** The structural claim is preserved verbatim from the pre-edit text (only the source-singularity lead-in was softened) and is accurate against the shipped dogfood `.rp.md`: `## Shared conventions` containing `### Managing tasks`, `### Pipeline slugs`, `### Artifact folders`, `### Commit format`, then per-tool conventions `### Worktrees`, `### Branch names`, `### Team spawning`, `### Health monitoring`; `.rp.md:3` confirms "the per-tool sections add conventions specific to Claude Code and Pi." The `[`.rp.md`](./.rp.md)` link target exists.
- **Scope guard — the standalone `.rp.local.md` paragraph (line 159) is out of this task's scope but its claims were cross-checked** to confirm the reconciled paragraphs do not contradict it: its overridable subset (agent models, health-monitoring cadence, Issues access-mechanism) and locked set (commit format, artifact folder, pipeline slug, branch/worktree naming, Issues tracker identity, tool-dictated forms) match `local-overrides.md:54-60`, and its `local-overrides.md` link target exists. The reconciled paragraphs and this standalone paragraph read as one coherent passage with no contradiction.

## Issues

None.
