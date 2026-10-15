import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  lastRawSessionProgressAt,
  lastSendFor,
  lastSessionEventAt,
  observeHttpResponse,
  recordGenerationID,
  recordRawResponseStart,
  recordRawSessionProgress,
  recordSend,
  recordSessionEventActivity,
  recordSpawn,
  recordTurnEnd,
  turnsFor,
} from "../../../opencode/plugin.mjs";

describe("recordSessionEventActivity / lastSessionEventAt", () => {
  test("records execution-progress events only, keeping the newest observation per session", () => {
    recordSessionEventActivity({ type: "session.tool.input.started", data: { sessionID: "ses_activity_test" } }, 1_000);
    recordSessionEventActivity({ type: "session.text.ended", data: { sessionID: "ses_activity_test" } }, 2_000);
    // Inbox and metadata traffic can surround a hung session indefinitely
    // and must never defer its recovery.
    recordSessionEventActivity({ type: "session.inbox.delivered", data: { sessionID: "ses_activity_test" } }, 3_000);
    recordSessionEventActivity({ type: "permission.asked", data: { sessionID: "ses_activity_test" } }, 4_000);
    recordSessionEventActivity({ type: "server.heartbeat", data: {} }, 5_000);
    recordSessionEventActivity({ data: { sessionID: "ses_activity_test" } }, 6_000);

    assert.equal(lastSessionEventAt("ses_activity_test"), 2_000);
    assert.equal(lastSessionEventAt("ses_activity_never_seen"), undefined);
  });

  test("a delayed event is stamped with its own creation time, not the consumption time", () => {
    // An old event draining from a lagged queue must not masquerade as
    // fresh progress and re-arm the dead-stream window.
    recordSessionEventActivity({
      type: "session.text.delta",
      created: 1_234,
      data: { sessionID: "ses_activity_delayed" },
    });
    assert.equal(lastSessionEventAt("ses_activity_delayed"), 1_234);
  });

  test("an older event refreshing the entry never regresses a newer timestamp", () => {
    recordSessionEventActivity({ type: "session.text.delta", data: { sessionID: "ses_activity_order" } }, 5_000);
    recordSessionEventActivity({ type: "session.text.delta", data: { sessionID: "ses_activity_order" } }, 3_000);
    assert.equal(lastSessionEventAt("ses_activity_order"), 5_000);
  });

  test("evidence ages out but is never crowded out", () => {
    // Aged entries are pruned once the map grows...
    for (let i = 0; i < 300; i++) {
      recordSessionEventActivity({ type: "session.text.delta", data: { sessionID: `ses_aged_${i}` } }, i);
    }
    recordSessionEventActivity(
      { type: "session.text.delta", data: { sessionID: "ses_aged_fresh" } },
      86_400_000 + 1_000,
    );
    assert.equal(lastSessionEventAt("ses_aged_0"), undefined, "aged entries must be pruned");
    assert.equal(lastSessionEventAt("ses_aged_fresh"), 86_400_000 + 1_000);

    // ...but volume alone never evicts recent liveness: converting an
    // observed byte into apparent silence could authorize interrupting a
    // live stream.
    const base = 86_400_000 + 2_000;
    for (let i = 0; i < 300; i++) {
      recordSessionEventActivity({ type: "session.text.delta", data: { sessionID: `ses_recent_${i}` } }, base + i);
    }
    assert.equal(lastSessionEventAt("ses_recent_0"), base, "recent entries must survive any volume");
    assert.equal(lastSessionEventAt("ses_recent_299"), base + 299);
  });
});

const TURN_END_TYPES = ["session.execution.succeeded", "session.execution.failed", "session.execution.interrupted"];

