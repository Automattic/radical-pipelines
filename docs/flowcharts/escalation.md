# Contradiction escalation

This chart mirrors the claim and owner-escalation path in [`reference/run/loop.md`](../../skills/radical-pipelines/reference/run/loop.md): a producer's evidence must survive review before a contradiction can move to its target or reach the owner.

```mermaid
flowchart TD
    START{"Contradiction source"} -->|Producer records Contradicts-input| A["Run a review wave"]
    START -->|Reviewer writes unsatisfiable| C
    A --> C["Wait for every lane and close the wave"]
    C --> D{"Closed-wave result"}
    D -->|Any rejected| E["Producer adjudicates every lane"]
    E --> A
    D -->|Every approved| F{"Review names the claim as Origin and target pins it?"}
    F -->|Yes| RESOLVED["The claim is resolved"]
    F -->|No| APPROVED["The artifact is approved"]
    D -->|Unsatisfiable and no rejection| G["Pending claim"]
    G --> H{"Target in owner territory?"}
    H -->|Yes| I["Pause the pipeline and assemble the dossier"]
    I --> J["Give the owner the claim, evidence chain, and options"]
    J --> K["Write the answer into intent.md as a decision; stamp and commit"]
    K --> CHANGED["The target identity changes"]
    H -->|No| N["Dispatch the target producer: Adjudicate"]
    N --> O{"Producer disposition"}
    O -->|Adopt| P["Change the target"]
    O -->|Refute| Q["Record the refutation; review names the claim as Origin"]
    O -->|Contradicts input| R["Name the higher target"]
    P --> S["Stamp the target with the claim pin"]
    Q --> S
    R --> S
    S --> A
    RESOLVED --> CASCADE
    CHANGED --> CASCADE["Re-synthesize stale downstream artifacts"]
```
