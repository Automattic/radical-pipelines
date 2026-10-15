/**
 * RP's opencode v2 plugin.
 *
 * Zero-dependency ESM entry supplying the coordination layer opencode lacks
 * natively (team spawning, directed messaging, session termination, health
 * monitoring, permission mediation, status). Each concern lives in its own
 * module beside this file; `setup` wires them to opencode's plugin context,
 * and every pure helper is re-exported here so it can be unit-tested offline,
 * without a running opencode daemon.
 */

import { basename } from "node:path";

import { materializeAgents, resolveAgentsTargetDir } from "./agents.mjs";
import { recordDiagnostic, recordError } from "./diagnostics.mjs";
import { superviseEvents } from "./events.mjs";
import { readSessionIdentity, recordSessionParent } from "./ledger.mjs";
import {
  armLoopTimer,
  buildLoopCancelTool,
  buildLoopListTool,
  buildLoopStartTool,
  deleteLoopEntry,
  disarmLoopTimer,
  getLoopTimers,
  lastTargetInterruptAt,
  listLoopEntries,
  recordLoopTick,
  recordTargetInterrupt,
  resolveDeadStreamConfirmMs,
  resolveLoopRegistryPath,
  runLoopTick,
  withTargetInterruptLock,
} from "./loops.mjs";
import {
  lastRawSessionProgressAt,
  lastSessionEventAt,
  observeHttpResponse,
  onToolEvent,
  recordSessionEventActivity,
  recordTurnEnd,
} from "./observations.mjs";
import { buildPermissionReplyTool, onPermissionAsked } from "./permissions.mjs";
import { forgetSkillActivations, onContext } from "./resupply.mjs";
import { buildSendTool } from "./send.mjs";
import {
  getSessionInbox,
  getSessionMessages,
  getSessionUpdatedAt,
  interruptSession,
  isSessionActive,
  promoteInboxItem,
  resolveServer,
} from "./server.mjs";
import { SKILLS_SOURCE_DIR, readSkillDirectory } from "./skills.mjs";
import { buildSpawnTool, resolveRepoRoot } from "./spawn.mjs";
import { buildStatusTool } from "./status.mjs";
import { buildTerminateTool, onTerminalEvent } from "./termination.mjs";
import { asDirectTool, guardTool } from "./tools.mjs";
import { PLUGIN_ID } from "./version.mjs";

/**
 * `globalThis` key guarding the plugin's global, process-wide concerns —
 * the terminal-event listener's `ctx.event.subscribe` and the loop registry's
 * re-arm-at-setup — so they run exactly once across every per-directory
 * `setup(ctx)` re-run within one daemon process.
 */
const SETUP_ONCE_KEY = Symbol.for("radical-pipelines.opencode.setupOnce");

/**
 * The RP opencode plugin's `setup` function.
 *
 * Registers the eight coordination tools and the packaged skill source on
 * every call (opencode re-runs `setup` once per directory scope); guards the
 * terminal-event listener's subscription and the loop registry's re-arm
 * behind `SETUP_ONCE_KEY` so they run exactly once per daemon process.
 * Materializes the agent profiles on every call, replacing RP's agents
 * directory whole.
 *
 * @param {object} ctx The plugin context opencode supplies: `ctx.tool`,
 *   `ctx.skill`, `ctx.agent`, `ctx.session`, `ctx.event`.
 * @param {{
 *   env?: Record<string, string | undefined>,
 *   readServiceRecord?: (env: object) => object | null,
 *   requestFn?: (url: URL, init: object) => Promise<{status: number, body: *}>,
 *   agentsSourceDir?: string,
 *   agentsTargetDir?: string,
 *   resolveRepoRootFn?: (directory: string) => string | null,
 *   exists?: (path: string) => boolean,
 * }} [deps] Injectable dependencies, absent in opencode's real invocation
 *   (`setup(ctx)`) and supplied only by offline tests: `env` and
 *   `readServiceRecord` reach `resolveServer`; `requestFn` reaches the HTTP
 *   client; `agentsSourceDir`/`agentsTargetDir` reach `materializeAgents`;
 *   `resolveRepoRootFn` reaches `rp_spawn`; `exists` reaches the permission
 *   mediator's redirect check.
 * @returns {Promise<() => Promise<void>>} Resolves once this location's tools
 *   and skills are registered, to the location's cleanup: disposes its own
 *   raw-liveness hook, and — when the last live location releases the
 *   shared resources — closes the supervised event subscription, disarms
 *   every loop timer, and clears the once-guard so a reloaded plugin
 *   re-arms.
 */
