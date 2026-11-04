# UI and interaction proposal

Status: warm, realistic wooden-table direction approved; detailed interaction and
layout proposals still need review.
Confirmed controls are click/tap to swap ends and R to rotate 90 degrees.
The [play storyboard](play-storyboard.md) and `prototype/` explore the transition
from an arranged hand to a table endpoint. Their behavior is a reviewable proposal.

## Visual direction A: warm wooden table

See [initial camera comparison](table-concept-v1.png). The reference is the
user-supplied physical wooden hub; artwork is original. Large ivory numbered
tiles, restrained walnut texture, light oak hub, miniature colored train markers,
and a quiet score/activity area support a tactile tabletop feel.

See also the [hand and lobby concept](hand-lobby-concept-v1.png), which explores
a deeper tray and a full-wheel color picker. Its tile faces are mostly black
instead of the required per-value colors, and some tiles are duplicated. It is
an illustration of layout and controls, not a legal deal or final palette. The
tray must support longer chains than the image can demonstrate; fit, expansion,
and panning must not rearrange tiles.
The user specifically requested more room for long chains and chose a full-screen
hand workspace that can be opened and closed. This earlier image does not show
that workspace.

The [expanded hand concept](expanded-hand-concept-v1.png) explores substantially
more room, including a long player-arranged chain. Tiles may still be positioned
anywhere or slightly overlapped; the straight example chain does not imply slots,
snapping, or a positional grid. This rendering has duplicate sample tiles, some
number colors need stronger contrast, and its tiny board is only illustrative.
Do not use the sample as a valid deal or a final screen layout.

The newer [full-screen hand concept](full-screen-hand-concept-v1.png) reflects the
chosen open/close workspace, with a Back to table control. The example repeats
some unordered tiles and uses illustrative number colors, not a valid deal or
an accessibility-tested palette. Straight rows are one possible arrangement;
they must not be imposed by the interface.

**Rendering limitations:** v1 was generated before the user's control and
six-player answers. It shows extra train positions, incorrect helper text, repeated
tile identities, and illustrative targets/actions. It is not a legal double-12
deal. The two panels are not pixel-identical game states. Use it to discuss visual
style and camera direction only. Final layout has six personal routes plus one
community route; helper text must say `Click to flip · R to rotate`. Only legal
endpoints and actions are enabled in the actual game.

## Board and camera

- Place the local player's personal train nearest them. Other seats stay stable
  within that player's view; each client may have its own viewing orientation.
- Start with a seated oblique view (proposed 35–45 degrees from overhead). Animate
  toward near-overhead on your turn, without rotating seat assignments or the hand.
- Proposed transition: 350–500 ms, ease in/out, no bounce. Make input geometry
  agree with the visible board throughout; delay board placement until settled.
- Add a manual overhead-view toggle and a reduced-motion setting. Reduced motion
  changes views immediately. Avoid compulsory zooming or spinning every turn.
- A shared central engine feeds six personal routes and one labeled community
  route. Unoccupied seats need no active route. Long routes bend without crossing;
  fit/zoom/pan must preserve legibility. Do not shrink all numerals indefinitely.
- On your turn, highlight legal endpoints for the chosen tile. Explain blocked
  actions, especially an unresolved double. Show the active player's name in text.
- Keep room code, round/engine, scores, and a short activity log secondary to play.

## Private hand: the main design risk

The user can open a full-screen hand workspace and close it to return to the
table. The full-screen view uses the available browser area for the hand, not a
forced browser full-screen mode. It must offer a clearly visible return control
and keep the arranged tiles, orientation, stacking order, and workspace view when
switching. Its exact layout is still being designed.

Proposed play flow: select a tile, choose Play, and return to the table with that
tile selected and legal endpoints highlighted. Cancelling or a rejected play
preserves its workspace position. Keep turn and double-obligation notifications
visible in the workspace without moving tiles or automatically closing the view.

The tray is a screen-aligned area, not part of the board's 3D transform. Initial
tiles appear with no overlap; subsequent movement belongs entirely to the player.
Do not sort, snap, pack, or rearrange them after a draw, play, resize, camera move,
or reconnect. A deliberate optional Arrange action can be discussed later.

