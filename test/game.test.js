import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newGame,
  act,
  legalMoves,
  viewGame,
  nextRound,
} from "../server/game.js";
const rand = () => 0;
const seats = Array.from({ length: 6 }, (_, i) => ({
  id: `p${i}`,
  name: `Player ${i}`,
  color: `#00000${i}`,
}));
const t = (a, b) => ({
  id: `${Math.min(a, b)}-${Math.max(a, b)}`,
  a: Math.min(a, b),
  b: Math.max(a, b),
});
function setup() {
  const g = newGame(seats.slice(0, 2), 12, rand);
  g.turn = 0;
  g.players[0].hand = [t(12, 5), t(5, 7), t(2, 3)];
  g.players[1].hand = [t(12, 8), t(6, 8)];
  g.boneyard = [t(1, 4)];
  return g;
}
test("six-player deal has 91 conserved tiles and 18 in boneyard", () => {
  const g = newGame(seats, 12, rand);
  assert.equal(g.players.length, 6);
  assert(g.players.every((p) => p.hand.length === 12));
  assert.equal(g.boneyard.length, 18);
  const all = [...g.players.flatMap((p) => p.hand), ...g.boneyard];
  assert.equal(new Set(all.map((x) => x.id)).size, 90);
  assert(!all.some((x) => x.id === "12-12"));
});
test("opening runs stay on own train and end without drawing", () => {
  let g = setup();
  assert.deepEqual(legalMoves(g, "p0"), [{ tile: "5-12", train: "p:p0" }]);
  g = act(g, "p0", { type: "play", tile: "5-12", train: "p:p0" }, rand);
  g = act(g, "p0", { type: "play", tile: "5-7", train: "p:p0" }, rand);
  assert.equal(g.turn, 0);
  g = act(g, "p0", { type: "end-opening" }, rand);
  assert.equal(g.turn, 1);
  assert.equal(g.boneyard.length, 1);
});
test("ending after a failed opening draw opens the train", () => {
  let g = setup();
  g.players[0].hand = [t(2, 3)];
  g = act(g, "p0", { type: "draw" }, rand);
  g = act(g, "p0", { type: "end-turn" }, rand);
  assert.equal(g.players[0].open, true);
  assert.equal(g.turn, 1);
  assert.equal(g.players[0].hand.length, 2);
});
test("a final double is passed without drawing; a cover lets its owner go out", () => {
  let g = setup();
  g.players[0].first = false;
  g.players[0].hand = [t(6, 6)];
  g.trains["p:p0"].end = 6;
  g = act(g, "p0", { type: "play", tile: "6-6", train: "p:p0" }, rand);
  assert.equal(g.pending.phase, "no-draw");
  assert.equal(g.players[0].hand.length, 0);
  assert.throws(() => act(g, "p0", { type: "draw" }, rand));
  assert.throws(() => act(g, "p0", { type: "end-turn" }, rand));
  g = act(g, "p0", { type: "cant-satisfy" }, rand);
  assert.equal(g.turn, 1);
  assert.equal(g.players[0].open, false);
  assert.equal(g.pending.train, "p:p0");
  assert.deepEqual(legalMoves(g, "p1"), [{ tile: "6-8", train: "p:p0" }]);
  g = act(g, "p1", { type: "play", tile: "6-8", train: "p:p0" }, rand);
  assert.equal(g.pending, null);
  assert.equal(g.phase, "round-end");
  assert.equal(g.roundWinner, "p0");
});
test("final double with empty boneyard resolves after a cover", () => {
  let g = setup();
  g.players[0].first = false;
  g.players[0].hand = [t(6, 6)];
  g.trains["p:p0"].end = 6;
  g.boneyard = [];
  g = act(g, "p0", { type: "play", tile: "6-6", train: "p:p0" }, rand);
  g = act(g, "p0", { type: "cant-satisfy" }, rand);
  g = act(g, "p1", { type: "play", tile: "6-8", train: "p:p0" }, rand);
  assert.equal(g.phase, "round-end");
  assert.equal(g.roundWinner, "p0");
  g = nextRound(g, rand);
  assert.equal(g.engine, 11);
  assert.equal(g.turn, 0);
});
test("uncoverable last double with empty boneyard is blocked and scored", () => {
  let g = setup();
  g.players[0].first = false;
  g.players[0].hand = [t(6, 6)];
  g.players[1].hand = [t(1, 3)];
  g.trains["p:p0"].end = 6;
  g.boneyard = [];
  g = act(g, "p0", { type: "play", tile: "6-6", train: "p:p0" }, rand);
  assert.equal(g.phase, "playing");
  g = act(g, "p0", { type: "cant-satisfy" }, rand);
  assert.equal(g.phase, "playing");
  g = act(g, "p1", { type: "cant-satisfy" }, rand);
  assert.equal(g.phase, "round-end");
  assert.equal(g.results[0].blocked, true);
  assert.deepEqual(
    g.results[0].scores.map((x) => x.points),
    [0, 4],
  );
});
test("the first lap passes without draws or opening trains, and a cover ends that player's turn", () => {
  let g = newGame(seats.slice(0, 3), 12, rand);
  g.turn = 0;
  g.players.forEach((p) => (p.first = false));
  g.players[0].hand = [t(6, 6), t(1, 2)];
  g.players[1].hand = [t(2, 3)];
  g.players[2].hand = [t(6, 8), t(3, 4)];
  g.boneyard = [t(1, 4), t(6, 10)];
  g.trains["p:p0"].end = 6;
  g = act(g, "p0", { type: "play", tile: "6-6", train: "p:p0" }, rand);
  assert.throws(() => act(g, "p0", { type: "draw" }, rand));
  g = act(g, "p0", { type: "cant-satisfy" }, rand);
  assert.throws(() => act(g, "p1", { type: "draw" }, rand));
  g = act(g, "p1", { type: "cant-satisfy" }, rand);
  assert(g.players.every((p) => !p.open));
  assert.equal(g.boneyard.length, 2);
  g = act(g, "p2", { type: "play", tile: "6-8", train: "p:p0" }, rand);
  assert.equal(g.pending, null);
  assert.equal(g.turn, 0);
  assert.equal(g.boneyard.length, 2);
});

