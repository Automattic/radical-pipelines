# Spec research — Recommend standard remote names when setting up artifacts-in-fork mode

## Rough idea

When the orchestrator sets up `artifacts-in-fork` mode (in `skills/radical-pipelines/reference/conventions/setup.md`), the current "Identify the remotes" step only asks the owner to confirm which existing remote is the upstream (canonical) and which is the fork, then records whatever names already exist (e.g. it might record `fork`/`canonical` or any arbitrary names the owner happens to have). It does not recommend a conventional naming scheme, and it never offers to rename a remote.

This feature changes the setup flow so the orchestrator:

1. Recommends the GitHub-standard naming scheme — fork remote → `origin`, canonical/upstream remote → `upstream`.
2. Phrases it as a recommendation the owner can decline ("we recommend naming them this way; want us to rename them, or leave them as they are?").
3. Never renames silently — always confirms first, because renaming changes the owner's local git config.
4. Records the resolved (final) remote names in the convention so downstream steps (PR-opening, cherry-pick, push) reference them unambiguously.

Where this lives: `skills/radical-pipelines/reference/conventions/setup.md` (the `artifacts-in-fork` branch of "Artifact storage" convention, the "Identify the remotes" and "Capture" subsections). The artifact produced by this pipeline is an edit to that skill reference document — this is a documentation/spec change to the orchestrator's instructions, not application code.

Key existing facts gathered from the codebase:

- `setup.md` "Identify the remotes" currently: runs `git remote -v`; if 2+ remotes, asks owner to confirm which is upstream/fork (notes the GitHub convention that `origin` is usually the fork and `upstream` the canonical, "but do not assume — always confirm"); if only one remote or no fork, walks the owner through creating a fork and adding it as a remote, then re-runs `git remote -v` to confirm assignment.
- `setup.md` "Capture" currently records: `mode`; for fork mode `upstream` (name + URL) and `fork` (name + URL), upstream branch format, upstream commit format.
- Downstream consumers of the remote names: the `artifacts-in-fork` explanation block in `setup.md` references pushing to `upstream`, never pushing `.rp.md`/artifacts to `upstream`, cherry-picking code commits to a clean branch pushed to `upstream`, opening the PR in `upstream`. `pipeline-versioning.md` references "the fork's main in artifacts-in-fork mode". The orchestrator's run close-out (in `.rp.md`) pushes "the pipeline branch to the remote" (the fork).
- This repo's own `.rp.md` is `artifacts-in-repo` mode, so it records no remotes — the fork-mode logic lives only in the shipped skill reference.

## Q&A

### Q1 — Git remote rename mechanics, name collisions, and canonical starting states

**Question (3 parts):** (1) What does `git remote rename <old> <new>` actually update — tracking refs, branch tracking config, push/pull behavior, any dangling config? (2) What happens on a target-name collision, and what is the safe ordering for the `origin`=canonical + `fork`=fork swap? (3) What are the common real-world starting states, and what does `gh repo fork` name remotes by default?

**Answer (empirically verified, git 2.50.1 / gh 2.78.0):**

**1. Rename mechanics — comprehensive and safe in the common case.**
- (a) Remote-tracking refs migrate: `refs/remotes/<old>/*` → `refs/remotes/<new>/*` (including `<old>/HEAD`). Verified.
- (b) Branch tracking config migrates: `branch.<name>.remote` pointing at `<old>` is rewritten to `<new>` automatically. `branch.<name>.merge` (holds `refs/heads/main`, remote-agnostic) correctly stays unchanged.
- (c) Push/pull keeps working with no further action: a local branch whose upstream was `<old>/main` transparently tracks `<new>/main`; `git push`/`git pull`/`@{upstream}` all resolve. Verified end-to-end against a bare remote.
- (d) The ENTIRE `remote.<old>.*` section migrates to `remote.<new>.*`, including arbitrary custom keys (`pushurl`, `proxy`, custom keys all moved; zero `remote.<old>.*` residue). The ONE documented exception: a NON-DEFAULT fetch refspec whose destination is outside `refs/remotes/<old>/*` is NOT rewritten — git prints `warning: Not updating non-default fetch refspec ...`, exits 0, leaves it stale. Rare (requires hand-edited refspec), benign for our flow. Man page: "All remote-tracking branches and configuration settings for the remote are updated."

