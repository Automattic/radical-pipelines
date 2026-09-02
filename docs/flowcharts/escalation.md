# Contradiction escalation

This chart mirrors the claim and owner-escalation path in [`reference/run/loop.md`](../../skills/radical-pipelines/reference/run/loop.md): a producer's evidence must survive review before a contradiction can move to its target or reach the owner.

```mermaid
flowchart TD
    A["Producer records Contradicts-input with a target"] --> B["Reviewer checks the disposition and evidence"]
    B --> C{"Reviewer verdict"}
    C --> D["Defeated: rejected with a live route"]
    C --> E["Corroborated: unsatisfiable with the target"]
    D --> F["Producer adjudicates the rejection"]
    F --> B
    E --> G["Pending claim"]
    G --> H{"Target in owner territory?"}
    H --> I["Pause the pipeline and assemble the dossier"]
    I --> J["Give the owner the claim, evidence chain, and options"]
    J --> K["Write the answer verbatim into intent.md or the targeted record, attributed owner"]
    K --> L["The target identity changes"]
    L --> M["The cascade re-synthesizes stale downstream artifacts"]
    H --> N["Dispatch the target producer in Adjudicate mode"]
    N --> O{"Producer disposition"}
    O --> P["Adopt and change the target"]
    O --> Q["Refute in the target record"]
    O --> R["Climb with a new Contradicts-input target"]
    P --> L
    Q --> S["A review with the trigger as origin approves"]
    S --> T["The claim is resolved"]
    R --> B
```
