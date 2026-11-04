# Proposed technical approach

Status: a first local multiplayer implementation exists; online hosting is not
yet configured. Optimize for a private six-person game and testable rules; no
third-party accounts are required locally.

## Stack and boundaries

| Layer | Recommendation | Reason |
| --- | --- | --- |
| Language/tooling | JavaScript, Node 24, npm with a committed lockfile | Reuses the tested interaction study and runs without a compile step. |
| Client | Vanilla browser JavaScript | Reuses the existing hand interactions; the earlier React/Vite choice remains optional. |
| Table | SVG routes and tiles inside a CSS-transformed board layer | Precise endpoints and camera projection without a full 3D engine. |
| Private hand | DOM/SVG tile faces with Pointer Events and continuous CSS transforms | Touch/keyboard access, arbitrary placement, predictable hit targets. |
| Multiplayer | Express + Socket.IO on one Node HTTP service | Server-authoritative rooms and reconnect transport. |
| Rules | Isolated JavaScript module with server-validated commands | Deterministic tests; server always revalidates client intentions. |
| Persistence | SQLite on a persistent volume for one server instance | Small operational footprint; transactional game snapshots and recovery. |
| Verification | Node test runner; browser checks for interaction and multiplayer | Tests the actual risky behaviors. |

Do not add Three.js, Redis, a separate API platform, or a second server language
unless the camera prototype or hosting constraints justify it. Validate CSS/SVG
projection and hit-testing on a real tablet before committing to this renderer.
Use original procedural tile/hub art; concept images are not UI sprite sheets.

Current structure:

```text
public/            game UI, table/hand input, local hand layouts
server/game.js     game state, rules, legal moves, scoring
server/index.js    room/session lifecycle, persistence, broadcasts
test/              rules and multiplayer server tests
prototype/         earlier static interaction study
```

The protocol currently lives alongside the server. Split it into packages if the
project grows; it is not necessary to scaffold a monorepo for the first build.

## Theme boundary (future requirement, no holiday implementation now)

Define one typed theme contract alongside the first wooden UI. Centralize semantic
CSS variables for surfaces, text, highlights, shadows, number-value inks, and
spacing/style tokens. Use stable asset keys for table material, hub finish,
locomotive skins, and optional sound cues. Components consume these tokens/keys
instead of hardcoding walnut colors or holiday asset paths across the app.

Keep layout geometry, hit areas, tile value labels, seat identity, rules, and
network state independent of theme. A theme must not change legal targets or
rearrange the hand. Keep each player's chosen train color as an identity override;
do not silently replace it with a holiday palette. Always retain number text,
player names, contrast, reduced motion, and sound-off behavior. Number-value color
mapping should stay stable by default; a future palette override needs explicit
contrast/readability testing rather than automatic seasonal substitutions.

Initially ship only a bundled wood theme, not a theme picker, holiday artwork,
theme marketplace, plugin system, or time-based switcher. Later theme selection
can be a local preference without changing game state; a shared host-selected
theme, if desired, is a separate future product decision. All themes use the same
render components and event cues, with safe fallbacks for missing optional assets.
Theme changes must preserve private layout and selected/pending tiles.

## Host, guests, and authoritative state

The host is a player with room-management permissions, not the computer running
the game server. Guests need only a display name, code/link, and an available
color. Recommended code: six characters from an unambiguous alphabet, generated
cryptographically, checked for collision; rate-limit room lookup and joins.
A room code is an invitation, not permission to impersonate a player or host.

Give each guest a server-managed session (same-origin Secure/HttpOnly cookie in
production, with a local development equivalent). Persist a resumable seat binding
on the server. Validate Origin, session, room membership, and command payloads.
Room codes and display names never authenticate a seat on their own. Do not place
reconnect credentials in shareable URLs or logs. Render names as text.

Each action includes a unique command ID and expected game revision. Serialize
commands within a room; validate active player, ownership, target, rules, and
revision; commit state/revision plus deduplication record before broadcasting.
Duplicate commands return their prior result. Stale actions receive fresh state
without applying another move. On reconnect send a tailored authoritative
snapshot, not an assumption that transport recovery retained every event.

Public state contains the engine, played tiles/routes, markers, current turn,
rules, scores, boneyard count, and opponent hand counts. Send actual hand tile
identities only to their owner. Keep boneyard ordering and all other hands entirely
server-side; do not hide secrets merely by filtering what the UI renders.
Generate owner-specific snapshots, events, errors, logs and legal-move hints from
the same privacy boundary: a draw must not expose its identity to other seats.
Persisted snapshots, diagnostics and reconnect responses need the same protection.
Any end-of-round reveal of unplayed hands is a separate rules/product decision;
scores alone do not require publishing the tiles.

Private arrangement is browser-local view data keyed by room/player/round/tile ID.
The server owns each tile's membership and immutable pair of values. Flipping a
tile changes displayed end order; rotating changes its view angle. Neither changes
the tile identity or becomes a game move until a legal play command is accepted.
Sharing a code from a different device does not restore a seat automatically;
cross-device seat recovery can be added explicitly later.

## Durability and disconnects

Store room rules/version, seats/session bindings, shuffled boneyard, hands, turn,
double obligation, scores, command IDs, and revision in a transaction. Live sockets
are not persistent state. Rehydrate after server restart without redealing.
This persistence is server-private; never serve the database or full snapshots to
clients. Limit retention of deduplication records alongside room retention.
Expire abandoned rooms under a documented retention policy; proposed 24 hours of
inactivity, to confirm if multi-day games are wanted.

Recommended initial disconnect policy: pause when the active player disconnects;
allow seat rejoin without forfeiting the hand. Host can pause/resume but cannot
silently view hands or bypass the rules. After a proposed two-minute host grace
period, give the oldest connected player host status; host departure alone does
not end the game. Agree on removal/abandonment behavior before implementation;
do not silently bot-play a disconnected seat.

Use a single server instance on a host supporting WebSockets and a persistent
volume. SQLite does not justify running several independent app instances against
the same file. If deployment requires multiple replicas or volume-free serverless
hosting, revisit persistence/coordination (for example PostgreSQL), rather than
pretending an in-memory room map is durable. Deployment provider is undecided.

## Client behavior under latency

Move and rotate tiles locally at pointer speed; avoid React network rerenders on
every pointer move. During a submitted game move, lock only the pending tile and
avoid duplicate submission. Remove it from the hand only after acceptance; a
rejection restores the original layout and explains the cause. Refresh legal
targets after any accepted revision. Never let an old camera animation or stale
highlight authorize a move.

Audio and future emotes consume accepted event IDs and deduplicate on the client.
Do not replay old train horns after reconnect. Keep effects separate from rules.

## Local workflow

Run `npm ci`, `npm start`, and `npm test` from the repository root. The client is
static and is served by the same Node process, so it has no separate build step.
Browser interaction tests performed during development are separate from `npm test`.