test("after one complete lap, drawing starts with the double's player", () => {
  let g = newGame(seats.slice(0, 3), 12, rand);
  g.turn = 0;
  g.players.forEach((p) => (p.first = false));
  g.players[0].hand = [t(6, 6), t(1, 2)];
  g.players[1].hand = [t(2, 3), t(4, 5)];
  g.players[2].hand = [t(3, 4)];
  g.boneyard = [t(1, 4), t(6, 10), t(0, 8)];
  g.trains["p:p0"].end = 6;
  g = act(g, "p0", { type: "play", tile: "6-6", train: "p:p0" }, rand);
  for (const id of ["p0", "p1", "p2"])
    g = act(g, id, { type: "cant-satisfy" }, rand);
  assert.equal(g.turn, 0);
  assert.equal(g.pending.phase, "draw");
  assert.equal(g.boneyard.length, 3);
  assert.throws(() => act(g, "p0", { type: "cant-satisfy" }, rand));
  g = act(g, "p0", { type: "draw" }, rand);
  g = act(g, "p0", { type: "end-turn" }, rand);
  assert.equal(g.players[0].open, true);
  assert.equal(g.turn, 1);
  g = act(g, "p1", { type: "draw" }, rand);
  g = act(g, "p1", { type: "play", tile: "6-10", train: "p:p0" }, rand);
  assert.equal(g.pending, null);
  assert.equal(g.turn, 2);
});

test("a player who drew after a final double is not out until they empty their hand", () => {
  let g = setup();
  g.players[0].first = false;
  g.players[0].hand = [t(6, 6)];
  g.players[1].hand = [t(6, 8), t(1, 2)];
  g.trains["p:p0"].end = 6;
  g.boneyard = [t(1, 4), t(2, 4)];
  g = act(g, "p0", { type: "play", tile: "6-6", train: "p:p0" }, rand);
  g = act(g, "p0", { type: "cant-satisfy" }, rand);
  // A player can miss a cover, as with ordinary plays.
  g = act(g, "p1", { type: "cant-satisfy" }, rand);
  g = act(g, "p0", { type: "draw" }, rand);
  assert.equal(g.pending.finalOut, null);
  g = act(g, "p0", { type: "end-turn" }, rand);
  g = act(g, "p1", { type: "play", tile: "6-8", train: "p:p0" }, rand);
  assert.equal(g.phase, "playing");
  assert.equal(g.players[0].hand.length, 1);
});

