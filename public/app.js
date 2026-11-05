import { layoutTable, TILE_LENGTH, TILE_WIDTH } from "./train-layout.js";
import { locomotiveModel } from "./locomotive.js";
import { createSoundPlayer } from "./sounds.js";
import { soundEvents } from "./sound-events.js";
import {
  HAND_WORKSPACE_SCALE,
  initialHandLayout,
  nextHandPosition,
} from "./hand-layout.js";

(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    W = 1600,
    H = 800,
    viewport = $("handViewport"),
    space = $("handSpace"),
    canvas = $("handCanvas");
  const soundPlayer = createSoundPlayer();
  let ignoreNextSoundState = true;
  let soundPrefs = {
    turn: false,
    train: "off",
    volumes: { turn: 70, normal: 70, station: 70 },
  };
  let room = null,
    socket = null,
    state = { tiles: [], endpoints: {} },
    selected = null,
    fullscreen = false,
    scale = 1,
    camera = false,
    drag = null,
    timer,
    turnHintTimer,
    layoutKey = "",
    latestDraw = null,
    lastDrawNotice = "",
    handViewBeforeFit = null,
    autoHandFit = false,
    expandedTrains = new Set(),
    expandedRound = "",
    boardView = { zoom: 1, x: 0, y: 0, radius: 190, svg: null };
  const tell = (s) => {
    const n = $("notice");
    n.textContent = s;
    n.classList.add("visible");
    clearTimeout(timer);
    timer = setTimeout(() => n.classList.remove("visible"), 3500);
  };
  const tile = (id) => state.tiles.find((t) => t.id === id),
    faces = (t) => (t.flip ? [t.b, t.a] : [t.a, t.b]),
    face = (v) => `<span class="face" style="color:var(--v${v})">${v}</span>`,
    label = (t) => `Domino ${faces(t).join(" and ")}`;
  const legal = (t, id) =>
    !!t && !!room?.game?.legal.some((m) => m.tile === t.id && m.train === id);
  function save() {
    try {
      localStorage.setItem(
        layoutKey,
        JSON.stringify(
          state.tiles.map(({ id, x, y, z, flip, rotation }) => ({
            id,
            x,
            y,
            z,
            flip,
            rotation,
          })),
        ),
      );
      localStorage.setItem(
        `${layoutKey}:scale`,
        String(handViewBeforeFit?.scale ?? scale),
      );
      localStorage.setItem(`${layoutKey}:auto-fit`, autoHandFit ? "1" : "0");
    } catch {}
  }
  function loadHand(g) {
    const key = `mexican-train-layout-${room.code}-${room.me}-${g.round}`;
    const changedHand = key !== layoutKey;
    let old = [];
    try {
      old =
        key === layoutKey
          ? state.tiles
          : JSON.parse(localStorage.getItem(key) || "[]");
    } catch {}
    if (changedHand && old.length) {
      try {
        const savedScale = Number(localStorage.getItem(`${key}:scale`));
        if (Number.isFinite(savedScale) && savedScale > 0 && savedScale <= 1)
          scale = savedScale;
        autoHandFit = localStorage.getItem(`${key}:auto-fit`) === "1";
      } catch {}
    }
    layoutKey = key;
    if (!old.length && g.hand.length) {
      const initial = initialHandLayout(
        g.hand.length,
        viewport.clientWidth,
        viewport.clientHeight,
      );
      scale = initial.scale;
      autoHandFit = true;
      handViewBeforeFit = null;
      $("fitButton").textContent = "Fit hand";
      state.tiles = g.hand.map((t, i) => ({
        ...t,
        ...initial.positions[i],
        z: i + 1,
        flip: false,
        rotation: 0,
      }));
      if (!tile(selected)) selected = null;
      save();
      return;
    }
    const occupied = old.filter((o) => g.hand.some((t) => t.id === o.id));
    state.tiles = g.hand.map((t, i) => {
      let place = occupied.find((o) => o.id === t.id);
      if (!place) {
        const left = viewport.scrollLeft / scale,
          top = viewport.scrollTop / scale;
        const spot = nextHandPosition(
          occupied,
          {
            left,
            top,
            right: left + viewport.clientWidth / scale,
            bottom: top + viewport.clientHeight / scale,
            scale,
          },
          W,
          H,
        );
        place = {
          id: t.id,
          ...spot,
          z: Math.max(0, ...occupied.map((o) => o.z || 0)) + 1,
          flip: false,
          rotation: 0,
        };
        occupied.push(place);
      }
      return { ...t, ...place };
    });
    if (!tile(selected)) selected = null;
    save();
  }
  function updateSize() {
    space.style.width = `${W * scale}px`;
    space.style.height = `${H * scale}px`;
    canvas.style.transform = `scale(${scale})`;
  }
  function fitHand() {
    autoHandFit = false;
    if (handViewBeforeFit) {
      scale = handViewBeforeFit.scale;
      updateSize();
      viewport.scrollLeft = handViewBeforeFit.left;
      viewport.scrollTop = handViewBeforeFit.top;
      handViewBeforeFit = null;
      $("fitButton").textContent = "Fit hand";
      save();
      return;
    }
    if (!state.tiles.length) return;
    const edges = state.tiles.map((t) => {
      const vertical = t.rotation % 180 !== 0;
      return {
        left: t.x - (vertical ? 26 : 50),
        right: t.x + (vertical ? 26 : 50),
        top: t.y - (vertical ? 50 : 26),
        bottom: t.y + (vertical ? 50 : 26),
      };
    });
    const left = Math.min(...edges.map((e) => e.left)),
      right = Math.max(...edges.map((e) => e.right));
    const top = Math.min(...edges.map((e) => e.top)),
      bottom = Math.max(...edges.map((e) => e.bottom));
    handViewBeforeFit = {
      scale,
      left: viewport.scrollLeft,
      top: viewport.scrollTop,
    };
    scale = Math.min(
      1,
      (viewport.clientWidth - 16) / (right - left),
      (viewport.clientHeight - 16) / (bottom - top),
    );
    updateSize();
    viewport.scrollLeft = Math.max(0, left * scale - 8);
    viewport.scrollTop = Math.max(0, top * scale - 8);
    $("fitButton").textContent = "Restore view";
    save();
  }
  function position(el, t) {
    el.style.left = `${t.x}px`;
    el.style.top = `${t.y}px`;
    el.style.zIndex = String(t.z);
    el.style.setProperty("--rotation", `${t.rotation}deg`);
  }
  function select(id) {
    selected = id;
    updateSelection();
  }
  function refresh(t) {
    const el = [...canvas.children].find((e) => e.dataset.id === t.id);
    if (el) {
      el.innerHTML = faces(t).map(face).join("");
      el.setAttribute("aria-label", label(t));
      position(el, t);
    }
    updateSelection();
    save();
  }
  function flip() {
    const t = tile(selected);
    if (t) {
      t.flip = !t.flip;
      refresh(t);
    }
  }
  function clamp(t) {
    const v = t.rotation % 180 !== 0,
      hw = v ? 26 : 50,
      hh = v ? 50 : 26;
    t.x = Math.max(hw, Math.min(W - hw, t.x));
    t.y = Math.max(hh, Math.min(H - hh, t.y));
  }
  function rotate() {
    const t = tile(selected);
    if (t) {
      autoHandFit = false;
      t.rotation = (t.rotation + 90) % 360;
      clamp(t);
      refresh(t);
    }
  }
  function renderHand() {
    canvas.replaceChildren(
      ...state.tiles.map((t) => {
        const e = document.createElement("button");
        e.type = "button";
        e.className = "domino";
        if (t.id === latestDraw) e.classList.add("drawn");
        e.dataset.id = t.id;
        e.innerHTML = faces(t).map(face).join("");
        e.setAttribute(
          "aria-label",
          (t.id === latestDraw ? "Drawn " : "") + label(t),
        );
        position(e, t);
        e.addEventListener("pointerdown", startDrag);
        e.addEventListener("click", (ev) => {
          if (ev.detail === 0) {
            select(t.id);
            flip();
          }
        });
        return e;
      }),
    );
    $("handCount").textContent =
      `${state.tiles.length} ${state.tiles.length === 1 ? "tile" : "tiles"}`;
    updateSize();
    updateSelection();
  }
  function revealHandTile(id) {
    const t = tile(id);
    if (!t) return;
    const margin = 60 * scale;
    const x = t.x * scale,
      y = t.y * scale;
    if (x - margin < viewport.scrollLeft)
      viewport.scrollLeft = Math.max(0, x - margin);
    else if (x + margin > viewport.scrollLeft + viewport.clientWidth)
      viewport.scrollLeft = x + margin - viewport.clientWidth;
    if (y - margin < viewport.scrollTop)
      viewport.scrollTop = Math.max(0, y - margin);
    else if (y + margin > viewport.scrollTop + viewport.clientHeight)
      viewport.scrollTop = y + margin - viewport.clientHeight;
    // The hand itself can be below the browser viewport on a tablet.
    const element = [...canvas.children].find((el) => el.dataset.id === id);
    element?.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (element && !fullscreen) {
      const rect = element.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - 12)
        window.scrollBy(0, rect.bottom - window.innerHeight + 12);
      else if (rect.top < 12) window.scrollBy(0, rect.top - 12);
    }
  }
  function updateSelection() {
    const t = tile(selected);
    for (const el of canvas.querySelectorAll(".domino")) {
      const on = el.dataset.id === selected;
      el.classList.toggle("selected", on);
      el.setAttribute("aria-pressed", String(on));
    }
    $("playButton").disabled = !t || camera || room?.game?.turn !== room?.me;
    $("flipButton").disabled = !t;
    $("rotateButton").disabled = !t;
    $("boardCaption").textContent = t
      ? `${faces(t).join(" | ")} selected · choose a train`
      : "Select a tile and choose a train.";
  }
  function startDrag(e) {
    if (e.button !== 0 || drag) return;
    const t = tile(e.currentTarget.dataset.id);
    if (!t) return;
    select(t.id);
    t.z = Math.max(0, ...state.tiles.map((x) => x.z)) + 1;
    position(e.currentTarget, t);
    drag = {
      id: t.id,
      el: e.currentTarget,
      pointer: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      x: t.x,
      y: t.y,
      moved: false,
      ghost: null,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.addEventListener("pointermove", moveDrag);
    e.currentTarget.addEventListener("pointerup", endDrag);
    e.currentTarget.addEventListener("pointercancel", cancelDrag);
    e.preventDefault();
  }
  const inside = (x, y, r) =>
    x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  function moveDrag(e) {
    if (!drag || e.pointerId !== drag.pointer) return;
    const t = tile(drag.id);
    if (!t) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6)
      return;
    drag.moved = true;
    if (inside(e.clientX, e.clientY, viewport.getBoundingClientRect())) {
      t.x = drag.x + (e.clientX - drag.sx) / scale;
      t.y = drag.y + (e.clientY - drag.sy) / scale;
      clamp(t);
      position(drag.el, t);
      drag.el.style.opacity = "1";
      if (drag.ghost) {
        drag.ghost.remove();
        drag.ghost = null;
      }
    } else {
      if (!drag.ghost) {
        drag.ghost = drag.el.cloneNode(true);
        drag.ghost.classList.add("drag-ghost");
        drag.ghost.style.width = `${98 * scale}px`;
        drag.ghost.style.height = `${51 * scale}px`;
        document.body.append(drag.ghost);
      }
      drag.el.style.opacity = ".35";
      drag.ghost.style.left = `${e.clientX}px`;
      drag.ghost.style.top = `${e.clientY}px`;
    }
  }
  function cleanup() {
    if (!drag) return;
    drag.el.removeEventListener("pointermove", moveDrag);
    drag.el.removeEventListener("pointerup", endDrag);
    drag.el.removeEventListener("pointercancel", cancelDrag);
    drag.el.style.opacity = "";
    drag.ghost?.remove();
    drag = null;
  }
  function cancelDrag() {
    if (!drag) return;
    const t = tile(drag.id);
    if (t) {
      t.x = drag.x;
      t.y = drag.y;
      position(drag.el, t);
    }
    cleanup();
    save();
  }
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.pointer) return;
    const t = tile(drag.id);
    if (!t) {
      cleanup();
      return;
    }
    if (!drag.moved) {
      cleanup();
      flip();
      return;
    }
    const insideHand = inside(
        e.clientX,
        e.clientY,
        viewport.getBoundingClientRect(),
      ),
      target = insideHand
        ? null
        : document
            .elementFromPoint(e.clientX, e.clientY)
            ?.closest("[data-train]");
    if (!insideHand) {
      t.x = drag.x;
      t.y = drag.y;
      position(drag.el, t);
    } else autoHandFit = false;
    cleanup();
    save();
    if (target && !fullscreen) play(target.dataset.train);
    else if (!insideHand) tell("Tile returned to your hand.");
  }
  function setFullscreen(on) {
    fullscreen = on;
    $("handCard").classList.toggle("fullscreen", on);
    $("expandButton").querySelector("span").textContent = on
      ? "Back to table"
      : "Expand hand";
  }
  function send(event, data = {}, cb = () => {}) {
    if (!socket?.connected) {
      tell("Connecting to the table…");
      return;
    }
    socket.emit(event, data, (r) => {
      if (!r?.ok) {
        tell(r?.error || "Could not complete that action.");
        $("entryError").textContent = r?.error || "";
        $("lobbyError").textContent = r?.error || "";
      } else cb(r);
    });
  }
  function move(action) {
    if (!room) return;
    send("move", {
      code: room.code,
      revision: room.revision,
      commandId: crypto.randomUUID(),
      action,
    });
  }
  function play(id) {
    if (camera) {
      tell("Switch to playing view to play a tile.");
      return;
    }
    if (!legal(tile(selected), id)) {
      tell("That tile cannot be played on this train.");
      return;
    }
    move({ type: "play", tile: selected, train: id });
  }
  const svgNS = "http://www.w3.org/2000/svg";
  function svgElement(name, attrs = {}) {
    const el = document.createElementNS(svgNS, name);
    for (const [key, value] of Object.entries(attrs))
      el.setAttribute(key, String(value));
    return el;
  }
  function updateBoardView() {
    if (!boardView.svg) return;
    const board = $("board");
    const aspect = board.clientWidth / Math.max(1, board.clientHeight);
    if (boardView.bounds) {
      const b = boardView.bounds;
      boardView.fitX = (b.minX + b.maxX) / 2;
      boardView.fitY = (b.minY + b.maxY) / 2;
      boardView.radius = Math.max(
        100,
        (b.maxY - b.minY) / 2,
        (b.maxX - b.minX) / (2 * aspect),
      );
      if (boardView.fitActive) {
        boardView.x = boardView.fitX;
        boardView.y = boardView.fitY;
      }
    }
    const radius = boardView.radius / boardView.zoom;
    boardView.svg.setAttribute(
      "viewBox",
      `${boardView.x - radius * aspect} ${boardView.y - radius} ${radius * aspect * 2} ${radius * 2}`,
    );
    $("zoomOut").disabled = boardView.zoom <= 1;
    $("zoomIn").disabled = boardView.zoom >= 32;
  }
  function focusTrainEnd(train) {
    const distance = Math.hypot(train.target.x, train.target.y);
    const towardHub = Math.min(150, distance / 2);
    const factor = distance ? (distance - towardHub) / distance : 0;
    boardView.zoom = Math.max(1, Math.min(32, boardView.radius / 230));
    boardView.x = train.target.x * factor;
    boardView.y = train.target.y * factor;
  }
  function board(g, arrivingTile = null) {
    document
      .querySelectorAll(".board > .route,.board > .seat,.board > .endpoint")
      .forEach((e) => e.remove());
    document.querySelector(".board > .hub").hidden = true;
    const dynamic = $("dynamicBoard"),
      list = $("trainList");
    dynamic.replaceChildren();
    list.replaceChildren();
    const me = g.players.find((p) => p.id === room.me);
    const others = g.players.filter((p) => p.id !== room.me);
    const lanes = [
      { key: `p:${me.id}`, name: "Your train", color: me.color, open: me.open },
      ...others.map((p) => ({
        key: `p:${p.id}`,
        name: p.name,
        color: p.color,
        open: p.open,
      })),
      { key: "community", name: "Community", color: "#00cfff" },
    ].map((lane) => ({ ...lane, tiles: g.trains[lane.key].tiles }));
    const roundKey = `${room.code}:${g.round}`;
    if (expandedRound !== roundKey) {
      expandedRound = roundKey;
      expandedTrains.clear();
    }
    const table = layoutTable(lanes, {
      condense: true,
      expanded: expandedTrains,
    });
    boardView.trains = table.trains;
    if (boardView.round !== g.round) {
      boardView.zoom = 1;
      boardView.x = 0;
      boardView.y = 0;
      boardView.manual = false;
      boardView.round = g.round;
    }
    boardView.bounds = table.bounds;
    const aspect =
      $("board").clientWidth / Math.max(1, $("board").clientHeight);
    boardView.fitX = (table.bounds.minX + table.bounds.maxX) / 2;
    boardView.fitY = (table.bounds.minY + table.bounds.maxY) / 2;
    boardView.radius = Math.max(
      100,
      (table.bounds.maxY - table.bounds.minY) / 2,
      (table.bounds.maxX - table.bounds.minX) / (2 * aspect),
    );
    // Keep the active end readable as a long train grows. Players can always
    // return to a complete overview with Fit table or focus any other train.
    if (!boardView.manual) {
      if (
        g.phase === "playing" &&
        g.turn === room.me &&
        boardView.radius > 400
      ) {
        const target = table.trains.find(
          (train) => train.key === (g.pending?.train || `p:${room.me}`),
        );
        boardView.fitActive = false;
        focusTrainEnd(target);
      } else {
        boardView.zoom = 1;
        boardView.fitActive = true;
        boardView.x = boardView.fitX;
        boardView.y = boardView.fitY;
      }
    }
    const svg = svgElement("svg", {
      role: "group",
      "aria-label": "Domino trains. Drag the table to pan.",
    });
    svg.classList.add("rail-board");
    boardView.svg = svg;
    dynamic.append(svg);
    const defs = svgElement("defs");
    defs.innerHTML =
      '<linearGradient id="hubWood" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#ead0a3"/><stop offset="1" stop-color="#b98956"/></linearGradient><linearGradient id="tileIvory" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#fffdf2"/><stop offset="1" stop-color="#eee1c9"/></linearGradient>';
    svg.append(defs);
    const rails = svgElement("g", { class: "rail-lines" });
    svg.append(rails);
    for (const train of table.trains)
      rails.append(
        svgElement("line", {
          x1: 0,
          y1: 0,
          x2: train.target.x,
          y2: train.target.y,
        }),
      );
    const hub = svgElement("g", { class: "rail-hub" });
    hub.append(
      svgElement("circle", {
        cx: 0,
        cy: 0,
        r: 66,
        fill: "url(#hubWood)",
        stroke: "#966944",
        "stroke-width": 5,
      }),
    );
    hub.append(
      svgElement("circle", {
        cx: 0,
        cy: 0,
        r: 56,
        fill: "none",
        stroke: "#a77d54",
        "stroke-width": 1,
        "stroke-dasharray": "3 3",
      }),
    );
    hub.append(
      svgElement("rect", {
        x: -32,
        y: -21,
        width: 64,
        height: 42,
        rx: 5,
        fill: "url(#tileIvory)",
        stroke: "#c5b9a4",
      }),
    );
    hub.append(
      svgElement("line", { x1: 0, y1: -19, x2: 0, y2: 19, stroke: "#b5aa99" }),
    );
    for (const x of [-16, 16]) {
      const num = svgElement("text", {
        x,
        y: 1,
        "text-anchor": "middle",
        "dominant-baseline": "central",
        class: "rail-number",
        fill: `var(--v${g.engine})`,
      });
      num.textContent = g.engine;
      hub.append(num);
    }
    svg.append(hub);
    function toggleTrain(key) {
      if (expandedTrains.has(key)) expandedTrains.delete(key);
      else expandedTrains.add(key);
      boardView.manual = true;
      boardView.fitActive = true;
      boardView.zoom = 1;
      board(g);
    }
    // The markers sit on the hub at the start of each route, independent of
    // how far the train has grown. They are visual only and never block input.
    for (const train of table.trains) {
      if (train.key !== "community" && !train.open) continue;
      const radians = (train.angle * Math.PI) / 180;
      const marker = svgElement("g", {
        class: "hub-train-marker",
        "data-train-marker": train.key,
        transform: `translate(${52 * Math.cos(radians)} ${52 * Math.sin(radians)}) rotate(${train.angle})`,
        role: "img",
        "aria-label":
          train.key === "community"
            ? "Community train"
            : `${train.name} is open`,
        "pointer-events": "none",
      });
      marker.append(locomotiveModel(svgElement, train.color));
      svg.append(marker);
    }
    for (const train of table.trains) {
      if (train.hiddenCount) {
        const holder = svgElement("foreignObject", {
          x: train.gap.x - 21,
          y: train.gap.y - 14,
          width: 42,
          height: 28,
        });
        const expand = document.createElement("button");
        expand.type = "button";
        expand.className = "train-gap";
        expand.dataset.trainExpand = train.key;
        expand.textContent = `+${train.hiddenCount}`;
        expand.setAttribute(
          "aria-label",
          `Expand ${train.name}, ${train.hiddenCount} hidden dominoes`,
        );
        expand.addEventListener("click", () => toggleTrain(train.key));
        holder.append(expand);
        svg.append(holder);
      }
      for (const piece of train.dominoes) {
        const pendingDouble =
          g.pending?.train === train.key &&
          piece.tile.id === train.tiles.at(-1)?.id &&
          piece.tile.a === piece.tile.b;
        const group = svgElement("g", {
          transform: `translate(${piece.center.x} ${piece.center.y}) rotate(${piece.angle})`,
          class: `rail-domino${pendingDouble ? " double-pending" : ""}${piece.tile.id === arrivingTile ? " just-played" : ""}`,
          "data-tile": piece.tile.id,
        });
        group.append(
          svgElement("rect", {
            x: -TILE_LENGTH / 2,
            y: -TILE_WIDTH / 2,
            width: TILE_LENGTH,
            height: TILE_WIDTH,
            rx: 4,
            fill: "url(#tileIvory)",
            stroke: "#785b40",
            "stroke-width": 2.5,
          }),
        );
        group.append(
          svgElement("line", {
            x1: 0,
            y1: -TILE_WIDTH / 2 + 2,
            x2: 0,
            y2: TILE_WIDTH / 2 - 2,
            stroke: "#ad9e87",
          }),
        );
        for (const [value, x] of [
          [piece.tile.a, -TILE_LENGTH / 4],
          [piece.tile.b, TILE_LENGTH / 4],
        ]) {
          const num = svgElement("text", {
            x,
            y: 1,
            "text-anchor": "middle",
            "dominant-baseline": "central",
            class: "rail-number",
            fill: `var(--v${value})`,
            transform: `rotate(${-piece.angle} ${x} 1)`,
          });
          num.textContent = value;
          group.append(num);
        }
        svg.append(group);
      }
      if (expandedTrains.has(train.key) && train.tiles.length > 5) {
        const first = train.dominoes[0].center;
        const radians = (train.angle * Math.PI) / 180;
        const x = first.x + Math.sin(radians) * 42;
        const y = first.y - Math.cos(radians) * 42;
        const holder = svgElement("foreignObject", {
          x: x - 18,
          y: y - 14,
          width: 36,
          height: 28,
        });
        const collapse = document.createElement("button");
        collapse.type = "button";
        collapse.className = "train-gap train-collapse";
        collapse.dataset.trainExpand = train.key;
        collapse.textContent = "−";
        collapse.setAttribute("aria-label", `Condense ${train.name} on table`);
        collapse.addEventListener("click", () => toggleTrain(train.key));
        holder.append(collapse);
        svg.append(holder);
      }
      const label = svgElement("text", {
        x: train.label.x,
        y: train.label.y,
        class: "rail-label",
        "text-anchor": "middle",
        "dominant-baseline": "central",
      });
      label.textContent = train.name + (train.open ? " · OPEN" : "");
      svg.append(label);
      const marker = svgElement("circle", {
        cx: train.label.x,
        cy: train.label.y + 17,
        r: 5,
        fill: train.color,
        stroke: "#fff6e5",
        "stroke-width": 1,
      });
      svg.append(marker);
      const holder = svgElement("foreignObject", {
        x: train.target.x - 23,
        y: train.target.y - 23,
        width: 46,
        height: 46,
      });
      const end = document.createElement("button");
      end.type = "button";
      end.className = "endpoint rail-endpoint";
      end.dataset.train = train.key;
      end.setAttribute(
        "aria-label",
        `${train.name}, needs ${g.trains[train.key].end}`,
      );
      end.addEventListener("click", () => play(train.key));
      holder.append(end);
      svg.append(holder);
      const row = document.createElement("div");
      row.className = "train-line";
      const title = document.createElement("b");
      title.textContent = train.name + (train.open ? " · open" : "");
      let quickIcon = null;
      if (train.open || train.key === "community") {
        quickIcon = svgElement("svg", {
          viewBox: "-16 -16 32 32",
          class: "quick-train-icon",
          "aria-hidden": "true",
          "data-quick-train": train.key,
        });
        quickIcon.append(locomotiveModel(svgElement, train.color));
      }
      const values = document.createElement("span");
      values.className = "train-values";
      if (!train.tiles.length) values.textContent = `Starts with ${g.engine}`;
      for (const [index, t] of train.tiles.entries()) {
        const chip = document.createElement("span");
        const pendingDouble =
          g.pending?.train === train.key &&
          index === train.tiles.length - 1 &&
          t.a === t.b;
        chip.className = pendingDouble
          ? "train-chip double-pending"
          : "train-chip";
        if (pendingDouble)
          chip.setAttribute(
            "aria-label",
            `Uncovered double ${t.a}; must be covered`,
          );
        chip.innerHTML = `<span style="color:var(--v${t.a})">${t.a}</span><span style="color:var(--v${t.b})">${t.b}</span>`;
        values.append(chip);
      }
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.train = train.key;
      button.textContent = `Play here · needs ${g.trains[train.key].end}`;
      button.addEventListener("click", () => play(train.key));
      const focus = document.createElement("button");
      focus.type = "button";
      focus.className = "focus-train";
      focus.textContent = "Focus";
      focus.setAttribute("aria-label", `Focus ${train.name}`);
      focus.addEventListener("click", () => {
        boardView.manual = true;
        boardView.fitActive = false;
        focusTrainEnd(train);
        updateBoardView();
      });
      row.append(title);
      if (quickIcon) row.append(quickIcon);
      row.append(values, focus);
      if (train.tiles.length > 5) {
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "toggle-train";
        toggle.textContent = expandedTrains.has(train.key)
          ? "Condense"
          : `Expand (+${train.hiddenCount})`;
        toggle.setAttribute(
          "aria-label",
          `${expandedTrains.has(train.key) ? "Condense" : "Expand"} ${train.name}`,
        );
        toggle.addEventListener("click", () => toggleTrain(train.key));
        row.append(toggle);
      }
      row.append(button);
      list.append(row);
    }
    let pan = null,
      pinch = null;
    const touches = new Map();
    const startPan = (pointer, x, y) => ({
      pointer,
      x,
      y,
      viewX: boardView.x,
      viewY: boardView.y,
    });
    function touchPair() {
      const [a, b] = [...touches.values()];
      return {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        distance: Math.hypot(a.x - b.x, a.y - b.y),
      };
    }
    function pointAt(clientX, clientY) {
      const rect = svg.getBoundingClientRect();
      return {
        nx: (clientX - rect.left) / Math.max(1, rect.width) - 0.5,
        ny: (clientY - rect.top) / Math.max(1, rect.height) - 0.5,
        aspect: $("board").clientWidth / Math.max(1, $("board").clientHeight),
      };
    }
    svg.addEventListener("pointerdown", (event) => {
      if (
        event.button !== 0 ||
        event.target.closest("[data-train], [data-train-expand]")
      )
        return;
      if (event.pointerType === "touch") {
        touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (touches.size === 2) {
          const mid = touchPair(),
            p = pointAt(mid.x, mid.y);
          const radius = boardView.radius / boardView.zoom;
          pinch = {
            distance: Math.max(1, mid.distance),
            zoom: boardView.zoom,
            worldX: boardView.x + p.nx * 2 * p.aspect * radius,
            worldY: boardView.y + p.ny * 2 * radius,
          };
          pan = null;
        } else if (touches.size === 1)
          pan = startPan(event.pointerId, event.clientX, event.clientY);
      } else pan = startPan(event.pointerId, event.clientX, event.clientY);
      svg.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    svg.addEventListener("pointermove", (event) => {
      if (touches.has(event.pointerId))
        touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pinch && touches.size >= 2) {
        const mid = touchPair(),
          p = pointAt(mid.x, mid.y);
        boardView.zoom = Math.max(
          1,
          Math.min(32, (pinch.zoom * mid.distance) / pinch.distance),
        );
        const radius = boardView.radius / boardView.zoom;
        boardView.x = pinch.worldX - p.nx * 2 * p.aspect * radius;
        boardView.y = pinch.worldY - p.ny * 2 * radius;
        boardView.manual = true;
        boardView.fitActive = false;
        updateBoardView();
        return;
      }
      if (!pan || event.pointerId !== pan.pointer) return;
      boardView.manual = true;
      boardView.fitActive = false;
      const rect = svg.getBoundingClientRect();
      const aspect =
        $("board").clientWidth / Math.max(1, $("board").clientHeight);
      const height = (boardView.radius * 2) / boardView.zoom;
      boardView.x =
        pan.viewX -
        ((event.clientX - pan.x) * height * aspect) / Math.max(1, rect.width);
      boardView.y =
        pan.viewY -
        ((event.clientY - pan.y) * height) / Math.max(1, rect.height);
      updateBoardView();
    });
    function endPointer(event) {
      touches.delete(event.pointerId);
      if (touches.size < 2) pinch = null;
      if (touches.size === 1) {
        const [id, position] = touches.entries().next().value;
        pan = startPan(id, position.x, position.y);
      } else if (!touches.size) pan = null;
    }
    svg.addEventListener("pointerup", endPointer);
    svg.addEventListener("pointercancel", endPointer);
    $("boardTiles").replaceChildren();
    updateBoardView();
    updateSelection();
  }
  function render(r) {
    const previous = room;
    let arrivingTile = null;
    if (
      !ignoreNextSoundState &&
      previous?.code === r.code &&
      previous.game?.phase === "playing" &&
      previous.game.round === r.game?.round &&
      r.revision === previous.revision + 1
    ) {
      for (const [key, train] of Object.entries(r.game.trains)) {
        const before = previous.game.trains[key]?.tiles || [];
        if (train.tiles.length === before.length + 1)
          arrivingTile = train.tiles.at(-1).id;
      }
    }
    room = r;
    if (!ignoreNextSoundState) {
      const events = soundEvents(previous, r);
      const turnSound = events.includes("turn") && soundPrefs.turn;
      if (turnSound) soundPlayer.play("turn", soundPrefs.volumes.turn);
      if (events.includes("train") && soundPrefs.train !== "off")
        soundPlayer.play(
          soundPrefs.train,
          soundPrefs.volumes[soundPrefs.train],
          false,
          turnSound ? 0.85 : 0,
        );
    }
    ignoreNextSoundState = false;
    localStorage.setItem("mexican-train-room", r.code);
    $("entry").hidden = true;
    $("roomCode").textContent = r.code;
    $("lobby").hidden = !!r.game;
    $("gameArea").hidden = !r.game;
    $("hostControls").hidden = r.host !== r.me;
    $("lobbyStatus").textContent =
      r.host === r.me
        ? "You are the host. At least two players are needed."
        : "Waiting for the host to start.";
    $("startGame").disabled = r.players.length < 2;
    const own = r.players.find((p) => p.id === r.me);
    $("lobbyColor").value = own.color;
    const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const a = rgb(own.color);
    $("colorWarning").textContent = r.players.some(
      (p) =>
        p.id !== r.me &&
        Math.hypot(...rgb(p.color).map((v, i) => v - a[i])) < 65,
    )
      ? "Your color looks similar to another player’s. Names will also identify trains."
      : "";
    $("lobbyPlayers").replaceChildren(
      ...r.players.map((p) => {
        const li = document.createElement("li"),
          dot = document.createElement("span");
        dot.className = "color-dot";
        dot.style.background = p.color;
        li.append(
          dot,
          document.createTextNode(
            p.name +
              (p.id === r.host ? " · host" : "") +
              (p.connected ? "" : " · disconnected"),
          ),
        );
        return li;
      }),
    );
    if (!r.game) return;
    const g = r.game,
      wasMyTurn = previous?.game?.turn === r.me;
    function seatBadge(player, local = false) {
      const badge = document.createElement("div");
      const connected =
        r.players.find((p) => p.id === player.id)?.connected !== false;
      const active = g.phase === "playing" && g.turn === player.id;
      badge.className = `seat-badge${active ? " seat-active" : ""}${connected ? "" : " seat-away"}`;
      badge.setAttribute(
        "aria-label",
        `${player.name}${local ? ", you" : ""}${active ? ", current turn" : ""}${connected ? "" : ", disconnected"}`,
      );
      badge.title = badge.getAttribute("aria-label");
      const icon = svgElement("svg", {
        viewBox: "-16 -16 32 32",
        class: "seat-train",
        "aria-hidden": "true",
      });
      icon.append(locomotiveModel(svgElement, player.color));
      const name = document.createElement("span");
      name.className = "seat-name";
      name.textContent = player.name + (local ? " (you)" : "");
      badge.append(icon, name);
      if (active || !connected) {
        const status = document.createElement("small");
        status.textContent = !connected ? "Away" : "Turn";
        badge.append(status);
      }
      return badge;
    }
    $("localSeat").replaceChildren(
      seatBadge(
        g.players.find((p) => p.id === r.me),
        true,
      ),
    );
    if (previous?.code === r.code && previous.game === null && g.round === 1) {
      expandedTrains.clear();
      expandedRound = "";
      const key = `mexican-train-layout-${r.code}-${r.me}-${g.round}`;
      try {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}:scale`);
      } catch {}
      if (layoutKey === key) {
        layoutKey = "";
        state.tiles = [];
      }
      handViewBeforeFit = null;
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    }
    const sameRound =
      previous?.code === r.code && previous?.game?.round === g.round;
    const oldIds = sameRound
      ? new Set(previous.game.hand.map((t) => t.id))
      : null;
    const drawnTile = oldIds ? g.hand.find((t) => !oldIds.has(t.id)) : null;
    if (!sameRound) {
      latestDraw = null;
      lastDrawNotice = "";
    }
    loadHand(g);
    if (latestDraw && !tile(latestDraw)) {
      latestDraw = null;
      lastDrawNotice = "";
    }
    if (drawnTile) {
      latestDraw = drawnTile.id;
      selected = drawnTile.id;
      lastDrawNotice = `You drew ${drawnTile.a} | ${drawnTile.b}.`;
    } else if (g.drawn && tile(g.drawn)) {
      latestDraw = g.drawn;
      selected = g.drawn;
    } else if (g.turn === r.me && !wasMyTurn) {
      latestDraw = null;
      lastDrawNotice = "";
    }
    if (
      g.phase === "playing" &&
      (!previous?.game ||
        previous.game.phase !== "playing" ||
        wasMyTurn !== (g.turn === r.me))
    ) {
      camera = g.turn !== r.me;
      $("board").classList.toggle("perspective", camera);
      $("cameraButton").textContent = camera
        ? "Playing view"
        : "Table perspective";
    }
    $("roundLabel").textContent = `Round ${g.round} · ${g.engine}`;
    const turnPlayer = g.players.find((p) => p.id === g.turn);
    const turnBanner = $("turnBanner");
    turnBanner.hidden = g.phase !== "playing";
    turnBanner.classList.toggle(
      "your-turn",
      g.phase === "playing" && g.turn === r.me,
    );
    const turnMessage =
      g.turn === r.me ? "YOUR TURN" : `${turnPlayer?.name || "Player"}'s turn`;
    if (turnBanner.textContent !== turnMessage)
      turnBanner.textContent = turnMessage;
    $("turnLabel").textContent =
      g.phase === "playing"
        ? g.turn === r.me
          ? "Your turn"
          : `${turnPlayer?.name}'s turn`
        : g.phase === "finished"
          ? "Game complete"
          : "Round complete";
    const pl = $("gameArea").querySelector(".players");
    pl.replaceChildren(
      ...g.players.map((p) => {
        const li = document.createElement("li"),
          avatar = document.createElement("span"),
          text = document.createElement("span"),
          b = document.createElement("b"),
          small = document.createElement("small");
        const active = g.phase === "playing" && p.id === g.turn;
        li.dataset.playerId = p.id;
        if (active) li.classList.add("player-on-turn");
        avatar.className = "player-avatar";
        avatar.style.background = p.color;
        avatar.textContent = p.name.slice(0, 1).toUpperCase();
        b.textContent = p.name + (p.id === r.me ? " (you)" : "");
        small.textContent = `${p.score} points · ${p.count} tiles${p.open ? " · OPEN" : ""}`;
        text.append(b, small);
        li.append(avatar, text);
        if (active) {
          const turn = document.createElement("em");
          turn.textContent = p.id === r.me ? "YOUR TURN" : "TURN";
          li.append(turn);
        }
        return li;
      }),
    );
    document.querySelector(".player-count").textContent =
      `${g.players.length} PLAYERS`;
    const myTurn = g.phase === "playing" && g.turn === r.me;
    if (!myTurn) {
      clearTimeout(turnHintTimer);
      turnHintTimer = null;
    } else if (
      !wasMyTurn ||
      !sameRound ||
      previous?.game?.phase !== "playing"
    ) {
      clearTimeout(turnHintTimer);
      const hintRound = g.round;
      turnHintTimer = setTimeout(() => {
        const current = room?.game;
        if (
          current?.phase === "playing" &&
          current.turn === room.me &&
          current.round === hintRound &&
          !current.drawn &&
          !current.openingPlayed
        )
          tell("If you can't play, remember you can draw from the boneyard.");
      }, 30000);
    }
    $("drawButton").disabled = !myTurn || !g.boneyard || g.drewThisTurn;
    $("drawButton").textContent = "Draw";
    $("drawButton").title = !myTurn
      ? "Wait for your turn"
      : g.drewThisTurn
        ? "Already drew this turn"
        : !g.boneyard
          ? "The boneyard is empty"
          : "";
    $("endOpening").hidden =
      !myTurn ||
      !(g.drewThisTurn || !g.boneyard || (g.openingPlayed && !g.pending));
    $("endOpening").textContent =
      g.openingPlayed && !g.pending && !g.drawn
        ? "End opening turn"
        : "End turn";
    $("nextRound").hidden = !(g.phase === "round-end" && r.host === r.me);
    $("rematch").hidden = !(g.phase === "finished" && r.host === r.me);
    $("leaveGame").hidden = g.phase !== "finished";
    document.querySelector(".game-controls").hidden =
      $("nextRound").hidden && $("rematch").hidden && $("leaveGame").hidden;
    const winner = g.players.find((p) => p.id === g.gameWinner);
    $("gameMessage").textContent =
      g.phase === "finished"
        ? `${winner?.name} wins the game!`
        : g.phase === "round-end"
          ? `Round complete. ${g.players.find((p) => p.id === g.roundWinner)?.name} starts the next round.`
          : g.pending
            ? "Cover the exposed double before playing elsewhere."
            : `${g.boneyard} tiles in the boneyard.`;
    const drawn = g.drawn && tile(g.drawn);
    $("actionBanner").textContent =
      g.phase !== "playing"
        ? $("gameMessage").textContent
        : myTurn && drawn
          ? `You drew ${drawn.a} | ${drawn.b}. Play a tile or end your turn.`
          : myTurn && g.pending
            ? "Cover the exposed double with a matching tile."
            : myTurn && g.openingPlayed
              ? "Keep building your train, or choose End opening turn when you are done."
              : myTurn
                ? "Your turn: select a tile and choose a train."
                : lastDrawNotice ||
                  `Waiting for ${turnPlayer?.name || "the next player"}.`;
    const results = $("roundResults");
    results.replaceChildren();
    for (const player of g.players) {
      const line = document.createElement("div");
      line.className = "score-line";
      const total = document.createElement("b");
      total.textContent = `${player.name}: ${player.score} points`;
      line.append(total);
      if (g.results.length) {
        const rounds = document.createElement("small");
        rounds.textContent = g.results
          .map((result) => {
            const score = result.scores.find((s) => s.id === player.id);
            return `${result.engine}–${result.engine}: ${score?.points ?? 0}`;
          })
          .join(" · ");
        line.append(rounds);
      }
      results.append(line);
    }
    renderHand();
    board(g, arrivingTile);
    if (drawnTile || (!sameRound && g.drawn)) {
      revealHandTile(latestDraw);
      if (drawnTile) tell(lastDrawNotice);
    }
  }
  // Keep the relevant actions next to the turn instructions on desktop and tablet.
  $("actionBanner").after(document.querySelector(".game-controls"));
  $("zoomIn").addEventListener("click", () => {
    boardView.manual = true;
    boardView.fitActive = false;
    boardView.zoom = Math.min(32, boardView.zoom * 1.5);
    updateBoardView();
  });
  $("zoomOut").addEventListener("click", () => {
    boardView.manual = true;
    boardView.fitActive = false;
    boardView.zoom = Math.max(1, boardView.zoom / 1.5);
    updateBoardView();
  });
  $("fitBoard").addEventListener("click", () => {
    boardView.manual = true;
    boardView.zoom = 1;
    boardView.fitActive = true;
    updateBoardView();
  });
  $("boardViewport").addEventListener(
    "wheel",
    (event) => {
      if (!boardView.svg || !event.deltaY) return;
      const rect = boardView.svg.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
      const ny = (event.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
      const aspect =
        $("board").clientWidth / Math.max(1, $("board").clientHeight);
      const before = boardView.radius / boardView.zoom;
      const mode =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
      const factor = Math.exp(
        -Math.max(-500, Math.min(500, event.deltaY * mode)) * 0.0015,
      );
      const nextZoom = Math.max(1, Math.min(32, boardView.zoom * factor));
      if (nextZoom === boardView.zoom) return;
      event.preventDefault();
      const after = boardView.radius / nextZoom;
      boardView.x += nx * 2 * aspect * (before - after);
      boardView.y += ny * 2 * (before - after);
      boardView.zoom = nextZoom;
      boardView.manual = true;
      boardView.fitActive = false;
      updateBoardView();
    },
    { passive: false },
  );
  window.addEventListener("resize", updateBoardView);
  const handResize = new ResizeObserver(() => {
    if (!autoHandFit || !state.tiles.length || handViewBeforeFit || !layoutKey)
      return;
    const right = Math.max(
      ...state.tiles.map((t) => t.x + (t.rotation % 180 ? 26 : 50)),
    );
    const bottom = Math.max(
      ...state.tiles.map((t) => t.y + (t.rotation % 180 ? 50 : 26)),
    );
    const nextScale =
      HAND_WORKSPACE_SCALE *
      Math.min(
        1,
        (viewport.clientWidth - 8) / right,
        (viewport.clientHeight - 8) / bottom,
      );
    if (nextScale > 0 && Math.abs(nextScale - scale) > 0.001) {
      scale = nextScale;
      updateSize();
      save();
    }
  });
  handResize.observe(viewport);
  $("createRoom").addEventListener("click", () =>
    send(
      "create",
      { name: $("nameInput").value, color: $("colorInput").value },
      (r) => {
        localStorage.setItem("mexican-train-room", r.code);
      },
    ),
  );
  $("joinRoom").addEventListener("click", () =>
    send(
      "join",
      {
        name: $("nameInput").value,
        color: $("colorInput").value,
        code: $("codeInput").value,
      },
      (r) => {
        localStorage.setItem("mexican-train-room", r.code);
      },
    ),
  );
  $("copyCode").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      tell("Room code copied.");
    } catch {
      tell(`Room code: ${room.code}`);
    }
  });
  for (let i = 12; i >= 0; i--) {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = `${i}–${i}${i === 12 ? " · full game" : ""}`;
    $("engineInput").append(o);
  }
  $("lobbyColor").addEventListener("change", () => {
    const chosen = $("lobbyColor").value;
    socket.emit("change-color", { code: room.code, color: chosen }, (r) => {
      if (!r?.ok) {
        $("lobbyColor").value = room.players.find(
          (p) => p.id === room.me,
        ).color;
        tell(r?.error || "Could not change color.");
      }
    });
  });
  $("startGame").addEventListener("click", () =>
    send("start", { code: room.code, engine: $("engineInput").value }),
  );
  $("drawButton").addEventListener("click", () => move({ type: "draw" }));
  $("endOpening").addEventListener("click", () => move({ type: "end-turn" }));
  $("nextRound").addEventListener("click", () =>
    send("next-round", { code: room.code }),
  );
  $("rematch").addEventListener("click", () =>
    send("rematch", { code: room.code }),
  );
  for (const id of ["leaveLobby", "leaveGame"])
    $(id).addEventListener("click", () => send("leave", { code: room.code }));
  $("expandButton").addEventListener("click", () => setFullscreen(!fullscreen));
  $("flipButton").addEventListener("click", flip);
  $("rotateButton").addEventListener("click", rotate);
  $("fitButton").addEventListener("click", fitHand);
  $("playButton").addEventListener("click", () => {
    if (fullscreen) setFullscreen(false);
    tell("Choose a train.");
  });
  $("cameraButton").addEventListener("click", () => {
    camera = !camera;
    $("board").classList.toggle("perspective", camera);
    $("cameraButton").textContent = camera
      ? "Playing view"
      : "Table perspective";
    updateSelection();
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input,textarea,select")) return;
    if (e.key.toLowerCase() === "r" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      rotate();
    } else if (e.key === "Escape") {
      if (drag) cancelDrag();
      else if (fullscreen) setFullscreen(false);
      else {
        selected = null;
        updateSelection();
      }
    } else if (
      e.target.classList.contains("domino") &&
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
    ) {
      e.preventDefault();
      const t = tile(e.target.dataset.id);
      if (!t) return;
      autoHandFit = false;
      const d = e.shiftKey ? 10 : 2;
      t.x += e.key === "ArrowRight" ? d : e.key === "ArrowLeft" ? -d : 0;
      t.y += e.key === "ArrowDown" ? d : e.key === "ArrowUp" ? -d : 0;
      clamp(t);
      refresh(t);
    }
  });
  const soundKey = "mexican-train-sound-settings";
  try {
    const saved = JSON.parse(localStorage.getItem(soundKey) || "null");
    if (saved && typeof saved === "object") {
      soundPrefs.turn = saved.turn === true;
      if (["off", "normal", "station"].includes(saved.train))
        soundPrefs.train = saved.train;
      for (const name of ["turn", "normal", "station"]) {
        const value = Number(saved.volumes?.[name]);
        if (Number.isFinite(value))
          soundPrefs.volumes[name] = Math.max(0, Math.min(100, value));
      }
    } else if (localStorage.getItem("mexican-train-sound") === "on") {
      soundPrefs.turn = true;
      soundPrefs.train = "normal";
    }
  } catch {}
  const volumeControls = { turn: "Turn", normal: "Normal", station: "Station" };
  $("soundTurnEnabled").checked = soundPrefs.turn;
  document.querySelector(
    `input[name="trainSound"][value="${soundPrefs.train}"]`,
  ).checked = true;
  for (const [name, suffix] of Object.entries(volumeControls)) {
    const slider = $(`sound${suffix}Volume`),
      output = $(`sound${suffix}Value`);
    slider.value = soundPrefs.volumes[name];
    soundPlayer.setVolume(name, soundPrefs.volumes[name]);
    output.value = `${slider.value}%`;
    slider.addEventListener("input", () => {
      soundPrefs.volumes[name] = Number(slider.value);
      soundPlayer.setVolume(name, soundPrefs.volumes[name]);
      output.value = `${slider.value}%`;
      saveSoundSettings();
    });
  }
  function saveSoundSettings() {
    try {
      localStorage.setItem(soundKey, JSON.stringify(soundPrefs));
    } catch {}
  }
  $("soundTurnEnabled").addEventListener("change", () => {
    soundPrefs.turn = $("soundTurnEnabled").checked;
    if (!soundPrefs.turn) soundPlayer.stop("turn");
    saveSoundSettings();
    activateAudio();
  });
  for (const input of document.querySelectorAll('input[name="trainSound"]'))
    input.addEventListener("change", () => {
      if (!input.checked) return;
      if (soundPrefs.train !== input.value && soundPrefs.train !== "off")
        soundPlayer.stop(soundPrefs.train);
      soundPrefs.train = input.value;
      saveSoundSettings();
      activateAudio();
    });
  for (const button of document.querySelectorAll("[data-play-sound]"))
    button.addEventListener("click", async () => {
      const name = button.dataset.playSound;
      const played = await soundPlayer.play(
        name,
        soundPrefs.volumes[name],
        true,
      );
      if (!played)
        tell("Could not play that sound. Check your browser audio settings.");
    });
  function activateAudio() {
    if (!soundPrefs.turn && soundPrefs.train === "off") return;
    try {
      if (soundPlayer.unlock()) soundPlayer.preload();
    } catch {}
  }
  document.addEventListener("pointerdown", activateAudio);
  document.addEventListener("keydown", activateAudio);
  fetch("/api/session")
    .then((r) => {
      if (!r.ok) throw Error("Session unavailable");
      socket = io();
      socket.on("state", render);
      socket.on("left", () => {
        room = null;
        localStorage.removeItem("mexican-train-room");
        $("entry").hidden = false;
        $("lobby").hidden = true;
        $("gameArea").hidden = true;
      });
      socket.on("connect", () => {
        ignoreNextSoundState = true;
        const code = localStorage.getItem("mexican-train-room");
        if (code)
          socket.emit("resume", { code }, (r) => {
            if (!r?.ok) localStorage.removeItem("mexican-train-room");
          });
      });
      socket.on("disconnect", () => {
        ignoreNextSoundState = true;
        tell("Connection lost. Reconnecting…");
      });
      socket.on("connect_error", () => {
        $("entryError").textContent =
          "Could not connect to the game server. Retrying…";
      });
    })
    .catch(
      () =>
        ($("entryError").textContent = "Could not connect to the game server."),
    );
})();