async function setup(ctx, deps = {}) {
  const {
    env = process.env,
    readServiceRecord: readServiceRecordOverride,
    requestFn,
    agentsSourceDir,
    agentsTargetDir,
    resolveRepoRootFn,
    exists,
  } = deps;

  const registryPath = resolveLoopRegistryPath(env);

  const tick = async (entry, isCancelled, runtime = {}) => {
    let outcomeRecorded = false;
    const onOutcome = (outcome) => {
      const tickEntry = {
        loopID: entry.id,
        targetSession: entry.targetSession,
        at: Date.now(),
        ...outcome,
      };
      recordLoopTick(tickEntry);
      outcomeRecorded = true;
      if (outcome.outcome === "no-server") {
        recordError({
          type: "loop.tick.skipped",
          loopID: entry.id,
          reason: "server unreachable",
          at: tickEntry.at,
        });
      }
      if (outcome.outcome === "target-missing") {
        // Disarm before the registry write, as `rp_loop_cancel` does: a
        // registry that cannot be read or written must still stop the timer,
        // or the loop keeps ticking on a target that is gone.
        void disarmLoopTimer(entry.id);
        deleteLoopEntry(registryPath, entry.id);
        recordDiagnostic({
          type: "loop.retired",
          loopID: entry.id,
          targetSession: entry.targetSession,
          reason: "target session no longer exists",
          at: tickEntry.at,
        });
      }
    };

    try {
      await runLoopTick(entry, {
        server: resolveServer({ env, readServiceRecord: readServiceRecordOverride }),
        isSessionActive: (server, sessionID) => isSessionActive(server, sessionID, requestFn),
        getSessionUpdatedAt: (server, sessionID) => getSessionUpdatedAt(server, sessionID, requestFn),
        getInbox: (server, sessionID) => getSessionInbox(server, sessionID, requestFn),
        getMessages: (server, sessionID) => getSessionMessages(server, sessionID, requestFn),
        getLastEventAt: (sessionID) => lastSessionEventAt(sessionID),
        getRawProgressAt: (sessionID) => lastRawSessionProgressAt(sessionID),
        getLastInterruptAt: (sessionID) => lastTargetInterruptAt(sessionID),
        recordInterrupt: (sessionID, at) => recordTargetInterrupt(sessionID, at),
        withTargetLock: withTargetInterruptLock,
        injectPrompt: (sessionID, text, delivery) => ctx.session.prompt({ sessionID, text, delivery }),
        promoteInboxItem: (server, sessionID, inboxID) => promoteInboxItem(server, sessionID, inboxID, requestFn),
        interruptSession: (server, sessionID) => interruptSession(server, sessionID, requestFn),
        onOutcome,
        isCancelled,
        deadStreamConfirmMs: resolveDeadStreamConfirmMs(env),
        state: runtime,
      });
    } catch (error) {
      if (!outcomeRecorded) {
        onOutcome({ outcome: "failed", error: String(error) });
      }
      recordError({ type: "loop.tick.failed", loopID: entry.id, error: String(error), at: Date.now() });
    }
  };

  const { written } = materializeAgents(agentsSourceDir, agentsTargetDir ?? resolveAgentsTargetDir(env));
  const rpProfiles = new Set(written.map((name) => basename(name, ".md")));

  // Answers `resolveSession` for a session this process did not watch being
  // created. Any read that does not answer — an unreachable server, but
  // equally one that replies 500 or 404 — leaves the question unanswered
  // rather than answering it wrongly.
  const readSession = async (sessionID) => {
    try {
      const server = resolveServer({ env, readServiceRecord: readServiceRecordOverride });
      if (!server) {
        return undefined;
      }
      const { child, spawn } = await readSessionIdentity(server, sessionID, requestFn);
      return {
        child,
        ...(spawn && {
          spawn: { ...spawn, repoRoot: spawn.directory ? (resolveRepoRootFn ?? resolveRepoRoot)(spawn.directory) : null },
        }),
      };
    } catch (error) {
      recordError({
        type: "session.unreadable",
        sessionID,
        error: String(error),
        at: Date.now(),
      });
      return undefined;
    }
  };

  // Registration is a promise that opencode resolves to a disposable, and
  // `setup` is what the plugin API waits on before treating this location as
  // live — so awaiting it is what keeps a session from being served a tool
  // catalogue that RP has not finished contributing to yet.
  await ctx.tool.transform((tools) => {
    // Direct invocability and who may invoke are separate properties of a
    // registration: the guard decides the caller, `asDirectTool` decides the
    // shape opencode publishes.
    const guard = (tool) => asDirectTool(guardTool(tool, { readSession }));
    tools.add(guard(buildSpawnTool(ctx, { resolveRepoRootFn, rpProfiles })));
    tools.add(guard(buildSendTool(ctx, { env, readServiceRecordOverride, requestFn, readSession })));
    tools.add(guard(buildTerminateTool({ env, readServiceRecordOverride, requestFn })));
    tools.add(guard(buildLoopStartTool({ registryPath, tick })));
    tools.add(guard(buildLoopListTool(registryPath)));
    tools.add(guard(buildLoopCancelTool(registryPath)));
    tools.add(guard(buildStatusTool({ env, readServiceRecordOverride, requestFn })));
    tools.add(guard(buildPermissionReplyTool({ env, readServiceRecordOverride, requestFn })));
    return tools;
  });

  const packagedSkills = readSkillDirectory(SKILLS_SOURCE_DIR);
  await ctx.skill.transform((skills) => {
    for (const skill of packagedSkills) {
      skills.add(skill);
    }
    return skills;
  });

  let shared = globalThis[SETUP_ONCE_KEY];
  if (!shared || shared === true) {
    shared = { refs: 0, abort: new AbortController() };
    globalThis[SETUP_ONCE_KEY] = shared;
    void superviseEvents(
      ctx,
      async (event) => {
        recordSessionEventActivity(event);
        recordSessionParent(event);
        forgetSkillActivations(event);
        onToolEvent(event);
        recordTurnEnd(event);
        await onPermissionAsked(event, {
          ctx,
          env,
          readServiceRecord: readServiceRecordOverride,
          requestFn,
          exists,
          readSession,
        });
        await onTerminalEvent(event, { ctx, readSession });
      },
      { signal: shared.abort.signal },
    );
    for (const entry of listLoopEntries(registryPath)) {
      void armLoopTimer(entry, tick);
    }
  }
  shared.refs += 1;

  // The raw-liveness observer, registered per location: `ctx.session.hook`
  // is location-scoped, so the once-guarded resources above must not own
  // it — every location tees its own provider responses (see
  // `observeHttpResponse`). Registration inserts the callback
  // synchronously with no failure channel; the guard below still records
  // the unexpected, and the dead-stream gate treats uncovered targets as
  // unobservable rather than silent, so escalation is disabled wherever
  // this hook is missing. A hook landing late cannot retroactively tee a
  // response whose headers already passed; coverage returns only with the
  // next response the hook actually observes.
  //
  // The skill re-supply hook is registered the same way: `context` sees
  // every model request and gives a session continuing from a checkpoint
  // its skill back. It works from the skills read at registration.
  const registerHook = (name, callback) =>
    Promise.resolve()
      .then(() => ctx.session.hook(name, callback))
      .catch((error) => {
        recordError({ type: "observer.hook.failed", hook: name, error: String(error), at: Date.now() });
        return undefined;
      });
  const hookRegistrations = [
    registerHook("http.response", observeHttpResponse),
    registerHook("context", (event) =>
      onContext(event, {
        server: resolveServer({ env, readServiceRecord: readServiceRecordOverride }),
        skills: packagedSkills,
        requestFn,
        readSession,
      }),
    ),
  ];

  // The plugin API invokes the returned cleanup when unloading a location:
  // dispose only this location's hooks, and tear the shared observer and
  // timers down only when the last live location releases them — clearing
  // the once-guard so a reloaded plugin's setup can re-arm everything.
  let cleaned = false;
  return async () => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    for (const registration of await Promise.all(hookRegistrations)) {
      await Promise.resolve(registration?.dispose?.()).catch(() => {});
    }
    shared.refs -= 1;
    if (shared.refs <= 0 && globalThis[SETUP_ONCE_KEY] === shared) {
      delete globalThis[SETUP_ONCE_KEY];
      shared.abort.abort();
      const timers = getLoopTimers();
      await Promise.all([...timers.keys()].map((id) => disarmLoopTimer(id)));
    }
  };
}

