# Review wave

This chart mirrors the review-wave procedure in [`reference/run/loop.md`](../../skills/radical-pipelines/reference/run/loop.md): all lanes review one frozen identity atomically before their verdicts route the next step.

```mermaid
flowchart TD
    A["Freeze the artifact at one identity"] --> B["Seed every declared lane at the same commit"]
    B --> C["Run reviewers in parallel"]
    C --> D["Wait for every lane"]
    D --> E["Land reviews, merge lanes, and stamp"]
    E --> F{"Closed-wave result"}
    F --> G["Any rejected"]
    F --> H["Every lane approved"]
    F --> I["Unsatisfiable with no rejection"]
    G --> J["Dispatch the producer to adjudicate all lanes"]
    H --> K["Artifact approved"]
    I --> L["The claim stands"]
    L --> M["Expose the verdict as a trigger"]
```
