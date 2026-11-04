# Mexican Train

A private browser game for friends: one player hosts, others join with a code.
The signature interaction is a private, freely arranged domino hand alongside a
table that moves from a seated perspective to a clear playing view.

**Stage: local multiplayer build.** Desktop and tablet first; 2–6 players. The
server implements private rooms and the selected house rules. The public GitHub
Pages site still hosts the earlier static interaction prototype; it does not run
the multiplayer server.

## Start here

- [Product brief and confirmed decisions](docs/product.md)
- [UI and interaction design](docs/design/README.md)
- [Play-interaction storyboard](docs/design/play-storyboard.md)
- [Rules and house-rule decisions](docs/rules.md)
- [Proposed technical approach](docs/architecture.md)
- [Build order and acceptance gates](docs/roadmap.md)
- [Research sources and access status](docs/research.md)

These documents distinguish user-confirmed requirements from recommendations.
Resolve the core interaction and rules questions before scaffolding the game.

## Run the multiplayer build

Install Node.js 24 or later. From the repository root, run:

```sh
npm ci
npm start
```

Open `http://127.0.0.1:3000` in a browser on the same machine. To try two players
locally, open a normal and a private/incognito browser window, create a table in
one, and join with its code in the other. Multiple windows sharing one browser
profile share a seat. Run `npm test` for the rules and server tests.

When a player cannot play, **Draw** draws one tile. A playable draw is highlighted
and brought into view; if it cannot be played, the player's train opens and the
turn passes. After an opening run, use **End opening turn**. The table draws all
dominoes end to end, with doubles sideways. Use the table's zoom, drag-to-pan,
**Fit table**, and each train's **Focus** control to inspect longer trains.

For the optional browser regression checks, install Playwright's Chromium once
with `npx playwright install chromium`, then run `npm run test:browser`. To use
an existing Chromium installation instead, set `CHROMIUM_PATH` to its executable.

The server uses `game.sqlite` in its working directory. Set `DATA_PATH` to a
durable writable location when hosting. The database contains private hands and
session credentials; do not publish or commit it. `PORT` controls the listening
port. A single server instance is supported. See [deployment notes](docs/deployment.md).

## Try the earlier interaction prototype

To run it on your own computer, download the repository files, open the
`prototype` folder, and double-click `index.html`. Keep `styles.css` and `app.js`
in the same folder. No Python or installation is required for this local sample.

Alternatively, if Python 3 is installed, run this from the repository root on
the **same computer whose browser you will use**:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory prototype
```

Then open `http://127.0.0.1:4173` in that computer's browser. A server running
in a remote cloud workspace is not reachable at this address on your computer.
Drag tiles to arrange or onto a glowing sample endpoint. Click a tile to flip it,
press **R** or use **Rotate 90°**, and use **Expand hand** for the full-screen
workspace. You can also select a tile, choose **Play selected**, and select an
endpoint. **Table perspective** toggles the waiting-camera study. **Fit hand**
changes the view; **Actual size** restores it without rearranging tiles. Scroll
the hand to reach its larger workspace.

This is a local, fixed sample with three illustrative endpoints; it is not a game,
rules implementation, or online room. Sample tile positions and moves are saved
in the browser's local storage; **Reset sample** clears that sample state.

## Development status

The existing checkout is `/workspace/Mexican-train`; use it directly. Current
environment tools include Node 24.22.1, npm, Python 3.12.14, and Git. No secrets
or third-party accounts are needed for the proposed local prototype.

GitHub read access was verified through the platform HTTPS proxy. The reference
game and rules sites currently require additional allowed domains; see the
research notes. Nothing has been deployed or published by this planning work.