export default { id: PLUGIN_ID, setup };

export { setup };

export {
  appendToErrorLog,
  formatStructuredError,
  recordDiagnostic,
  recordError,
} from "./diagnostics.mjs";

export {
  buildBasicAuthHeader,
  fetchRequest,
  getSessionInbox,
  getSessionMessages,
  getSessionUpdatedAt,
  interruptSession,
  isSessionActive,
  isSessionNotFoundError,
  promoteInboxItem,
  readServiceRecordFile,
  requestServer,
  resolveServer,
  sessionReadError,
} from "./server.mjs";

export {
  formatModelString,
  lookupSpawn,
  parseModelString,
  readSessionIdentity,
  recordSessionParent,
  recordSpawn,
  resolveSession,
  resolveToolAccess,
  spawnIdentity,
} from "./ledger.mjs";

export {
  currentToolFor,
  lastRawSessionProgressAt,
  lastSendFor,
  lastSessionEventAt,
  observeHttpResponse,
  onToolEvent,
  recordGenerationID,
  recordRawResponseStart,
  recordRawSessionProgress,
  recordSend,
  recordSessionEventActivity,
  recordTurnEnd,
  terminalEventError,
  terminalEventSessionID,
  toolTarget,
  turnsFor,
} from "./observations.mjs";

