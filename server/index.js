import express from "express";
import http from "node:http";
import { Server } from "socket.io";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomInt } from "node:crypto";
import { newGame, act, nextRound, viewGame } from "./game.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
const db = new DatabaseSync(process.env.DATA_PATH || "game.sqlite");
db.exec(
  "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, data TEXT NOT NULL)",
);
const rooms = new Map(
  db
    .prepare("SELECT code,data FROM rooms")
    .all()
    .map((r) => [r.code, JSON.parse(r.data)]),
);
const sockets = new Map();
const timers = new Map();
const attempts = new Map();
function limitJoins(socket) {
  const forwarded = socket.handshake.headers["x-forwarded-for"];
  const ip =
    typeof forwarded === "string"
      ? forwarded.split(",").at(-1).trim()
      : socket.handshake.address;
  const now = Date.now(),
    entry = attempts.get(ip);
  if (!entry || now - entry.start > 60000) {
    attempts.set(ip, { start: now, count: 1 });
    return;
  }
  if (++entry.count > 30)
    throw Error("Too many room attempts. Please wait a minute.");
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of attempts)
    if (now - entry.start > 60000) attempts.delete(ip);
}, 60000).unref();
const save = (r) =>
  db
    .prepare(
      "INSERT INTO rooms(code,data) VALUES (?,?) ON CONFLICT(code) DO UPDATE SET data=excluded.data",
    )
    .run(r.code, JSON.stringify(r));
const token = () => randomBytes(24).toString("hex");
const cookie = (req) => {
  const m = (req.headers.cookie || "").match(
    /(?:^|;\s*)mt_session=([a-f0-9]{48})(?:;|$)/,
  );
  return m?.[1];
};
app.get("/api/session", (req, res) => {
  let id = cookie(req);
  if (!id) {
    id = token();
    res.cookie("mt_session", id, {
      httpOnly: true,
      sameSite: "lax",
      secure: req.secure,
      maxAge: 30 * 24 * 3600 * 1000,
    });
  }
  res.set("Cache-Control", "no-store").json({ ok: true });
});
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use(express.static("public", { index: "index.html", maxAge: 0 }));
const server = http.createServer(app);
const io = new Server(server, {
  allowRequest: (req, done) => {
    const origin = req.headers.origin;
    if (!origin) return done(null, true);
    try {
      done(null, new URL(origin).host === req.headers.host);
    } catch {
      done(null, false);
    }
  },
});
const connected = (id) => [...(sockets.get(id) || [])].some((s) => s.connected);
const validName = (s) =>
  typeof s === "string" && s.trim().length > 0 && s.trim().length <= 24;
