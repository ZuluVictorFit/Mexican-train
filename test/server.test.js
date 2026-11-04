import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { io } from "socket.io-client";
import { once } from "node:events";
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn) {
  for (let i = 0; i < 100; i++) {
    if (fn()) return;
    await delay(20);
  }
  throw Error("Timed out waiting for server state");
}
async function boot(port, path) {
  const child = spawn(process.execPath, ["server/index.js"], {
    env: { ...process.env, PORT: String(port), DATA_PATH: path },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  await until(() => out.includes("listening"));
  return child;
}
async function connect(url, cookie) {
  if (!cookie) {
    const res = await fetch(url + "/api/session");
    cookie = res.headers.getSetCookie()[0].split(";")[0];
  }
  const s = io(url, {
    transports: ["websocket"],
    extraHeaders: { Cookie: cookie },
    reconnection: false,
  });
  await once(s, "connect");
  let state;
  s.on("state", (x) => (state = x));
  return {
    s,
    cookie,
    get state() {
      return state;
    },
  };
}
const send = (c, event, data) => c.s.timeout(2000).emitWithAck(event, data);
test("rooms enforce privacy, revisions, color uniqueness, and survive a restart", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mexican-train-"));
  const port = 31000 + Math.floor(Math.random() * 15000),
    url = `http://127.0.0.1:${port}`,
    path = join(dir, "rooms.sqlite");
  let server;
  const clients = [];
  try {
    server = await boot(port, path);
    const a = await connect(url),
      b = await connect(url),
      c = await connect(url);
    clients.push(a, b, c);
    let result = await send(a, "create", { name: "Alice", color: "#123456" });
    assert(result.ok);
    const code = result.code;
    await until(() => a.state);
    result = await send(b, "join", { code, name: "Bob", color: "#123456" });
    assert.equal(result.ok, false);
    result = await send(b, "join", { code, name: "Bob", color: "#654321" });
    assert(result.ok);
    await until(() => a.state.players.length === 2 && b.state);
    result = await send(b, "start", { code, engine: 0 });
    assert.equal(result.ok, false);
    result = await send(a, "start", { code, engine: 0 });
    assert(result.ok);
    await until(() => a.state.game && b.state.game);
    assert.equal(a.state.game.hand.length, 15);
    assert.equal(b.state.game.hand.length, 15);
    assert(!JSON.stringify(a.state).includes(b.cookie.split("=")[1]));
    const aIds = new Set(a.state.game.hand.map((t) => t.id));
    assert(b.state.game.hand.every((t) => !aIds.has(t.id)));
    for (const t of b.state.game.hand)
      assert(!JSON.stringify(a.state).includes(`"id":"${t.id}"`));
    const active = a.state.game.turn === a.state.me ? a : b,
      other = active === a ? b : a;
    result = await send(other, "move", {
      code,
      revision: other.state.revision,
      commandId: "wrong-turn",
      action: { type: "draw" },
    });
    assert.equal(result.ok, false);
    result = await send(active, "move", {
      code,
      revision: active.state.revision,
      commandId: "fake",
      action: { type: "play", tile: "fake", train: "community" },
    });
    assert.equal(result.ok, false);
    const revision = active.state.revision,
      move = active.state.game.legal[0],
      action = move ? { type: "play", ...move } : { type: "draw" };
    result = await send(active, "move", {
      code,
      revision,
      commandId: "once",
      action,
    });
    assert(result.ok);
    await until(() => active.state.revision > revision);
    const after = active.state.revision;
    result = await send(active, "move", {
      code,
      revision,
      commandId: "once",
      action,
    });
    assert(result.ok);
    assert.equal(active.state.revision, after);
    const expected = active.state.game.hand.map((t) => t.id).sort();
    for (const client of clients) client.s.disconnect();
    server.kill("SIGTERM");
    await once(server, "exit");
    server = await boot(port, path);
    const restored = await connect(url, active.cookie);
    clients.push(restored);
    result = await send(restored, "resume", { code });
    assert(result.ok);
    await until(() => restored.state?.game);
    assert.deepEqual(
      restored.state.game.hand.map((t) => t.id).sort(),
      expected,
    );
    assert.equal(restored.state.revision, after);
  } finally {
    for (const c of clients) c.s.disconnect();
    if (server && !server.killed) {
      server.kill("SIGTERM");
      await once(server, "exit");
    }
    await rm(dir, { recursive: true, force: true });
  }
});
test("lobby color changes and host leaving keep the table manageable", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mexican-lobby-"));
  const port = 31000 + Math.floor(Math.random() * 15000),
    url = `http://127.0.0.1:${port}`;
  let server;
  const clients = [];
  try {
    server = await boot(port, join(dir, "rooms.sqlite"));
    const a = await connect(url),
      b = await connect(url),
      c = await connect(url);
    clients.push(a, b, c);
    const { code } = await send(a, "create", { name: "A", color: "#112233" });
    assert((await send(b, "join", { code, name: "B", color: "#334455" })).ok);
    assert((await send(c, "join", { code, name: "C", color: "#556677" })).ok);
    await until(() => a.state?.players.length === 3);
    assert.equal(
      (await send(b, "change-color", { code, color: "#112233" })).ok,
      false,
    );
    assert((await send(b, "change-color", { code, color: "#778899" })).ok);
    await until(() => a.state.players.some((p) => p.color === "#778899"));
    const bId = b.state.me;
    assert((await send(a, "leave", { code })).ok);
    await until(() => b.state.host === bId && b.state.players.length === 2);
    assert((await send(b, "start", { code, engine: 12 })).ok);
    await until(() => b.state.game);
    assert.equal((await send(b, "leave", { code })).ok, false);
  } finally {
    for (const c of clients) c.s.disconnect();
    if (server && !server.killed) {
      server.kill("SIGTERM");
      await once(server, "exit");
    }
    await rm(dir, { recursive: true, force: true });
  }
});