**2. Name collisions — rename ERRORS if `<new>` already exists.** Message: `error: remote <new> already exists.` Exit status 3 (per man page EXIT STATUS). It is a no-op on failure (nothing changed). Verified both directions.
- **Ordering implication:** from the common state `origin`=canonical, `fork`=the-fork, applying the recommended scheme is a TWO-rename swap and order matters: (1) `git remote rename origin upstream` (frees `origin`), then (2) `git remote rename fork origin`. Doing step 2 first collides and errors (exit 3). There is no atomic swap in git; it's two sequential commands. **Rule: free the target name first.**

**3. Canonical starting states — two dominant configs; one already matches.**
- **State A — already-standard:** fork=`origin`, canonical=`upstream`. Produced by `gh repo fork --clone` and the common "clone your own fork, add upstream" flow. Recommendation is a NO-OP here; orchestrator should detect and just record names, not propose renames.
- **State B — inverted/non-standard:** canonical=`origin`, fork=other name (e.g. `fork`/`myfork`). Produced by cloning the canonical directly then adding the fork. This is the case that benefits from the recommendation; it's the two-rename swap.
- **gh defaults (verified from `gh repo fork --help`):** "By default, the new fork is set to be your `origin` remote and any existing origin remote is renamed to `upstream`." So `gh repo fork` ALREADY implements the recommended scheme automatically (including the `origin`→`upstream` rename) WHEN it adds the remote during fork creation. `--remote-name` (default `origin`) overrides. Caveat: a fork added MANUALLY later (not via gh's auto-add) can produce State B.
- **Other states (lower frequency):** single remote / no fork yet (handled by the existing "create a fork" branch at setup.md:130); fork present but canonical missing; non-standard names on BOTH (e.g. `mine`/`theirs`). The recommendation generalizes: identify which remote plays which role (by URL/owner, confirmed with owner), then offer to rename whichever don't already match `origin`(fork)/`upstream`(canonical), applying free-the-target-first ordering for any swap.

**Sources:** git-remote(1) man page (git 2.50.1) — `rename` subcommand wording + EXIT STATUS=3 on existing remote; `gh repo fork --help` (gh 2.78.0) — default remote naming + `--remote-name`; empirical experiments in temp repos (ref migration, branch.remote rewrite, push/pull-after-rename, custom-key migration, collision error/exit-3, two-rename ordering, non-default-refspec warning).

### Q2 — Inventory of every downstream consumer of remote names (role vs. hardcoded literal)

**Question:** Enumerate every place in the repo that references a git remote by name or role, classify each as (i) a logical ROLE reference that resolves through the captured config, or (ii) a HARDCODED literal that breaks if the owner's remote isn't named that. Determines whether the spec must parameterize scattered literals or whether the abstraction already exists.

**Answer (full-repo grep over agents/, skills/, .rp.md, AGENTS.md, CONTRIBUTING.md, README.md, .github/, website/; excluded `.rp/pipelines/` and lockfiles):**

**Core finding — the abstraction already exists.** The captured config keys in `setup.md` are literally `upstream:` and `fork:`, each storing "name and URL" (setup.md:152-153). So the config records BOTH the role (the key) AND the resolved remote name (the `name` field). Every operational reference elsewhere uses the ROLE words `upstream`/`fork` (or the role-neutral "the remote"), which resolve through that config. There is NO code path that executes a literal `git push upstream`/`git push origin` against the configured remote. So an owner who declines the rename (keeping e.g. `theirs`/`mine`) is already structurally handled IF prose resolves the role to the recorded `name`.

**Classified inventory (all type (i) ROLE unless noted):**
- `setup.md` fork-mode block: :115 "never pushed to `upstream`", :116 "upstream PR", :118 "clean branch name for `upstream`", :121 "Pushes the clean branch directly to `upstream`" (this is the ONE operational push — must resolve to the recorded upstream remote name), :122 "Opens the PR in `upstream`", :123 "lives in `upstream`, not in the fork", :138 "pushed to `upstream`", :179 "never push it to upstream", :187 ".gitignore lives on the fork" — all ROLE.
- `setup.md:129` "By default `origin` is usually the fork and `upstream` the canonical repo, but do not assume — always confirm." — the ONLY place stating the literal-name convention, as a soft hint. **This is exactly the sentence the feature replaces/expands** with the recommend-and-rename flow.
- `setup.md:152-153` Capture `upstream: name and URL` / `fork: name and URL` — the resolution mechanism; the `name` field is (or should be made) authoritative.
- `pi.md:63` "fork branches ... cherry-picks to upstream exclude them ... push agents to the fork" — ROLE (English).
- `pipeline-versioning.md:44,52` "the fork's main in `artifacts-in-fork` mode" — ROLE. (:51,:54 "fork" = *pipeline* forks, not the git remote — irrelevant.)
- `.rp.md:28,34` run close-out "push the pipeline branch to the remote" — ROLE-NEUTRAL ("the remote", no name); in fork mode resolves to the fork remote. Note: this repo's own `.rp.md` is artifacts-in-repo, so it has NO fork-mode block to serve as a live example.
- `resume-pipeline.md:36` "a branch already on the remote" — ROLE-neutral. (:34 "forking" = pipeline fork — irrelevant.)
- `agents/` (all 17 phase agents): ZERO remote references. Only hit was spec-analyst.md:6 "upstream of work-on-an-issue.md" = English ordering. Confirms agents never touch remotes; the orchestrator owns all push/PR ops (setup.md:141 "consulted by the orchestrator only ... never passed down to agents").
- `SKILL.md`: zero remote references.
- `CONTRIBUTING.md:219,223,46,274` `git push origin trunk` etc. — type (ii) HARDCODED literals, but OUT OF SCOPE: these are radical-pipelines' OWN maintainer release/changeset instructions, unrelated to the orchestrator's fork-mode handling. The feature must NOT touch them.

**Bottom line for scope:**
1. NO type-(ii) hardcoded literals inside the pipeline logic would break on non-standard names. Every operational reference is ROLE-based.
2. The spec does NOT need to parameterize a scatter of literals. The abstraction already exists via the captured `name` per role.
3. The spec SHOULD: (a) add the recommend-and-rename step; (b) make explicit that the recorded `name` field is the source of truth downstream operations resolve through (esp. setup.md:121 push-to-upstream and the .rp.md:34 fork-push); (c) replace the soft "by default origin is usually the fork" hint at setup.md:129.
4. Gap to surface: setup.md never shows a concrete worked example of the captured `upstream`/`fork` block, and this repo's .rp.md can't serve as one (artifacts-in-repo). A worked example would remove residual ambiguity about whether the stored value is role or literal.

**Sources:** full-repo grep (`upstream`, `\borigin\b`, `\bfork\b`, `git push|remote|fetch`, `pushurl`, `cherry-pick`, `pull request|gh pr`) over listed paths; line-verified reads of setup.md, pi.md, pipeline-versioning.md, .rp.md, resume-pipeline.md, agents/*; confirmed this repo's .rp.md has no artifacts-in-fork block.

### Q3 — Can the orchestrator auto-detect which remote is the fork vs. canonical?

**Question:** To recommend "fork→origin, canonical→upstream," the orchestrator must know which remote plays which role. Can it auto-detect roles via gh (fork/parent), or must it always ask? Confirm the gh fields, URL normalization, and the failure modes that force a fallback to asking.

**Answer (empirically verified against live GitHub, gh 2.78.0, using a real fork):**

**1. Fork/parent detection via gh — yes, two interchangeable paths.**
- `gh repo view <repo|url> --json isFork,parent,nameWithOwner,url,sshUrl`: `isFork` is a boolean (verified true for fork, false for non-forks). `parent` is an OBJECT for a fork, `null` otherwise. **Correction to my assumption:** there is NO `parent.nameWithOwner`. The nested shape is `parent: { name, owner: { login } }`. To get the canonical `owner/repo` you must COMPOSE `parent.owner.login + "/" + parent.name`. (`nameWithOwner` exists only at top level for the queried repo.)
- REST `gh api repos/<owner>/<repo>`: returns `fork` (bool), `parent.full_name` (immediate upstream, flat `owner/repo`), `source.full_name` (ultimate root of the fork network; equals parent for a one-level fork, differs for a fork-of-a-fork), plus `clone_url`/`ssh_url`. REST gives the flat name directly — easier than the GraphQL compose step.
- Recommendation: prefer `gh repo view <url> --json isFork,parent` and compose; use REST `source` only to handle fork-of-a-fork chains (edge case).

**2. Mapping remotes to roles by URL — deterministic; gh removes the normalization burden.**
- KEY FINDING: `gh repo view <ARG>` accepts a RAW REMOTE URL and normalizes it itself. Verified all four forms resolve to the same `owner/repo`: `https://github.com/o/r.git`, `git@github.com:o/r.git` (scp-style ssh), `https://github.com/o/r` (no `.git`), `ssh://git@github.com/o/r.git`. So the orchestrator can pipe `git remote get-url <name>` straight into gh — no custom regex needed. (If a manual normalizer is ever wanted: strip trailing `.git`; map both `git@github.com:OWNER/REPO` and `https://github.com/OWNER/REPO` to `OWNER/REPO`.)
- **Deterministic role-mapping algorithm (2-remote case):** for each remote resolve URL→`owner/repo`+`isFork`+parent via gh; the FORK is the remote with `isFork==true` whose composed parent equals the OTHER remote's `owner/repo`; the CANONICAL is that other remote. If exactly one such fork↔parent pairing exists → roles unambiguous → make a concrete recommendation. Otherwise → ask. Robust to whatever local NAMES are in use, because the decision rests on repo identity + the fork relationship, not on the remote name.

**3. Ambiguity / failure cases — fall back to asking in every one.** (gh returns clean nonzero exit so the orchestrator can branch on it.)
- (a) Neither remote is a fork of the other (unrelated repos, or both forks of a third) → no pairing → ASK.
- (b) Both remotes point at the SAME repo → no fork relationship between them → ASK (possibly warn setup expects two distinct repos).
- (c) Canonical/fork not on GitHub (GitLab/Bitbucket/self-hosted) → verified `gh repo view` on a gitlab URL fails with GraphQL error, exit 1 → ASK. (GH Enterprise Server works only if that host is authed via `gh auth login --hostname`.)
- (d) Offline / no gh auth / API error / rate-limited → gh call fails nonzero → treat ANY nonzero gh exit as "detection unavailable" → ASK. (Offline reasoned from the same exit-1 error path, not directly simulated — flagged.)
- (e) Fork's parent is a THIRD repo not among the configured remotes → `isFork:true` but parent matches no configured remote → ASK (could surface "your fork's upstream is <parent>, not configured as a remote").
- (f) Exit-code contract: `gh repo view <url> --json …` → exit 0 + JSON on success; exit 1 on nonexistent repo, non-GitHub host, unauth/offline/API errors. Verified for valid/nonexistent/non-github.
- (g) More than two remotes → detection still works pairwise, but if multiple plausible pairings or extra remotes muddy it → ASK which two are the relevant fork/canonical.

**Conclusion:** Auto-detection is an ENHANCEMENT that sharpens the recommendation (the orchestrator can name which remote is which and propose concrete renames), with OWNER-CONFIRMATION as the guaranteed floor. Spec rule: attempt detection; if exactly one unambiguous fork↔canonical pairing → present a concrete recommendation, still requiring owner approval before any rename; in EVERY failure/ambiguity mode → fall back to asking the owner (today's setup.md:129 behavior). Never guess; never rename without approval.

**Sources:** `gh repo view <repo|url> --json isFork,parent,nameWithOwner,url,sshUrl` on a real fork (parent object shape) and on non-forks (isFork:false, parent:null); `gh api repos/<owner>/<repo>` (fork/parent/source full_name); URL normalization across https/.git, scp-ssh, no-.git, ssh:// → same owner/repo; failure modes via gitlab URL + nonexistent repo → exit 1, valid → exit 0; gh 2.78.0. Offline case reasoned from the shared exit-1 path (flagged, not directly reproduced).

### Q4 — Premise check: is fork→`origin`, canonical→`upstream` consistent with the push-to-upstream PR flow?

**Question:** This tool's fork-mode PR flow pushes the clean branch directly to `upstream` and opens the PR with its source branch in `upstream` (setup.md:121-123) — unusual vs. the standard contributor flow. Is the recommended naming still consistent? Does fork=`origin` risk misrouting the artifact push? Any convention nuance for a maintainer with write access to both?

**Answer — the premise is VALID (not false); one latent doc gap surfaced.**

**1. No contradiction with naming; one hidden assumption.** Remote NAMES are just labels (name→URL); they impose no push direction. Where commits go is set by the EXPLICIT push target the orchestrator uses (`git push <remote> <branch>`), not by the label. So naming the canonical `upstream` AND pushing the clean PR branch to it are orthogonal and both true at once. The naming says WHICH repo each remote is; the PR flow says WHERE the orchestrator pushes. **Hidden assumption (load-bearing, currently UNSTATED):** setup.md:121-123 (push clean branch directly to `upstream`, PR source lives in `upstream`) is only possible if the owner has WRITE/PUSH access to the canonical repo. This is NOT the standard outside-contributor flow (push to your fork, open a cross-fork PR). Repo-wide grep for write/push access/maintainer/permission across skills/, .rp.md, agents/ → ZERO hits. So this prerequisite is nowhere stated; purely implied. **Independent of #68 and arguably out of its scope**, but the recommendation sits on top of it. Surfaced as an observation, not a blocker.

**2. Naming the fork `origin` does NOT risk misrouting the artifact push — it is the safest mapping.** Verified git mechanics: explicit `git push <remote> <branch>` always routes by the named remote regardless of the `origin` label; a plain `git push` (no remote) is governed by the branch's tracking config `branch.<name>.remote`, with `origin` only as the fallback for a branch lacking an upstream. Pipeline artifact branches are created and first pushed against the fork, so their tracking remote IS the fork. Naming the fork `origin` means even a bare push/pull falls back to the fork (where artifacts belong), never the canonical. The only push to `upstream` is the deliberate explicit clean-branch push at PR time (setup.md:121). Net: artifact branches → fork (`origin`) ✓; clean PR branch → `upstream` ✓; no misroute path. (Spec should still state pushes are always explicit-by-remote in fork mode.)

**3. Convention holds for a maintainer with write access to both.** The fork→`origin`/canonical→`upstream` convention is defined by the fork RELATIONSHIP, not by permissions. GitHub's official "Configuring a remote repository for a fork" docs: `origin` = your fork, `git remote add upstream <ORIGINAL-OWNER/REPO>` = canonical. `origin` tracks "where I work" (the fork, where all pipeline work happens per setup.md:114), `upstream` the occasional deliberate push target — which matches this tool's model exactly. Write access to both doesn't invert it. Subtlety: the convention is unambiguous only when a genuine fork relationship exists; a maintainer with two remotes of the same canonical and no fork link trips Q3 failure modes (a)/(b) and the orchestrator correctly falls back to asking.

**Bottom line:** fork→`origin`, canonical→`upstream` is (1) the documented GitHub convention, (2) consistent with the push-to-upstream PR flow (naming and push-direction are independent), and (3) the safest mapping for artifact-branch pushes. The one thing to optionally surface: fork mode silently assumes upstream write access (a pre-existing doc gap, independent of #68).

**Sources:** setup.md:112-123, :114-115, :121-123; .rp.md:34; repo grep for write/push access/maintainer/permission (zero hits); git push routing mechanics (explicit-by-remote vs. `branch.<name>.remote` tracking with `origin` fallback); GitHub docs "Configuring a remote repository for a fork" (origin=fork, upstream=canonical); gh enforced default (origin=fork, existing→upstream) from Q1/Q3.

---

## Consolidated Requirements

### Context and scope

This feature edits ONE shipped reference document — `skills/radical-pipelines/reference/conventions/setup.md` — specifically the `artifacts-in-fork` branch of the **Artifact storage (required)** convention (the "Identify the remotes" block at lines 127-134 and the "Capture" block at lines 148-156). The artifact this pipeline produces is a documentation/instruction change to the orchestrator's setup flow, not application code. No agent definitions, no other reference docs, and no application code need to change (per the Q2 inventory: every downstream remote reference is already role-based and resolves through the captured config; there are no hardcoded literals in the pipeline logic that would break).

The change applies only to the orchestrator's behavior during **setup** of `artifacts-in-fork` mode. It does not alter `artifacts-in-repo` mode, which records no remotes.

### Core functional requirements

R1. **Recommend the GitHub-standard naming scheme.** During `artifacts-in-fork` setup, after identifying which configured remote plays which role, the orchestrator recommends the conventional scheme: the fork remote → `origin`, the canonical/upstream remote → `upstream`. (This matches GitHub's documented fork convention and `gh repo fork`'s own default; it is the safest mapping for artifact-branch pushes.)

R2. **Phrase it as a decline-able recommendation.** The orchestrator presents the scheme as a recommendation the owner can accept or decline, e.g. "By default we recommend naming them this way. Do you want us to rename them, or leave them as they are?" The owner stays in control.

R3. **Never rename silently; always confirm first.** Because `git remote rename` changes the owner's local git configuration, the orchestrator must obtain explicit owner approval before renaming any remote. It never renames on its own.

R4. **Record the resolved (final) remote names in the convention.** Whatever names end up in use — whether the owner accepted the rename (so they become `origin`/`upstream`) or declined (so they keep their existing names) — are written into the captured fork-mode config so downstream steps reference them unambiguously. The captured config already keys remotes by ROLE (`upstream`, `fork`) and stores a `name` + URL per role; the `name` field is the authoritative resolved remote name that all downstream operations resolve through.

R5. **Attempt role auto-detection, with owner-confirmation as the guaranteed floor.** To make the recommendation concrete, the orchestrator should attempt to auto-detect which remote is the fork and which is the canonical, using `gh` fork/parent data (`gh repo view <remote-url> --json isFork,parent`, composing the parent as `parent.owner.login/parent.name`; gh normalizes raw remote URLs itself, so no manual URL parsing is required). The fork is the remote whose `isFork == true` and whose parent equals the other remote's `owner/repo`; the canonical is that parent. If exactly one unambiguous fork↔canonical pairing is found, the orchestrator presents a concrete recommendation naming which remote is which and the proposed renames. In EVERY ambiguity or failure case (neither remote is a fork of the other; both point at the same repo; a non-GitHub host; offline / no gh auth / API error — any nonzero gh exit; the fork's parent is a third repo not among the remotes; more than two remotes with no single clear pairing), the orchestrator falls back to asking the owner which remote is which — exactly today's setup.md:129 behavior. It never guesses.

R6. **Apply the rename safely when the owner accepts, respecting name-collision ordering.** Applying the recommended scheme from the common inverted state (`origin` = canonical, `fork` = the fork) is a two-rename swap, and `git remote rename` ERRORS (exit 3) if the target name already exists. The orchestrator must free the target name first: rename the canonical `origin` → `upstream` BEFORE renaming the fork → `origin`. More generally, when any rename's target name is currently taken, the orchestrator frees that name first. `git remote rename` is otherwise comprehensive (it migrates remote-tracking refs, `branch.<name>.remote` tracking config, and the entire `remote.<old>.*` section), so push/pull keep working with no further action.

R7. **Detect and skip the no-op case.** When the remotes already match the recommended scheme (fork = `origin`, canonical = `upstream` — the state produced by `gh repo fork` and the common "clone your own fork, add upstream" flow), the orchestrator recognizes it, makes no rename recommendation, and simply records the names.

R8. **Replace the soft naming hint at setup.md:129.** The existing non-binding sentence ("By default `origin` is usually the fork and `upstream` the canonical repo, but do not assume — always confirm") is superseded by the recommend-and-(optionally-)rename flow above. The "always confirm the role assignment with the owner" guarantee is preserved (now as the auto-detection fallback floor).

R9. **Make the recorded `name` field explicitly authoritative downstream.** The setup doc makes clear that the recorded `name` per role is the source of truth that downstream operations resolve through — in particular the clean-PR-branch push to the upstream remote (setup.md:121) and the run-close-out push of the pipeline branch to the fork remote (.rp.md:34). Downstream prose continues to refer to remotes by ROLE (`upstream`/`fork`), resolving the role to the recorded name; pushes in fork mode are always explicit-by-remote.

### Success criteria (measurable / checkable in the produced setup.md)

- S1. The `artifacts-in-fork` "Identify the remotes" section instructs the orchestrator to recommend fork→`origin`, canonical→`upstream` (R1).
- S2. It phrases this as a recommendation the owner can decline, with concrete example wording (R2).
- S3. It states the orchestrator must get explicit owner approval before any rename and never renames silently (R3, satisfies the prompt's stated Constraint).
- S4. It instructs recording the resolved remote names (post-decision) in the captured config, with the `name` field authoritative (R4, R9).
- S5. It describes attempting `gh`-based role auto-detection and falling back to asking the owner in every ambiguity/failure case (R5).
- S6. It specifies the safe rename ordering for the two-rename swap (free the target name first; canonical→`upstream` before fork→`origin`) and notes the collision error (R6).
- S7. It handles the already-standard no-op case without proposing renames (R7).
- S8. The old soft hint at setup.md:129 is replaced/superseded, while the "confirm the role assignment" guarantee is retained (R8).
- S9. `artifacts-in-repo` mode is unchanged; no other reference doc, agent definition, or application code is modified.

### Edge cases to cover

- E1. **Already-standard (State A):** fork=`origin`, canonical=`upstream` → no-op, just record (R7).
- E2. **Inverted (State B):** canonical=`origin`, fork=other name → recommend the two-rename swap with safe ordering (R6).
- E3. **Both non-standard names** (e.g. `mine`/`theirs`) → recommend renaming each to its standard name; apply free-target-first ordering for any collision.
- E4. **Owner declines the rename** → record the existing actual names as the resolved names; downstream resolves through the recorded `name` field (R4, R9). Nothing breaks because all downstream references are role-based.
- E5. **No fork exists yet / single remote** → existing "create a fork" branch (setup.md:130-134); when created via `gh repo fork` the remotes land already-standard (State A), so the recommendation is a no-op there. A fork added manually afterward may land in State B and gets the recommendation.
- E6. **Auto-detection cannot conclude** (non-GitHub host, offline/no auth, no fork relationship, parent not among remotes, >2 ambiguous remotes) → fall back to asking the owner (R5).
- E7. **Non-default hand-edited fetch refspec** pointing outside `refs/remotes/<old>/*` → `git remote rename` warns and leaves it stale (exit 0). Rare and benign; the orchestrator need not block on it but should not assume the warning is an error.

### Out of scope

- O1. **Parameterizing downstream literal references** — unnecessary; the role abstraction already exists (Q2). No agent definitions, `pi.md`, `pipeline-versioning.md`, or application code change.
- O2. **The latent upstream-write-access assumption** — fork mode's PR flow (push clean branch directly to `upstream`) silently assumes the owner has write access to the canonical repo. This is a pre-existing doc gap, independent of #68, and not introduced or resolved by this feature. Surfaced as an observation for a separate issue.
- O3. **`CONTRIBUTING.md` literal `git push origin` references** — these are radical-pipelines' own maintainer release docs, unrelated to the orchestrator's fork-mode handling. Not touched.
- O4. **`artifacts-in-repo` mode** — unchanged.
- O5. **Fork-of-a-fork chains** — handling multi-level fork networks (REST `source` vs `parent`) is an edge case beyond this feature; auto-detection targets the single-level fork↔parent relationship and otherwise falls back to asking.

### Open observation for later phases (non-blocking)

The setup doc currently shows no concrete worked EXAMPLE of the captured `upstream`/`fork` block, and this repo's own `.rp.md` (artifacts-in-repo) cannot serve as one. A short worked example of the captured block — showing role key, resolved `name`, and URL — would remove residual ambiguity about whether the stored value is the role or the literal remote name. Recommended for the design/docs phase to consider; not required by #68.
