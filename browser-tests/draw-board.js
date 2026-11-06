import { DatabaseSync } from "node:sqlite";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { newGame } from "../server/game.js";
const dir = await mkdtemp(join(tmpdir(), "train-draw-ui-")),
  path = join(dir, "test.sqlite"),
  db = new DatabaseSync(path);
db.exec("CREATE TABLE rooms (code TEXT PRIMARY KEY, data TEXT NOT NULL)");
const sessions = ["a".repeat(48), "b".repeat(48)];
const seats = sessions.map((session, i) => ({
  id: "seat" + i,
  session,
  name: i ? "Morgan" : "Avery",
  color: i ? "#667788" : "#445566",
}));
const t = (a, b) => ({
  id: `${Math.min(a, b)}-${Math.max(a, b)}`,
  a: Math.min(a, b),
  b: Math.max(a, b),
});
const hand = [
  ...Array.from({ length: 12 }, (_, i) => t(0, i)),
  t(1, 1),
  t(1, 2),
  t(1, 3),
];
for (const [code, draw] of [
  ["TEST23", t(1, 12)],
  ["TEST24", t(4, 5)],
]) {
  const g = newGame(seats, 12, () => 0);
  g.turn = 0;
  g.players[0].hand = structuredClone(hand);
  if (code === "TEST24") g.players[0].hand[11] = t(0, 12); // A playable tile can be overlooked.
  g.players[1].hand = [t(2, 12), t(5, 6)];
  g.boneyard = [draw, t(2, 8)];
  db.prepare("INSERT INTO rooms(code,data) VALUES (?,?)").run(
    code,
    JSON.stringify({
      code,
      host: "seat0",
      seats,
      revision: 0,
      game: g,
      commands: {},
    }),
  );
}
const long = newGame(seats, 12, () => 0);
long.turn = 0;
long.round = 2;
long.players[0].score = 17;
long.players[1].score = 24;
long.results = [
  {
    round: 1,
    engine: 12,
    scores: [
      { id: "seat0", points: 17 },
      { id: "seat1", points: 24 },
    ],
  },
];
long.players[0].first = false;
const chain = [
  t(12, 0),
  t(0, 1),
  t(1, 2),
  t(2, 3),
  t(3, 4),
  t(4, 5),
  t(5, 6),
  t(6, 7),
  t(7, 8),
  t(8, 9),
  t(9, 10),
  t(10, 11),
  t(11, 12),
];
long.trains["p:seat0"] = {
  end: 12,
  tiles: chain.map((q, i) => ({
    ...q,
    a: i === 0 ? 12 : i - 1,
    b: i === 0 ? 0 : i,
    by: "seat0",
  })),
};
long.players[0].hand = [t(2, 12), t(3, 4)];
db.prepare("INSERT INTO rooms(code,data) VALUES (?,?)").run(
  "TEST25",
  JSON.stringify({
    code: "TEST25",
    host: "seat0",
    seats,
    revision: 0,
    game: long,
    commands: {},
  }),
);
const visual = newGame(seats, 12, () => 0);
visual.turn = 0;
visual.players[0].first = false;
visual.players[0].hand = [t(1, 8), t(3, 4)];
visual.trains["p:seat0"] = {
  end: 8,
  tiles: [
    { id: "6-12", a: 12, b: 6, by: "seat0" },
    { id: "6-6", a: 6, b: 6, by: "seat0" },
    { id: "5-6", a: 6, b: 5, by: "seat0" },
    { id: "5-8", a: 5, b: 8, by: "seat0" },
  ],
};
visual.trains["p:seat1"] = {
  end: 5,
  tiles: [
    { id: "9-12", a: 12, b: 9, by: "seat1" },
    { id: "5-9", a: 9, b: 5, by: "seat1" },
  ],
};
db.prepare("INSERT INTO rooms(code,data) VALUES (?,?)").run(
  "TEST26",
  JSON.stringify({
    code: "TEST26",
    host: "seat0",
    seats,
    revision: 0,
    game: visual,
    commands: {},
  }),
);
const doubleGame = newGame(seats, 12, () => 0);
doubleGame.turn = 0;
doubleGame.players[0].first = false;
doubleGame.players[0].hand = [t(6, 8), t(3, 4)];
doubleGame.trains["p:seat0"] = {
  end: 6,
  tiles: [
    { id: "6-12", a: 12, b: 6, by: "seat0" },
    { id: "6-6", a: 6, b: 6, by: "seat0" },
  ],
};
doubleGame.pending = { train: "p:seat0", by: "seat0", finalOut: null };
db.prepare("INSERT INTO rooms(code,data) VALUES (?,?)").run(
  "TEST28",
  JSON.stringify({
    code: "TEST28",
    host: "seat0",
    seats,
    revision: 0,
    game: doubleGame,
    commands: {},
  }),
);
const soundGame = newGame(seats, 12, () => 0);
soundGame.turn = 0;
soundGame.players[0].hand = [t(2, 3)];
soundGame.players[1].hand = [t(4, 5)];
soundGame.boneyard = [t(1, 4), t(3, 5), t(2, 8)];
db.prepare("INSERT INTO rooms(code,data) VALUES (?,?)").run(
  "TEST29",
  JSON.stringify({
    code: "TEST29",
    host: "seat0",
    seats,
    revision: 0,
    game: soundGame,
    commands: {},
  }),
);
const lapGame = newGame(seats, 12, () => 0);
lapGame.turn = 0;
lapGame.players.forEach((p) => (p.first = false));
lapGame.players[0].hand = [t(6, 6), t(1, 2)];
lapGame.players[1].hand = [t(3, 4)];
lapGame.boneyard = [t(1, 4), t(6, 10)];
lapGame.trains["p:seat0"] = {
  end: 6,
  tiles: [{ id: "6-12", a: 12, b: 6, by: "seat0" }],
};
db.prepare("INSERT INTO rooms(code,data) VALUES (?,?)").run(
  "TEST30",
  JSON.stringify({
    code: "TEST30",
    host: "seat0",
    seats,
    revision: 0,
    game: lapGame,
    commands: {},
  }),
);
const sixSeats = Array.from({ length: 6 }, (_, i) => ({
  id: `seat${i}`,
  session: i < 2 ? sessions[i] : String(i).repeat(48),
  name: `Player ${i + 1}`,
  color: `#${(0x223344 + i * 0x101010).toString(16).padStart(6, "0")}`,
}));
const fourSeats = sixSeats.slice(0, 4);
const fourGame = newGame(fourSeats, 12, () => 0);
fourGame.turn = 0;
fourGame.players.forEach((player) => (player.open = true));
for (const key of [...fourSeats.map((seat) => `p:${seat.id}`), "community"])
  fourGame.trains[key] = {
    end: 12,
    tiles: chain.map((tile, index) => ({
      ...tile,
      a: index === 0 ? 12 : index - 1,
      b: index === 0 ? 0 : index,
      by: "seat0",
    })),
  };
