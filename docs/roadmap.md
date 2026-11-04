# Build sequence

Status: the rules and private-room flow are implemented and being tested locally;
the multiplayer build is not yet hosted online. Complete each gate before release.
Save decisions here so later tasks can reference a small relevant document.

| Stage | Deliverable | Gate |
| --- | --- | --- |
| 0. Design and rules | Requirements, verified references when access permits, selected rules, corrected table/hand/lobby renderings | User agrees on core interactions, camera direction, and rule behavior. |
| 1. Interaction prototype | One local hand tray, numbered tiles, camera switch, one legal endpoint; no multiplayer | Free placement/overlap feels right on desktop and tablet; click flips, R rotates; view changes preserve layout. |
| 2. Rules engine | Deterministic deal/turns/draws/doubles/scoring and chosen rule config | Meaningful tests cover the cases in `rules.md`; no renderer dependency. |
| 3. Private-room vertical slice | Host, join code, names/colors, two clients, one whole round | Separate sessions see only their own hands; legal moves and scores agree. |
| 4. Complete six-player game | All rounds, chosen host options, persistence/reconnect, tablet controls, long routes/hands | Six-client playthrough, reconnect and server-restart recovery, no double plays or leaked hands. |
| 5. Finish and release | Final wood art, optional train sounds, deployment, concise help | Usable keyboard/touch controls, reduced motion, readable numbers/colors, functional deployed smoke test. |
| Later | Holiday themes, emotes, phone UI, further tested rule presets | Add separately after the core game is stable; theme boundary exists in the original UI architecture. |

## First prototype acceptance checklist

- Arrange 14+ tiles into several personal groups and long chains, at arbitrary
  positions, with small overlaps and horizontal/vertical orientations. No snapping
  or auto-sort. Verify the chosen workspace provides room for longer chains than
  the initial mockup.
- A drag does not flip a tile. Click swaps ends exactly once. R performs a quarter
  turn on the focused tile; touch has an equivalent button.
- Flip/rotate never changes tile identity. 0, 6, 9, and 12 remain readable.
- The tray stays flat and stable as the board changes perspective.
- Open and close the full-screen hand workspace without moving, rotating, or
  losing any tiles; verify long chains fit or can be panned into view.
- A new draw, viewport resize, and same-browser reconnect preserve the existing
  arrangement; missing local layout has a usable recovery state.
- Tap-based Play works without a precision drag. Invalid/cancelled play restores
  position, orientation, and order; accepted play removes the correct tile.
- Expanded/zoomed tray and Fit Hand recover overlapped/large hands without sorting.
- Keyboard focus, motion reduction, and tablet Pointer Events work in the prototype.

## Multiplayer acceptance checklist

- Two simultaneous color claims never produce duplicate colors; equivalent hex
  forms normalize to the same color. Names identify near-matching shades.
- A full room, unknown code, reconnect, and disconnected host have understandable
  states. No public listing or account requirement.
- Commands from the wrong seat, fabricated tiles, duplicate submissions, and stale
  revisions cannot change game state. Only one community route can be created.
- An unresolved double visibly gates all unrelated endpoints.
- Playing on the community train or another player's train leaves the acting
  player's open marker in place; when the boneyard is empty, a player with no
  legal play opens their train and passes.
- First-turn draws target the player's own train when it cannot be started; a
  failed draw opens it immediately. An already-started opening run ends without
  a further draw. An exposed double has priority, even on a player's first turn;
  covering another player's double ends that turn, and a blocked opening run is
  not carried to a later turn.
- Private socket payloads reveal no opponent hands or boneyard sequence.
- Refreshing a browser preserves its seat; restarting the service preserves the
  game. Test these separately from normal WebSocket reconnection.
- Six clients finish a representative round and verify scores; rule tests cover
  the remaining edge cases. Sound-off and reconnect never produce unwanted horns.
- Check a blocked round selects the lowest score for that round, and a tie for
  lowest selects the next starter only from the tied players.
- Check a final-total tie uses the lowest final-round score and selects randomly
  only among players still tied if that score also ties.

## Avoid rework

Do not implement multiplayer around uncertain tile interactions. Do not polish
textures while turn rules remain ambiguous. Use one rendering direction and a few
focused storyboard states before generating many cosmetic alternatives. Record
accepted choices once and refer to them by file in later tasks.
