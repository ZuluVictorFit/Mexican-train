import { test } from "node:test";
import assert from "node:assert/strict";
import {
  layoutTrain,
  layoutTable,
  TILE_LENGTH,
  TILE_WIDTH,
} from "../public/train-layout.js";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
test("dominoes connect end to end with sideways doubles on every route angle", () => {
  const tiles = [
    { id: "a", a: 12, b: 9 },
    { id: "b", a: 9, b: 9 },
    { id: "c", a: 9, b: 4 },
    { id: "d", a: 4, b: 0 },
  ];
  for (const angle of [0, 51.42857, 90, 180, 270, 315]) {
    const train = layoutTrain(tiles, angle);
    assert.equal(train.dominoes.length, tiles.length);
    for (let i = 1; i < train.dominoes.length; i++) {
      close(train.dominoes[i - 1].end.x, train.dominoes[i].start.x);
      close(train.dominoes[i - 1].end.y, train.dominoes[i].start.y);
      assert.equal(tiles[i - 1].b, tiles[i].a);
    }
    assert.equal(train.dominoes[0].length, TILE_LENGTH);
    assert.equal(train.dominoes[1].length, TILE_WIDTH);
    assert.equal(train.dominoes[1].angle, angle + 90);
    assert.equal(train.dominoes[2].angle, angle);
    const endDistance = Math.hypot(train.end.x, train.end.y);
    assert.ok(Math.hypot(train.target.x, train.target.y) > endDistance);
  }
});
test("six personal trains and one community train have distinct directions and all long-train tiles", () => {
  const lanes = Array.from({ length: 7 }, (_, i) => ({
    key: i === 6 ? "community" : `p:${i}`,
    tiles:
      i === 1
        ? Array.from({ length: 30 }, (_, n) => ({
            id: `t${n}`,
            a: n % 13,
            b: (n + 1) % 13,
          }))
        : [],
  }));
  const table = layoutTable(lanes);
  assert.equal(table.trains.length, 7);
  assert.equal(new Set(table.trains.map((t) => t.angle)).size, 7);
  assert.equal(table.trains[1].dominoes.length, 30);
  for (const train of table.trains)
    assert.ok(Math.hypot(train.label.x, train.label.y) < table.radius);
});