db.prepare("INSERT INTO rooms(code,data) VALUES (?,?)").run(
  "TEST32",
  JSON.stringify({ code: "TEST32", host: "seat0", seats: fourSeats, revision: 0, game: fourGame, commands: {} }),
);
const roundGame = newGame(seats, 12, () => 0);
roundGame.turn = 0;
roundGame.players[0].first = false;
roundGame.players[0].hand = [t(1, 12)];
db.prepare("INSERT INTO rooms(code,data) VALUES (?,?)").run(
  "TEST33",
  JSON.stringify({ code: "TEST33", host: "seat0", seats, revision: 0, game: roundGame, commands: {} }),
);
const sixGame = newGame(sixSeats, 12, () => 0);
sixGame.turn = 0;
db.prepare("INSERT INTO rooms(code,data) VALUES (?,?)").run(
  "TEST27",
  JSON.stringify({
    code: "TEST27",
    host: "seat0",
    seats: sixSeats,
    revision: 0,
    game: sixGame,
    commands: {},
  }),
);
const markersGame = newGame(sixSeats, 12, () => 0);
markersGame.turn = 0;
markersGame.players.forEach((p) => (p.open = true));
db.prepare("INSERT INTO rooms(code,data) VALUES (?,?)").run(
  "TEST31",
  JSON.stringify({
    code: "TEST31",
    host: "seat0",
    seats: sixSeats,
    revision: 0,
    game: markersGame,
    commands: {},
  }),
);
db.close();
const port = 32000 + Math.floor(Math.random() * 10000),
  url = `http://127.0.0.1:${port}`,
  server = spawn(process.execPath, ["server/index.js"], {
    cwd: process.cwd(),
    env: { ...process.env, DATA_PATH: path, PORT: String(port) },
    stdio: "ignore",
  });
