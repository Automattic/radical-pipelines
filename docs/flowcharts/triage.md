# Triage

This chart mirrors [`reference/entries/triage.md`](../../skills/radical-pipelines/reference/entries/triage.md), from issue normalization and the pipeline scan through first-match routing, confirmation, preparation, and the run.

```mermaid
flowchart TD
    A{"The request has an issue?"} -->|No| MI["Manage issues: create it"]
    A -->|Yes| SCAN
    MI --> SCAN["git fetch; fast-forward the artifact base branch; rp pipelines --issue; fast-forward each pipeline's base branch (state.md); rp check on each pipeline found"]
    SCAN --> B{"The issue declares dependencies the tracker reports open?"}
    B -->|Yes| E{"Owner chooses"}
    E -->|Wait| WAIT["Wait"]
    E -->|Proceed| ROUTE
    B -->|No| ROUTE{"Route each statement by the first predicate that holds"}
    ROUTE --> R1["Answers a pending escalation: record the answer and continue that pipeline"]
    ROUTE --> R2["Adds nothing to a live pipeline, whose frontier names the work or whose intent already calls for it: continue it"]
    ROUTE --> R3["Concerns an existing pipeline's artifacts or code, or brings the owner's commits on its branch: later input on it"]
    ROUTE --> R4["Changes a live pipeline's scope: the owner chooses to rescope it or start a new pipeline from its tip"]
    ROUTE --> R5["New intent from another pipeline's unmerged tip: new pipeline, origin starts-from"]
    ROUTE --> R6["New intent re-attempting a pipeline: new pipeline, origin re-attempts"]
    ROUTE --> R7["New intent: new pipeline from the base branch"]
    R1 --> GROUP["Group the routed statements by pipeline: one run each"]
    R2 --> GROUP
    R3 --> GROUP
    R4 --> GROUP
    R5 --> GROUP
    R6 --> GROUP
    R7 --> GROUP
    GROUP --> NEED{"Writes an intent, constraint, or proposal; no config.json or the request changes it; or a question left open?"}
    NEED -->|Yes| CONFIRM["In one message: each route and why; the text to write; the configuration — target, lanes, each profile's models, and its guardrails and resources; what a lane change does to the tree; and the open questions. Revise until the owner confirms"]
    NEED -->|No| BEGIN
    CONFIRM --> BEGIN
    BEGIN["Start the run: write the pipeline configuration to a file; fire the before- hooks; rp start --apply creates the pipeline branch and worktree this machine lacks and writes config.json; fire the after- hooks"] --> PREP{"Prepare every route of the run"}
    PREP --> P1["New pipeline: synthesize the intent"]
    PREP --> P2["Later input: write and commit each input"]
    PREP --> P3["Continue: nothing more"]
    PREP --> P4["Rescope: modify the issue; re-synthesize and commit the intent"]
    P1 --> CFG
    P2 --> CFG
    P3 --> CFG
    P4 --> CFG
    CFG["Commit config.json, a new pipeline's with its intent"] --> RUN
    RUN["Record unconsumed statements a role must act on as later input"] --> START["Fire run-started; run the loop"]
    START --> NEXT{"Another run?"}
    NEXT -->|Yes| BEGIN
```
