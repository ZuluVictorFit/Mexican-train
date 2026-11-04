import { randomInt } from "node:crypto";

const fail = (message) => {
  throw new Error(message);
};
const shuffle = (items, rand = randomInt) => {
  for (let i = items.length - 1; i > 0; i--) {
    let j = rand(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};
const makeTiles = () => {
  const a = [];
  for (let i = 0; i <= 12; i++)
    for (let j = i; j <= 12; j++) a.push({ id: `${i}-${j}`, a: i, b: j });
  return a;
};
const player = (g, id) => g.players.find((p) => p.id === id);
const ownTrain = (id) => `p:${id}`;
const handScore = (p) => p.hand.reduce((n, t) => n + t.a + t.b, 0);
const active = (g) => g.players[g.turn];

export function newGame(seats, startingDouble = 12, rand = randomInt) {
  if (
    !Number.isInteger(startingDouble) ||
    startingDouble < 0 ||
    startingDouble > 12
  )
    fail("Invalid starting double.");
  if (
    seats.length < 2 ||
    seats.length > 6 ||
    new Set(seats.map((p) => p.id)).size !== seats.length
  )
    fail("A game needs two to six distinct players.");
  const g = {
    players: seats.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      score: 0,
      hand: [],
      open: false,
      first: true,
    })),
    initialDouble: startingDouble,
    engine: startingDouble,
    round: 1,
    turn: rand(seats.length),
    phase: "playing",
    trains: { community: { tiles: [], end: startingDouble } },
    boneyard: [],
    pending: null,
    drawn: null,
    openingPlayed: false,
    passes: 0,
    results: [],
    roundWinner: null,
    gameWinner: null,
  };
  deal(g, rand);
  return g;
}
function deal(g, rand) {
  const tiles = makeTiles(),
    idx = tiles.findIndex((t) => t.a === g.engine && t.b === g.engine);
  tiles.splice(idx, 1);
  shuffle(tiles, rand);
  g.boneyard = tiles;
  g.trains = { community: { tiles: [], end: g.engine } };
  g.pending = null;
  g.drawn = null;
  g.openingPlayed = false;
  g.passes = 0;
  const n = g.players.length <= 4 ? 15 : 12;
  for (const p of g.players) {
    p.hand = g.boneyard.splice(0, n);
    p.first = true;
    p.open = false;
    g.trains[ownTrain(p.id)] = { tiles: [], end: g.engine };
  }
  g.phase = "playing";
  g.roundWinner = null;
}
function legalTrains(g, p) {
  if (g.pending) return [g.pending.train];
  if (p.first) return [ownTrain(p.id)];
  return [
    ownTrain(p.id),
    "community",
    ...g.players
      .filter((o) => o.id !== p.id && o.open)
      .map((o) => ownTrain(o.id)),
  ];
}
export function legalMoves(g, id) {
  if (g.phase !== "playing" || active(g).id !== id) return [];
  const p = player(g, id),
    ids = legalTrains(g, p);
  const hand = g.drawn ? p.hand.filter((t) => t.id === g.drawn) : p.hand;
  return hand.flatMap((t) =>
    ids
      .filter(
        (k) =>
          g.trains[k] && (t.a === g.trains[k].end || t.b === g.trains[k].end),
      )
      .map((train) => ({ tile: t.id, train })),
  );
}
function endRound(g, outId, rand) {
  const scores = g.players.map((p) => ({ id: p.id, points: handScore(p) }));
  for (const p of g.players)
    p.score += scores.find((s) => s.id === p.id).points;
  let candidates = outId
    ? [outId]
    : scores
        .filter((s) => s.points === Math.min(...scores.map((x) => x.points)))
        .map((s) => s.id);
  g.roundWinner = candidates[rand(candidates.length)];
  g.results.push({
    round: g.round,
    engine: g.engine,
    scores,
    winner: g.roundWinner,
    blocked: !outId,
  });
  if (g.engine === 0) {
    let low = Math.min(...g.players.map((p) => p.score));
    let tied = g.players.filter((p) => p.score === low);
    const last = g.results.at(-1).scores;
    let min = Math.min(
      ...tied.map((p) => last.find((s) => s.id === p.id).points),
    );
    tied = tied.filter((p) => last.find((s) => s.id === p.id).points === min);
    g.gameWinner = tied[rand(tied.length)].id;
    g.phase = "finished";
  } else g.phase = "round-end";
  g.pending = null;
  g.drawn = null;
}
function advance(g, rand) {
  const p = active(g);
  p.first = false;
  g.drawn = null;
  g.openingPlayed = false;
  if (g.boneyard.length === 0 && g.passes >= g.players.length) {
    endRound(g, null, rand);
    return;
  }
  g.turn = (g.turn + 1) % g.players.length;
}
function drawOrPass(g, rand) {
  const p = active(g);
  if (legalMoves(g, p.id).length) fail("You have a playable tile.");
  if (g.boneyard.length) {
    const t = g.boneyard.shift();
    p.hand.push(t);
    g.drawn = t.id;
    if (legalMoves(g, p.id).length) return;
  }
  p.open = true;
  g.passes++;
  advance(g, rand);
}
export function act(game, id, command, rand = randomInt) {
  const g = structuredClone(game);
  if (g.phase !== "playing") fail("The round is not in play.");
  const p = player(g, id);
  if (!p || active(g).id !== id) fail("It is not your turn.");
  if (!command || typeof command.type !== "string") fail("Invalid action.");
  if (command.type === "draw") {
    if (p.first && g.openingPlayed && !g.pending)
      fail("End your opening turn instead.");
    drawOrPass(g, rand);
    return g;
  }
  if (command.type === "end-opening") {
    if (!p.first || !g.openingPlayed || g.pending)
      fail("You cannot end this opening turn yet.");
    g.passes = 0;
    advance(g, rand);
    return g;
  }
  if (command.type !== "play") fail("Unknown action.");
  const move = legalMoves(g, id).find(
    (x) => x.tile === command.tile && x.train === command.train,
  );
  if (!move) fail("That tile cannot be played there.");
  const tile = p.hand.find((t) => t.id === move.tile),
    train = g.trains[move.train],
    priorPending = g.pending;
  p.hand = p.hand.filter((t) => t.id !== tile.id);
  const next = tile.a === train.end ? tile.b : tile.a;
  train.tiles.push({ id: tile.id, a: train.end, b: next, by: id });
  train.end = next;
  g.drawn = null;
  g.passes = 0;
  if (move.train === ownTrain(id)) p.open = false;
  if (priorPending) {
    g.pending = null;
    if (priorPending.finalOut) {
      endRound(g, priorPending.finalOut, rand);
      return g;
    }
    if (p.hand.length === 0) {
      endRound(g, id, rand);
      return g;
    }
    if (priorPending.by !== id || !p.first) {
      advance(g, rand);
      return g;
    }
    g.openingPlayed = true;
    return g;
  }
  if (p.first) g.openingPlayed = true;
  if (tile.a === tile.b) {
    g.pending = { train: move.train, by: id, finalOut: null };
    if (p.hand.length === 0) {
      if (g.boneyard.length) {
        const t = g.boneyard.shift();
        p.hand.push(t);
        g.drawn = t.id;
        if (!legalMoves(g, id).length) {
          p.open = true;
          g.passes++;
          advance(g, rand);
        }
      } else {
        g.pending.finalOut = id;
        if (
          !g.players.some(
            (other) =>
              other.id !== id &&
              other.hand.some((t) => t.a === train.end || t.b === train.end),
          )
        ) {
          endRound(g, null, rand);
        } else advance(g, rand);
      }
    }
    return g;
  }
  if (p.hand.length === 0) {
    endRound(g, id, rand);
    return g;
  }
  if (!p.first) advance(g, rand);
  return g;
}
export function nextRound(game, rand = randomInt) {
  const g = structuredClone(game);
  if (g.phase !== "round-end") fail("There is no next round.");
  g.engine--;
  g.round++;
  g.turn = g.players.findIndex((p) => p.id === g.roundWinner);
  deal(g, rand);
  return g;
}
export function viewGame(g, id) {
  const p = player(g, id);
  if (!p) fail("Player not in game.");
  return {
    phase: g.phase,
    engine: g.engine,
    round: g.round,
    turn: active(g).id,
    players: g.players.map(({ id, name, color, score, hand, open, first }) => ({
      id,
      name,
      color,
      score,
      count: hand.length,
      open,
      first,
    })),
    hand: p.hand,
    trains: g.trains,
    boneyard: g.boneyard.length,
    pending: g.pending,
    drawn: g.turn === g.players.indexOf(p) ? g.drawn : null,
    openingPlayed: g.turn === g.players.indexOf(p) && g.openingPlayed,
    legal: legalMoves(g, id),
    results: g.results,
    roundWinner: g.roundWinner,
    gameWinner: g.gameWinner,
  };
}
