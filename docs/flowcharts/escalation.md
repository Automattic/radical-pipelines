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
    D -->|Every approved| F{"Target pins the claim and this wave covers that target?"}
    F -->|Yes| RESOLVED["The claim is resolved"]
    F -->|No| APPROVED["The artifact is approved"]
    D -->|Unsatisfiable and no rejection| G["Pending claim"]
    G --> H{"Target in owner territory?"}
    H -->|Yes| I["Close-out and assemble the dossier"]
    I --> J["Give the owner the claim, evidence chain, and options"]
    J --> K["Present the synthesized answer for approval; record a constraint citing the claim; stamp and commit"]
    K --> ANSWERED["The owner claim is answered; the new constraint is pending on its targets"]
    ANSWERED --> N
    H -->|No| N["Dispatch the target producer: Converge"]
    N --> O{"Producer disposition"}
    O -->|Adopt| P["Change the target"]
    O -->|Refute| Q["Record the refutation"]
    O -->|Contradicts input| R["Name the higher target; unsatisfiable review cites the claim as Origin"]
    P --> S["Stamp the target with the claim pin"]
    Q --> S
    R --> S
    S --> A
    RESOLVED --> CASCADE["Converge stale downstream artifacts"]
```
