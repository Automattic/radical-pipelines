# The Output Rules

Two tool-default rules — **Rule 1** and **Rule 2**, collectively **the output
rules** — applied to every run's host-project product. They are always-on and
carry no override.

The **host-project product** is the source code, tests, inline and external
documentation, and the commit messages a run ships into the host repository — as
distinct from the pipeline's own artifacts (specs, design docs, plans, reviews,
and other files the pipeline writes about its own process).

## Rule 1 — leave unchanged comments and prose untouched

A change must not reword, reflow, reformat, or otherwise tidy comments attached
to code the change did not modify, or prose sections of a documentation file the
change edits but did not otherwise touch. It reaches wherever comments or prose
exist in a file the change edits.

Content the change itself touched is exempt: a comment or prose section updated
alongside the code or section being changed is not a violation. The rule targets
content the change did *not* touch, and imposes no duty to preserve a still-valid
comment beside changed code.

Commit messages carry no pre-existing comments or prose, so Rule 1 does not apply
to them.

## Rule 2 — the host-project product is transparent to the pipeline

The shipped product must not reference this run's pipeline, its phases, its
artifacts, or its agents, or narrate the writing agent's own process, anywhere in
its content; it must read as if written by hand. This reach is total — code
comments, identifiers and names, string literals, log and error messages, inline
API documentation, and external documentation, not only the commit message.

### The this-run discriminator

Rule 2 flags only references whose referent is *this run's* pipeline process,
artifacts, or agents — not the vocabulary. The forbidden cases:

1. a pointer to this run's actual artifact files or artifacts-folder path (e.g.
   the concrete `.pipelines/<this-run-slug>/.../spec.md`);
2. a reference to a phase or plan task of this run (e.g. "implements task 4.2 of
   this code plan", "in the Docs phase");
3. narration of the writing agent's own task or process (e.g. a comment
   explaining code in terms of the task the agent was given);
4. any claim the output was produced by the pipeline or its agents, including an
   agent-name provenance tag.

It does **not** flag the tool's vocabulary, nor a host project documenting
pipeline concepts or its own artifact *types* in general. The self-hosting
Radical Pipelines repository is the worked example: its `README.md`, `website/`,
and skill files legitimately use "spec / design doc / plan / pipeline / phases /
artifacts" and name the agents as product documentation, and these pass. A
comment like `// added per task 3 of the code plan` fails the referent test and
is correctly flagged.

### Commit messages

Rule 2 applies to the message of any commit that introduces host-project product:
no pipeline-naming provenance, including no agent-name provenance tag. A commit
that changes only pipeline artifacts (files under the pipeline's artifacts folder)
is exempt and may reference the pipeline freely. This boundary holds the same
whether artifacts live in a separate fork or directly in the upstream repository.

## Enforcement

The Code and Docs phase reviewers (`code-reviewer`, `docs-reviewer`) gate on the
output rules. A violation is a must-fix that blocks its phase from completing.
