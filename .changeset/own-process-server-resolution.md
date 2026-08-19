---
"@automattic/radical-pipelines": patch
---

Fix opencode coordination and update the verified pin to `0.0.0-beta-17595`. The plugin now addresses only its own server process, surfaces failed state reads, handles the build's `/inbox` queue contract, forwards permission asks when an automatic reject fails, and reports `rp_send` queue admission plus observed target state instead of claiming receipt. `rp_spawn` also appends an opencode messaging protocol with the authoritative spawner ID to every child prompt, directing required reports through `rp_send` to the requester when present or the spawner otherwise.
