import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  afterEach,
  beforeEach,
  describe,
  test,
} from "node:test";

import {
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
} from "../../../opencode/plugin.mjs";

describe("resolveServer", () => {
  test("returns the service record's {url, password} as {baseURL, password} when a record is present", () => {
    const result = resolveServer({
      env: {},
      readServiceRecord: () => ({ url: "http://127.0.0.1:4096", password: "record-pw" }),
    });
    assert.deepEqual(result, { baseURL: "http://127.0.0.1:4096", password: "record-pw" });
  });

  test("falls back to RP_OPENCODE_SERVER_URL + OPENCODE_PASSWORD when no record is present", () => {
    const result = resolveServer({
      env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9000", OPENCODE_PASSWORD: "env-pw" },
      readServiceRecord: () => null,
    });
    assert.deepEqual(result, { baseURL: "http://127.0.0.1:9000", password: "env-pw" });
  });

  test("returns null when neither the service record nor both env vars resolve", () => {
    assert.equal(resolveServer({ env: {}, readServiceRecord: () => null }), null);
    assert.equal(
      resolveServer({ env: { RP_OPENCODE_SERVER_URL: "http://x" }, readServiceRecord: () => null }),
      null,
    );
  });
});

describe("readServiceRecordFile", () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "service-record-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("reads and parses the service-*.json file naming the current process under XDG_STATE_HOME/opencode", () => {
    const stateDir = join(root, "opencode");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      join(stateDir, "service-abc123.json"),
      JSON.stringify({ url: "http://127.0.0.1:4096", password: "pw", version: "0.0.0-next-1", pid: 111 }),
    );

    assert.deepEqual(readServiceRecordFile({ XDG_STATE_HOME: root }, 111), {
      url: "http://127.0.0.1:4096",
      password: "pw",
      version: "0.0.0-next-1",
      pid: 111,
    });
  });

  test("reads and parses the bare service.json file naming the current process", () => {
    const stateDir = join(root, "opencode");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      join(stateDir, "service.json"),
      JSON.stringify({ url: "http://127.0.0.1:49374", password: "pw", version: "0.0.0-next-2", pid: 222 }),
    );

    assert.deepEqual(readServiceRecordFile({ XDG_STATE_HOME: root }, 222), {
      url: "http://127.0.0.1:49374",
      password: "pw",
      version: "0.0.0-next-2",
      pid: 222,
    });
  });

  test("picks the record naming the current process among records of live sibling servers", () => {
    // The state directory is shared across concurrently running opencode
    // instances: records for other live processes routinely sit alongside,
    // and those siblings share on-disk session storage while holding
    // unrelated in-memory state. Identity turns on pid, never on mtime.
    const stateDir = join(root, "opencode");
    mkdirSync(stateDir, { recursive: true });
    const own = join(stateDir, "service-abc123.json");
    writeFileSync(
      own,
      JSON.stringify({ url: "http://127.0.0.1:4096", password: "own", version: "0.0.0-next-1", pid: 111 }),
    );
    writeFileSync(
      join(stateDir, "service.json"),
      JSON.stringify({ url: "http://127.0.0.1:49375", password: "sibling", version: "local", pid: 222 }),
    );
    // Age the matching record so the assertion turns on pid rather than on
    // mtime or readdir order.
    const past = new Date(Date.now() - 60_000);
    utimesSync(own, past, past);

    assert.equal(readServiceRecordFile({ XDG_STATE_HOME: root }, 111).password, "own");
  });

  test("picks the newest valid record when more than one record names the current pid", () => {
    const stateDir = join(root, "opencode");
    mkdirSync(stateDir, { recursive: true });
    const stale = join(stateDir, "service-old.json");
    writeFileSync(
      stale,
      JSON.stringify({ url: "http://127.0.0.1:4000", password: "stale", version: "old", pid: 111 }),
    );
    writeFileSync(
      join(stateDir, "service.json"),
      JSON.stringify({ url: "http://127.0.0.1:5000", password: "current", version: "new", pid: 111 }),
    );
    const past = new Date(Date.now() - 60_000);
    utimesSync(stale, past, past);

    assert.equal(readServiceRecordFile({ XDG_STATE_HOME: root }, 111).password, "current");
  });

  test("returns null when no record names the current process", () => {
    const stateDir = join(root, "opencode");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      join(stateDir, "service.json"),
      JSON.stringify({ url: "http://127.0.0.1:49375", password: "sibling", version: "local", pid: 222 }),
    );

    assert.equal(readServiceRecordFile({ XDG_STATE_HOME: root }, 111), null);
  });

  test("returns null when the service record directory does not exist", () => {
    assert.equal(readServiceRecordFile({ XDG_STATE_HOME: join(root, "missing") }, 111), null);
  });

  test("returns null when the directory exists but holds no service record", () => {
    mkdirSync(join(root, "opencode"), { recursive: true });
    assert.equal(readServiceRecordFile({ XDG_STATE_HOME: root }, 111), null);
  });

  test("ignores a service record lock file left alongside the record", () => {
    const stateDir = join(root, "opencode");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "service-abc123.json.lock"), "");

    assert.equal(readServiceRecordFile({ XDG_STATE_HOME: root }, 111), null);
  });
});