let browser;
try {
  for (let i = 0; i < 150; i++) {
    try {
      if ((await fetch(url + "/health")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 30));
  }
  browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: process.env.CHROMIUM_NO_SANDBOX === "1" ? ["--no-sandbox"] : [],
  });
  for (const [code, match] of [
    ["TEST23", true],
    ["TEST24", false],
  ]) {
    const c = await browser.newContext({
      viewport: { width: 1024, height: 768 },
    });
    await c.addCookies([{ name: "mt_session", value: sessions[0], url }]);
    const p = await c.newPage(),
      errs = [];
    p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(url);
    await p.evaluate(
      (code) => localStorage.setItem("mexican-train-room", code),
      code,
    );
    await p.reload();
    await p.waitForSelector("#gameArea:not([hidden])");
    assert.equal(await p.locator("#tableSeats").count(), 0);
    assert.equal(
      await p.locator("#turnBanner.your-turn").textContent(),
      "YOUR TURN",
    );
    assert.equal(
      await p
        .locator('.players .player-on-turn[data-player-id="seat0"]')
        .count(),
      1,
    );
    assert.match(
      await p.locator("#localSeat .seat-badge").getAttribute("aria-label"),
      /Avery, you, current turn/,
    );
    assert.equal(await p.locator(".rail-domino.just-played").count(), 0);
    assert.equal(await p.locator('[data-train-marker="community"]').count(), 1);
    assert.equal(
      await p
        .locator('[data-train-marker="community"] .locomotive-model')
        .getAttribute("transform"),
      "scale(1.62)",
    );
    assert.equal(
      await p
        .locator('[data-quick-train="community"] .locomotive-model')
        .getAttribute("transform"),
      "scale(1.08)",
    );
    assert.equal(await p.locator('[data-quick-train="community"]').count(), 1);
    assert(
      (await p
        .locator('[data-quick-train="community"] [fill="#00cfff"]')
        .count()) > 0,
    );
    assert.equal(await p.locator('[data-quick-train="p:seat0"]').count(), 0);
    assert.equal(await p.locator(".double-pending").count(), 0);
    assert.equal(await p.locator(".hand-header #drawButton").count(), 1);
    assert.equal(await p.locator(".hand-header #endOpening").count(), 1);
    assert.equal(await p.locator("#boneyardCount").textContent(), "2");
    assert.equal(await p.locator("#cameraButton").count(), 0);
    assert.equal(await p.locator("#board.perspective").count(), 1);
    assert.match(
      await p.locator(".sidebar-bottom").textContent(),
      /you guys are a bunch of nerds/,
    );
    const drawBox = await p.locator("#drawButton").boundingBox();
    assert(
      drawBox.width >= 112 && drawBox.height >= 46,
      "turn controls should be comfortably large",
    );
    const green = async (selector) => {
      const color = await p
        .locator(selector)
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      const [red, green, blue] = color.match(/\d+/g).map(Number);
      assert(
        green > red && green > blue,
        `${selector} should stay green: ${color}`,
      );
    };
    await green("#drawButton");
    assert.equal(
      await p.locator('[data-train-marker="community"] > circle').count(),
      0,
    );
    assert(
      (await p
        .locator('[data-train-marker="community"] .locomotive-model polygon')
        .count()) > 8,
      "the community marker renders the locomotive's projected 3D faces",
    );
    assert.equal(await p.locator('[data-train-marker="p:seat0"]').count(), 0);
    const initialViewport = await p.locator("#handViewport").boundingBox();
    for (const item of await p.locator(".domino").all()) {
      const bounds = await item.boundingBox();
      assert(
        bounds.x >= initialViewport.x - 1 &&
          bounds.y >= initialViewport.y - 1 &&
          bounds.x + bounds.width <=
            initialViewport.x + initialViewport.width + 1 &&
          bounds.y + bounds.height <=
            initialViewport.y + initialViewport.height + 1,
        "every initially dealt domino must fit in the compact hand",
      );
    }
    let otherContext, otherPage;
    if (!match) {
      otherContext = await browser.newContext({
        viewport: { width: 1024, height: 768 },
      });
      await otherContext.addCookies([
        { name: "mt_session", value: sessions[1], url },
      ]);
      otherPage = await otherContext.newPage();
      otherPage.on("pageerror", (e) => errs.push(e.message));
      await otherPage.goto(url);
      await otherPage.evaluate(
        (code) => localStorage.setItem("mexican-train-room", code),
        code,
      );
      await otherPage.reload();
      await otherPage.waitForSelector("#gameArea:not([hidden])");
      const held = otherPage.locator(".domino").first();
      await held.scrollIntoViewIfNeeded();
      const heldBox = await held.boundingBox();
      const handBox = await otherPage.locator("#handViewport").boundingBox();
      await otherPage.mouse.move(heldBox.x + heldBox.width / 2, heldBox.y + heldBox.height / 2);
      await otherPage.mouse.down();
      await otherPage.mouse.move(heldBox.x + heldBox.width / 2, handBox.y - 20, { steps: 4 });
      assert.equal(await otherPage.locator(".drag-ghost").count(), 1);
    }
    const viewBeforeDraw = await p.locator(".rail-board").getAttribute("viewBox");
    assert(await p.locator("#drawButton").isEnabled());
    assert.match(await p.locator("#actionBanner").textContent(), /Your turn/);
    await p.click("#drawButton");
    await p.waitForSelector(".domino.drawn");
    assert.equal(await p.locator(".rail-board").getAttribute("viewBox"), viewBeforeDraw);
    if (otherPage) {
      await otherPage.waitForFunction(() => !document.querySelector(".drag-ghost"));
      await otherPage.mouse.up();
      await otherPage.locator(".domino").first().click();
      assert.equal(await otherPage.locator(".domino.selected").count(), 1);
    }
    assert.equal(await p.locator("#boneyardCount").textContent(), "1");
    await green("#drawButton");
    await green("#endOpening");
    const endBox = await p.locator("#endOpening").boundingBox();
    assert(endBox.width >= 112 && endBox.height >= 46);
    const drawn = p.locator(".domino.drawn");
    assert.equal(await drawn.getAttribute("data-id"), match ? "1-12" : "4-5");
    const bb = await drawn.boundingBox(),
      vp = await p.locator("#handViewport").boundingBox();
    assert(
      bb.x >= vp.x && bb.x + bb.width <= vp.x + vp.width,
      `drawn tile should be visible ${JSON.stringify({ bb, vp })}`,
    );
    assert(
      bb.y >= 0 && bb.y + bb.height <= 768,
      `drawn tile should be inside the browser viewport: ${JSON.stringify({ bb, vp, code })}`,
    );
    if (match) {
      assert.match(
        await p.locator("#actionBanner").textContent(),
        /Play a tile or end your turn/,
      );
      assert(!(await drawn.evaluate((e) => e.classList.contains("selected"))));
      assert.equal(await p.locator(".endpoint.valid").count(), 0);
      const target = await p
        .locator('.endpoint[data-train="p:seat0"]')
        .boundingBox();
      await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
      await p.mouse.down();
      await p.mouse.move(
        target.x + target.width / 2,
        target.y + target.height / 2,
        { steps: 12 },
      );
      await p.mouse.up();
      await p.waitForSelector('.rail-domino[data-tile="1-12"]');
      assert.equal(
        await p.locator('.rail-domino.just-played[data-tile="1-12"]').count(),
        1,
      );
      await p.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(
        await p
          .locator(".rail-domino.just-played")
          .evaluate((el) => getComputedStyle(el).animationName),
        "none",
      );
      await p.waitForSelector("#endOpening:not([hidden])");
      assert.match(
        await p.locator("#actionBanner").textContent(),
        /End opening turn/,
      );
    } else {
      assert.match(
        await p.locator("#actionBanner").textContent(),
        /Play a tile or end your turn/,
      );
      await p.click("#endOpening");
      await p.waitForFunction(() =>
        document.querySelector("#turnLabel").textContent.includes("Morgan"),
      );
      assert.equal(
        await p.locator("#turnBanner").textContent(),
        "Morgan's turn",
      );
      assert.equal(await p.locator("#board.perspective").count(), 1);
      assert.equal(
        await p
          .locator('.players .player-on-turn[data-player-id="seat1"]')
          .count(),
        1,
      );
      assert.equal(await p.locator('[data-train-marker="p:seat0"]').count(), 1);
      assert.equal(await p.locator('[data-quick-train="p:seat0"]').count(), 1);
      assert.equal(
        await p.locator('[data-train-marker="p:seat0"] > circle').count(),
        0,
      );
      assert(
        (await p
          .locator(
            '[data-train-marker="p:seat0"] .locomotive-model [fill="#445566"]',
          )
          .count()) > 0,
      );
      if (process.env.MARKER_SCREENSHOT)
        await p.screenshot({ path: process.env.MARKER_SCREENSHOT });
      assert.equal(
        await p
          .locator('[data-train-marker="p:seat0"] .locomotive-model')
          .count(),
        1,
      );
      await otherPage.waitForSelector('[data-train-marker="p:seat0"]');
      assert.equal(
        await otherPage.locator('[data-train-marker="p:seat0"]').count(),
        1,
      );
      assert.match(await p.locator("#turnLabel").textContent(), /Morgan/);
      await otherPage.waitForFunction(
        () => document.querySelector("#turnLabel").textContent === "Your turn",
      );
      await otherPage.locator('[data-id="2-12"]').click();
      await otherPage.locator('.endpoint[data-train="p:seat1"]').click();
      await otherPage.waitForSelector("#endOpening:not([hidden])");
      await otherPage.click("#endOpening");
      await p.waitForFunction(
        () => document.querySelector("#turnLabel").textContent === "Your turn",
      );
      await p.locator('[data-id="0-12"]').click();
      await p.locator('.endpoint[data-train="p:seat0"]').click();
      await p.waitForSelector('.rail-domino[data-tile="0-12"]');
      assert.equal(await p.locator('[data-train-marker="p:seat0"]').count(), 0);
      assert.equal(await p.locator('[data-quick-train="p:seat0"]').count(), 0);
      assert.equal(
        await p.locator('[data-train-marker="community"]').count(),
        1,
      );
    }
    assert.deepEqual(errs, []);
    console.log(
      code,
      match
        ? "matching draw remains playable without highlighted trains"
        : "ending after a draw passes and opens train",
      "passed",
    );
    await otherContext?.close();
    await c.close();
  }
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    hasTouch: true,
  });
  await c.addCookies([{ name: "mt_session", value: sessions[0], url }]);
  const p = await c.newPage();
  await p.goto(url);
  await p.evaluate(() => localStorage.setItem("mexican-train-room", "TEST25"));
  await p.reload();
  await p.waitForSelector("#gameArea:not([hidden])");
  assert.equal(await p.locator(".rail-domino").count(), 5);
  assert.equal(await p.locator(".train-gap").count(), 1);
  if (process.env.COMPACT_SCREENSHOT)
    await p.screenshot({ path: process.env.COMPACT_SCREENSHOT });
  assert.equal(
    await p.locator('[data-player-id="seat0"] .player-score').textContent(),
    "17points",
  );
  assert.equal(
    await p.locator('[data-player-id="seat0"] .player-score strong').evaluate(
      (el) => getComputedStyle(el).fontSize,
    ),
    await p.locator("#boneyardCount").evaluate((el) => getComputedStyle(el).fontSize),
  );
  assert.match(await p.locator("#roundResults").textContent(), /12–12: 17/);
  assert.equal(
    await p.locator('[data-player-id="seat1"] .player-score').textContent(),
    "24points",
  );
  await p
    .getByRole("button", { name: "Expand Your train", exact: true })
    .click();
  assert.equal(await p.locator(".rail-domino").count(), 13);
  assert.equal(await p.locator(".train-gap:not(.train-collapse)").count(), 0);
  if (process.env.EXPANDED_SCREENSHOT)
    await p.screenshot({ path: process.env.EXPANDED_SCREENSHOT });
  await p
    .getByRole("button", { name: "Condense Your train", exact: true })
    .click();
  assert.equal(await p.locator(".rail-domino").count(), 5);
  await p.locator(".train-gap").click();
  assert.equal(await p.locator(".rail-domino").count(), 13);
  await p.getByRole("button", { name: "Condense Your train on table" }).click();
  assert.equal(await p.locator(".rail-domino").count(), 5);
  await p
    .getByRole("button", { name: "Expand Your train", exact: true })
    .click();
  const controlsBox = await p.locator(".board-controls").boundingBox();
  const playableArea = await p.locator(".rail-board").boundingBox();
  assert(
    controlsBox.y + controlsBox.height <= playableArea.y + 1,
    "table controls must not cover any playable train end",
  );
  const before = await p.locator(".rail-board").getAttribute("viewBox");
  await p.click("#zoomIn");
  const after = await p.locator(".rail-board").getAttribute("viewBox");
  assert.notEqual(before, after);
  await p.click("#fitBoard");
  const fitted = await p.locator(".rail-board").getAttribute("viewBox");
  assert.notEqual(fitted, after);
  await p.click("#zoomOut");
  assert(
    Number((await p.locator(".rail-board").getAttribute("viewBox")).split(" ")[2]) >
      Number(fitted.split(" ")[2]),
    "players can zoom out beyond the last fitted view",
  );
  await p.click("#fitBoard");
  const boardBox = await p.locator(".rail-board").boundingBox();
  for (const domino of await p.locator(".rail-domino").all()) {
    const box = await domino.boundingBox();
    assert(
      box.x >= boardBox.x - 2 &&
        box.y >= boardBox.y - 2 &&
        box.x + box.width <= boardBox.x + boardBox.width + 2 &&
        box.y + box.height <= boardBox.y + boardBox.height + 2,
      "Fit table must keep every played domino inside the table viewport",
    );
  }
  const wheelBox = await p.locator(".rail-board").boundingBox();
  const wheelX = wheelBox.x + wheelBox.width * 0.35;
  const wheelY = wheelBox.y + wheelBox.height * 0.4;
  const beforeWheel = fitted.split(" ").map(Number);
  await p.mouse.move(wheelX, wheelY);
  await p.mouse.wheel(0, -180);
  await p.waitForFunction(
    (old) =>
      document.querySelector(".rail-board").getAttribute("viewBox") !== old,
    fitted,
  );
  const afterWheel = (await p.locator(".rail-board").getAttribute("viewBox"))
    .split(" ")
    .map(Number);
  assert(afterWheel[2] < beforeWheel[2], "scrolling up should zoom in");
  assert(
    Math.abs(
      beforeWheel[0] +
        0.35 * beforeWheel[2] -
        (afterWheel[0] + 0.35 * afterWheel[2]),
    ) < 1,
    "wheel zoom should stay anchored under the pointer horizontally",
  );
  assert(
    Math.abs(
      beforeWheel[1] +
        0.4 * beforeWheel[3] -
        (afterWheel[1] + 0.4 * afterWheel[3]),
    ) < 1,
    "wheel zoom should stay anchored under the pointer vertically",
  );
  await p.click("#fitBoard");
  const boardBeforeHandScroll = await p
    .locator(".rail-board")
    .getAttribute("viewBox");
  await p.locator("#handViewport").scrollIntoViewIfNeeded();
  const handArea = await p.locator("#handViewport").boundingBox();
  await p.mouse.move(handArea.x + handArea.width / 2, handArea.y + 30);
  await p.mouse.wheel(0, 120);
  await p.waitForTimeout(50);
  assert.equal(
    await p.locator(".rail-board").getAttribute("viewBox"),
    boardBeforeHandScroll,
    "scrolling the hand must not zoom the table",
  );
  await p.getByRole("button", { name: "Focus Your train" }).click();
  assert.notEqual(
    await p.locator(".rail-board").getAttribute("viewBox"),
    fitted,
  );
  const panBefore = await p.locator(".rail-board").getAttribute("viewBox");
  const area = await p.locator(".rail-board").boundingBox();
  await p.mouse.move(area.x + area.width * 0.25, area.y + area.height * 0.7);
  await p.mouse.down();
  await p.mouse.move(
    area.x + area.width * 0.25 + 35,
    area.y + area.height * 0.7 + 20,
    { steps: 5 },
  );
  await p.mouse.up();
  assert.notEqual(
    await p.locator(".rail-board").getAttribute("viewBox"),
    panBefore,
    "dragging table pans the view",
  );
  const touchBefore = await p.locator(".rail-board").getAttribute("viewBox");
  const touch = await c.newCDPSession(p);
  const tx = area.x + area.width * 0.25,
    ty = area.y + area.height * 0.7;
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: tx, y: ty }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: tx + 30, y: ty + 15 }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  assert.notEqual(
    await p.locator(".rail-board").getAttribute("viewBox"),
    touchBefore,
    "touch dragging must pan the table",
  );
  const widthBeforePinch = Number(
    (await p.locator(".rail-board").getAttribute("viewBox")).split(" ")[2],
  );
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: tx - 35, y: ty, id: 1 },
      { x: tx + 35, y: ty, id: 2 },
    ],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: tx - 65, y: ty, id: 1 },
      { x: tx + 65, y: ty, id: 2 },
    ],
  });
  await p.waitForFunction(
    (before) =>
      Number(
        document
          .querySelector(".rail-board")
          .getAttribute("viewBox")
          .split(" ")[2],
      ) < before,
    widthBeforePinch,
  );
  const widthAfterPinch = Number(
    (await p.locator(".rail-board").getAttribute("viewBox")).split(" ")[2],
  );
  assert(
    widthAfterPinch < widthBeforePinch,
    "spreading two fingers zooms into the table",
  );
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: tx - 30, y: ty, id: 1 },
      { x: tx + 30, y: ty, id: 2 },
    ],
  });
  await p.waitForFunction(
    (before) =>
      Number(
        document
          .querySelector(".rail-board")
          .getAttribute("viewBox")
          .split(" ")[2],
      ) > before,
    widthAfterPinch,
  );
  const widthAfterClosing = Number(
    (await p.locator(".rail-board").getAttribute("viewBox")).split(" ")[2],
  );
  assert(
    widthAfterClosing > widthAfterPinch,
    `pinching two fingers zooms out: ${widthBeforePinch}, ${widthAfterPinch}, ${widthAfterClosing}`,
  );
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await p.locator('[data-id="2-12"]').click();
  assert.equal(await p.locator(".endpoint.valid").count(), 0);
  await p
    .getByRole("button", { name: "Condense Your train", exact: true })
    .click();
  await p.locator('.train-line [data-train="p:seat0"]').click();
  await p.waitForSelector('.rail-domino[data-tile="2-12"]');
  assert.equal(await p.locator(".rail-domino").count(), 5);
  assert.equal(await p.locator(".train-gap").textContent(), "+9");
  assert.equal(
    await p.locator('[data-player-id="seat0"] .player-score').textContent(),
    "17points",
  );
  console.log(
    "All 13 dominoes render on the table; zoom, fit and focus passed.",
  );
  await c.close();
  for (const dimensions of [
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    const context = await browser.newContext({ viewport: dimensions });
    await context.addCookies([{ name: "mt_session", value: sessions[0], url }]);
    const page = await context.newPage();
    await page.goto(url);
    await page.evaluate(() =>
      localStorage.setItem("mexican-train-room", "TEST27"),
    );
    await page.reload();
    await page.waitForSelector("#gameArea:not([hidden])");
    assert.equal(await page.locator("#tableSeats").count(), 0);
    assert.equal(await page.locator("#localSeat .seat-badge").count(), 1);
    for (const name of await page.locator(".seat-badge .seat-name").all())
      assert(
        await name.evaluate((el) => el.scrollWidth <= el.clientWidth),
        "short seat names stay readable",
      );
    assert.equal(await page.locator(".players .player-on-turn").count(), 1);
    if (process.env.SIX_SEAT_SCREENSHOT && dimensions.width === 1024)
      await page.screenshot({
        path: process.env.SIX_SEAT_SCREENSHOT,
        fullPage: true,
      });
    assert.equal(await page.locator(".domino").count(), 12);
    const tray = await page.locator("#handViewport").boundingBox();
    for (const domino of await page.locator(".domino").all()) {
      const box = await domino.boundingBox();
      assert(
        box.x >= tray.x - 1 &&
          box.y >= tray.y - 1 &&
          box.x + box.width <= tray.x + tray.width + 1 &&
          box.y + box.height <= tray.y + tray.height + 1,
        `all twelve tiles must fit at ${dimensions.width}x${dimensions.height}`,
      );
    }
    if (dimensions.width === 1440) {
      const positions = await page
        .locator(".domino")
        .evaluateAll((els) => els.map((el) => el.getAttribute("style")));
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.waitForFunction(() => {
        const tray = document
          .querySelector("#handViewport")
          .getBoundingClientRect();
        return [...document.querySelectorAll(".domino")].every((el) => {
          const box = el.getBoundingClientRect();
          return (
            box.left >= tray.left - 1 &&
            box.top >= tray.top - 1 &&
            box.right <= tray.right + 1 &&
            box.bottom <= tray.bottom + 1
          );
        });
      });
      assert.deepEqual(
        await page
          .locator(".domino")
          .evaluateAll((els) => els.map((el) => el.getAttribute("style"))),
        positions,
        "resizing must keep freely arranged positions unchanged",
      );
      await page.setViewportSize(dimensions);
    }
    const chosen = page.locator('[data-id="0-1"]');
    const initialFaces = await chosen.locator(".face").allTextContents();
    await chosen.click();
    assert(await chosen.evaluate((el) => el.classList.contains("selected")));
    assert.deepEqual(
      await chosen.locator(".face").allTextContents(),
      initialFaces,
      "first click selects without flipping",
    );
    await chosen.click();
    assert.deepEqual(
      await chosen.locator(".face").allTextContents(),
      [...initialFaces].reverse(),
      "second click flips",
    );
    await chosen.click();
    assert.deepEqual(
      await chosen.locator(".face").allTextContents(),
      initialFaces,
    );
    await page.locator('[data-id="0-2"]').click();
    await chosen.focus();
    await page.keyboard.press("Enter");
    assert.deepEqual(
      await chosen.locator(".face").allTextContents(),
      initialFaces,
      "keyboard selection does not flip",
    );
    await page.keyboard.press("Enter");
    assert.deepEqual(
      await chosen.locator(".face").allTextContents(),
      [...initialFaces].reverse(),
      "keyboard activation flips the selected tile",
    );
    await page.keyboard.press("Enter");
    await page.keyboard.press("r");
    assert.match(await chosen.getAttribute("style"), /--rotation: 90deg/);
    for (let i = 0; i < 3; i++) await page.keyboard.press("r");
    const first = page.locator(".domino").first();
    await first.scrollIntoViewIfNeeded();
    const beforeMove = await first.getAttribute("style");
    const firstBox = await first.boundingBox();
    await page.mouse.move(
      firstBox.x + firstBox.width / 2,
      firstBox.y + firstBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      firstBox.x + firstBox.width / 2 + 13,
      firstBox.y + firstBox.height / 2 + 11,
      { steps: 4 },
    );
    await page.mouse.up();
    const afterMove = await first.getAttribute("style");
    assert.notEqual(
      afterMove,
      beforeMove,
      "hand placement must remain freely movable",
    );
    await page.reload();
    await page.waitForSelector("#gameArea:not([hidden])");
    assert.equal(
      await page.locator(".domino").first().getAttribute("style"),
      afterMove,
      "reconnecting must preserve the player's hand arrangement",
    );
    await page.evaluate(() => {
      const key = Object.keys(localStorage).find(
        (k) => k.startsWith("mexican-train-layout-") && !k.endsWith(":scale"),
      );
      const layout = JSON.parse(localStorage.getItem(key));
      layout[0].x = 1400;
      layout[0].y = 700;
      localStorage.setItem(key, JSON.stringify(layout));
    });
    await page.reload();
    await page.waitForSelector("#gameArea:not([hidden])");
    const positionBeforeFit = await page
      .locator(".domino")
      .first()
      .getAttribute("style");
    await page.click("#fitButton");
    assert.equal(
      await page.locator("#fitButton").textContent(),
      "Restore view",
    );
    const fittedTray = await page.locator("#handViewport").boundingBox();
    for (const domino of await page.locator(".domino").all()) {
      const bounds = await domino.boundingBox();
      assert(
        bounds.x >= fittedTray.x - 1 &&
          bounds.y >= fittedTray.y - 1 &&
          bounds.x + bounds.width <= fittedTray.x + fittedTray.width + 1 &&
          bounds.y + bounds.height <= fittedTray.y + fittedTray.height + 1,
        "Fit hand must reveal every tile without rearranging it",
      );
    }
    await page.click("#fitButton");
    assert.equal(
      await page.locator(".domino").first().getAttribute("style"),
      positionBeforeFit,
      "fitting and restoring must not move any tile",
    );
    await context.close();
  }
  console.log(
    "Initial 12- and 15-tile hands fit the compact tray on tablet and desktop.",
  );
  const cv = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await cv.addCookies([{ name: "mt_session", value: sessions[0], url }]);
  const pv = await cv.newPage();
  await pv.goto(url);
  await pv.evaluate(() => localStorage.setItem("mexican-train-room", "TEST26"));
  await pv.reload();
  await pv.waitForSelector("#gameArea:not([hidden])");
  assert.equal(await pv.locator(".rail-domino").count(), 6);
  if (process.env.BOARD_SCREENSHOT)
    await pv.screenshot({ path: process.env.BOARD_SCREENSHOT });
  await pv.getByRole("button", { name: "Focus Morgan" }).click();
  for (let i = 0; i < 4; i++) await pv.click("#zoomIn");
  const remoteView = await pv.locator(".rail-board").getAttribute("viewBox");
  await pv.locator('[data-id="1-8"]').click();
  assert.equal(await pv.locator(".endpoint.valid").count(), 0);
  assert.equal(
    await pv.locator(".rail-board").getAttribute("viewBox"),
    remoteView,
    "selecting a tile must not reveal its playable endpoint",
  );
  await pv.evaluate(() => localStorage.setItem("mexican-train-room", "TEST28"));
  await pv.reload();
  await pv.waitForSelector("#gameArea:not([hidden])");
  assert.equal(
    await pv.locator('.rail-domino.double-pending[data-tile="6-6"]').count(),
    1,
  );
  assert.equal(await pv.locator(".train-chip.double-pending").count(), 1);
  assert.equal(await pv.locator(".rail-domino.double-pending").count(), 1);
  if (process.env.DOUBLE_SCREENSHOT)
    await pv.screenshot({ path: process.env.DOUBLE_SCREENSHOT });
  await pv.locator('[data-id="6-8"]').click();
  await pv.locator('.train-line [data-train="p:seat0"]').click();
  await pv.waitForSelector('.rail-domino[data-tile="6-8"]');
  assert.equal(await pv.locator(".double-pending").count(), 0);
  const decoded = await pv.evaluate(async () => {
    const audio = new AudioContext();
    const result = [];
    for (const name of ["turn-toot", "train-chug", "all-aboard"]) {
      const response = await fetch(`/audio/${name}.mp3`);
      const sound = await audio.decodeAudioData(await response.arrayBuffer());
      let peak = 0;
      for (const sample of sound.getChannelData(0))
        peak = Math.max(peak, Math.abs(sample));
      result.push({ duration: sound.duration, peak });
    }
    await audio.close();
    return result;
  });
  assert(decoded.every((sound) => sound.peak > 0.1 && sound.duration > 0.5));
  assert(decoded[2].duration > decoded[1].duration);
  await cv.close();

  const markersContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await markersContext.addCookies([
    { name: "mt_session", value: sessions[0], url },
  ]);
  const markersPage = await markersContext.newPage();
  await markersPage.goto(url);
  await markersPage.evaluate(() =>
    localStorage.setItem("mexican-train-room", "TEST31"),
  );
  await markersPage.reload();
  await markersPage.waitForSelector("#gameArea:not([hidden])");
  assert.equal(await markersPage.locator(".hub-train-marker").count(), 7);
  if (process.env.MARKERS_SCREENSHOT)
    await markersPage.screenshot({ path: process.env.MARKERS_SCREENSHOT });
  await markersContext.close();

  const lapContexts = await Promise.all(
    sessions.map(async (session) => {
      const context = await browser.newContext({
        viewport: { width: 1024, height: 768 },
      });
      await context.addCookies([{ name: "mt_session", value: session, url }]);
      const page = await context.newPage();
      await page.goto(url);
      await page.evaluate(() =>
        localStorage.setItem("mexican-train-room", "TEST30"),
      );
      await page.reload();
      await page.waitForSelector("#gameArea:not([hidden])");
      return { context, page };
    }),
  );
  const lap0 = lapContexts[0].page,
    lap1 = lapContexts[1].page;
  await lap0.locator('[data-id="6-6"]').click();
  await lap0.locator('.train-line [data-train="p:seat0"]').click();
  await lap0.waitForSelector("#cantSatisfy:not([hidden])");
  assert(await lap0.locator("#drawButton").isDisabled());
  assert.match(
    await lap0.locator("#actionBanner").textContent(),
    /No one draws on this lap/,
  );
  assert.equal(await lap0.locator(".rail-domino.double-pending").count(), 1);
  if (process.env.LAP_SCREENSHOT)
    await lap0.screenshot({ path: process.env.LAP_SCREENSHOT });
  await lap0.locator("#cantSatisfy").click();
  await lap1.waitForSelector("#cantSatisfy:not([hidden])");
  assert(await lap1.locator("#drawButton").isDisabled());
  assert.equal(await lap1.locator('[data-train-marker="p:seat0"]').count(), 0);
  await lap1.locator("#cantSatisfy").click();
  await lap0.waitForFunction(
    () => !document.querySelector("#drawButton").disabled,
  );
  assert(await lap0.locator("#cantSatisfy").isHidden());
  await lap0.locator("#drawButton").click();
  await lap0.waitForSelector("#endOpening:not([hidden])");
  await lap0.locator("#endOpening").click();
  await lap1.waitForFunction(
    () => !document.querySelector("#drawButton").disabled,
  );
  assert.equal(await lap1.locator('[data-train-marker="p:seat0"]').count(), 1);
  await lap1.locator("#drawButton").click();
  await lap1.waitForSelector('.domino[data-id="6-10"]');
  await lap1.locator('.domino[data-id="6-10"]').click();
  await lap1.locator('.train-line [data-train="p:seat0"]').click();
  await lap0.waitForSelector('.rail-domino[data-tile="6-10"]');
  assert.equal(await lap0.locator(".double-pending").count(), 0);
  await Promise.all(lapContexts.map(({ context }) => context.close()));
  console.log(
    "The no-draw double lap and subsequent draws passed in two browsers.",
  );

  const soundContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await soundContext.addCookies([
    { name: "mt_session", value: sessions[0], url },
  ]);
  await soundContext.addInitScript(() => {
    window.__soundStarts = [];
    window.__soundGains = [];
    window.__soundStops = 0;
    class FakeAudioContext {
      constructor() {
        this.state = "running";
        this.currentTime = 10;
        this.destination = {};
      }
      resume() {
        this.state = "running";
        return Promise.resolve();
      }
      decodeAudioData() {
        return Promise.resolve({});
      }
      createGain() {
        const node = { gain: { value: 0 }, connect() {} };
        window.__soundGains.push(node);
        return node;
      }
      createBufferSource() {
        return {
          connect(gain) {
            this.gain = gain;
          },
          stop() {
            window.__soundStops++;
          },
          start(time) {
            window.__soundStarts.push({ volume: this.gain.gain.value, time });
          },
        };
      }
    }
    window.AudioContext = FakeAudioContext;
    window.webkitAudioContext = FakeAudioContext;
  });
  const soundPage = await soundContext.newPage();
  await soundPage.goto(url);
  await soundPage.evaluate(() =>
    localStorage.setItem("mexican-train-room", "TEST29"),
  );
  await soundPage.reload();
  await soundPage.waitForSelector("#gameArea:not([hidden])");
  assert.equal(await soundPage.locator("#soundTurnEnabled").isChecked(), false);
  assert.equal(
    await soundPage
      .locator('input[name="trainSound"][value="off"]')
      .isChecked(),
    true,
  );
  for (const [slider, volume, button, expected] of [
    ["#soundTurnVolume", "12", '[data-play-sound="turn"]', 0.12],
    ["#soundNormalVolume", "35", '[data-play-sound="normal"]', 0.35],
    ["#soundStationVolume", "67", '[data-play-sound="station"]', 0.67],
  ]) {
    await soundPage.locator(slider).fill(volume);
    const count = await soundPage.evaluate(() => window.__soundStarts.length);
    await soundPage.locator(button).click();
    await soundPage.waitForFunction(
      (n) => window.__soundStarts.length > n,
      count,
    );
    assert.equal(
      await soundPage.evaluate(() => window.__soundStarts.at(-1).volume),
      expected,
    );
  }
  await soundPage.locator("#soundStationVolume").fill("45");
  assert.equal(
    await soundPage.evaluate(() => window.__soundGains.at(-1).gain.value),
    0.45,
  );
  await soundPage.locator("#soundStationVolume").fill("67");
  await soundPage.locator("#soundTurnEnabled").check();
  await soundPage.locator('input[name="trainSound"][value="normal"]').check();
  let count = await soundPage.evaluate(() => window.__soundStarts.length);
  await soundPage.locator("#drawButton").click();
  await soundPage.waitForSelector("#endOpening:not([hidden])");
  await soundPage.locator("#endOpening").click();
  await soundPage.waitForFunction(
    (n) => window.__soundStarts.length >= n + 2,
    count,
  );
  let automatic = await soundPage.evaluate(
    (n) => window.__soundStarts.slice(n),
    count,
  );
  assert(automatic.some((s) => s.volume === 0.12 && s.time === 10));
  assert(automatic.some((s) => s.volume === 0.35 && s.time === 10.85));
  await soundPage.locator('input[name="trainSound"][value="station"]').check();
  const otherSoundContext = await browser.newContext({
    viewport: { width: 1024, height: 768 },
  });
  await otherSoundContext.addCookies([
    { name: "mt_session", value: sessions[1], url },
  ]);
  const otherSoundPage = await otherSoundContext.newPage();
  await otherSoundPage.goto(url);
  await otherSoundPage.evaluate(() =>
    localStorage.setItem("mexican-train-room", "TEST29"),
  );
  await otherSoundPage.reload();
  await otherSoundPage.waitForSelector("#gameArea:not([hidden])");
  count = await soundPage.evaluate(() => window.__soundStarts.length);
  await otherSoundPage.locator("#drawButton").click();
  await otherSoundPage.waitForSelector("#endOpening:not([hidden])");
  await otherSoundPage.locator("#endOpening").click();
  await soundPage.waitForFunction(
    (n) => window.__soundStarts.length >= n + 2,
    count,
  );
  automatic = await soundPage.evaluate(
    (n) => window.__soundStarts.slice(n),
    count,
  );
  assert(automatic.some((s) => s.volume === 0.67 && s.time === 10.85));
  await soundPage.reload();
  await soundPage.waitForSelector("#gameArea:not([hidden])");
  assert(await soundPage.locator("#soundTurnEnabled").isChecked());
  assert(
    await soundPage
      .locator('input[name="trainSound"][value="station"]')
      .isChecked(),
  );
  assert.equal(
    await soundPage.locator("#soundStationVolume").inputValue(),
    "67",
  );
  assert.equal(await soundPage.evaluate(() => window.__soundStarts.length), 0);
  await soundPage.locator("#soundTurnEnabled").uncheck();
  await soundPage.locator('input[name="trainSound"][value="off"]').check();
  await soundPage.locator("#drawButton").click();
  await soundPage.waitForSelector("#endOpening:not([hidden])");
  await soundPage.locator("#endOpening").click();
  await soundPage.waitForFunction(
    () => document.querySelector("#turnLabel").textContent !== "Your turn",
  );
  assert.equal(await soundPage.evaluate(() => window.__soundStarts.length), 0);
  if (process.env.SOUND_SCREENSHOT)
    await soundPage.screenshot({
      path: process.env.SOUND_SCREENSHOT,
      fullPage: true,
    });
  await otherSoundContext.close();
  await soundContext.close();
  console.log(
    "Sound previews, individual volumes, automatic cues and silent reconnect passed.",
  );
  for (let index = 0; index < 4; index++) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addCookies([{ name: "mt_session", value: fourSeats[index].session, url }]);
    const page = await context.newPage();
    await page.goto(url);
    await page.evaluate(() => localStorage.setItem("mexican-train-room", "TEST32"));
    await page.reload();
    await page.waitForSelector("#gameArea:not([hidden])");
    const order = await page.locator(".train-line [data-train]").evaluateAll((els) => els.map((el) => el.dataset.train));
    assert.deepEqual(order, [...Array.from({ length: 4 }, (_, offset) => `p:seat${(index + offset) % 4}`), "community"]);
    assert(await page.locator("#trainList").evaluate((el) => el.scrollHeight <= el.clientHeight));
    if (index === 0) {
      for (const dimensions of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }]) {
        await page.setViewportSize(dimensions);
        await page.evaluate(() => window.scrollTo(0, 0));
        assert(await page.locator("#trainList").evaluate((el) => el.scrollHeight <= el.clientHeight));
        if (dimensions.height === 900) {
          const bottom = await page.locator("#handCard").evaluate((el) => el.getBoundingClientRect().bottom);
          assert(bottom <= dimensions.height, `Hand bottom ${bottom} exceeds viewport ${dimensions.height}`);
        }
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      const first = page.locator(".domino").nth(0), second = page.locator(".domino").nth(1);
      const id1 = await first.getAttribute("data-id"), id2 = await second.getAttribute("data-id");
      const position = (id) => page.locator(`[data-id="${id}"]`).evaluate((el) => [el.style.left, el.style.top]);
      const before1 = await position(id1), before2 = await position(id2);
      await first.click({ button: "right" });
      assert(await page.locator(`[data-id="${id1}"]`).evaluate((el) => el.classList.contains("swap-pending")));
      await page.locator(`[data-id="${id2}"]`).click({ button: "right" });
      assert.deepEqual(await position(id1), before2);
      assert.deepEqual(await position(id2), before1);
      await page.reload();
      await page.waitForSelector("#gameArea:not([hidden])");
      assert.deepEqual(await position(id1), before2);
      assert.deepEqual(await position(id2), before1);
    }
    await context.close();
  }
  const roundContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await roundContext.addCookies([{ name: "mt_session", value: sessions[0], url }]);
  const roundPage = await roundContext.newPage();
  await roundPage.goto(url);
  await roundPage.evaluate(() => localStorage.setItem("mexican-train-room", "TEST33"));
  await roundPage.reload();
  await roundPage.waitForSelector("#gameArea:not([hidden])");
  await roundPage.locator("#zoomIn").click();
  const viewBeforeRound = await roundPage.locator(".rail-board").getAttribute("viewBox");
  await roundPage.locator('[data-id="1-12"]').click();
  await roundPage.locator('.train-line [data-train="p:seat0"]').click();
  await roundPage.locator("#nextRound").waitFor({ state: "visible" });
  assert.equal(await roundPage.locator(".rail-board").getAttribute("viewBox"), viewBeforeRound);
  await roundPage.locator("#nextRound").click();
  await roundPage.waitForFunction(() => document.querySelector("#roundLabel").textContent.includes("Round 2"));
  assert.equal(await roundPage.locator(".rail-board").getAttribute("viewBox"), viewBeforeRound);
  await roundContext.close();
  console.log("Clockwise seats, hand swapping, and view preservation across rounds passed.");
  const hostContext = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const guestContext = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  await hostContext.addCookies([{ name: "mt_session", value: sessions[0], url }]);
  await guestContext.addCookies([{ name: "mt_session", value: sessions[1], url }]);
  const hostPage = await hostContext.newPage(), guestPage = await guestContext.newPage();
  for (const page of [hostPage, guestPage]) {
    await page.goto(url);
    await page.evaluate(() => localStorage.setItem("mexican-train-room", "TEST25"));
    await page.reload();
    await page.waitForSelector("#gameArea:not([hidden])");
  }
  assert(await hostPage.locator("#closeGame").isVisible());
  assert(await guestPage.locator("#closeGame").isHidden());
  hostPage.once("dialog", (dialog) => dialog.dismiss());
  await hostPage.locator("#closeGame").click();
  assert(await hostPage.locator("#gameArea").isVisible());
  assert(await guestPage.locator("#gameArea").isVisible());
  hostPage.once("dialog", (dialog) => dialog.accept());
  await hostPage.locator("#closeGame").click();
  for (const page of [hostPage, guestPage]) {
    await page.waitForSelector("#entry:not([hidden])");
    assert.match(await page.locator("#entryError").textContent(), /host ended the game/i);
    assert.equal(await page.evaluate(() => localStorage.getItem("mexican-train-room")), null);
  }
  await guestPage.evaluate(() => localStorage.setItem("mexican-train-room", "TEST25"));
  await guestPage.reload();
  await guestPage.waitForFunction(() => !localStorage.getItem("mexican-train-room"));
  assert(await guestPage.locator("#entry").isVisible());
  await hostPage.locator("#nameInput").fill("New host");
  await hostPage.locator("#createRoom").click();
  await hostPage.waitForSelector("#lobby:not([hidden])");
  await hostContext.close();
  await guestContext.close();
  console.log("The host can end a game for everyone and create a new table.");
} finally {
  await browser?.close();
  if (server.exitCode === null) {
    server.kill("SIGTERM");
    await once(server, "exit");
  }
  await rm(dir, { recursive: true, force: true });
}
