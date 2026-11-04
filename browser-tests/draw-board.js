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
const sixSeats = Array.from({ length: 6 }, (_, i) => ({
  id: `seat${i}`,
  session: i < 2 ? sessions[i] : String(i).repeat(48),
  name: `Player ${i + 1}`,
  color: `#${(0x223344 + i * 0x101010).toString(16).padStart(6, "0")}`,
}));
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
    assert.equal(await p.locator('[data-train-marker="community"]').count(), 1);
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
    }
    assert(await p.locator("#drawButton").isEnabled());
    assert.match(await p.locator("#actionBanner").textContent(), /Your turn/);
    await p.click("#drawButton");
    await p.waitForSelector(".domino.drawn");
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
      assert(await drawn.evaluate((e) => e.classList.contains("selected")));
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
      assert.equal(await p.locator('[data-train-marker="p:seat0"]').count(), 1);
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
  assert.equal(await p.locator(".rail-domino").count(), 13);
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
  await p.locator('[data-id="2-12"]').click();
  assert.equal(await p.locator(".endpoint.valid").count(), 0);
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
  await cv.close();
} finally {
  await browser?.close();
  if (server.exitCode === null) {
    server.kill("SIGTERM");
    await once(server, "exit");
  }
  await rm(dir, { recursive: true, force: true });
}
