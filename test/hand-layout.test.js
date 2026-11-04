import { test } from "node:test";
import assert from "node:assert/strict";
import { initialHandLayout, nextHandPosition } from "../public/hand-layout.js";

test("a fresh 12 or 15 tile hand fits desktop and tablet trays without overlapping", () => {
  for (const [width, height] of [
    [690, 176],
    [950, 176],
    [520, 176],
  ])
    for (const count of [12, 15]) {
      const { scale, positions } = initialHandLayout(count, width, height);
      assert.equal(positions.length, count);
      assert(
        scale >= 0.65 && scale <= 0.9,
        `unreadably small tiles at ${width}x${height}`,
      );
      for (const p of positions) {
        assert(
          (p.x - 49) * scale >= 0 && (p.x + 49) * scale <= width,
          "tile must fit horizontally",
        );
        assert(
          (p.y - 25.5) * scale >= 0 && (p.y + 25.5) * scale <= height,
          "tile must fit vertically",
        );
      }
      assert(
        Math.max(...positions.map((p) => (p.x + 49) * scale)) <= width * 0.93 &&
          Math.max(...positions.map((p) => (p.y + 25.5) * scale)) <=
            height * 0.93,
        "leave visible space to rearrange the hand",
      );
      for (let i = 0; i < positions.length; i++)
        for (let j = i + 1; j < positions.length; j++)
          assert(
            Math.abs(positions[i].x - positions[j].x) >= 98 ||
              Math.abs(positions[i].y - positions[j].y) >= 51,
            "initial tiles must not overlap",
          );
    }
});

test("a draw uses visible empty space without moving existing tiles", () => {
  const initial = initialHandLayout(15, 690, 176);
  const occupied = initial.positions.map((p, i) => ({
    ...p,
    id: String(i),
    rotation: 0,
  }));
  const before = JSON.stringify(occupied),
    scale = initial.scale;
  const p = nextHandPosition(
    occupied,
    { left: 0, top: 0, right: 690 / scale, bottom: 176 / scale, scale },
    1600,
    800,
  );
  assert.equal(JSON.stringify(occupied), before);
  assert((p.x - 49) * scale >= 0 && (p.x + 49) * scale <= 690);
  assert((p.y - 25.5) * scale >= 0 && (p.y + 25.5) * scale <= 176);
  for (const o of occupied)
    assert(Math.abs(o.x - p.x) >= 102 || Math.abs(o.y - p.y) >= 55);
});
