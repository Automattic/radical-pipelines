# Phase 3 — Build

> v3 skeleton stub — content pending. Design record: [#273](https://github.com/Automattic/radical-pipelines/issues/273).

Only what differs from the generic machine in `../loop.md`: the build-plan artifact loop (`build-plan-producer`, `build-plan-reviewer`); the assumption→task mapping (structural assumptions verified by the earliest tasks); workers (`build-worker-tdd` / `-e2e` / `-edit`) with two outcomes — completed, or failed with reproducible evidence routed to the plan loop; task trailers and completion markers on commits; the whole-diff batch review against the current plan (`build-reviewer`) and the build summary.