const validColor = (s) => typeof s === "string" && /^#[0-9a-f]{6}$/i.test(s);
function roomCode() {
  let c;
  do {
    c = Array.from(
      { length: 6 },
      () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[randomInt(32)],
    ).join("");
  } while (rooms.has(c));
  return c;
}
function view(room, id) {
  return {
    code: room.code,
    host: room.host,
    me: id,
    revision: room.revision,
    players: room.seats.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      connected: connected(s.session),
    })),
    game: room.game ? viewGame(room.game, id) : null,
  };
}
function broadcast(room) {
  for (const seat of room.seats)
    for (const socket of sockets.get(seat.session) || [])
      if (socket.connected && socket.data.room === room.code)
        socket.emit("state", view(room, seat.id));
}
function requireRoom(id, code) {
  const room = rooms.get(String(code || "").toUpperCase());
  if (!room || !room.seats.some((s) => s.session === id))
    throw Error("Room or seat not found.");
  return room;
}
function respond(fn, cb) {
  try {
    const result = fn();
    cb?.({ ok: true, ...result });
  } catch (e) {
    cb?.({ ok: false, error: e.message || "Request failed." });
  }
}
io.on("connection", (socket) => {
  const id = cookie(socket.request);
  if (!id) {
    socket.disconnect(true);
    return;
  }
  if (!sockets.has(id)) sockets.set(id, new Set());
  sockets.get(id).add(socket);
  if (timers.has(id)) {
    clearTimeout(timers.get(id));
    timers.delete(id);
  }
  socket.on("create", (data, cb) =>
    respond(() => {
      limitJoins(socket);
      if (!validName(data?.name) || !validColor(data?.color))
        throw Error("Enter a name and a valid train color.");
      const seat = {
        id: token(),
        session: id,
        name: data.name.trim(),
        color: data.color.toLowerCase(),
      };
      let room = {
        code: roomCode(),
        host: seat.id,
        seats: [seat],
        revision: 0,
        game: null,
        commands: {},
      };
      rooms.set(room.code, room);
      socket.data.room = room.code;
      save(room);
      broadcast(room);
      return { code: room.code };
    }, cb),
  );
  socket.on("join", (data, cb) =>
    respond(() => {
      limitJoins(socket);
      const code = String(data?.code || "")
          .trim()
          .toUpperCase(),
        room = rooms.get(code);
      if (!room) throw Error("Room code not found.");
      let seat = room.seats.find((s) => s.session === id);
      if (!seat) {
        if (room.game) throw Error("This game has already started.");
        if (room.seats.length >= 6) throw Error("This room is full.");
        if (!validName(data.name) || !validColor(data.color))
          throw Error("Enter a name and a valid train color.");
        if (room.seats.some((s) => s.color === data.color.toLowerCase()))
          throw Error("That train color is already taken.");
        room.seats.push({
          id: token(),
          session: id,
          name: data.name.trim(),
          color: data.color.toLowerCase(),
        });
        room.revision++;
        save(room);
      }
      socket.data.room = room.code;
      broadcast(room);
      return { code };
    }, cb),
  );
  socket.on("resume", (data, cb) =>
    respond(() => {
      const room = requireRoom(id, data?.code);
      socket.data.room = room.code;
      broadcast(room);
      return { code: room.code };
    }, cb),
  );
  socket.on("change-color", (data, cb) =>
    respond(() => {
      const room = requireRoom(id, data?.code);
      if (room.game) throw Error("Colors cannot change during a game.");
      if (!validColor(data?.color)) throw Error("Choose a valid color.");
      const seat = room.seats.find((s) => s.session === id),
        color = data.color.toLowerCase();
      if (room.seats.some((s) => s.id !== seat.id && s.color === color))
        throw Error("That train color is already taken.");
      seat.color = color;
      room.revision++;
      save(room);
      broadcast(room);
      return {};
    }, cb),
  );
  socket.on("start", (data, cb) =>
    respond(() => {
      const room = requireRoom(id, data?.code);
      if (room.host !== room.seats.find((s) => s.session === id).id)
        throw Error("Only the host can start.");
      if (room.game) throw Error("Game already started.");
      room.game = newGame(room.seats, Number(data.engine));
      room.revision++;
      save(room);
      broadcast(room);
      return {};
    }, cb),
  );
  socket.on("move", (data, cb) =>
    respond(() => {
      const room = requireRoom(id, data?.code);
      if (!room.game) throw Error("The game has not started.");
      if (typeof data.commandId !== "string" || data.commandId.length > 80)
        throw Error("Missing command ID.");
      const key = id + ":" + data.commandId;
      if (room.commands[key]) return {};
      if (data.revision !== room.revision)
        throw Error("The table changed. Please try again.");
      room.game = act(
        room.game,
        room.seats.find((s) => s.session === id).id,
        data.action,
      );
      room.revision++;
      room.commands[key] = true;
      let keys = Object.keys(room.commands);
      if (keys.length > 500) delete room.commands[keys[0]];
      save(room);
      broadcast(room);
      return {};
    }, cb),
  );
  socket.on("next-round", (data, cb) =>
    respond(() => {
      const room = requireRoom(id, data?.code);
      if (room.host !== room.seats.find((s) => s.session === id).id)
        throw Error("Only the host starts the next round.");
      room.game = nextRound(room.game);
      room.revision++;
      save(room);
      broadcast(room);
      return {};
    }, cb),
  );
  socket.on("rematch", (data, cb) =>
    respond(() => {
      const room = requireRoom(id, data?.code);
      if (room.host !== room.seats.find((s) => s.session === id).id)
        throw Error("Only the host can start a rematch.");
      if (room.game?.phase !== "finished")
        throw Error("The game is not complete.");
      room.game = null;
      room.commands = {};
      room.revision++;
      save(room);
      broadcast(room);
      return {};
    }, cb),
  );
  socket.on("leave", (data, cb) =>
    respond(() => {
      const room = requireRoom(id, data?.code);
      if (room.game && room.game.phase !== "finished")
        throw Error("The game is still in progress.");
      const seat = room.seats.find((s) => s.session === id);
      room.seats = room.seats.filter((s) => s.id !== seat.id);
      for (const client of sockets.get(id) || []) {
        if (client.data.room === room.code) {
          client.data.room = null;
          client.emit("left");
        }
      }
      if (!room.seats.length) {
        rooms.delete(room.code);
        db.prepare("DELETE FROM rooms WHERE code=?").run(room.code);
      } else {
        if (room.host === seat.id) room.host = room.seats[0].id;
        room.revision++;
        save(room);
        broadcast(room);
      }
      return {};
    }, cb),
  );
  socket.on("disconnect", () => {
    sockets.get(id)?.delete(socket);
    for (const room of rooms.values())
      if (room.seats.some((s) => s.session === id)) broadcast(room);
    if (!connected(id))
      timers.set(
        id,
        setTimeout(() => {
          for (const room of rooms.values()) {
            if (room.seats.find((s) => s.session === id)?.id === room.host) {
              const replacement = room.seats.find(
                (s) => s.session !== id && connected(s.session),
              );
              if (replacement) {
                room.host = replacement.id;
                room.revision++;
                save(room);
                broadcast(room);
              }
            }
          }
          timers.delete(id);
        }, 120000),
      );
  });
});
const port = Number(process.env.PORT || 3000);
server.listen(port, "0.0.0.0", () =>
  console.log(`Mexican Train listening on ${port}`),
);
