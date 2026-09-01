# The convergence loop

The machine that runs a pipeline. Enter from triage with the route taken and the run policy known. All state words used here are defined in `state.md`.

## The loop

Repeat until the frontier is empty:

1. **Check.** Walk phases 1 → the target phase and compute the frontier — the first thing that is missing, stale, or unapproved. Within a phase the order is: the artifact, then its reviews, then (build/document) its tasks.
2. **Dispatch** on what the frontier is:
   - **Artifact missing** → producer, mode Synthesize.
   - **Artifact stale** → producer, mode Synthesize with **Input changes** (the upstream diff and the amendment record). If the producer concludes no edit is needed, apply stamp propagation instead of a new revision.
   - **A claim or findings await adjudication** → producer, mode Adjudicate.
   - **Approvals missing or stale** → a review wave.
   - **Plan fresh, tasks remain** (build/document) → workers, per the phase file.
   - **Complete through the target phase** → `close-out.md`.
3. **Stamp on landing** after every agent commit; return to 1.

A fresh session recovers by running step 1 — there is no other resume procedure.

## Dispatching

Fill the profile's template in `../../templates/` — the filled prompt is everything the agent knows beyond its profile. You compute every derived value (paths, lane ids, iteration numbers, output filenames). Spawn, seat, and address agents per the Agent spawning convention; prepare each worktree at the commit the dispatch must see. Terminate agents when their work ends.

Serve **research requests** by spawning a fresh `researcher` per question with its template; it answers the requester directly. Serve a **blocker** by fixing what it names — re-prepare the materials or the seat and re-dispatch; a broken environment you cannot fix is reported to the owner.

## Review waves

One wave at a time per artifact; the artifact is frozen while its wave is out.

1. The run policy declares the lanes — `(model, charter)` pairs; default: one full-scope lane. For each lane, create a throwaway branch and worktree at the current commit and dispatch the reviewer (mode Fresh, Consolidation, or Delta per the situation) with its computed output path `…-review-r<lane>-<iteration>.md`.
2. Collect all lanes; merge the lane branches — disjoint files, mechanical — and stamp each review's `reviewed` pins.
3. **All approved** → the artifact is approved; continue.
4. **Any rejection** → dispatch a fresh producer, mode Adjudicate, with every review file of the wave. Its landing starts the next wave: every lane re-reviews delta-scoped (mode Delta). Unanimity on the current blobs is required — there is no accepted staleness.

## Escalation

After **every** rejection wave, check two signals:

- an `unsatisfiable` verdict among the lanes;
- the same root cause recurring across consecutive waves.

Either opens an **inspection** — a decision point; judgment is allowed:

- **The claim stands** (per `state.md`, and the record carries the evidence): route it. The target is always among the declaring artifact's direct inputs; exhaustion claims climb one layer at a time. Write the amendment record per `../entries/intent-format.md`, stamp it, and let the loop cascade — the target's wave adjudicates the claim (its producer's Amendment judgment; its reviewers corroborate or defeat).
- **The target clause rests on the intent or a recorded owner statement** and the target's wave grants the claim → **owner escalation**: pause, present the full dossier, record the answer verbatim and attributed `owner`, open the amendment that implements it, resume.
- **No evidence in the record** → commission a research request, or let the loop continue if it is progressing.

You never originate verdicts or open amendments on your own initiative — claims are certified by agent pairs; you route them.

**Valve:** when an artifact's wave counter reaches the non-convergence threshold (Policy defaults; default 6) and the pair has certified nothing, stop the run and report the pattern to the owner.

## Conduct

- Owner-facing items queue while waves close and go out as one message.
- Fire the lifecycle hooks at their defined moments.
- Health monitoring runs per its convention for the whole run.
