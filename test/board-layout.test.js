import { test } from "node:test";
import assert from "node:assert/strict";
import {
  layoutTrain,
  layoutTable,
  TILE_LENGTH,
  TILE_WIDTH,
  HUB_RADIUS,
} from "../public/train-layout.js";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
test("staggered matching halves connect without overlap, including sideways doubles", () => {
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
    assert.equal(train.dominoes[0].length, TILE_WIDTH);
    assert.equal(train.dominoes[1].length, TILE_LENGTH);
    assert.equal(train.dominoes[1].angle, angle);
    for (let i = 1; i < train.dominoes.length; i++) {
      const before = train.dominoes[i - 1],
        after = train.dominoes[i];
      const local = (piece, point) => {
        const r = (-piece.angle * Math.PI) / 180;
        const x = point.x - piece.center.x,
          y = point.y - piece.center.y;
        return {
          x: x * Math.cos(r) - y * Math.sin(r),
          y: x * Math.sin(r) + y * Math.cos(r),
        };
      };
      const previousEnd = local(before, before.end),
        nextStart = local(after, after.start);
      assert(
        previousEnd.x >= -1e-8 && previousEnd.x <= TILE_LENGTH / 2 + 1e-8,
        "connection touches the outgoing matching half",
      );
      assert(
        nextStart.x <= 1e-8 && nextStart.x >= -TILE_LENGTH / 2 - 1e-8,
        "connection touches the incoming matching half",
      );
      assert(Math.abs(previousEnd.y) <= TILE_WIDTH / 2 + 1e-8);
      assert(Math.abs(nextStart.y) <= TILE_WIDTH / 2 + 1e-8);
    }
    const endDistance = Math.hypot(train.end.x, train.end.y);
    assert.ok(Math.hypot(train.target.x, train.target.y) > endDistance);
  }
});

test("a staggered 15-tile train fits in much less outward space than a straight train", () => {
  const tiles = Array.from({ length: 15 }, (_, i) => ({
    id: String(i),
    a: i,
    b: i + 1,
  }));
  const train = layoutTrain(tiles, 0);
  assert.equal(train.dominoes.length, 15);
  assert.ok(
    train.end.x < 700,
    "15 ordinary tiles should fit in under 700 board units",
  );
  assert.ok(
    train.end.x < 86 + 15 * TILE_LENGTH * 0.6,
    "the stagger should substantially reduce the required zoom-out",
  );
  assert.notEqual(
    train.dominoes[0].center.y,
    train.dominoes[1].center.y,
    "alternate tiles must be visibly staggered",
  );
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

test("seven staggered trains do not overlap each other or the hub", () => {
  const lanes = Array.from({ length: 7 }, (_, lane) => ({
    key: String(lane),
    tiles: Array.from({ length: 15 }, (_, i) => ({
      id: `${lane}-${i}`,
      a: i % 13,
      b: i === 5 || i === 10 ? i % 13 : (i + 1) % 13,
    })),
  }));
  const table = layoutTable(lanes);
  function overlaps(a, b) {
    const ar = (a.angle * Math.PI) / 180,
      br = (b.angle * Math.PI) / 180;
    const axes = [
      [Math.cos(ar), Math.sin(ar)],
      [-Math.sin(ar), Math.cos(ar)],
      [Math.cos(br), Math.sin(br)],
      [-Math.sin(br), Math.cos(br)],
    ];
    const radius = (p, r, x, y) =>
      (TILE_LENGTH / 2) * Math.abs(x * Math.cos(r) + y * Math.sin(r)) +
      (TILE_WIDTH / 2) * Math.abs(-x * Math.sin(r) + y * Math.cos(r));
    return axes.every(
      ([x, y]) =>
        Math.abs(
          (a.center.x - b.center.x) * x + (a.center.y - b.center.y) * y,
        ) <
        radius(a, ar, x, y) + radius(b, br, x, y) - 1e-7,
    );
  }
  const pieces = table.trains.flatMap((train) =>
    train.dominoes.map((piece) => ({ ...piece, lane: train.key })),
  );
  for (const piece of pieces) {
    const r = (-piece.angle * Math.PI) / 180;
    const x = -piece.center.x * Math.cos(r) + piece.center.y * Math.sin(r);
    const y = -piece.center.x * Math.sin(r) - piece.center.y * Math.cos(r);
    const dx = Math.max(0, Math.abs(x) - TILE_LENGTH / 2);
    const dy = Math.max(0, Math.abs(y) - TILE_WIDTH / 2);
    assert(
      Math.hypot(dx, dy) >= HUB_RADIUS - 1e-7,
      `tile ${piece.tile.id} overlaps the hub`,
    );
  }
  for (let i = 0; i < pieces.length; i++)
    for (let j = i + 1; j < pieces.length; j++)
      assert.equal(
        overlaps(pieces[i], pieces[j]),
        false,
        `tiles ${pieces[i].tile.id} and ${pieces[j].tile.id} overlap`,
      );
});
