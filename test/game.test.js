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
  assert.throws(() => act(g, "p0", { type: "draw" }, rand));
  g = act(g, "p0", { type: "end-opening" }, rand);
  assert.equal(g.turn, 1);
  assert.equal(g.boneyard.length, 1);
});
test("failed opening draw opens train and ends turn", () => {
  let g = setup();
  g.players[0].hand = [t(2, 3)];
  g = act(g, "p0", { type: "draw" }, rand);
  assert.equal(g.players[0].open, true);
  assert.equal(g.turn, 1);
  assert.equal(g.players[0].hand.length, 2);
});
test("final double forces draw then transfers cover obligation", () => {
  let g = setup();
  g.players[0].first = false;
  g.players[0].hand = [t(6, 6)];
  g.trains["p:p0"].end = 6;
  g = act(g, "p0", { type: "play", tile: "6-6", train: "p:p0" }, rand);
  assert.equal(g.turn, 1);
  assert.equal(g.players[0].open, true);
  assert.equal(g.pending.train, "p:p0");
  assert.deepEqual(legalMoves(g, "p1"), [{ tile: "6-8", train: "p:p0" }]);
  g = act(g, "p1", { type: "play", tile: "6-8", train: "p:p0" }, rand);
  assert.equal(g.pending, null);
  assert.equal(g.phase, "playing");
  assert.equal(g.turn, 0);
});
test("final double with empty boneyard resolves after a cover", () => {
  let g = setup();
  g.players[0].first = false;
  g.players[0].hand = [t(6, 6)];
  g.trains["p:p0"].end = 6;
  g.boneyard = [];
  g = act(g, "p0", { type: "play", tile: "6-6", train: "p:p0" }, rand);
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
  assert.equal(g.phase, "round-end");
  assert.equal(g.results[0].blocked, true);
  assert.deepEqual(
    g.results[0].scores.map((x) => x.points),
    [0, 4],
  );
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
        } else g = act(g, p.id, { type: "draw" }, seeded);
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
