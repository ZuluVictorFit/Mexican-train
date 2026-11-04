// Board coordinates are independent of screen size. Matching halves touch along
// a compact, outward-moving stagger; doubles turn across that pattern.
export const TILE_LENGTH = 72;
export const TILE_WIDTH = 36;
export const HUB_RADIUS = 66;

export function layoutTrain(tiles, angle) {
  // The train moves outward along its local x-axis. Ordinary dominoes alternate
  // which half points toward the previous tile, creating a compact stagger.
  // Each matching half shares a section of the boundary with its neighbor.
  let cursor = HUB_RADIUS + 20;
  let normalCount = 0;
  let outgoingY = -TILE_WIDTH / 2 - 5;
  const radians = (angle * Math.PI) / 180;
  const point = (x, y) => ({
    x: Math.cos(radians) * x - Math.sin(radians) * y,
    y: Math.sin(radians) * x + Math.cos(radians) * y,
  });
  const dominoes = [];
  for (const tile of tiles) {
    const isDouble = tile.a === tile.b;
    const length = isDouble ? TILE_LENGTH : TILE_WIDTH;
    const firstHalfOffset =
      normalCount % 2 === 0 ? -TILE_WIDTH / 2 : TILE_WIDTH / 2;
    const centerY = isDouble ? outgoingY : normalCount % 2 === 0 ? -5 : 5;
    const incomingY = isDouble ? centerY : centerY + firstHalfOffset;
    const nextOutgoingY = isDouble ? centerY : centerY - firstHalfOffset;
    const sharedY = dominoes.length ? (outgoingY + incomingY) / 2 : incomingY;
    const start = point(cursor, sharedY);
    if (dominoes.length) dominoes.at(-1).end = start;
    const center = point(cursor + length / 2, centerY);
    cursor += length;
    const piece = {
      tile,
      start,
      center,
      end: point(cursor, nextOutgoingY),
      angle: angle + (isDouble ? 0 : firstHalfOffset < 0 ? 90 : -90),
      length,
    };
    dominoes.push(piece);
    outgoingY = nextOutgoingY;
    if (!isDouble) normalCount++;
  }
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
