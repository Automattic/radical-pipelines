# Lanes

Defaults for the lanes a profile runs, each named by its id and optionally given a brief: a text copied into the lane's assignment as written, its placeholders expanded. A profile without lanes runs alone.

- `spec-producer` and `design-doc-producer` take production lanes: each lane writes a candidate exploring its brief, or the whole artifact, and the producer consolidates the candidates into the artifact.
- `reviewer` takes review lanes: each lane's brief replaces what the reviewer templates ask a reviewer to report by default (`../../templates/reviewer-first.md`), and every lane must approve. The lane `default` is defined in `../run/state.md` § Pipeline configuration.