describe("recordTurnEnd / turnsFor", () => {
  test("counts every terminal event and keeps the newest one with its outcome", () => {
    recordTurnEnd({ type: "session.execution.succeeded", data: { sessionID: "ses_turns" } }, 1_000);
    assert.deepEqual(turnsFor("ses_turns"), { turns: 1, lastTurn: { endedAt: 1_000, outcome: "succeeded" } });

    recordTurnEnd({ type: "session.execution.failed", properties: { sessionID: "ses_turns" } }, 2_000);
    assert.deepEqual(turnsFor("ses_turns"), { turns: 2, lastTurn: { endedAt: 2_000, outcome: "failed", messaged: false } });

    // An interrupt ends the turn too — verified live against the tested
    // build: `POST /interrupt` emits `session.execution.interrupted`, with no
    // succeeded/failed event — without being a failure to announce.
    recordTurnEnd({ type: "session.execution.interrupted", data: { sessionID: "ses_turns" } }, 3_000);
    assert.deepEqual(turnsFor("ses_turns"), { turns: 3, lastTurn: { endedAt: 3_000, outcome: "interrupted", messaged: false } });

    assert.equal(turnsFor("ses_turns_never_seen"), undefined);
  });

  test("a turn is messaged when a send falls at or after its beginning, and carries no answer when its beginning was not observed within the evidence retention", () => {
    // The turn begins at the previous turn's end, else at this process's
    // spawn of the session. Neither observed (a session from before a
    // restart), or a beginning older than the retention — whose evidence may
    // have aged out — leaves the fact unknown.
    const retention = 86_400_000;
    const end = 3 * retention;
    const ages = { recent: 1_000, aged: retention + 1 };
    const beginnings = {
      spawn: (begins) => ({ spawnedAt: begins }),
      previous: (begins) => ({ previousEnd: begins }),
      both: (begins) => ({ spawnedAt: begins - 500, previousEnd: begins }),
      unknown: () => ({}),
    };
    const sends = { none: undefined, before: -100, at: 0, after: 100 };
    let n = 0;
    for (const [age, ago] of Object.entries(ages)) {
      for (const [beginning, observed] of Object.entries(beginnings)) {
        const begins = end - ago;
        const { spawnedAt, previousEnd } = observed(begins);
        for (const [send, offset] of Object.entries(sends)) {
          for (const type of TURN_END_TYPES) {
            const id = `ses_messaged_${n++}`;
            recordSpawn(id, {
              name: id,
              pipelineSlug: "messaged-matrix",
              spawner: "ses_spawner",
              ...(spawnedAt === undefined ? {} : { spawnedAt }),
            });
            if (previousEnd !== undefined) {
              recordTurnEnd({ type: "session.execution.succeeded", data: { sessionID: id } }, previousEnd);
            }
            if (offset !== undefined) {
              recordSend(id, "ses_spawner", begins + offset);
            }
            recordTurnEnd({ type, data: { sessionID: id } }, end);

            const known = beginning !== "unknown" && age === "recent";
            const expected = known ? send === "at" || send === "after" : undefined;
            const label = `${age} ${beginning} beginning, send ${send}, ${type}`;
            assert.equal(turnsFor(id).lastTurn.messaged, expected, label);
            assert.equal("messaged" in turnsFor(id).lastTurn, known, label);
          }
        }
      }
    }
  });

  test("evidence pruned from the observation maps reads as unknown, never as silence or as a first turn", () => {
    const retention = 86_400_000;
    const later = 10 * retention;
    const crowd = (record) => {
      for (let i = 0; i < 300; i++) {
        record(`ses_prune_crowd_${i}`, later);
      }
    };

    // A send aged out of its map.
    recordSpawn("ses_prune_send", { name: "a", pipelineSlug: "prune", spawner: "ses_spawner", spawnedAt: later - retention - 2_000 });
    recordSend("ses_prune_send", "ses_spawner", later - retention - 1_000);
    crowd((id, at) => recordSend(id, "ses_spawner", at));
    assert.equal(lastSendFor("ses_prune_send"), undefined, "the send was pruned");
    recordTurnEnd({ type: "session.execution.succeeded", data: { sessionID: "ses_prune_send" } }, later);
    assert.equal("messaged" in turnsFor("ses_prune_send").lastTurn, false);

    // A previous turn's end aged out, leaving only the spawn — and an
    // earlier turn's send after it.
    recordSpawn("ses_prune_turn", { name: "b", pipelineSlug: "prune", spawner: "ses_spawner", spawnedAt: later - retention - 3_000 });
    recordSend("ses_prune_turn", "ses_spawner", later - retention - 2_000);
    recordTurnEnd({ type: "session.execution.succeeded", data: { sessionID: "ses_prune_turn" } }, later - retention - 1_000);
    crowd((id, at) => recordTurnEnd({ type: "session.execution.succeeded", data: { sessionID: id } }, at));
    assert.equal(turnsFor("ses_prune_turn"), undefined, "the previous turn was pruned");
    recordTurnEnd({ type: "session.execution.succeeded", data: { sessionID: "ses_prune_turn" } }, later + 1_000);
    assert.equal("messaged" in turnsFor("ses_prune_turn").lastTurn, false);
  });

  test("ignores non-terminal events and stamps a delayed event with its own creation time", () => {
    recordTurnEnd({ type: "session.tool.called", data: { sessionID: "ses_turns_other" } }, 1_000);
    recordTurnEnd({ type: "session.execution.started", data: { sessionID: "ses_turns_other" } }, 1_500);
    assert.equal(turnsFor("ses_turns_other"), undefined);

    recordTurnEnd({ type: "session.execution.succeeded", created: 4_321, data: { sessionID: "ses_turns_other" } });
    assert.equal(turnsFor("ses_turns_other").lastTurn.endedAt, 4_321);
  });

  test("turn records age out but are never crowded out", () => {
    for (let i = 0; i < 300; i++) {
      recordTurnEnd({ type: "session.execution.succeeded", data: { sessionID: `ses_turn_aged_${i}` } }, i);
    }
    recordTurnEnd(
      { type: "session.execution.succeeded", data: { sessionID: "ses_turn_fresh" } },
      86_400_000 + 1_000,
    );
    assert.equal(turnsFor("ses_turn_aged_0"), undefined);
    assert.equal(turnsFor("ses_turn_fresh").turns, 1);

    const base = 86_400_000 + 2_000;
    for (let i = 0; i < 300; i++) {
      recordTurnEnd({ type: "session.execution.succeeded", data: { sessionID: `ses_turn_recent_${i}` } }, base + i);
    }
    assert.equal(turnsFor("ses_turn_recent_0").lastTurn.endedAt, base);
  });
});

