// Only compare consecutive live room snapshots. Reconnect snapshots are silent.
export function soundEvents(previous, current) {
  if (
    !previous?.game ||
    !current?.game ||
    previous.code !== current.code ||
    current.revision <= previous.revision
  )
    return [];
  const old = previous.game,
    game = current.game;
  if (old.phase !== "playing" || old.round !== game.round) return [];
  const events = [];
  if (old.turn !== game.turn || game.phase !== "playing") events.push("turn");
  const opened = game.players.some(
    (p) => p.open && !old.players.find((q) => q.id === p.id)?.open,
  );
  const communityStarted =
    !old.trains.community.tiles.length &&
    game.trains.community.tiles.length > 0;
  if (opened || communityStarted) events.push("train");
  return events;
}
