# Mexican Train

A private browser game for friends: one player hosts, others join with a code.
The signature interaction is a private, freely arranged domino hand alongside a
table that moves from a seated perspective to a clear playing view.

**Stage: product design and a local interaction prototype.** Desktop and tablet
first; 2–6 players. The prototype explores the hand and table; the multiplayer
game and its rules engine have not been built.

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

## Try the interaction prototype

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