describe("HTTP client", () => {
  /** Start a local HTTP server on an ephemeral port; returns its base URL and a closer. */
  function listen(handler) {
    const server = createServer(handler);
    return new Promise((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        resolve({
          baseURL: `http://127.0.0.1:${server.address().port}`,
          close: () => new Promise((done) => server.close(done)),
          server,
        });
      });
    });
  }

  test("fetchRequest sends the method, headers, and body, and parses the JSON response", async () => {
    let received;
    const { baseURL, close } = await listen((req, res) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => {
        received = { method: req.method, url: req.url, headers: req.headers, body: data };
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ data: { id: "ses_1" } }));
      });
    });
    try {
      const result = await requestServer(
        { baseURL, password: "secret" },
        "POST",
        "/api/session/ses_1/rename",
        { title: "renamed" },
      );

      assert.deepEqual(result, { status: 201, body: { data: { id: "ses_1" } } });
      assert.equal(received.method, "POST");
      assert.equal(received.url, "/api/session/ses_1/rename");
      assert.equal(received.headers.authorization, buildBasicAuthHeader("secret"));
      assert.equal(received.headers["content-type"], "application/json");
      assert.equal(received.body, JSON.stringify({ title: "renamed" }));
    } finally {
      await close();
    }
  });

  test("fetchRequest resolves an empty response body to undefined", async () => {
    const { baseURL, close } = await listen((req, res) => {
      res.writeHead(204);
      res.end();
    });
    try {
      const result = await requestServer({ baseURL, password: "secret" }, "DELETE", "/api/session/ses_1");
      assert.deepEqual(result, { status: 204, body: undefined });
    } finally {
      await close();
    }
  });

  test("fetchRequest rejects once the timeout passes without a response, instead of pending forever", async () => {
    const pending = [];
    const { baseURL, close, server } = await listen((req, res) => {
      pending.push(res);
    });
    try {
      let settled = false;
      const request = fetchRequest(
        new URL("/api/session/active", baseURL),
        { method: "GET", headers: {} },
        50,
      ).finally(() => {
        settled = true;
      });
      await assert.rejects(request, (error) => error.name === "TimeoutError");
      assert.equal(settled, true);
    } finally {
      for (const res of pending) res.destroy();
      server.closeAllConnections();
      await close();
    }
  });

  test("buildBasicAuthHeader base64-encodes opencode:<password>", () => {
    assert.equal(
      buildBasicAuthHeader("secret"),
      `Basic ${Buffer.from("opencode:secret").toString("base64")}`,
    );
  });

  test("requestServer resolves the path against baseURL, sets the method, and sends the Basic-auth header built from the resolved password", async () => {
    const calls = [];
    const requestFn = async (url, init) => {
      calls.push({ url, init });
      return { status: 200, body: { ok: true } };
    };

    const result = await requestServer(
      { baseURL: "http://127.0.0.1:4096", password: "secret" },
      "GET",
      "/api/session",
      undefined,
      requestFn,
    );

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url.toString(), "http://127.0.0.1:4096/api/session");
    assert.equal(calls[0].init.method, "GET");
    assert.equal(calls[0].init.headers.Authorization, buildBasicAuthHeader("secret"));
    assert.deepEqual(result, { status: 200, body: { ok: true } });
  });

  test("requestServer JSON-encodes a POST body and uses only the injected request function (no real HTTP call)", async () => {
    const calls = [];
    const requestFn = async (url, init) => {
      calls.push({ url, init });
      return { status: 204, body: undefined };
    };

    await requestServer(
      { baseURL: "http://127.0.0.1:4096", password: "secret" },
      "POST",
      "/api/session/ses_1/rename",
      { title: "renamed" },
      requestFn,
    );

    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.body, JSON.stringify({ title: "renamed" }));
    assert.equal(calls[0].init.headers["Content-Type"], "application/json");
    assert.equal(calls[0].init.headers["Content-Length"], Buffer.byteLength(calls[0].init.body));
  });
});

describe("isSessionActive", () => {
  const server = { baseURL: "http://127.0.0.1:4096", password: "pw" };

  test("returns true when the session ID is a key of /api/session/active's data envelope", async () => {
    const requestFn = async () => ({ status: 200, body: { data: { ses_1: { type: "running" } } } });
    assert.equal(await isSessionActive(server, "ses_1", requestFn), true);
  });

  test("returns false when the session ID is absent from the data envelope", async () => {
    const requestFn = async () => ({ status: 200, body: { data: {} } });
    assert.equal(await isSessionActive(server, "ses_1", requestFn), false);
  });

  test("throws on a non-2xx response instead of reporting the session idle", async () => {
    // A failed read means "unknown", not "idle": defaulting to idle is how a
    // health-loop tick ends up injecting into a busy session.
    const requestFn = async () => ({ status: 500, body: undefined });
    await assert.rejects(
      () => isSessionActive(server, "ses_1", requestFn),
      /returned 500/,
    );
  });
});

