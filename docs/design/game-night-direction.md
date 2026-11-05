# Game-night design exploration

Status: a wood-theme design is being tested on the `codex/cozy-game-night`
branch. The following images are visual concepts, not exact specifications.
See the [first felt concept](cozy-game-night-concept.png) and
the [wood-forward revision](cozy-wood-table-concept.png), followed by the
[playing-screen refinement](cozy-wood-refinement.png).

## User decisions

- Make the game feel like sitting around a table with friends, in a cozy home
  game-night setting.
- Show friends through names and their chosen train colors at seats, rather than
  depicting faces or requiring avatars.
- Keep the playable table large; the surrounding room should appear subtly at
  the edges.
- Prefer more visible wood and less felt than the first game-night concept.
- The wood-forward revision is close enough to refine, rather than replacing the
  direction. Its exact layout and details are not yet approved.
- The current sound framework works for now; the user wants to revisit the
  audio later.

## Direction to review

The reference suggests dark green felt, warm wood, brass accents, soft lighting,
and tangible materials. The first concept tried these as a possible atmosphere;
the user prefers more wood and less felt. The amount of ornament and darkness
remains to be reviewed.

Possible ways to make the table feel shared without inventing activity:

- Place a player's name and color near their consistent seat; show whose turn it
  is and whether they are connected using real game state.
- Show actual plays arriving on the table with a brief, optional movement and a
  subtle indication of who played. Do not animate pretend moves or reveal a
  player's hand.
- Use restrained table-edge details and lighting; keep labels and numbers clear
  and avoid excessive motion. Respect reduced-motion settings.

The first implementation uses live seat and turn data and a brief arrival fade
for real plays; the game remains usable with reduced motion. Theme materials,
lighting, and assets remain separate from rules, hand placement, and camera
geometry so future holiday themes remain possible.

## Important concept limitations

The images are generated artwork, not playable or valid game states. The first
omits the community train; the next shows one but disconnects it from the hub.
They misrepresent the selected alternating lanes and open-train markers, repeat
tiles, and the earlier images put the engine tile in the hand. The real hand
must fit the deal with space to arrange, support free placement and slight
overlap, and retain click-to-flip and R-to-rotate.

The real design must preserve the single community train, user-selected train
colors, readable value-colored numbers, open-train markers, unobtrusive pending
double highlight, player-controlled draws, score history, zoom/pan, compact and
expandable long trains, individual sound controls, and desktop/tablet use. The
concept's labels, seat counts, score examples, and apparent control positions are
illustrative. The room must never consume space needed for playable dominoes.

## Real-board visual check

[Current wood-theme implementation](wood-theme-board-preview.png) shows the
actual board and controls on the design branch, using the same simulated game
as the earlier study. Seat badges use real connection and turn state.

[Wood-color preview on the real board](real-board-wood-preview.png) is a browser
screenshot of the current game UI with temporary color and material styling. It
uses a simulated four-player game produced by the real rules engine, with one
community train and several long, condensed routes. It is a rough visual study,
not the finished room or an applied theme. The preview session checked moving a
hand tile, expanding and condensing a long train, and making a legal play. These
checks do not establish that a future redesign works on every device or at all
player counts; the real implementation will still need desktop and tablet tests.

Keep the board's actual hit targets, train geometry, long-train compression,
private hand and state handling intact when exploring the new visual design.
Any new layout, seating, or camera movement must be checked against live game
state and input, including tablet use, before it is deployed.

## Testing and rollback

The design branch begins at `a09d43a`, the game version before the redesign.
The design does not change server rules or the saved-game format. If the design
is deployed and needs to be undone, revert its commit on the deployment branch
or redeploy that earlier commit through Render. The free service may restart
and lose active rooms during either deployment or rollback.

## Suggested review sequence

1. Agree on how dark and ornate the tabletop should be.
2. Design one accurate playing screen around real seat counts, the community
   route, a usable hand, and existing controls.
3. Explore subtle presence and turn transitions against real multiplayer state.
4. Test readability, table interaction, and tablet use before applying the
   approved appearance to the live game.
