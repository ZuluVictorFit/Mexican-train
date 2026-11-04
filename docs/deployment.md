# Multiplayer deployment

The GitHub Pages site serves the original static prototype. A multiplayer room
needs the Node server; GitHub Pages cannot run it. `render.yaml` is an optional
starting point for an early playtest on a Render free web service, subject to
Render's current terms, availability, and the account owner's setup.

**Data limitation:** the default SQLite database is a local file. Free services
may sleep or restart, and their local filesystem can be ephemeral, so rooms and
games can disappear. Do not promise saved games on that setup. A durable volume or
external database is needed before relying on recovery across provider restarts;
the latter is not implemented yet. A free provider's limits should be checked
before choosing it. The host should understand this limitation before playtesting.

Run one server instance with Node 24, `npm ci --omit=dev`, and `npm start`. The
server respects `PORT`, exposes `/health`, serves the client and Socket.IO from
the same origin, and stores its database at `DATA_PATH` if supplied. For durable
SQLite, place `DATA_PATH` on a writable persistent volume. Do not expose that
database publicly: it contains private hands and session credentials. Do not run
multiple independent instances against the same SQLite file.

No hosting account is configured in this repository. Do not treat the Render
blueprint as proof of a deployment or a currently available free plan. Deploy
only after the user chooses a provider and connects an account, then verify the
actual public URL and a two-player create/join/play flow.
