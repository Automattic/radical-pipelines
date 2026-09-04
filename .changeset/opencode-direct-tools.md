---
"@automattic/radical-pipelines": minor
---

Register every RP tool as directly invocable on opencode, so an agent calls `rp_spawn`, `rp_send`, `rp_terminate`, `rp_loop_start`, `rp_loop_list`, `rp_loop_cancel`, `rp_status`, and `rp_permission_reply` by name. opencode routes a registered tool by its `options.codemode` and defaults to Code Mode, so tools that declared no option were reachable only inside the `execute` wrapper; each one now declares the direct form, as opencode's own built-in tools do. `setup` also awaits its tool and skill registrations — each returns a promise opencode resolves to a disposable, and `setup` is what the plugin API waits on before treating a location as live, so returning early could serve a session a catalogue RP had not finished contributing to. The pin moves to opencode build `0.0.0-dev-19093`
