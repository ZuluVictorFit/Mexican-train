// Board coordinates are independent of screen size. Matching halves touch along
// a compact, outward-moving stagger; doubles turn across that pattern.
export const TILE_LENGTH = 72;
export const TILE_WIDTH = 36;
export const HUB_RADIUS = 66;

export function layoutTrain(tiles, angle) {
  // Lengthwise tiles alternate between parallel tracks. Consecutive matching
  // halves meet along their side edges, halfway along each tile.
  let last = null;
  let side = 1;
  const radians = (angle * Math.PI) / 180;
  const point = (x, y) => ({
    x: Math.cos(radians) * x - Math.sin(radians) * y,
    y: Math.sin(radians) * x + Math.cos(radians) * y,
  });
  const dominoes = [];
  for (const tile of tiles) {
    const isDouble = tile.a === tile.b;
    let x, y, joinX, joinY;
    if (!last) {
      x = HUB_RADIUS + 20 + (isDouble ? TILE_WIDTH : TILE_LENGTH) / 2;
      y = 0;
      joinX = HUB_RADIUS + 20;
      joinY = 0;
    } else if (!last.isDouble && !isDouble) {
      x = last.x + TILE_LENGTH / 2;
      y = last.y + side * TILE_WIDTH;
      joinX = last.x + TILE_LENGTH / 4;
      joinY = (last.y + y) / 2;
      side *= -1;
    } else {
      x =
        last.x +
        (last.isDouble ? TILE_WIDTH : TILE_LENGTH) / 2 +
        (isDouble ? TILE_WIDTH : TILE_LENGTH) / 2;
      y = last.y + (last.isDouble && !isDouble ? TILE_LENGTH / 4 : 0);
      joinX = last.x + (last.isDouble ? TILE_WIDTH : TILE_LENGTH) / 2;
      joinY = last.isDouble
        ? last.y + TILE_LENGTH / 4
        : last.y - TILE_WIDTH / 4;
      side = 1;
    }
    const start = point(joinX, joinY);
    if (dominoes.length) dominoes.at(-1).end = start;
    const piece = {
      tile,
      start,
      center: point(x, y),
      end: point(x + (isDouble ? TILE_WIDTH : TILE_LENGTH) / 2, y),
      angle: angle + (isDouble ? 90 : 0),
      length: isDouble ? TILE_WIDTH : TILE_LENGTH,
    };
    dominoes.push(piece);
    last = { x, y, isDouble };
  }
  const cursor = last
    ? last.x + (last.isDouble ? TILE_WIDTH : TILE_LENGTH) / 2
    : HUB_RADIUS + 20;
  const outgoingY = last ? last.y : 0;
  return {
    angle,
    dominoes,
    end: point(cursor, outgoingY),
    target: point(cursor + 23, outgoingY),
    label: point(cursor + 65, outgoingY),
    extent: cursor + Math.abs(outgoingY) + 150,
  };
}

export function layoutTable(lanes) {
  const trains = lanes.map((lane, index) => ({
    ...lane,
    ...layoutTrain(lane.tiles, 90 + (index * 360) / lanes.length),
  }));
  const bounds = {
    minX: -HUB_RADIUS,
    maxX: HUB_RADIUS,
    minY: -HUB_RADIUS,
    maxY: HUB_RADIUS,
  };
  function include(x, y, width, height) {
    bounds.minX = Math.min(bounds.minX, x - width);
    bounds.maxX = Math.max(bounds.maxX, x + width);
    bounds.minY = Math.min(bounds.minY, y - height);
    bounds.maxY = Math.max(bounds.maxY, y + height);
  }
  for (const train of trains) {
    for (const piece of train.dominoes) {
      const radians = (piece.angle * Math.PI) / 180;
      const width =
        (Math.abs(Math.cos(radians)) * TILE_LENGTH) / 2 +
        (Math.abs(Math.sin(radians)) * TILE_WIDTH) / 2;
      const height =
        (Math.abs(Math.sin(radians)) * TILE_LENGTH) / 2 +
        (Math.abs(Math.cos(radians)) * TILE_WIDTH) / 2;
      include(piece.center.x, piece.center.y, width + 3, height + 3);
    }
    include(train.target.x, train.target.y, 25, 25);
    const labelLength = String(train.name || "").length + (train.open ? 7 : 0);
    include(
      train.label.x,
      train.label.y + 8,
      Math.max(35, labelLength * 5),
      22,
    );
  }
  const padding = 20;
  bounds.minX -= padding;
  bounds.maxX += padding;
  bounds.minY -= padding;
  bounds.maxY += padding;
  return {
    trains,
    bounds,
    radius: Math.max(190, ...trains.map((train) => train.extent)),
  };
}
