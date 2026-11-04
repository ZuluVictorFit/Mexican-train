import { test } from "node:test";
import assert from "node:assert/strict";
import { soundEvents } from "../public/sound-events.js";

function snapshot() {
  return {
    code: "ABC123",
    revision: 10,
    game: {
      round: 1,
      phase: "playing",
      turn: "a",
      players: [
        { id: "a", open: false },
        { id: "b", open: false },
      ],
      trains: { community: { tiles: [] } },
    },
  };
}
test("sound cues reflect turn endings, opened trains, and community starts", () => {
  const before = snapshot(),
    after = structuredClone(before);
  after.revision++;
  after.game.turn = "b";
  assert.deepEqual(soundEvents(before, after), ["turn"]);
  after.game.players[0].open = true;
  assert.deepEqual(soundEvents(before, after), ["turn", "train"]);
  after.game.turn = "a";
  assert.deepEqual(soundEvents(before, after), ["train"]);
  after.game.players[0].open = false;
  after.game.trains.community.tiles.push({ a: 12, b: 4 });
  assert.deepEqual(soundEvents(before, after), ["train"]);
  after.game.trains.community.tiles = [];
  after.game.phase = "round-end";
  assert.deepEqual(soundEvents(before, after), ["turn"]);
});
test("initial, repeated, unrelated and new-round snapshots are silent", () => {
  const before = snapshot(),
    after = structuredClone(before);
  after.game.turn = "b";
  assert.deepEqual(soundEvents(null, after), []);
  assert.deepEqual(soundEvents(before, after), []);
  after.revision++;
  after.code = "OTHER";
  assert.deepEqual(soundEvents(before, after), []);
  after.code = before.code;
  after.game.round++;
  assert.deepEqual(soundEvents(before, after), []);
  before.game.phase = "round-end";
  after.game.round = before.game.round;
  assert.deepEqual(soundEvents(before, after), []);
});
