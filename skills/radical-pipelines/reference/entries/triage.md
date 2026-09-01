# Triage

> v3 skeleton stub — content pending; absorbs v2's `work-on-an-issue.md`, `create-pipeline.md`, `resume-pipeline.md`, `revision-pipeline.md`, and `fork-pipeline.md`. Design record: [#273](https://github.com/Automattic/radical-pipelines/issues/273).

Will contain:

- Normalizing any request (issue, PR feedback, CI failure, bug, correction) into an issue via manage-issues.
- The discovery scan and the routing predicates: continue · amendment (live or merged) · new pipeline stacked · new pipeline forked-from · new pipeline from main.
- Question batching: finish all reading and scanning first, ask everything at once, then dispatch.
- Run policy collection (mode, target phase, lanes, gate mode — conventions defaults, conversation overrides).
- The mechanics of creating a pipeline (slug, branch, folder, intent with origin frontmatter, stamps) and of opening an amendment (`0-intent/N-amendment.md`, origin chain).
- Announce the route and hand off to the convergence loop.
