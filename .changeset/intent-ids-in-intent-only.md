---
"@automattic/radical-pipelines": patch
---

Assign intent item ids in `intent.md` only: an issue's bullets carry no ids, and synthesizing from an issue that already follows the format copies the body verbatim, adding the Origin lines and the ids without owner approval. Ids are the pipeline's addressing mechanism; the issue is the owner's request, and numbering its bullets is mechanical work that belongs to the pipeline, not a change for the owner to re-approve.
