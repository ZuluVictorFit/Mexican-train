# Project working instructions

- The user has authorized the multiplayer build. `prototype/` is the earlier
  standalone interaction study; the Node server and current client live in
  `server/` and `public/`. Keep the public prototype distinct from the game.
- Read `docs/product.md` and the relevant design/rules document first. Treat
  confirmed decisions as requirements; recommendations remain proposals.
- Use this existing checkout. Cloud tasks are already isolated; do not create
  Git worktrees unless explicitly requested.
- Preserve the defining interaction: continuous free placement in the private
  hand, small overlaps, no positional grid or automatic rearrangement. Click/tap
  swaps ends; R turns 90 degrees. Keep hand coordinates independent of the board
  camera. Fit a fresh deal in the compact hand, and keep the full-screen hand
  workspace optional. Keep outward-moving trains compact and staggered, preserve
  the quick-view list, and support mouse-wheel zoom and dragging to pan the table.
  Target desktop/tablet and at most six players.
- Use numbered, value-colored domino faces, unique custom player train colors,
  and exactly one community train. Do not confuse number colors and train colors.
- Update the decision documents when the user settles a question. Link to the
  decision rather than copying long specifications into every task.
- For eventual implementation, keep rules separate from rendering and multiplayer
  transport. Server state is authoritative; private hands must not leak to peers.
- Generated concepts illustrate appearance, not valid game state or exact layout.
  Resolve their documented discrepancies before using them as implementation specs.
- Do not copy another site's code, artwork, branding, or audio.
- Future themes (including holidays) are a confirmed requirement for architecture,
  not a current feature to build. Separate visual/audio tokens and assets from
  rules, input, camera geometry, and private-hand data. Ship wood first.
