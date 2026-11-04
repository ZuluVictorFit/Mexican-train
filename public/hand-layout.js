// Arrange a fresh deal so it fits the compact hand. Positions remain free after dealing.
const WIDTH = 98,
  HEIGHT = 51,
  GAP = 9,
  PADDING = 8;
// Leave some visible workspace around a fresh deal for sorting tiles.
export const HAND_WORKSPACE_SCALE = 0.9;
export function initialHandLayout(count, viewWidth, viewHeight) {
  if (!Number.isInteger(count) || count < 0)
    throw new Error("Invalid hand size.");
  if (!count) return { scale: 1, positions: [] };
  const availableWidth = Math.max(1, viewWidth - PADDING * 2);
  const availableHeight = Math.max(1, viewHeight - PADDING * 2);
  let best = null;
  for (let columns = 1; columns <= count; columns++) {
    const rows = Math.ceil(count / columns);
    const width = columns * WIDTH + (columns - 1) * GAP;
    const height = rows * HEIGHT + (rows - 1) * GAP;
    const scale = Math.min(1, availableWidth / width, availableHeight / height);
    if (
      !best ||
      scale > best.scale + 1e-8 ||
      (Math.abs(scale - best.scale) < 1e-8 && columns > best.columns)
    )
      best = { columns, scale };
  }
  return {
    scale: best.scale * HAND_WORKSPACE_SCALE,
    positions: Array.from({ length: count }, (_, i) => ({
      x: PADDING / best.scale + WIDTH / 2 + (i % best.columns) * (WIDTH + GAP),
      y:
        PADDING / best.scale +
        HEIGHT / 2 +
        Math.floor(i / best.columns) * (HEIGHT + GAP),
    })),
  };
}

// Place only a new tile; existing freely arranged positions are never moved.
export function nextHandPosition(occupied, view, canvasWidth, canvasHeight) {
  function free(x, y) {
    return occupied.every((tile) => {
      const vertical = (tile.rotation || 0) % 180 !== 0;
      const halfWidth = vertical ? HEIGHT / 2 : WIDTH / 2;
      const halfHeight = vertical ? WIDTH / 2 : HEIGHT / 2;
      return (
        Math.abs(tile.x - x) >= halfWidth + WIDTH / 2 + 4 ||
        Math.abs(tile.y - y) >= halfHeight + HEIGHT / 2 + 4
      );
    });
  }
  function search(left, top, right, bottom, padding) {
    for (
      let y = top + padding + HEIGHT / 2;
      y <= bottom - padding - HEIGHT / 2;
      y += HEIGHT + GAP
    )
      for (
        let x = left + padding + WIDTH / 2;
        x <= right - padding - WIDTH / 2;
        x += WIDTH + GAP
      )
        if (
          x >= WIDTH / 2 &&
          y >= HEIGHT / 2 &&
          x <= canvasWidth - WIDTH / 2 &&
          y <= canvasHeight - HEIGHT / 2 &&
          free(x, y)
        )
          return { x, y };
    return null;
  }
  return (
    search(
      view.left,
      view.top,
      view.right,
      view.bottom,
      PADDING / view.scale,
    ) ||
    search(0, 0, canvasWidth, canvasHeight, PADDING) || {
      x: WIDTH / 2 + PADDING,
      y: HEIGHT / 2 + PADDING,
    }
  );
}
