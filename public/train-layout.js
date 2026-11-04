// Board coordinates are independent of screen size. Each domino begins where
// the previous one ends; doubles occupy their shorter dimension along the train.
export const TILE_LENGTH = 72;
export const TILE_WIDTH = 36;
export const HUB_RADIUS = 66;
const START = HUB_RADIUS + 4;

export function layoutTrain(tiles, angle) {
  let cursor = START;
  const radians = (angle * Math.PI) / 180;
  const point = (distance) => ({
    x: Math.cos(radians) * distance,
    y: Math.sin(radians) * distance,
  });
  const dominoes = tiles.map((tile) => {
    const isDouble = tile.a === tile.b;
    const length = isDouble ? TILE_WIDTH : TILE_LENGTH;
    const start = point(cursor);
    const center = point(cursor + length / 2);
    cursor += length;
    return {
      tile,
      start,
      center,
      end: point(cursor),
      angle: angle + (isDouble ? 90 : 0),
      length,
    };
  });
  return {
    angle,
    dominoes,
    end: point(cursor),
    target: point(cursor + 23),
    label: point(cursor + 65),
    extent: cursor + 150,
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