export {
  asDirectTool,
  guardTool,
  toToolResult,
} from "./tools.mjs";

export {
  materializeAgents,
  resolveAgentsTargetDir,
} from "./agents.mjs";

export {
  readPackageVersion,
} from "./version.mjs";

export {
  parseSkillFrontmatter,
  readSkillDirectory,
} from "./skills.mjs";

export {
  activeSkillActivations,
  forgetSkillActivations,
  getSkillActivations,
  holdSkillActivations,
  listSessionMessages,
  onContext,
  packagedSkillActivations,
  readSealedSkillActivations,
  renderSkillResupply,
  storedSkillActivations,
} from "./resupply.mjs";

export {
  agentExists,
  appendSpawnProtocol,
  resolveRepoRoot,
} from "./spawn.mjs";

export {
  formatAttribution,
} from "./send.mjs";

export {
  formatPermissionForward,
  formatRedirectMessage,
  onPermissionAsked,
  parsePermissionAsked,
  redirectTargets,
  replyToPermission,
} from "./permissions.mjs";

export {
  addLoopEntry,
  armLoopTimer,
  deleteLoopEntry,
  disarmLoopTimer,
  isDeadStreamMessage,
  lastTargetInterruptAt,
  listLoopEntries,
  recordTargetInterrupt,
  resolveDeadStreamConfirmMs,
  resolveLoopRegistryPath,
  runLoopTick,
  withTargetInterruptLock,
} from "./loops.mjs";

export {
  buildLedgerRows,
  buildStatusPayload,
  extractLastText,
  shapeStatus,
} from "./status.mjs";

export {
  superviseEvents,
} from "./events.mjs";
