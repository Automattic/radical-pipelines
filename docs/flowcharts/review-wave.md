# Review wave

This chart mirrors the review-wave procedure in [`reference/run/loop.md`](../../skills/radical-pipelines/reference/run/loop.md): all lanes review one frozen identity atomically before their verdicts route the next step.

```mermaid
flowchart TD
    A["Freeze the artifact at one identity"] --> B["Seed every declared lane at the same commit"]
    B --> C["Prepare Brief and, for a re-review, previous review, Diff, and Adjudication"]
    C --> D["Run reviewers in parallel"]
    D --> E["Serve research requests or blockers; wait for every lane"]
    E --> L["Merge review lanes into the wave branch"]
    L --> M["Remove lane worktrees and branches; stamp every review"]
    M --> F{"Closed-wave result"}
    F -->|Any rejected| G["Dispatch the producer to adjudicate every lane"]
    F -->|Every approved| H["Artifact approved"]
    F -->|Unsatisfiable and no rejection| I["The claim stands"]
    I --> J["Expose the verdict as a trigger"]
```
