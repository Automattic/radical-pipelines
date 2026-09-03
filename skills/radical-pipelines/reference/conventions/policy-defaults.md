# Policy defaults

The run policy triage confirms with the owner: review lanes per artifact, and the loop's thresholds.

## Format

A block under `.rp.md`'s `Policy defaults` section:

```markdown
### Review lanes

- spec: r1 full scope; r2 full scope
- design-doc: r1 full scope; r2 security
- build: r1 full scope

### Thresholds

- audit: 3
- valve: 6
```

Each artifact lists its lanes as `<lane> <charter>`. An artifact not listed has one lane, `r1 full scope`. A lane's model is the profile's, or a `<profile>[<lane>]` row in the active tool's `Agent models`.

## Charters

- `full scope` — everything the reviewer's profile verifies. Every artifact has exactly one; for a build or document review it writes the summary.
- Any other charter is a focus the reviewer verifies in depth; it scopes what the lane verifies, never what it may defeat.