test("a player can draw and cover their final double after the first lap", () => {
  let g = setup();
  g.players[0].first = false;
  g.players[0].hand = [t(6, 6)];
  g.players[1].hand = [t(1, 2)];
  g.trains["p:p0"].end = 6;
  g.boneyard = [t(6, 10)];
  g = act(g, "p0", { type: "play", tile: "6-6", train: "p:p0" }, rand);
  g = act(g, "p0", { type: "cant-satisfy" }, rand);
  g = act(g, "p1", { type: "cant-satisfy" }, rand);
  g = act(g, "p0", { type: "draw" }, rand);
  g = act(g, "p0", { type: "play", tile: "6-10", train: "p:p0" }, rand);
  assert.equal(g.phase, "round-end");
  assert.equal(g.roundWinner, "p0");
});

test("covering your own double during an opening run lets you keep building", () => {
  let g = setup();
  g.players[0].hand = [t(6, 6), t(6, 8), t(8, 9), t(2, 3)];
  g.trains["p:p0"].end = 6;
  g = act(g, "p0", { type: "play", tile: "6-6", train: "p:p0" }, rand);
  g = act(g, "p0", { type: "play", tile: "6-8", train: "p:p0" }, rand);
  assert.equal(g.turn, 0);
  assert.equal(g.pending, null);
  g = act(g, "p0", { type: "play", tile: "8-9", train: "p:p0" }, rand);
  assert.equal(g.turn, 0);
  assert.equal(g.trains["p:p0"].end, 9);
});

test("missed covers do not falsely block an empty-boneyard round", () => {
  let g = setup();
  g.players[0].first = false;
  g.players[0].hand = [t(6, 6), t(1, 2)];
  g.players[1].hand = [t(6, 8), t(1, 3)];
  g.trains["p:p0"].end = 6;
  g.boneyard = [];
  g = act(g, "p0", { type: "play", tile: "6-6", train: "p:p0" }, rand);
  g = act(g, "p0", { type: "cant-satisfy" }, rand);
  g = act(g, "p1", { type: "cant-satisfy" }, rand);
  assert.equal(g.phase, "playing");
  assert.equal(g.pending.phase, "draw");
  assert.equal(g.turn, 0);
});

test("a previously saved double without a lap phase remains playable", () => {
  let g = setup();
  g.players[0].first = false;
  g.trains["p:p0"].end = 6;
  g.pending = { train: "p:p0", by: "p0", finalOut: null };
  g = act(g, "p0", { type: "draw" }, rand);
  assert.equal(g.pending.phase, "draw");
  assert.equal(g.drawn, "1-4");
});
test("private view hides other hands and boneyard ordering", () => {
  const g = setup(),
    v = viewGame(g, "p0");
  assert.deepEqual(v.hand, g.players[0].hand);
  assert.equal(v.boneyard, 1);
  assert(!JSON.stringify(v).includes("6-8"));
  assert(!JSON.stringify(v).includes("1-4"));
});
test("rejects out-of-turn and fabricated moves without mutating state", () => {
  const g = setup(),
    before = JSON.stringify(g);
  assert.throws(() => act(g, "p1", { type: "draw" }));
  assert.throws(() =>
    act(g, "p0", { type: "play", tile: "12-12", train: "community" }),
  );
  assert.equal(JSON.stringify(g), before);
});
test("players may draw despite a missed play, then play an existing tile or end", () => {
  let g = setup();
  g.players[0].first = false;
  g.players[1].first = false;
  g = act(g, "p0", { type: "draw" }, rand);
  assert.equal(g.turn, 0);
  assert.equal(g.players[0].hand.length, 4);
  assert.throws(() => act(g, "p0", { type: "draw" }, rand));
  assert(legalMoves(g, "p0").some((m) => m.tile === "5-12"));
  const played = act(
    g,
    "p0",
    { type: "play", tile: "5-12", train: "p:p0" },
    rand,
  );
  assert.equal(played.turn, 1);
  assert(played.players[0].hand.some((tile) => tile.id === "1-4"));
  const passed = act(g, "p0", { type: "end-turn" }, rand);
  assert.equal(passed.turn, 1);
  assert.equal(passed.players[0].open, true);
});