describe("recordSend / lastSendFor", () => {
  test("keeps the newest send with its recipient", () => {
    recordSend("ses_sender_rec", "ses_requester", 1_000);
    recordSend("ses_sender_rec", "ses_orchestrator", 2_000);
    assert.deepEqual(lastSendFor("ses_sender_rec"), { at: 2_000, to: "ses_orchestrator" });
    assert.equal(lastSendFor("ses_sender_never"), undefined);
  });
});

describe("observeHttpResponse / lastRawSessionProgressAt", () => {
  test("tees the provider response so each streamed chunk records raw progress, bytes untouched", async () => {
    const encoder = new TextEncoder();
    const chunks = ["data: one\n\n", "data: two\n\n"];
    const body = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });
    const input = {
      sessionID: "ses_raw_progress_test",
      response: new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } }),
    };

    const before = Date.now();
    observeHttpResponse(input);
    const arrival = lastRawSessionProgressAt("ses_raw_progress_test");
    assert.equal(arrival.open.length, 1, "the arrival must open a response generation");
    assert.ok(arrival.open[0].startedAt >= before);

    const received = await input.response.text();
    assert.equal(received, chunks.join(""), "the tee must pass the bytes through untouched");
    const record = lastRawSessionProgressAt("ses_raw_progress_test");
    assert.ok(record.lastAt >= before, "each streamed chunk must refresh the raw-progress timestamp");
    assert.equal(record.open.length, 0, "a completed stream must close its generation — identity, not history");
    assert.equal(input.response.status, 200);
  });

  test("captures identifier values from consumed bytes, across chunk boundaries", async () => {
    const encoder = new TextEncoder();
    // The id value is split across two chunks: the tail carry must join it.
    const chunks = ['data: {"id":"call_', 'boundary_test","choices":[]}\n\n'];
    const body = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        // Held open: the generation must stay open with its ids readable.
      },
    });
    const input = {
      sessionID: "ses_raw_ids_test",
      response: new Response(body, { status: 200 }),
    };
    observeHttpResponse(input);
    const reader = input.response.body.getReader();
    await reader.read();
    await reader.read();

    const record = lastRawSessionProgressAt("ses_raw_ids_test");
    assert.equal(record.open.length, 1);
    assert.ok(
      record.open[0].ids.has("call_boundary_test"),
      `expected the split id to be captured, got: ${JSON.stringify([...record.open[0].ids])}`,
    );
  });

  test("captures projected tool ids across provider protocols, decoding JSON escapes", async () => {
    const encoder = new TextEncoder();
    const chunks = [
      // Open Responses: the projected tool-part id is `call_id`, not `id`.
      'data: {"id":"fc_item_1","call_id":"call_projected_1","type":"function_call"}\n\n',
      // Bedrock: `toolUseId`, with no `id` field at all.
      'data: {"contentBlockStart":{"start":{"toolUse":{"toolUseId":"tooluse_bedrock_1"}}}}\n\n',
      // Escaped raw value must match its decoded projected form.
      'data: {"call_id":"call_\\u0031"}\n\n',
    ];
    const body = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        // Held open: generation stays inspectable.
      },
    });
    const input = { sessionID: "ses_raw_protocols_test", response: new Response(body, { status: 200 }) };
    observeHttpResponse(input);
    const reader = input.response.body.getReader();
    for (let i = 0; i < chunks.length; i++) {
      await reader.read();
    }

    const ids = lastRawSessionProgressAt("ses_raw_protocols_test").open[0].ids;
    for (const expected of ["fc_item_1", "call_projected_1", "tooluse_bedrock_1", "call_1"]) {
      assert.ok(ids.has(expected), `expected ${expected} captured, got: ${JSON.stringify([...ids])}`);
    }
  });

  test("a resumed byte re-attaches its aged generation instead of pruning it away", () => {
    const base = 30_000_000_000;
    const generation = recordRawResponseStart("ses_resume_detach", base);
    // 24h of silence, then the stream proves itself with a byte.
    recordRawSessionProgress("ses_resume_detach", generation, base + 86_400_000 + 1_000);
    const record = lastRawSessionProgressAt("ses_resume_detach");
    assert.ok(record.open.includes(generation), "the producing generation must survive its own resumption");
    assert.equal(generation.lastAt, base + 86_400_000 + 1_000);
  });

  test("a valid call id is never displaced by id volume", () => {
    const generation = recordRawResponseStart("ses_id_volume", 40_000_000_000);
    for (let i = 0; i < 200; i++) {
      recordGenerationID(generation, `chatcmpl_${i}`);
    }
    recordGenerationID(generation, "call_suspected_late");
    assert.ok(generation.ids.has("call_suspected_late"), "late ids must not be silently discarded");
  });

  test("a session reusing an aged record cannot prune it out from under its own new response", () => {
    // Seed enough aged sessions to trigger pruning, including an aged
    // record for the session about to be reused.
    const base = 10_000_000_000;
    recordRawResponseStart("ses_reuse_detach", base - 90_000_000);
    for (let i = 0; i < 300; i++) {
      recordRawResponseStart(`ses_reuse_filler_${i}`, base - 89_000_000);
    }
    // The reused session's new response must land in the *live* record.
    recordRawResponseStart("ses_reuse_detach", base);
    const record = lastRawSessionProgressAt("ses_reuse_detach");
    assert.ok(record, "the reused record must survive its own arrival's pruning");
    assert.equal(
      record.open.filter((generation) => generation.startedAt === base).length,
      1,
      "the new generation must be attached to the live record",
    );
  });

  test("open generations are pruned by age only, never by count", () => {
    const base = 20_000_000_000;
    for (let i = 0; i < 12; i++) {
      recordRawResponseStart("ses_gen_volume", base + i);
    }
    assert.equal(
      lastRawSessionProgressAt("ses_gen_volume").open.length,
      12,
      "volume alone must never evict a live generation",
    );

    // Aged-out generations do get pruned on the next observation.
    recordRawResponseStart("ses_gen_volume", base + 86_400_000 + 1_000);
    assert.equal(
      lastRawSessionProgressAt("ses_gen_volume").open.length,
      1,
      "generations older than the retention must age out",
    );
  });

  test("a body-less response records the arrival without opening a generation", () => {
    const input = { sessionID: "ses_raw_progress_nobody", response: { status: 204, body: null } };
    observeHttpResponse(input);
    const record = lastRawSessionProgressAt("ses_raw_progress_nobody");
    assert.ok(record?.lastAt !== undefined);
    assert.deepEqual(record.open, [], "nothing can hang mid-stream without a body");
    assert.equal(input.response.status, 204, "the response must be left as-is");
  });

});
