/**
 * Shared fixture for the opencode plugin's tests: a fake plugin context that
 * records every call, and the helper that keeps `setup()` off the real home
 * directory.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Create a fresh, empty temp directory (used for materializeAgents overrides). */
function freshDir() {
  return mkdtempSync(join(tmpdir(), "rp-oc-plugin-"));
}

/**
 * Build a minimal fake opencode `ctx` matching the plugin ctx surface the
 * plugin uses (`skill`, `session`), recording skill registrations and hooks.
 */
function createFakeCtx() {
  const addedSkills = [];
  const hooks = new Map();
  let hookDisposals = 0;

  const ctx = {
    skill: {
      transform(fn) {
        const api = {
          list: () => [...addedSkills],
          add(skill) {
            addedSkills.push(skill);
            return api;
          },
        };
        fn(api);
      },
    },
    session: {
      // Matches the real ctx.session.hook contract: registers a model hook
      // by name and resolves to a disposable Registration.
      async hook(name, callback) {
        hooks.set(name, callback);
        return {
          dispose: async () => {
            hookDisposals += 1;
          },
        };
      },
    },
  };

  return {
    ctx,
    addedSkills,
    hooks,
    get hookDisposals() {
      return hookDisposals;
    },
  };
}

/** Options that keep every `setup()` call off the real home dir. */
function isolatedDeps(overrides = {}) {
  return {
    agentsTargetDir: freshDir(),
    ...overrides,
  };
}

export { createFakeCtx, freshDir, isolatedDeps };