test("missed plays cannot falsely end a blocked round", () => {
  let g = setup();
  g.players.forEach((p) => (p.first = false));
  g.boneyard = [];
  g = act(g, "p0", { type: "end-turn" }, rand);
  g = act(g, "p1", { type: "end-turn" }, rand);
  assert.equal(g.phase, "playing");
  assert.equal(g.turn, 0);
  assert.equal(g.passes, 0);
});
test("complete games conserve every tile across all rounds for 2, 4 and 6 players", () => {
  let x = 1729;
  const seeded = (n) => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x % n;
  };
  for (const count of [2, 4, 6])
    for (let attempt = 0; attempt < 5; attempt++) {
      let g = newGame(seats.slice(0, count), 12, seeded),
        moves = 0;
      while (g.phase !== "finished" && moves++ < 20000) {
        if (g.phase === "round-end") {
          g = nextRound(g, seeded);
          continue;
        }
        const p = g.players[g.turn],
          options = legalMoves(g, p.id);
        if (
          p.first &&
          g.openingPlayed &&
          !g.pending &&
          (options.length === 0 || seeded(3) === 0)
        )
          g = act(g, p.id, { type: "end-opening" }, seeded);
        else if (options.length) {
          const m = options[seeded(options.length)];
          g = act(g, p.id, { type: "play", ...m }, seeded);
        } else if (g.pending?.phase === "no-draw")
          g = act(g, p.id, { type: "cant-satisfy" }, seeded);
        else if (g.drewThisTurn || !g.boneyard.length)
          g = act(g, p.id, { type: "end-turn" }, seeded);
        else g = act(g, p.id, { type: "draw" }, seeded);
        const all = [
          ...g.players.flatMap((p) => p.hand.map((t) => t.id)),
          ...g.boneyard.map((t) => t.id),
          ...Object.values(g.trains).flatMap((t) => t.tiles.map((x) => x.id)),
        ];
        assert.equal(all.length, 90);
        assert.equal(new Set(all).size, 90);
      }
      assert.equal(g.phase, "finished", `game stalled for ${count} players`);
      assert.equal(g.results.length, 13);
      assert(g.players.some((p) => p.id === g.gameWinner));
    }
});

test("a playable opening draw can start an opening run", () => {
  let g = setup();
  g.players[0].hand = [t(1, 2), t(3, 4)];
  g.boneyard = [t(1, 12), t(0, 5)];
  g = act(g, "p0", { type: "draw" }, rand);
  assert.equal(g.turn, 0);
  assert.equal(g.drawn, "1-12");
  assert.deepEqual(legalMoves(g, "p0"), [{ tile: "1-12", train: "p:p0" }]);
  assert.throws(() => act(g, "p0", { type: "draw" }, rand));
  g = act(g, "p0", { type: "play", tile: "1-12", train: "p:p0" }, rand);
  assert.equal(g.turn, 0);
  assert.equal(g.drawn, null);
  assert.equal(g.openingPlayed, true);
  assert.deepEqual(legalMoves(g, "p0"), [{ tile: "1-2", train: "p:p0" }]);
  g = act(g, "p0", { type: "play", tile: "1-2", train: "p:p0" }, rand);
  g = act(g, "p0", { type: "end-opening" }, rand);
  assert.equal(g.turn, 1);
});

test("an unsuccessful opening draw stays visible until the player ends their turn", () => {
  let g = setup();
  g.players[0].hand = [t(2, 3)];
  g.boneyard = [t(1, 4), t(1, 12)];
  g = act(g, "p0", { type: "draw" }, rand);
  assert.equal(g.turn, 0);
  g = act(g, "p0", { type: "end-turn" }, rand);
  assert.equal(g.turn, 1);
  assert.equal(g.players[0].open, true);
  assert.deepEqual(
    viewGame(g, "p0").hand.map((t) => t.id),
    ["2-3", "1-4"],
  );
  assert.equal(viewGame(g, "p0").drawn, null);
});
