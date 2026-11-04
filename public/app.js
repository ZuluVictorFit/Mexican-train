(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    W = 1600,
    H = 800,
    viewport = $("handViewport"),
    space = $("handSpace"),
    canvas = $("handCanvas");
  let audioContext = null;
  let room = null,
    socket = null,
    state = { tiles: [], endpoints: {} },
    selected = null,
    fullscreen = false,
    scale = 1,
    camera = false,
    drag = null,
    timer,
    layoutKey = "";
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
    } catch {}
  }
  function loadHand(g) {
    const key = `mexican-train-layout-${room.code}-${room.me}-${g.round}`;
    let old = [];
    try {
      old =
        key === layoutKey
          ? state.tiles
          : JSON.parse(localStorage.getItem(key) || "[]");
    } catch {}
    layoutKey = key;
    const occupied = old.filter((o) => g.hand.some((t) => t.id === o.id));
    state.tiles = g.hand.map((t, i) => {
      let place = occupied.find((o) => o.id === t.id);
      if (!place) {
        let spot;
        for (let y = 65; y < H - 25 && !spot; y += 82)
          for (let x = 85; x < W - 50; x += 142)
            if (
              occupied.every(
                (o) => Math.abs(o.x - x) > 105 || Math.abs(o.y - y) > 65,
              )
            ) {
              spot = { x, y };
              break;
            }
        place = {
          id: t.id,
          ...(spot || { x: 85, y: 65 }),
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
        e.dataset.id = t.id;
        e.innerHTML = faces(t).map(face).join("");
        e.setAttribute("aria-label", label(t));
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
  function updateSelection() {
    const t = tile(selected);
    for (const el of canvas.querySelectorAll(".domino")) {
      const on = el.dataset.id === selected;
      el.classList.toggle("selected", on);
      el.setAttribute("aria-pressed", String(on));
    }
    const playable = t && room?.game?.legal.some((m) => m.tile === t.id);
    $("playButton").disabled = !playable || camera;
    $("flipButton").disabled = !t;
    $("rotateButton").disabled = !t;
    for (const el of document.querySelectorAll("[data-train]")) {
      const on = !camera && legal(t, el.dataset.train);
      el.classList.toggle("valid", !!on);
      if (el.classList.contains("endpoint"))
        el.classList.toggle("invalid", !!t && !on);
    }
    $("boardCaption").textContent = t
      ? `${faces(t).join(" | ")} selected · choose a glowing train`
      : "Select a tile to see where it can go.";
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
    }
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
  function board(g) {
    document
      .querySelectorAll(".board > .route,.board > .seat,.board > .endpoint")
      .forEach((e) => e.remove());
    const dynamic = $("dynamicBoard"),
      list = $("trainList");
    dynamic.replaceChildren();
    list.replaceChildren();
    const ns = "http://www.w3.org/2000/svg",
      tracks = document.createElementNS(ns, "svg");
    tracks.setAttribute("viewBox", "0 0 100 100");
    tracks.setAttribute("preserveAspectRatio", "none");
    tracks.classList.add("board-tracks");
    dynamic.append(tracks);
    const engine = document.querySelectorAll(".engine span");
    engine.forEach((e) => (e.textContent = g.engine));
    const others = g.players.filter((p) => p.id !== room.me),
      me = g.players.find((p) => p.id === room.me);
    const lanes = [
      { key: `p:${me.id}`, name: "Your train", color: me.color, angle: 90 },
      ...others.map((p, i) => ({
        key: `p:${p.id}`,
        name: p.name,
        color: p.color,
        angle: 90 + ((i + 1) * 360) / (others.length + 2),
        open: p.open,
      })),
      {
        key: "community",
        name: "Community",
        color: "#bc8b3b",
        angle: 90 + ((others.length + 1) * 360) / (others.length + 2),
      },
    ];
    for (const lane of lanes) {
      const train = g.trains[lane.key];
      if (!train) continue;
      const rad = (lane.angle * Math.PI) / 180,
        x = 50 + 34 * Math.cos(rad),
        y = 50 + 31 * Math.sin(rad);
      const line = document.createElementNS(ns, "line");
      for (const [k, v] of Object.entries({ x1: 50, y1: 50, x2: x, y2: y }))
        line.setAttribute(k, v);
      tracks.append(line);
      const seat = document.createElement("div");
      seat.className = "dynamic-seat";
      seat.style.left = `${x}%`;
      seat.style.top = `${y}%`;
      const dot = document.createElement("i");
      dot.className = "color-dot";
      dot.style.background = lane.color;
      seat.append(
        dot,
        document.createTextNode(lane.name + (lane.open ? " · OPEN" : "")),
      );
      dynamic.append(seat);
      const end = document.createElement("button");
      end.type = "button";
      end.className = "endpoint dynamic-endpoint";
      end.dataset.train = lane.key;
      end.style.left = `${50 + 24 * Math.cos(rad)}%`;
      end.style.top = `${50 + 22 * Math.sin(rad)}%`;
      end.setAttribute("aria-label", `${lane.name}, needs ${train.end}`);
      end.addEventListener("click", () => play(lane.key));
      dynamic.append(end);
      const row = document.createElement("div");
      row.className = "train-line";
      const title = document.createElement("b");
      title.textContent = lane.name + (lane.open ? " · open" : "");
      const values = document.createElement("span");
      values.className = "train-values";
      if (!train.tiles.length) values.textContent = `Starts with ${g.engine}`;
      for (const t of train.tiles) {
        const chip = document.createElement("span");
        chip.className = "train-chip";
        chip.innerHTML = `<span style="color:var(--v${t.a})">${t.a}</span><span style="color:var(--v${t.b})">${t.b}</span>`;
        values.append(chip);
      }
      for (const [i, t] of train.tiles.slice(-3).entries()) {
        const marker = document.createElement("div");
        marker.className = "placed-tile";
        const radius = 11 + i * 5;
        marker.style.left = `${50 + radius * Math.cos(rad)}%`;
        marker.style.top = `${50 + radius * 0.7 * Math.sin(rad)}%`;
        marker.innerHTML = `<span style="color:var(--v${t.a})">${t.a}</span><span style="color:var(--v${t.b})">${t.b}</span>`;
        dynamic.append(marker);
      }
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.train = lane.key;
      button.textContent = `Play here · needs ${train.end}`;
      button.addEventListener("click", () => play(lane.key));
      row.append(title, values, button);
      list.append(row);
    }
    $("boardTiles").replaceChildren();
    updateSelection();
  }
  function whistle() {
    if (!$("soundToggle").checked || !audioContext) return;
    try {
      if (audioContext.state === "suspended") audioContext.resume();
      const now = audioContext.currentTime,
        gain = audioContext.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      gain.connect(audioContext.destination);
      for (const hz of [220, 277]) {
        const o = audioContext.createOscillator();
        o.type = "triangle";
        o.frequency.setValueAtTime(hz, now);
        o.connect(gain);
        o.start(now);
        o.stop(now + 0.82);
      }
    } catch {}
  }
  function render(r) {
    const previous = room;
    room = r;
    if (previous?.game && r.game && previous.game.round === r.game.round) {
      const old = previous.game;
      const opened = r.game.players.some(
        (p) => p.open && !old.players.find((q) => q.id === p.id)?.open,
      );
      const communityStarted =
        !old.trains.community.tiles.length &&
        r.game.trains.community.tiles.length > 0;
      if (opened || communityStarted) whistle();
    }
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
    loadHand(g);
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
    $("turnLabel").textContent =
      g.phase === "playing"
        ? g.turn === r.me
          ? "Your turn"
          : `${turnPlayer?.name}'s turn`
        : g.phase === "finished"
          ? "Game complete"
          : "Round complete";
    $("tableHint").textContent = g.pending
      ? "An exposed double must be covered"
      : $("turnLabel").textContent;
    const pl = $("gameArea").querySelector(".players");
    pl.replaceChildren(
      ...g.players.map((p) => {
        const li = document.createElement("li"),
          avatar = document.createElement("span"),
          text = document.createElement("span"),
          b = document.createElement("b"),
          small = document.createElement("small");
        avatar.className = "player-avatar";
        avatar.style.background = p.color;
        avatar.textContent = p.name.slice(0, 1).toUpperCase();
        b.textContent = p.name + (p.id === r.me ? " (you)" : "");
        small.textContent = `${p.score} points · ${p.count} tiles${p.open ? " · OPEN" : ""}`;
        text.append(b, small);
        li.append(avatar, text);
        return li;
      }),
    );
    document.querySelector(".player-count").textContent =
      `${g.players.length} PLAYERS`;
    const myTurn = g.phase === "playing" && g.turn === r.me;
    $("drawButton").disabled =
      !myTurn || g.legal.length > 0 || !!(g.openingPlayed && !g.pending);
    $("drawButton").textContent = g.boneyard ? "Draw" : "Pass";
    $("endOpening").hidden = !(myTurn && g.openingPlayed && !g.pending);
    $("nextRound").hidden = !(g.phase === "round-end" && r.host === r.me);
    $("rematch").hidden = !(g.phase === "finished" && r.host === r.me);
    $("leaveGame").hidden = g.phase !== "finished";
    const winner = g.players.find((p) => p.id === g.gameWinner);
    $("gameMessage").textContent =
      g.phase === "finished"
        ? `${winner?.name} wins the game!`
        : g.phase === "round-end"
          ? `Round complete. ${g.players.find((p) => p.id === g.roundWinner)?.name} starts the next round.`
          : g.pending
            ? "Cover the exposed double before playing elsewhere."
            : `${g.boneyard} tiles in the boneyard.`;
    const results = $("roundResults");
    results.replaceChildren();
    if (g.phase !== "playing" && g.results.length) {
      const last = g.results.at(-1),
        heading = document.createElement("b");
      heading.textContent = "Round scores";
      results.append(heading);
      for (const score of last.scores) {
        const line = document.createElement("div"),
          who = g.players.find((p) => p.id === score.id);
        line.textContent = `${who?.name}: ${score.points} points`;
        results.append(line);
      }
    }
    renderHand();
    board(g);
  }
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
  $("endOpening").addEventListener("click", () =>
    move({ type: "end-opening" }),
  );
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
  $("fitButton").addEventListener("click", () => {
    if (scale < 0.99) {
      scale = 1;
      $("fitButton").textContent = "Fit hand";
    } else {
      scale = Math.min(viewport.clientWidth / W, viewport.clientHeight / H, 1);
      $("fitButton").textContent = scale < 0.99 ? "Actual size" : "Fit hand";
    }
    updateSize();
  });
  $("playButton").addEventListener("click", () => {
    if (fullscreen) setFullscreen(false);
    tell("Choose a glowing train.");
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
      const d = e.shiftKey ? 10 : 2;
      t.x += e.key === "ArrowRight" ? d : e.key === "ArrowLeft" ? -d : 0;
      t.y += e.key === "ArrowDown" ? d : e.key === "ArrowUp" ? -d : 0;
      clamp(t);
      refresh(t);
    }
  });
  $("soundToggle").checked =
    localStorage.getItem("mexican-train-sound") === "on";
  $("soundToggle").addEventListener("change", () => {
    localStorage.setItem(
      "mexican-train-sound",
      $("soundToggle").checked ? "on" : "off",
    );
    if ($("soundToggle").checked) {
      try {
        audioContext ||= new (window.AudioContext ||
          window.webkitAudioContext)();
        audioContext.resume();
      } catch {
        tell("Audio is not available in this browser.");
      }
    }
  });
  function activateAudio() {
    if (!$("soundToggle").checked) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
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
        const code = localStorage.getItem("mexican-train-room");
        if (code)
          socket.emit("resume", { code }, (r) => {
            if (!r?.ok) localStorage.removeItem("mexican-train-room");
          });
      });
      socket.on("disconnect", () => tell("Connection lost. Reconnecting…"));
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