describe("getSessionUpdatedAt", () => {
  const server = { baseURL: "http://127.0.0.1:4096", password: "pw" };

  test("returns the session's time.updated timestamp", async () => {
    const requestFn = async (url) => {
      assert.equal(url.pathname, "/api/session/ses_1");
      return { status: 200, body: { data: { time: { updated: 123456 } } } };
    };

    assert.equal(await getSessionUpdatedAt(server, "ses_1", requestFn), 123456);
  });

  test("throws when the session read fails or omits time.updated", async () => {
    await assert.rejects(
      () => getSessionUpdatedAt(server, "ses_1", async () => ({ status: 500 })),
      /returned 500/,
    );
    await assert.rejects(
      () => getSessionUpdatedAt(server, "ses_1", async () => ({ status: 200, body: { data: {} } })),
      /missing time.updated/,
    );
  });
});

describe("getSessionInbox", () => {
  const server = { baseURL: "http://127.0.0.1:4096", password: "pw" };

  test("returns the pending inbox items, defaulting to empty", async () => {
    const items = [{ id: "inb_1", delivery: "steer", payload: { text: "check" } }];
    const requestFn = async (url) => {
      assert.equal(url.pathname, "/api/session/ses_1/inbox");
      return { status: 200, body: { data: items } };
    };

    assert.deepEqual(await getSessionInbox(server, "ses_1", requestFn), items);
    assert.deepEqual(await getSessionInbox(server, "ses_1", async () => ({ status: 200 })), []);
  });

  test("throws on a failed read rather than reporting an empty inbox", async () => {
    await assert.rejects(() => getSessionInbox(server, "ses_1", async () => ({ status: 500 })), /returned 500/);
  });
});

describe("getSessionMessages", () => {
  const server = { baseURL: "http://127.0.0.1:4096", password: "pw" };

  test("returns the newest-first message list, defaulting to empty", async () => {
    const messages = [
      { id: "msg_2", type: "assistant", finish: "error" },
      { id: "msg_1", type: "user", text: "check" },
    ];
    const requestFn = async (url) => {
      assert.equal(url.pathname, "/api/session/ses_1/message");
      assert.equal(url.search, "?limit=200", "the read must out-page the server's default so anchors age slowly");
      return { status: 200, body: { data: messages } };
    };

    assert.deepEqual(await getSessionMessages(server, "ses_1", requestFn), messages);
    assert.deepEqual(await getSessionMessages(server, "ses_1", async () => ({ status: 200 })), []);
  });

  test("throws on a failed read", async () => {
    await assert.rejects(() => getSessionMessages(server, "ses_1", async () => ({ status: 500 })), /returned 500/);
  });
});

describe("interruptSession", () => {
  const server = { baseURL: "http://127.0.0.1:4096", password: "pw" };

  test("posts an interrupt that resumes execution with pending steering input", async () => {
    const calls = [];
    const requestFn = async (url, init) => {
      calls.push({ path: url.pathname + url.search, method: init.method });
      return { status: 204 };
    };

    await interruptSession(server, "ses_1", requestFn);
    assert.deepEqual(calls, [{ path: "/api/session/ses_1/interrupt?resume=true", method: "POST" }]);
  });

  test("throws on a non-2xx response", async () => {
    await assert.rejects(() => interruptSession(server, "ses_1", async () => ({ status: 404 })), /returned 404/);
  });
});

describe("promoteInboxItem", () => {
  const server = { baseURL: "http://127.0.0.1:4096", password: "pw" };

  test("updates the given inbox item's delivery to steer", async () => {
    const calls = [];
    const requestFn = async (url, init) => {
      calls.push({ path: url.pathname, method: init.method, body: JSON.parse(init.body) });
      return { status: 204 };
    };

    await promoteInboxItem(server, "ses_1", "inb_1", requestFn);
    assert.deepEqual(calls, [{ path: "/api/session/ses_1/inbox/inb_1", method: "PATCH", body: { delivery: "steer" } }]);
  });

  test("throws on a non-2xx response", async () => {
    await assert.rejects(() => promoteInboxItem(server, "ses_1", "inb_1", async () => ({ status: 404 })), /returned 404/);
  });
});

describe("isSessionNotFoundError", () => {
  test("recognizes a dead-target session error by HTTP status or by tag, in either observed shape", () => {
    assert.equal(isSessionNotFoundError({ status: 404 }), true);
    // The in-process ctx.session.prompt rejection: dotted tag, no status.
    assert.equal(isSessionNotFoundError({ name: "Session.NotFoundError" }), true);
    assert.equal(isSessionNotFoundError({ _tag: "Session.NotFoundError" }), true);
    // The raw HTTP response body: undotted tag, alongside a 404 status.
    assert.equal(isSessionNotFoundError({ name: "SessionNotFoundError" }), true);
    assert.equal(isSessionNotFoundError({ _tag: "SessionNotFoundError" }), true);
    assert.equal(isSessionNotFoundError({ status: 500 }), false);
    assert.equal(isSessionNotFoundError(new Error("boom")), false);
  });
});
