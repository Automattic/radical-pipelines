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