| Input | Proposed behavior |
| --- | --- |
| Drag inside tray | Move freely in continuous coordinates; allow overlap; lifted tile comes to front. |
| Click/tap without drag | Select the tile and swap its displayed ends. Does not play it. |
| R while tile focused | Rotate 90 degrees about its center; keep its two values legible. |
| Tablet Rotate button | Same quarter-turn action without a keyboard. |
| Flip button | Same swap-ends action as click; also useful to explain the control. |
| Drag to legal board endpoint | Show preview; release submits exactly one play. Invalid release restores original tray position. |
| Select + Play control | Enter placement mode, then tap a legal endpoint. Supports touch and keyboard without precision dragging. |
| Escape / Cancel | Cancel placement or in-progress manipulation without losing the original position. |
| Draw / Pass | Enable only when rules permit. New tile appears in visible free space without moving existing tiles. |

The click/drag threshold should be small but explicit (initial proposal: 6 CSS px;
validate on touch). A drag must never produce an accidental flip on release.
Prevent browser scrolling only during a captured tile drag, not across the whole
page. Disable letter shortcuts while typing in text fields.

Keep all tiles recoverable with workspace bounds, front/back focus cycling, and a
non-destructive Fit Hand view. Allow pan/zoom of the private canvas for large
hands; preserve each tile's relative arrangement. Fit must change the view, not
rearrange tiles. Warn before any future destructive arrangement reset.

Store normalized positions, quarter-turn orientation, displayed end order, and
stacking order locally per room/player/round/tile ID. Reconcile with the server's
current hand; never resurrect a played tile. A server-rejected play returns the
tile to its saved location and orientation. Private layout is not broadcast.
Preserve the logical canvas and its viewport independently of physical tray size;
resizing or fitting changes the view, not the stored tile positions. If no free
space is visible for a draw, expand or pan the canvas and put the new tile in
reachable space without moving existing tiles. Local storage loss or a different
device cannot restore a layout without a future explicit sync feature; show a
recoverable initial layout rather than claiming otherwise.

## Numbers and color

- Each value 0–12 gets one fixed ink color; values stay visible as text. Use a
  literal `0` for blanks. Color supplements the number, never replaces it.
- Number ink and player train colors are independent systems.
- Keep numerals readable when a tile is rotated; use an orientation cue for 6/9
  and test the actual font at target size. Prefer upright face labels independent
  of tile orientation if that proves clearest in the prototype.
- Color wheel plus hex entry, with a contrast preview against the table. Normalize
  colors before uniqueness checks; reserve the selected color atomically on the
  server to prevent two simultaneous joins claiming it.
- Exact RGB uniqueness is confirmed; allow nearby shades with a warning and always
  show names/seat labels. Reserve or clearly label the community marker so it
  cannot be mistaken for a player.

## Devices and accessibility

Prototype at desktop 1440×900 and tablet landscape 1024×768, also checking desktop
1280×720. Aim for 44 CSS px touch controls and accessible text contrast. Tablet
portrait can recommend landscape while preserving room controls and recovery.
Do not require hover, a physical keyboard, sound, or color perception to play.
Provide keyboard selection/movement and explicit Flip/Rotate/Play controls.
Keyboard users must also be able to select a legal destination, draw, pass, end an
opening, pan or fit the hand, and cancel; announce turn, obligations, errors and
accepted moves as text. Focus indicators must remain visible over the wood and
overlapping tiles, and all tiles must remain reachable without pointer precision.

## Sound and later features

Future holiday themes are confirmed as an architectural consideration. The first
release keeps the wooden theme. Replaceable surface/material/style/audio tokens
must preserve the same controls, numeric readability, player-chosen colors, and
hand arrangement. Do not implement a holiday theme or theme selector now.

Local train-sound toggle, initially off (proposal). After browser audio activation,
play once for a closed→open player-train event or the community train's first tile.
Do not replay old sounds after reconnect or replaying the event history. Provide
visual equivalents. Use original or properly licensed audio. Emotes come after a
stable playable game; whether they include sound is a separate choice.

## Next visual artifacts

1. Corrected table/active-view pair with six players and the confirmed controls.
2. Hand close-up storyboard: arrange, flip, rotate, overlap, invalid drop, tablet.
3. Create/join lobby with color wheel, rule summary, and color-conflict feedback.
4. Exposed double, draw/pass, reconnect, and scoring states after rules are chosen.

Review the first three before building the production UI. Generated images guide
composition; an interaction prototype must validate drag behavior and touch feel.
