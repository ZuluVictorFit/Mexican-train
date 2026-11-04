# Product brief

Planning date: November 3, 2026 (user timezone). Status: pre-build.

## Confirmed by the user

| Area | Requirement |
| --- | --- |
| Audience | Private online multiplayer with friends; one host; guests join with a code. |
| Devices | Desktop and tablet first. Phones later. |
| Table size | Up to six players. Proposed minimum: two. |
| Private hand | Bounded tray with continuous free placement, small overlaps, no grid. |
| Hand orientation | Click swaps a tile's two ends; R rotates it 90 degrees. |
| Idle board | Perspective suggesting sitting at an actual table. |
| Active board | Animate into a clearer playing view on the player's turn; animation details pending. |
| Domino faces | Actual numbers rather than dots, with consistent colors per number. |
| Community train | Exactly one per round; no option to create multiple community trains. |
| Community start | After opening turns, any player may start the community train, including a player who has not started their personal train. |
| Closing a train | When a player plays on their own open train, its marker is removed and it becomes private again. |
| Playing elsewhere | If a player's train is open, playing on the community train or another player's train leaves it open. |
| Empty boneyard | A player with no legal play opens their train and passes when no tiles remain to draw. |
| Player train colors | Full color wheel; block exact duplicates. Allow similar shades with a warning. |
| Sound | Optional train sound when a player opens their train or the community train starts. Lower priority. |
| Emotes | Later feature. |
| House rules | Discuss group rules; consider multiple host-selectable rule options after research. |
| Process | Settle details and UI renderings before building to reduce rework and repeated context. |
| Art direction | Warm, realistic wooden table (confirmed after concept v1). |
| Doubles | An exposed double must be covered before play elsewhere; obligation passes to other players if necessary. |
| Drawing | Draw one when unable to play; play it if possible, otherwise open your train and pass. |
| Opening turn | A player may lay as many matching tiles as desired on their personal train on their first turn. |
| Opening draw | A player's first turn is for their own train, except that an exposed double must be covered first. If they cannot start their train, they draw one to try; if that fails, their train opens immediately. |
| Successful opening draw | If the drawn tile starts their personal train, the player may continue their opening run. |
| End of opening run | After playing the opening tiles they want, a player ends their turn without drawing when they cannot extend their train. |
| Opening doubles | After covering a double during an opening run, the player may continue building their personal train. |
| Doubles on normal turns | If a player covers their own double during a normal turn, that turn ends. |
| Cover on first turn | Covering another player's double ends the turn. If the double prevents a player from starting their train, they do not get a delayed opening run; their later turns use the normal one-tile rule. |
| Deal | Deal 15 tiles each for 2–4 players, or 12 each for 5–6 players, using a double-12 set. |
| Starting double | Set the round's starting double aside before dealing, then place it in the center. |
| Final double | The player immediately draws and tries to cover it. If the draw cannot cover, they keep it and the normal cover obligation passes on; play continues. If the boneyard was already empty, the other players try to cover; once covered, the player who emptied their hand goes out. If nobody can cover it, the round is blocked and everyone scores their remaining tiles. |
| Round schedule | Host chooses a full 12-to-0 game or a shorter starting double. |
| Scoring | Sum printed numbers remaining in hand; 0–0 scores zero; lowest total wins. If final totals tie, the tied player with the lowest final-round score wins; choose randomly among anyone still tied. |
| Starting player | Choose randomly for the first round; the previous round's winner starts each later round. In a blocked round, the lowest score for that round wins; if tied, choose randomly among the tied players. |
| Future themes | Plan for interchangeable themes, including holidays; do not build holiday themes now. |
| Hand space | A full-screen hand workspace can be opened and closed, with enough room to arrange long chains freely. |

## Recommended first-version boundaries (not yet approved)

Anonymous display names, private unlisted rooms, 2–6 human players, a double-12
set, reconnect to the same seat, automatic legal-move validation, score tracking,
and a compact game activity log. Keep theme assets/tokens separate from behavior;
ship only the wooden theme initially. No public matchmaking, accounts, bots, spectators,
chat, money, or social integrations in the first build.

Use a warm wooden table inspired by the supplied physical hub photo, with original
artwork. The overall style of the first rendering is approved; its precise layout
and camera angles remain proposals. Keep the hand
flat on screen while only the shared board changes camera angle.

## Proposed room flow

Create room → display name and unique color → share code/link → guests choose
name and color → host reviews a readable rule summary → host starts round →
play and scores → host starts next round → final scores/rematch.

Show connected players and room capacity before starting. Freeze the chosen rule
configuration at game start. Seat spectators or late arrivals only between games
in a future feature; do not inject a new hand into an active round.

## Details still to settle

- Precise idle/active camera views and the interaction storyboard.
- Remaining double edge cases, community-train timing, and marker behavior
  ([rules matrix](rules.md)).
- Preferred active placement: drag to endpoint, click/tap tile then endpoint, or
  both. Recommendation: both, with a distinct Play action for the tap path.
- How the hand workspace transitions into playing a tile on the table. A return
  to the board with the tile selected and legal endpoints highlighted is proposed.
- Reconnect grace period and host succession behavior. Recommended behavior is
  described in the technical proposal.
- Whether saving a long game across days is needed; short disconnect/restart
  recovery is recommended regardless.

## Decision discipline

Record each settled choice here or in its owning document. Keep proposals marked
as such. Do not turn an unanswered question into an approved requirement. Before
building, settle the rules affecting the state machine and approve the interaction
storyboards; decorative details can remain adjustable.
