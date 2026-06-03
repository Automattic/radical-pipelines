---
"@automattic/radical-pipelines": minor
---

Adopt Changesets to track every repository change in a generated `CHANGELOG.md` and keep the project version synchronized across all version-bearing files. The bundled version step propagates the root `package.json` version to `.claude-plugin/plugin.json`, so the version stays consistent everywhere.
